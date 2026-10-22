"use server";

import { revalidatePath } from "next/cache";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { createClient } from "@/lib/supabase/server";

export type CategoryFeedback={status:"idle"|"success"|"error";message:string};
const response=(status:CategoryFeedback["status"],message:string):CategoryFeedback=>({status,message});
export async function createCategory(_:CategoryFeedback,data:FormData):Promise<CategoryFeedback>{
 await requireMarketplacePortal("admin");
 const name=String(data.get("name")||"").trim();
 const slug=String(data.get("slug")||"").trim().toLowerCase();
 if(name.length<2||name.length>80||slug.length>100||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
  return response("error","Nome ou identificador inválido.");
 const client=await createClient();
 const {error}=await client.from("product_categories").insert({name,slug});
 if(error)return response("error","Não foi possível cadastrar a categoria. Confira duplicidade e permissões.");
 revalidatePath("/admin/marketplace/cadastro");
 return response("success","Categoria cadastrada. Atualize a página para ver a nova opção.");
}
export async function assignCategory(_:CategoryFeedback,data:FormData):Promise<CategoryFeedback>{
 await requireMarketplacePortal("admin");
 const product_id=String(data.get("product_id")||"");
 const category_id=String(data.get("category_id")||"");
 const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!id.test(product_id)||!id.test(category_id))return response("error","Selecione produto e categoria válidos.");
 const client=await createClient();
 const {error}=await client.from("product_category_assignments").insert({product_id,category_id});
 if(error)return response("error","Vínculo não salvo. Verifique duplicidade e permissões.");
 revalidatePath("/admin/marketplace/cadastro");
 return response("success","Categoria vinculada ao produto.");
}
