"use server";
import {revalidatePath} from "next/cache";
import {requireMarketplacePortal} from "@/lib/marketplace/session";
import {createClient} from "@/lib/supabase/server";
export type PublishResult={published:number;errors:string[]};
export async function publishCommercialBatch(ids:string[]):Promise<PublishResult>{
 await requireMarketplacePortal("admin");
 if(!Array.isArray(ids)||ids.length<1||ids.length>15||new Set(ids).size!==ids.length||
 ids.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))throw new Error("Lote inválido.");
 const db=await createClient();const errors:string[]=[];let published=0;
 for(const id of ids){
  const product=await db.from("products").select("id,name,status").eq("id",id).maybeSingle();
  if(product.error||!product.data||product.data.status!=="active"||/^\s*\[(TESTE|QA)[^\]]*\]/i.test(product.data.name)||/N[AÃ]O COMERCIAL/i.test(product.data.name)){
   errors.push(id+": produto inativo ou não comercial.");continue;
  }
  const image=await db.from("product_images").select("storage_path").eq("product_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(image.error||!image.data?.storage_path){errors.push(product.data.name+": foto WebP obrigatória.");continue;}
  const sku=await db.from("supplier_products").select("id").eq("product_id",id).eq("status","approved").limit(20);
  if(sku.error||!sku.data?.length){errors.push(product.data.name+": SKU não homologado.");continue;}
  const skuIds=sku.data.map(s=>s.id);
  const offers=await db.from("offers").select("id,supplier_product_id").in("supplier_product_id",skuIds).eq("status","approved").lte("valid_from",new Date().toISOString());
  if(offers.error||!offers.data?.length){errors.push(product.data.name+": oferta não aprovada.");continue;}
  const inventory=await db.from("inventory_positions").select("supplier_product_id,available_quantity,reserved_quantity").in("supplier_product_id",offers.data.map(o=>o.supplier_product_id));
  if(inventory.error||!inventory.data?.some(x=>Number(x.available_quantity)>Number(x.reserved_quantity))){errors.push(product.data.name+": sem estoque disponível.");continue;}
  const result=await db.from("public_catalog_listings").upsert({product_id:id,image_storage_path:image.data.storage_path},{onConflict:"product_id"}).select("product_id");
  if(result.error||!result.data?.length){errors.push(product.data.name+": publicação não autorizada.");continue;}
  published++;
 }
 revalidatePath("/produtos");revalidatePath("/admin/marketplace/cadastro");
 return {published,errors};
}
