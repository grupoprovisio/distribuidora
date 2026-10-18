"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";

export type Feedback={status:"idle"|"success"|"error";message:string};
const feedback=(status:Feedback["status"],message:string):Feedback=>({status,message});
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const units=new Set(["un","kg","l"]);
const stateCodes=new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
type Client=Awaited<ReturnType<typeof createClient>>;

function text(data:FormData,key:string,max=200) {
  const item=data.get(key);
  return typeof item==="string"?item.trim().slice(0,max+1):"";
}
function uuid(data:FormData,key:string):string|null {
  const value=text(data,key,36);
  return ID.test(value)?value:null;
}
function num(data:FormData,key:string,integer=true,max=10000000):number|null {
  const raw=text(data,key,40);
  if(!raw || !/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(raw))return null;
  const value=Number(raw);
  return Number.isFinite(value) && value>=0 && value<=max && (!integer || Number.isSafeInteger(value))
    ?value:null;
}
async function adminDb() {
  await requireMarketplacePortal("admin");
  return createClient();
}
function refreshed() {
  revalidatePath("/admin/marketplace/cadastro");
  revalidatePath("/admin/marketplace/catalogo");
  revalidatePath("/app/fornecedor/catalogo");
  revalidatePath("/admin/marketplace");
}
const failed=(message:string)=>feedback("error",message);
const saved=(message:string)=>feedback("success",message);
function dbFailure(code?:string) {
  return code==="23505"?"Registro duplicado. Confira o código e tente novamente."
    :code==="23514"?"Operação bloqueada por uma regra de homologação. Confira a situação da empresa, do produto e do estoque."
    :"Não foi possível confirmar o registro. Verifique suas permissões e tente novamente.";
}
async function confirmed<T>(request:PromiseLike<{data:T[]|null,error:{code?:string}|null}>,success:string):Promise<Feedback> {
  const result=await request;
  if(result.error || !result.data?.length)return failed(dbFailure(result.error?.code));
  refreshed();
  return saved(success);
}

export async function createDraftProduct(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb();
  const name=text(data,"name",160),slug=text(data,"slug",120).toLowerCase();
  const base_unit=text(data,"base_unit",8),gtin=text(data,"gtin",14);
  if(name.length<2 || name.length>160 || slug.length>120 || !slugPattern.test(slug) || !units.has(base_unit))
    return failed("Informe nome, identificador sem espaços e unidade válidos.");
  if(gtin && !/^\d{8,14}$/.test(gtin))return failed("O GTIN deve conter de 8 a 14 dígitos.");
  return confirmed(db.from("products").insert({name,slug,base_unit,gtin:gtin||null,status:"draft"}).select("id"),
    "Produto mestre cadastrado como rascunho. Ainda não está à venda.");
}

export async function activateProduct(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb(),id=uuid(data,"product_id");
  if(!id)return failed("Selecione um produto válido.");
  return confirmed(db.from("products").update({status:"active"}).eq("id",id).eq("status","draft").select("id"),
    "Produto mestre ativado. Ofertas continuam sujeitas à homologação.");
}

export async function createPendingSku(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb();
  const supplier_org_id=uuid(data,"supplier_org_id"),product_id=uuid(data,"product_id");
  const supplier_sku=text(data,"supplier_sku",100);
  const pack_unit=text(data,"pack_unit",8);
  const pack_quantity=num(data,"pack_quantity",false,1000000);
  if(!supplier_org_id || !product_id || !supplier_sku || supplier_sku.length>100 ||
     !units.has(pack_unit) || pack_quantity===null || pack_quantity<=0) return failed("Selecione fornecedor e produto e informe SKU e embalagem válidos.");
  const [org,cap,product]=await Promise.all([
    db.from("organizations").select("kind,status").eq("id",supplier_org_id).maybeSingle(),
    db.from("organization_capabilities").select("status").eq("organization_id",supplier_org_id).eq("capability","SUPPLIER").maybeSingle(),
    db.from("products").select("id,status").eq("id",product_id).maybeSingle()
  ]);
  if(org.error||cap.error||product.error||!org.data||!cap.data||!product.data||
    !["SUPPLIER","PLATFORM_OPERATOR"].includes(org.data.kind)||org.data.status!=="approved"||cap.data.status!=="approved") {
    return failed("Fornecedor precisa estar cadastrado, aprovado e habilitado para fornecer.");
  }
  return confirmed(db.from("supplier_products").insert({
    supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status:"pending"
  }).select("id"),"SKU vinculado ao fornecedor e enviado para homologação.");
}

export async function approveSupplierSku(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb(),id=uuid(data,"sku_id");
  if(!id)return failed("Selecione um SKU.");
  return confirmed(db.from("supplier_products").update({status:"approved"}).eq("id",id).eq("status","pending").select("id"),
    "SKU homologado. Para ficar disponível, ainda precisa de estoque e oferta aprovada.");
}

export async function setInventory(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb(),skuId=uuid(data,"sku_id"),available=num(data,"available",false,100000000);
  if(!skuId||available===null)return failed("Selecione o SKU e informe quantidade válida com até três decimais.");
  const sku=await db.from("supplier_products").select("id,supplier_org_id,status").eq("id",skuId).maybeSingle();
  if(sku.error||!sku.data||sku.data.status!=="approved")return failed("O estoque exige SKU homologado.");
  const existing=await db.from("inventory_positions").select("supplier_product_id").eq("supplier_product_id",skuId).maybeSingle();
  if(existing.error)return failed("Não foi possível confirmar a posição anterior do estoque.");
  const query=existing.data
    ?db.from("inventory_positions").update({available_quantity:available}).eq("supplier_product_id",skuId).select("supplier_product_id")
    :db.from("inventory_positions").insert({supplier_product_id:skuId,supplier_org_id:sku.data.supplier_org_id,available_quantity:available,reserved_quantity:0}).select("supplier_product_id");
  return confirmed(query,"Quantidade disponível atualizada no estoque deste fornecedor.");
}

export async function createPendingOffer(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb();
  const skuId=uuid(data,"sku_id"),base_price_minor=num(data,"price_minor",true,1000000000);
  const min_quantity=num(data,"minimum",true,10000000);
  const region=text(data,"region",8).toUpperCase();
  const normalized=region.startsWith("BR-")?region.slice(3):region;
  const end=text(data,"valid_to",10);
  if(!skuId||base_price_minor===null||base_price_minor<=0||min_quantity===null||min_quantity<1
    ||!stateCodes.has(normalized))return failed("Informe SKU homologado, preço positivo em centavos, mínimo e UF válidos.");
  if(end&&!/^\d{4}-\d{2}-\d{2}$/.test(end))return failed("Data final inválida.");
  const endTime=end?Date.parse(end+"T23:59:59.999Z"):null;
  if(endTime!==null && (!Number.isFinite(endTime) || endTime<=Date.now()))
    return failed("A validade final deve ser uma data real no futuro.");
  const valid_to=endTime!==null?new Date(endTime).toISOString():null;
  const sku=await db.from("supplier_products").select("id,supplier_org_id,status").eq("id",skuId).maybeSingle();
  if(sku.error||!sku.data||sku.data.status!=="approved")return failed("A oferta exige um SKU aprovado.");
  const inserted=await db.from("offers").insert({
    supplier_org_id:sku.data.supplier_org_id,supplier_product_id:skuId,
    source_type:"MANUAL_AUTHORIZED",base_price_minor,min_quantity,status:"pending",
    valid_from:new Date().toISOString(),valid_to
  }).select("id").single();
  if(inserted.error||!inserted.data)return failed(dbFailure(inserted.error?.code));
  const regionCode="BR-"+normalized;
  const regionResult=await db.from("offer_regions").insert({offer_id:inserted.data.id,region_code:regionCode}).select("offer_id");
  if(regionResult.error||!regionResult.data?.length) {
    refreshed();
    return failed("Oferta pendente criada, mas a região não foi vinculada. Não aprove esta oferta; procure o administrador para corrigir.");
  }
  refreshed();
  return saved("Oferta criada como pendente para "+normalized+". Nenhum preço foi publicado automaticamente.");
}

export async function approveOffer(_previous:Feedback,data:FormData):Promise<Feedback> {
  const db=await adminDb(),id=uuid(data,"offer_id");
  if(!id)return failed("Selecione a oferta.");
  return confirmed(db.from("offers").update({status:"approved"}).eq("id",id).eq("status","pending").select("id"),
    "Oferta aprovada no catálogo comercial. Disponibilidade ao comprador depende das políticas comerciais e da sessão.");
}
