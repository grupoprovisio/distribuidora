"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";

export type ReviewFeedback={status:"idle"|"success"|"error";message:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const error=(message:string):ReviewFeedback=>({status:"error",message});
export async function reviewSupplierSubmission(_previous:ReviewFeedback,data:FormData):Promise<ReviewFeedback>{
 await requireMarketplacePortal("admin");
 const id=String(data.get("submission_id")||"");
 const decision=String(data.get("decision")||"");
 const slug=String(data.get("slug")||"").trim().toLowerCase();
 const gtin=String(data.get("gtin")||"").trim();
 if(!UUID.test(id))return error("Selecione uma solicitação válida.");
 const db=await createClient();
 if(decision==="reject"){
  const {data:rows,error:reason}=await db.from("supplier_product_submissions")
    .update({status:"rejected"}).eq("id",id).eq("status","pending").select("id");
  if(reason||!rows?.length)return error("Solicitação não rejeitada. Verifique a sessão, a permissão e a situação atual.");
  revalidatePath("/admin/marketplace/solicitacoes");
  revalidatePath("/app/fornecedor/catalogo");
  return {status:"success",message:"Solicitação rejeitada. Nenhum produto comercial foi criado."};
 }
 if(decision!=="approve"||!slug||slug.length>120||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
    ||(gtin&&!/^[0-9]{8,14}$/.test(gtin)))return error("Informe slug válido e, se houver, GTIN de 8 a 14 dígitos.");
 const {data:created,error:reason}=await db.rpc("promote_supplier_submission",{
  p_submission:id,p_slug:slug,p_gtin:gtin||null
 } as never);
 if(reason||!created)return error("Não foi possível promover a solicitação. Verifique duplicidade, fornecedor e migrations.");
 revalidatePath("/admin/marketplace/solicitacoes");
 revalidatePath("/admin/marketplace/cadastro");
 revalidatePath("/app/fornecedor/catalogo");
 return {status:"success",message:"Produto mestre em rascunho, SKU e oferta pendentes criados. Ative e homologue antes de publicar."};
}
