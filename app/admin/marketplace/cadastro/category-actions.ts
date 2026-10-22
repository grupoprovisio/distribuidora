"use server";
import { revalidatePath } from "next/cache";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { createClient } from "@/lib/supabase/server";
export type CategoryFeedback={status:"idle"|"success"|"error";message:string};
const feedback=(status:CategoryFeedback["status"],message:string):CategoryFeedback=>({status,message});
export async function createCategory(_:CategoryFeedback,form:FormData):Promise<CategoryFeedback>{
 await requireMarketplacePortal("admin");
 const name=String(form.get("name")||"").trim().slice(0,81);
 const slug=String(form.get("slug")||"").trim().toLowerCase().slice(0,101);
 if(name.length<2||name.length>80||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return feedback("error","Nome ou identificador invalido.");
 const db=await createClient();
 const {error}=await db.from("product_categories" as "products").insert({name,slug} as never);
 if(error)return feedback("error","Nao foi possivel criar a categoria. Verifique se a migracao foi aplicada e se voce possui acesso.");
 revalidatePath("/admin/marketplace/cadastro");
 return feedback("success","Categoria cadastrada.");
}
export async function assignCategory(_:CategoryFeedback,form:FormData):Promise<CategoryFeedback>{
 await requireMarketplacePortal("admin");
 const product_id=String(form.get("product_id")||"");
 const category_id=String(form.get("category_id")||"");
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
 if(!uuid.test(product_id)||!uuid.test(category_id))return feedback("error","Selecione categoria e produto validos.");
 const db=await createClient();
 const {error}=await db.from("product_category_assignments" as "products").insert({product_id,category_id} as never);
 if(error)return feedback("error","Nao foi possivel vincular a categoria. Verifique permissao ou duplicidade.");
 revalidatePath("/admin/marketplace/cadastro");
 return feedback("success","Categoria vinculada ao produto.");
}
