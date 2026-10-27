"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const enumIs = <T extends string>(value: string, allowed: readonly T[]): value is T =>
  (allowed as readonly string[]).includes(value);

async function authorizedClient() {
  await requireMarketplacePortal("admin");
  return createClient();
}
function field(data:FormData,name:string,max=160) {
  const v=data.get(name);
  if(typeof v!=="string" || !v.trim() || v.length>max) throw new Error("Campo invalido.");
  return v.trim();
}
function id(data:FormData,name:string) {
  const v=field(data,name,36);
  if(!UUID.test(v))throw new Error("Identificador invalido.");
  return v;
}
async function updated(table:"profiles"|"organizations"|"organization_capabilities"|"organization_members",
  request:PromiseLike<{data:unknown[]|null,error:{message:string}|null}>) {
  const result=await request;
  if(result.error || !result.data?.length) {
    throw new Error(`Alteracao nao autorizada ou nao encontrada (${table}).`);
  }
  revalidatePath("/admin/acessos");
}

export async function setProfileStatus(data:FormData) {
  const client=await authorizedClient();
  const userId=id(data,"user_id");
  const status=field(data,"status",20);
  if(!enumIs(status,["active","blocked","pending"] as const))throw new Error("Status invalido");
  await updated("profiles",client.from("profiles").update({status}).eq("id",userId).select("id"));
}
export async function setOrganizationStatus(data:FormData) {
  const client=await authorizedClient();
  const org=id(data,"organization_id");
  const status=field(data,"status",20);
  if(!enumIs(status,["approved","suspended","pending"] as const))throw new Error("Status invalido");
  await updated("organizations",client.from("organizations").update({status}).eq("id",org).select("id"));
}
export async function setMembershipStatus(data:FormData) {
  const client=await authorizedClient();
  const member=id(data,"membership_id");
  const status=field(data,"status",20);
  if(!enumIs(status,["active","invited","revoked"] as const))throw new Error("Status invalido");
  await updated("organization_members",client.from("organization_members").update({status}).eq("id",member).select("id"));
}
export async function setCapabilityStatus(data:FormData) {
  const client=await authorizedClient();
  const org=id(data,"organization_id");
  const capability=field(data,"capability",30);
  const status=field(data,"status",20);
  if(!enumIs(capability,["BUYER","SUPPLIER","PLATFORM_OPERATOR"] as const)
    || !enumIs(status,["approved","pending","revoked"] as const))throw new Error("Alteracao invalida");
  const response=await client.from("organization_capabilities").update({status})
    .eq("organization_id",org).eq("capability",capability).select("organization_id");
  if(response.error||!response.data?.length)throw new Error("Permissao nao autorizada");
  revalidatePath("/admin/acessos");
}
export async function createOrganization(data:FormData) {
  const client=await authorizedClient();
  const legal_name=field(data,"legal_name",200);
  const trade_name=(data.get("trade_name")||"").toString().slice(0,160).trim()||null;
  const kind=field(data,"kind",20);
  if(!enumIs(kind,["BUYER","SUPPLIER"] as const))throw new Error("Tipo invalido");
  const result=await client.from("organizations").insert({
    legal_name,trade_name,kind,is_platform_owned:false,status:"pending",
  }).select("id");
  if(result.error||!result.data?.length)throw new Error("Nao foi possivel cadastrar a organizacao");
  revalidatePath("/admin/acessos");
}
export async function addMembership(data:FormData) {
  const client=await authorizedClient();
  const organization_id=id(data,"organization_id");
  const user_id=id(data,"user_id");
  const role=field(data,"role",30);
  // Nunca conceder PLATFORM_ADMIN por este formulario.
  if(!enumIs(role,["ORG_ADMIN","BUYER","REQUESTER","APPROVER","FINANCE","READER","SUPPLIER_ADMIN"] as const)) {
    throw new Error("Papel invalido");
  }
  const result=await client.from("organization_members").insert({
    organization_id,user_id,role,status:"invited",
  }).select("id");
  if(result.error||!result.data?.length)throw new Error("Nao foi possivel criar o vinculo.");
  revalidatePath("/admin/acessos");
}
export async function addCapability(data:FormData) {
  const client=await authorizedClient();
  const organization_id=id(data,"organization_id");
  const capability=field(data,"capability",30);
  if(!enumIs(capability,["BUYER","SUPPLIER"] as const))throw new Error("Capacidade invalida");
  const result=await client.from("organization_capabilities").insert({
    organization_id,capability,status:"pending",
  }).select("organization_id");
  if(result.error||!result.data?.length)throw new Error("Capacidade nao autorizada");
  revalidatePath("/admin/acessos");
}

/** Only an MFA-verified platform admin may approve regional visibility. */
export async function addBuyerRegion(data:FormData) {
  const client=await authorizedClient();
  const buyer_org_id=id(data,"buyer_org_id");
  const region_code=field(data,"region_code",5).toUpperCase();
  if(!/^BR-(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(region_code))
    throw new Error("Regiao brasileira invalida.");
  const result=await client.from("buyer_delivery_regions")
    .insert({buyer_org_id,region_code}).select("buyer_org_id");
  if(result.error||!result.data?.length)throw new Error("Nao foi possivel liberar a regiao. Confira a aprovacao da empresa e os vinculos.");
  revalidatePath("/admin/acessos");
  revalidatePath("/app/comprador/catalogo");
}
export async function revokeBuyerRegion(data:FormData) {
  const client=await authorizedClient();
  const buyer_org_id=id(data,"buyer_org_id");
  const region_code=field(data,"region_code",5).toUpperCase();
  if(field(data,"confirm",10)!=="revogar")throw new Error("Confirmacao obrigatoria.");
  if(!/^BR-[A-Z]{2}$/.test(region_code))throw new Error("Regiao invalida.");
  const result=await client.from("buyer_delivery_regions")
    .delete().eq("buyer_org_id",buyer_org_id).eq("region_code",region_code)
    .select("buyer_org_id");
  if(result.error||!result.data?.length)throw new Error("Nao foi possivel revogar a regiao.");
  revalidatePath("/admin/acessos");
  revalidatePath("/app/comprador/catalogo");
}

/** Updates remain restricted to an already authenticated PLATFORM_ADMIN at AAL2;
 * policies and audit triggers enforce the final database authorization. */
export async function setProfileName(data:FormData) {
  const client=await authorizedClient();
  const userId=id(data,"user_id");
  const name=field(data,"display_name",160);
  if(name.length<2)throw new Error("Nome deve ter pelo menos dois caracteres.");
  await updated("profiles",client.from("profiles").update({display_name:name}).eq("id",userId).select("id"));
}
export async function setOrganizationTaxId(data:FormData) {
  const client=await authorizedClient();
  const org=id(data,"organization_id");
  const raw=data.get("tax_id");
  if(typeof raw!=="string"||raw.length>18||!/^[\d.\/-]*$/.test(raw))throw new Error("Documento inválido.");
  const taxId=raw.replace(/\D/g,"");
  if(taxId&&![11,14].includes(taxId.length))throw new Error("Informe CPF com 11 ou CNPJ com 14 dígitos.");
  const existing=await client.from("organizations").select("id,is_platform_owned").eq("id",org).maybeSingle();
  if(existing.error||!existing.data||existing.data.is_platform_owned)throw new Error("Empresa protegida ou indisponível.");
  await updated("organizations",client.from("organizations").update({tax_id:taxId||null}).eq("id",org).eq("is_platform_owned",false).select("id"));
}
export async function setMembershipRole(data:FormData) {
  const client=await authorizedClient();
  const membershipId=id(data,"membership_id");
  const role=field(data,"role",30);
  if(!enumIs(role,["ORG_ADMIN","BUYER","REQUESTER","APPROVER","FINANCE","READER","SUPPLIER_ADMIN"] as const))
    throw new Error("Função inválida.");
  const previous=await client.from("organization_members").select("role").eq("id",membershipId).maybeSingle();
  if(previous.error||!previous.data||previous.data.role==="PLATFORM_ADMIN")throw new Error("Função administrativa protegida.");
  await updated("organization_members",client.from("organization_members")
    .update({role}).eq("id",membershipId).neq("role","PLATFORM_ADMIN").select("id"));
}
