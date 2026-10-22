"use client";
import { useActionState, useState } from "react";
import { editCatalogProduct } from "@/app/admin/marketplace/cadastro/edit-actions";
import { optimizeProductImage } from "@/lib/marketplace/optimize-product-image";
import { createClient } from "@/lib/supabase/client";
const initial={status:"idle" as const,message:""};
type Product={id:string;name:string;gtin:string|null;base_unit:string};
export function ProductEditAndImage({products}:{products:Product[]}){
 const [state,action,pending]=useActionState(editCatalogProduct,initial);
 const [selected,setSelected]=useState("");
 const [message,setMessage]=useState("");
 const [uploading,setUploading]=useState(false);
 const product=products.find(x=>x.id===selected);
 async function upload(file?:File){
   if(!file||!selected)return;
   setUploading(true);setMessage("");
   try{
     const optimized=await optimizeProductImage(file);
     const db=createClient();
     const path=selected+"/"+crypto.randomUUID()+".webp";
     const {error}=await db.storage.from("provisio-produtos").upload(path,optimized,{contentType:"image/webp",upsert:false});
     if(error)throw new Error(error.message);
     const {error:metadataError}=await db.from("product_images" as "products").insert({
       product_id:selected,storage_path:path,mime_type:"image/webp",size_bytes:optimized.size
     } as never);
     if(metadataError){
       await db.storage.from("provisio-produtos").remove([path]);
       throw new Error(metadataError.message);
     }
     setMessage("Imagem WebP salva. O produto segue sujeito a homologação.");
   }catch(error){setMessage(error instanceof Error?error.message:"Falha ao enviar imagem.");}
   finally{setUploading(false);}
 }
 return <section className="mt-7 rounded-3xl border border-line bg-paper p-6 text-forest-deep">
  <h2 className="text-xl font-black">Editar produto e adicionar imagem</h2>
  <p className="mt-2 text-sm text-muted">Apenas administração com MFA. Fotos são reduzidas para até 1600 px e convertidas em WebP antes do envio.</p>
  <label className="mt-5 block text-sm font-bold">Produto
    <select className="mt-2 w-full rounded-xl border border-line bg-canvas p-3" value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="">Selecione um produto</option>{products.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
    </select>
  </label>
  {product&&<div className="mt-5 grid gap-6 md:grid-cols-2">
    <form action={action} key={selected} className="grid content-start gap-3">
      <input type="hidden" name="product_id" value={selected}/>
      <label className="text-sm font-bold">Nome<input required maxLength={160} name="name" defaultValue={product.name} className="mt-1 w-full rounded-xl border border-line p-3"/></label>
      <label className="text-sm font-bold">GTIN<input name="gtin" defaultValue={product.gtin||""} className="mt-1 w-full rounded-xl border border-line p-3"/></label>
      <label className="text-sm font-bold">Unidade<select name="base_unit" defaultValue={product.base_unit} className="mt-1 w-full rounded-xl border border-line p-3"><option value="un">Unidade</option><option value="kg">Quilograma</option><option value="l">Litro</option></select></label>
      <button disabled={pending} className="rounded-full bg-forest p-3 font-bold text-white disabled:opacity-50">{pending?"Salvando...":"Salvar alterações"}</button>
      {state.message&&<p role={state.status==="error"?"alert":"status"} className="text-sm">{state.message}</p>}
    </form>
    <div className="grid content-start gap-3">
      <label className="text-sm font-bold">Imagem do produto (JPG, PNG, WebP, AVIF, GIF ou BMP)
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp" disabled={uploading} onChange={e=>void upload(e.currentTarget.files?.[0])} className="mt-2 block w-full rounded-xl border border-line p-3"/>
      </label>
      <p className="text-xs text-muted">Arquivo original até 15 MB. A imagem otimizada é enviada a um bucket privado do Supabase Storage; o banco guarda os metadados.</p>
      {uploading&&<p role="status" className="text-sm">Convertendo e enviando imagem...</p>}
      {message&&<p role="status" className="text-sm">{message}</p>}
    </div>
  </div>}
 </section>;
}
