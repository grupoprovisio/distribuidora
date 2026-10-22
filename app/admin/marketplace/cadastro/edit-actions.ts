"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
type Feedback={status:"idle"|"success"|"error";message:string};
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const result=(status:Feedback["status"],message:string):Feedback=>({status,message});
export async function editCatalogProduct(_:Feedback,data:FormData):Promise<Feedback>{
  await requireMarketplacePortal("admin");
  const product_id=String(data.get("product_id")||"");
  const name=String(data.get("name")||"").trim();
  const gtin=String(data.get("gtin")||"").trim();
  const base_unit=String(data.get("base_unit")||"");
  if(!id.test(product_id)||name.length<2||name.length>160||!["un","kg","l"].includes(base_unit)|| (gtin&&!/^\d{8,14}$/.test(gtin)))
    return result("error","Informe produto, nome, GTIN e unidade válidos.");
  const db=await createClient();
  const {data:updated,error}=await db.from("products").update({name,gtin:gtin||null,base_unit})
    .eq("id",product_id).select("id");
  if(error||!updated?.length)return result("error","Não foi possível atualizar o produto. Confira permissões e dados.");
  revalidatePath("/admin/marketplace/cadastro");
  revalidatePath("/app/fornecedor/catalogo");
  return result("success","Produto atualizado no Supabase.");
}
