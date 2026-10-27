"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { editCatalogProduct } from "@/app/admin/marketplace/cadastro/edit-actions";
import { setPublicProductListing } from "@/app/admin/marketplace/cadastro/actions";
import { optimizeProductImage } from "@/lib/marketplace/optimize-product-image";
import { createClient } from "@/lib/supabase/client";

const initial={status:"idle" as const,message:""};
type Product={id:string;name:string;gtin:string|null;base_unit:string};
type ImageEntry={id:string;src:string};

function ProductImageManager({product}:{product:Product}){
 const db=useMemo(()=>createClient(),[]);
 const [files,setFiles]=useState<ImageEntry[]>([]);
 const [loading,setLoading]=useState(true);
 const [uploading,setUploading]=useState(false);
 const [message,setMessage]=useState("");
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  let alive=true;
  void db.from("product_images").select("id,storage_path").eq("product_id",product.id)
    .order("created_at",{ascending:false}).limit(12)
    .then(async ({data,error})=>{
      if(error){if(alive){setFiles([]);setMessage("Não foi possível carregar as imagens cadastradas.");setLoading(false);}return;}
      const signed=await Promise.all((data??[]).map(async row=>{
        const result=await db.storage.from("provisio-produtos").createSignedUrl(row.storage_path,15*60);
        return result.data?.signedUrl?{id:row.id,src:result.data.signedUrl}:null;
      }));
      if(alive){setFiles(signed.filter((entry):entry is ImageEntry=>entry!==null));setLoading(false);}
    });
  return ()=>{alive=false;};
 },[db,product.id,version]);
 async function upload(file?:File){
  if(!file||uploading)return;
  setUploading(true);setMessage("");
  try{
   const optimized=await optimizeProductImage(file);
   const path=product.id+"/"+crypto.randomUUID()+".webp";
   const result=await db.storage.from("provisio-produtos")
      .upload(path,optimized,{contentType:"image/webp",cacheControl:"3600",upsert:false});
   if(result.error)throw new Error("O armazenamento não aceitou a imagem. Confira o bucket privado e seu MFA.");
   const metadata=await db.from("product_images").insert({
    product_id:product.id,storage_path:path,mime_type:"image/webp",size_bytes:optimized.size
   });
   if(metadata.error){
    await db.storage.from("provisio-produtos").remove([path]);
    throw new Error("O arquivo não pôde ser vinculado ao produto. O envio foi revertido.");
   }
   setMessage("Imagem redimensionada, convertida e salva em WebP no Storage da Provisio.");
   setLoading(true);
   setVersion(current=>current+1);
  }catch(error){setMessage(error instanceof Error?error.message:"Falha ao preparar imagem.");}
  finally{setUploading(false);}
 }
 return <div className="grid content-start gap-3">
  <label className="text-sm font-bold text-forest">Foto do produto (JPG, PNG, WebP, AVIF, GIF ou BMP)
   <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp"
    disabled={uploading} onChange={e=>{void upload(e.currentTarget.files?.[0]);e.currentTarget.value="";}}
    className="mt-2 block min-h-11 w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm
     file:mr-3 file:rounded-full file:border-0 file:bg-forest file:px-3 file:py-2 file:text-white"/>
  </label>
  <p className="text-xs leading-relaxed text-muted">Máximo original: 15 MB. A imagem final tem até 1600 px e 5 MB, no formato WebP. Arquivos ficam em armazenamento privado, não diretamente na tabela.</p>
  {uploading&&<p role="status" className="text-sm text-forest">Otimizando e enviando…</p>}
  {message&&<p role="status" className="text-sm text-forest">{message}</p>}
  <div className="min-h-24">
   <h3 className="text-sm font-bold text-forest-deep">Imagens cadastradas</h3>
   {loading?<p role="status" className="mt-2 text-sm text-muted">Carregando imagens…</p>:
    files.length?<ul className="mt-3 grid grid-cols-3 gap-2">
     {files.map((entry,index)=><li key={entry.id} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-canvas">
      <Image src={entry.src} alt={product.name+" — imagem "+(index+1)} fill sizes="(max-width:768px) 30vw, 120px" unoptimized className="object-contain"/>
     </li>)}
    </ul>:<p className="mt-2 text-sm text-muted">Nenhuma imagem vinculada a este produto.</p>}
  </div>
 </div>;
}
export function ProductEditAndImage({products,publicListingIds}:{
  products:Product[];publicListingIds:string[];
}){
 const router=useRouter();
 const [state,action,pending]=useActionState(editCatalogProduct,initial);
 const [publication,publicationAction,publicationPending]=useActionState(setPublicProductListing,initial);
 const [selected,setSelected]=useState("");
 const product=products.find(p=>p.id===selected);
 const isPublic=selected!==""&&publicListingIds.includes(selected);
 useEffect(()=>{
   if(publication.status==="success")router.refresh();
 },[publication.status,router]);
 return <section className="mt-7 rounded-3xl border border-line bg-paper p-6 text-forest-deep">
  <h2 className="text-xl font-black">Editar produtos e fotos</h2>
  <p className="mt-2 text-sm text-muted">Somente Administração com MFA. A imagem é convertida para WebP antes de sair do navegador.</p>
  <label className="mt-5 block text-sm font-bold text-forest">Produto
   <select className="mt-2 min-h-12 w-full rounded-xl border border-line bg-canvas p-3"
    value={selected} onChange={e=>setSelected(e.target.value)}>
    <option value="">Selecione um produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select>
  </label>
  {product&&<div className="mt-5 grid gap-6 md:grid-cols-2">
   <form action={action} key={"edit:"+product.id} className="grid content-start gap-3">
    <input type="hidden" name="product_id" value={product.id}/>
    <label className="text-sm font-bold text-forest">Nome comercial
     <input required maxLength={160} name="name" defaultValue={product.name} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-canvas p-3"/></label>
    <label className="text-sm font-bold text-forest">GTIN/EAN
     <input name="gtin" defaultValue={product.gtin||""} inputMode="numeric" maxLength={14} pattern="[0-9]{8,14}" className="mt-1 min-h-12 w-full rounded-xl border border-line bg-canvas p-3"/></label>
    <label className="text-sm font-bold text-forest">Unidade
     <select name="base_unit" defaultValue={product.base_unit} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-canvas p-3">
      <option value="un">Unidade</option><option value="kg">Quilograma</option><option value="l">Litro</option>
     </select></label>
    <button disabled={pending} className="min-h-12 rounded-full bg-forest p-3 font-bold text-white disabled:opacity-50">
      {pending?"Salvando…":"Salvar alterações"}
    </button>
    {state.message&&<p role={state.status==="error"?"alert":"status"} className="text-sm">{state.message}</p>}
   </form>
   <ProductImageManager key={"images:"+product.id} product={product}/>
  </div>}
  {product&&<div className="mt-5 rounded-2xl border border-line bg-canvas p-4">
    <h3 className="text-sm font-black text-forest-deep">Publicação na vitrine pública</h3>
    <p className="mt-2 text-xs leading-relaxed text-muted">
      {isPublic?"Publicado na vitrine.":"Ainda não publicado na vitrine."}
      {" "}Somente o ADM com MFA pode publicar a foto escolhida. Produtos de teste/não comerciais
      não devem ser divulgados. A oferta continua sujeita a estoque, vigência e homologação.
    </p>
    <form action={publicationAction} className="mt-3 flex flex-wrap gap-2">
      <input type="hidden" name="product_id" value={product.id}/>
      <button type="submit" name="publication_action" value="publish" disabled={publicationPending}
        className="min-h-11 rounded-full bg-forest px-4 text-xs font-bold text-white disabled:opacity-50">
        {isPublic?"Atualizar foto pública":"Publicar produto e foto"}
      </button>
      {isPublic&&<button type="submit" name="publication_action" value="unpublish" disabled={publicationPending}
        className="min-h-11 rounded-full border border-wine px-4 text-xs font-bold text-wine disabled:opacity-50">
        Retirar da vitrine
      </button>}
    </form>
    {publication.message&&<p role={publication.status==="error"?"alert":"status"}
      className="mt-3 text-xs font-bold text-forest">{publication.message}</p>}
  </div>}
 </section>;
}
