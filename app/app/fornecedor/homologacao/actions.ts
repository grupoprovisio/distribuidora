"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";

export type CompanyProfileFeedback={status:"idle"|"success"|"error";message:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const failure=(message:string):CompanyProfileFeedback=>({status:"error",message});
const validText=(value:FormDataEntryValue|null,max:number,min=0)=>{
  if(typeof value!=="string")return null;
  const normalized=value.trim().replace(/\s+/g," ");
  if(normalized.length<min||normalized.length>max||/[\u0000-\u001F\u007F]/.test(value))return null;
  return normalized;
};

/**
 * Administrator-only company name maintenance. Existing RLS and AAL2 are
 * authoritative; never use a service-role client or accept authorization fields.
 * Supplier users and other tenants cannot change their own approval or identity.
 */
export async function saveSupplierCompanyProfile(
  _previous:CompanyProfileFeedback,form:FormData
):Promise<CompanyProfileFeedback>{
  const access=await getMarketplaceAccess();
  if(!access?.allowed.includes("admin"))
    return failure("Somente um administrador da Provisio pode editar empresas.");
  const db=await createClient();
  const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error||assurance.data.currentLevel!=="aal2")
    return failure("Confirme a autenticação em duas etapas do ADM antes de editar o cadastro.");

  const rawId=form.get("organization_id");
  const organizationId=typeof rawId==="string"&&UUID.test(rawId)?rawId:null;
  const legalName=validText(form.get("legal_name"),200,2);
  const tradeName=validText(form.get("trade_name"),160);
  if(!organizationId||legalName===null||tradeName===null)
    return failure("Informe uma razão social entre 2 e 200 caracteres e um nome fantasia de até 160 caracteres.");

  const [org,cap]=await Promise.all([
    db.from("organizations").select("id,kind,status")
      .eq("id",organizationId).maybeSingle(),
    db.from("organization_capabilities").select("organization_id,capability")
      .eq("organization_id",organizationId).eq("capability","SUPPLIER").maybeSingle(),
  ]);
  if(org.error||cap.error||!org.data||!cap.data||
     !["SUPPLIER","PLATFORM_OPERATOR"].includes(org.data.kind))
    return failure("Empresa fornecedora não encontrada ou edição não autorizada.");

  // Only legal_name and trade_name may be changed. Organization status, QA realm,
  // tax ID, kind, ownership, members and commercial capabilities stay untouched.
  const result=await db.from("organizations")
    .update({legal_name:legalName,trade_name:tradeName||null})
    .eq("id",organizationId).eq("kind",org.data.kind)
    .select("id").maybeSingle();
  if(result.error||!result.data)
    return failure("Não foi possível salvar. Confira sua sessão administrativa e tente novamente.");

  revalidatePath("/app/fornecedor/homologacao");
  revalidatePath("/admin/acessos");
  revalidatePath("/admin/marketplace/cadastro");
  revalidatePath("/app/fornecedor/catalogo");
  revalidatePath("/app/comprador/catalogo");
  return {status:"success",message:"Cadastro da empresa atualizado."};
}
