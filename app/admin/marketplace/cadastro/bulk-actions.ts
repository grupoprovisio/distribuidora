"use server";

import { revalidatePath } from "next/cache";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { createClient } from "@/lib/supabase/server";

export type BulkResult = {status:"idle"|"success"|"error";message:string;details:string[]};
type Item = {name:string;gtin:string;unit:string;sku:string;pack:number;stock:number;price:number;minimum:number};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const units=new Set(["un","kg","l"]);
const states=new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
const invalid=(message:string):BulkResult=>({status:"error",message,details:[]});
const slug=(name:string)=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,75);

export async function saveCommercialBatch(_previous:BulkResult,form:FormData):Promise<BulkResult>{
  await requireMarketplacePortal("admin");
  const supplier=String(form.get("supplier")||"");
  const uf=String(form.get("uf")||"").toUpperCase();
  const approve=form.get("approve")==="on";
  if(!uuid.test(supplier)||!states.has(uf))return invalid("Selecione um fornecedor aprovado e uma UF válida.");
  const raw=form.get("items");
  if(typeof raw!=="string"||raw.length>30000)return invalid("Dados do lote inválidos ou muito extensos.");
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return invalid("Não foi possível interpretar os produtos.");}
  if(!Array.isArray(input)||input.length<1||input.length>15)return invalid("O lote deve conter de 1 a 15 produtos.");
  const rows:Item[]=[];
  for(let i=0;i<input.length;i++){
    const r=input[i] as Record<string,unknown>;
    if(!r||typeof r!=="object")return invalid("Produto "+(i+1)+": dados inválidos.");
    const name=String(r.name||"").trim(),gtin=String(r.gtin||"").trim(),sku=String(r.sku||"").trim();
    const unit=String(r.unit||"");
    const pack=Number(r.pack),stock=Number(r.stock),price=Number(r.price),minimum=Number(r.minimum);
    if(name.length<2||name.length>160||!slug(name)||sku.length<1||sku.length>100||!units.has(unit)||
       (gtin&&!/^\d{8,14}$/.test(gtin))|| !Number.isFinite(pack)||pack<=0||pack>1000000||
       !Number.isFinite(stock)||stock<0||stock>100000000||
       !Number.isSafeInteger(price)||price<=0||price>1000000000||
       !Number.isSafeInteger(minimum)||minimum<1||minimum>10000000||
       [pack,stock].some(n=>Math.round(n*1000)!==n*1000))
      return invalid("Produto "+(i+1)+": confira nome, GTIN, SKU, unidade, embalagem, estoque, preço e mínimo.");
    rows.push({name,gtin,unit,sku,pack,stock,price,minimum});
  }
  if(new Set(rows.map(r=>r.sku.toLowerCase())).size!==rows.length)return invalid("Há SKUs repetidos no mesmo lote.");
  const db=await createClient();
  const [org,cap,existing]=await Promise.all([
    db.from("organizations").select("kind,status").eq("id",supplier).maybeSingle(),
    db.from("organization_capabilities").select("status").eq("organization_id",supplier).eq("capability","SUPPLIER").maybeSingle(),
    db.from("supplier_products").select("supplier_sku").eq("supplier_org_id",supplier).in("supplier_sku",rows.map(r=>r.sku))
  ]);
  if(org.error||cap.error||org.data?.status!=="approved"||cap.data?.status!=="approved"||
     !["SUPPLIER","PLATFORM_OPERATOR"].includes(org.data?.kind||""))
    return invalid("Fornecedor não está autorizado para cadastro comercial.");
  if(existing.error)return invalid("Não foi possível verificar SKUs existentes.");
  if(existing.data?.length)return invalid("Já existem SKUs cadastrados: "+existing.data.map(s=>s.supplier_sku).join(", ")+". Ajuste antes de enviar.");
  const details:string[]=[];
  let completed=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i],prefix="Produto "+(i+1)+" ("+r.name+"): ";
    const product=await db.from("products").insert({
      name:r.name,slug:slug(r.name)+"-"+crypto.randomUUID().slice(0,8),gtin:r.gtin||null,
      base_unit:r.unit,status:"draft"
    }).select("id").single();
    if(product.error||!product.data){details.push(prefix+"falha na criação do produto.");continue;}
    const productId=product.data.id;
    const sku=await db.from("supplier_products").insert({
      supplier_org_id:supplier,product_id:productId,supplier_sku:r.sku,
      pack_quantity:r.pack,pack_unit:r.unit,status:"pending"
    }).select("id").single();
    if(sku.error||!sku.data){details.push(prefix+"produto criado como rascunho; vínculo do SKU falhou. Revise manualmente.");continue;}
    if(!approve){completed++;details.push(prefix+"rascunho e SKU pendente criados.");continue;}
    const active=await db.from("products").update({status:"active"}).eq("id",productId).eq("status","draft").select("id");
    const approved=await db.from("supplier_products").update({status:"approved"}).eq("id",sku.data.id).eq("status","pending").select("id");
    if(active.error||!active.data?.length||approved.error||!approved.data?.length){
      details.push(prefix+"criado, mas a homologação não foi concluída. Revise no cadastro tradicional.");continue;
    }
    const inventory=await db.from("inventory_positions").insert({
      supplier_product_id:sku.data.id,supplier_org_id:supplier,available_quantity:r.stock,reserved_quantity:0
    }).select("supplier_product_id");
    if(inventory.error||!inventory.data?.length){details.push(prefix+"SKU aprovado; estoque não gravado. Revise manualmente.");continue;}
    const offer=await db.from("offers").insert({
      supplier_org_id:supplier,supplier_product_id:sku.data.id,source_type:"MANUAL_AUTHORIZED",
      base_price_minor:r.price,min_quantity:r.minimum,status:"pending",valid_from:new Date().toISOString()
    }).select("id").single();
    if(offer.error||!offer.data){details.push(prefix+"estoque gravado; oferta não criada. Revise manualmente.");continue;}
    const region=await db.from("offer_regions").insert({offer_id:offer.data.id,region_code:"BR-"+uf}).select("offer_id");
    if(region.error||!region.data?.length){details.push(prefix+"oferta pendente sem região. Não publique antes de corrigir.");continue;}
    const approval=await db.from("offers").update({status:"approved"}).eq("id",offer.data.id).eq("status","pending").select("id");
    if(approval.error||!approval.data?.length){details.push(prefix+"oferta pendente de aprovação. Revise manualmente.");continue;}
    completed++;details.push(prefix+"produto, SKU, estoque e oferta homologados.");
  }
  for(const path of ["/admin/marketplace/cadastro","/admin/marketplace/catalogo","/admin/marketplace","/app/fornecedor/catalogo","/produtos"])revalidatePath(path);
  return {status:completed===rows.length?"success":"error",
    message:completed+" de "+rows.length+" produtos concluídos. "+(approve?"A vitrine pública exige publicação de imagem WebP separada.":"Os registros permanecem pendentes de homologação."),
    details};
}
