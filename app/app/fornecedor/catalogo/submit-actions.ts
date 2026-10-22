"use server";
import {createClient} from "@/lib/supabase/server";
import {requireMarketplacePortal} from "@/lib/marketplace/session";
import {revalidatePath} from "next/cache";
import {UF_CODES} from "@/lib/marketplace/brazil-regions";
type Feedback={status:"idle"|"error"|"success";message:string};
export async function submitSupplierProduct(_:Feedback,form:FormData):Promise<Feedback>{
 const access=await requireMarketplacePortal("fornecedor");
 const org=String(form.get("supplier_org_id")||"");
 const sku=String(form.get("supplier_sku")||"").trim();
 const name=String(form.get("product_name")||"").trim();
 const category=String(form.get("category_id")||"");
 const state=String(form.get("region")||"").toUpperCase();
 const unit=String(form.get("base_unit")||"");
 const packUnit=String(form.get("pack_unit")||"");
 const pack=Number(form.get("pack_quantity"));
 const price=Number(form.get("base_price_minor"));
 const stock=Number(form.get("available_quantity"));
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(org)||
  (category&&!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(category))||
  !UF_CODES.includes(state as typeof UF_CODES[number])||!sku||sku.length>100||name.length<2||name.length>160||
  !["un","kg","l"].includes(unit)||!["un","kg","l"].includes(packUnit)||!Number.isFinite(pack)||pack<=0||pack>1000000||
  !Number.isSafeInteger(price)||price<=0||price>1000000000||!Number.isFinite(stock)||stock<0||stock>100000000)
  return {status:"error",message:"Confira organizacao, SKU, nome, unidade, preco em centavos e quantidade."};
 const db=await createClient();
 const memberships=await db.from("organization_members").select("role").eq("user_id",access.userId)
  .eq("organization_id",org).eq("status","active").in("role",["ORG_ADMIN","SUPPLIER_ADMIN","PLATFORM_ADMIN"]).limit(1);
 const caps=await db.from("organization_capabilities").select("status").eq("organization_id",org).eq("capability","SUPPLIER").eq("status","approved").limit(1);
 if(memberships.error||!memberships.data?.length||caps.error||!caps.data?.length)
  return {status:"error",message:"Voce nao possui permissao de cadastro nesta organizacao."};
 const {error}=await db.from("supplier_product_submissions").insert({
  supplier_org_id:org,author_id:access.userId,supplier_sku:sku,product_name:name,
  category_id:category||null,region_code:"BR-"+state,base_unit:unit,pack_unit:packUnit,
  pack_quantity:pack,base_price_minor:price,available_quantity:stock,status:"pending"
 });
 if(error)return {status:"error",message:"Nao foi possivel registrar a solicitacao. Verifique duplicidade ou migracao."};
 revalidatePath("/app/fornecedor/catalogo");
 return {status:"success",message:"Produto enviado para revisao. Nao foi publicado."};
}
