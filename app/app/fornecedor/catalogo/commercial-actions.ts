"use server";

import { revalidatePath } from "next/cache";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { createClient } from "@/lib/supabase/server";
import { UF_CODES } from "@/lib/marketplace/brazil-regions";

export type SupplierCatalogFeedback = { status:"idle"|"error"|"success"; message:string };
const failed=(message:string):SupplierCatalogFeedback=>({status:"error",message});
const saved=(message:string):SupplierCatalogFeedback=>({status:"success",message});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(data:FormData,key:string){const item=data.get(key);return typeof item==="string"?item.trim():"";}
function decimal(data:FormData,key:string,max:number,integersOnly=false){
 const raw=value(data,key);
 const pattern=integersOnly?/^(0|[1-9][0-9]*)$/:/^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$/;
 if(!pattern.test(raw))return null;
 const numeric=Number(raw);
 return Number.isFinite(numeric)&&numeric>=0&&numeric<=max&&(!integersOnly||Number.isSafeInteger(numeric))?numeric:null;
}
async function authorizedSku(data:FormData){
 const access=await requireMarketplacePortal("fornecedor");
 const skuId=value(data,"sku_id");
 if(!UUID.test(skuId))return null;
 const client=await createClient();
 const sku=await client.from("supplier_products").select("id,supplier_org_id,status")
  .eq("id",skuId).eq("status","approved").maybeSingle();
 if(sku.error||!sku.data)return null;
 const orgId=sku.data.supplier_org_id;
 const [membership,capability,organization]=await Promise.all([
  client.from("organization_members").select("id").eq("organization_id",orgId).eq("user_id",access.userId)
   .eq("status","active").in("role",["ORG_ADMIN","SUPPLIER_ADMIN","PLATFORM_ADMIN"]).limit(1),
  client.from("organization_capabilities").select("organization_id").eq("organization_id",orgId)
   .eq("capability","SUPPLIER").eq("status","approved").limit(1),
  client.from("organizations").select("id").eq("id",orgId).eq("status","approved").limit(1)
 ]);
 if(membership.error||capability.error||organization.error||
   !membership.data?.length||!capability.data?.length||!organization.data?.length)return null;
 return {client,skuId,orgId};
}
function invalidate(){
 revalidatePath("/app/fornecedor/catalogo");
 revalidatePath("/app/fornecedor/operacao");
 revalidatePath("/admin/marketplace/catalogo");
 revalidatePath("/admin/marketplace/cadastro");
}
export async function updateSupplierStock(_previous:SupplierCatalogFeedback,data:FormData):Promise<SupplierCatalogFeedback>{
 const stock=decimal(data,"available",100000000);
 if(stock===null)return failed("Informe uma quantidade não negativa, com até três casas decimais.");
 const authorized=await authorizedSku(data);
 if(!authorized)return failed("SKU não encontrado ou sem permissão de edição.");
 const {error}=await authorized.client.rpc("set_supplier_available_stock",{
  p_org:authorized.orgId,p_sku:authorized.skuId,p_available:stock
 } as never);
 if(error)return failed("Estoque não confirmado. Confira se o SKU está homologado e se a integração foi atualizada.");
 invalidate();
 return saved("Disponibilidade salva para o seu fornecedor. Quantidades reservadas não foram alteradas.");
}
export async function submitSupplierPrice(_previous:SupplierCatalogFeedback,data:FormData):Promise<SupplierCatalogFeedback>{
 const price=decimal(data,"price_minor",1000000000,true);
 const minimum=decimal(data,"minimum",10000000,true);
 const state=value(data,"region").toUpperCase();
 const validToRaw=value(data,"valid_to");
 if(price===null||price<=0||minimum===null||minimum<1||!UF_CODES.includes(state as typeof UF_CODES[number]))
  return failed("Informe preço em centavos, mínimo e estado de atendimento válidos.");
 if(validToRaw&&!/^\d{4}-\d{2}-\d{2}$/.test(validToRaw))
  return failed("Validade inválida.");
 let validTo:string|null=null;
 if(validToRaw){
   const ms=Date.parse(validToRaw+"T23:59:59.999Z");
   if(!Number.isFinite(ms)||ms<=Date.now())return failed("A validade final deve ser futura.");
   validTo=new Date(ms).toISOString();
 }
 const authorized=await authorizedSku(data);
 if(!authorized)return failed("SKU não encontrado ou sem permissão comercial.");
 const {error}=await authorized.client.rpc("create_supplier_pending_offer",{
  p_org:authorized.orgId,p_sku:authorized.skuId,p_price_minor:price,p_minimum:minimum,
  p_region:"BR-"+state,p_valid_to:validTo
 } as never);
 if(error)return failed("Oferta não registrada. Verifique região, preço ou homologação do SKU.");
 invalidate();
 return saved("Preço enviado para aprovação do ADM. A oferta atual continua válida até uma decisão comercial.");
}
