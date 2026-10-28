"use client";

import {useActionState,useState,useEffect,useRef} from "react";
import {createClient} from "@/lib/supabase/client";
import {optimizeProductImage} from "@/lib/marketplace/optimize-product-image";
import {publishCommercialBatch} from "@/app/admin/marketplace/cadastro/bulk-publish";
import {saveCommercialBatch,type BulkResult} from "@/app/admin/marketplace/cadastro/bulk-actions";

type Supplier={id:string;label:string};
type Product={name:string;gtin:string;sku:string;unit:string;pack:string;stock:string;price:string;minimum:string};
const empty=():Product=>({name:"",gtin:"",sku:"",unit:"un",pack:"1",stock:"0",price:"",minimum:"1"});
const initial:BulkResult={status:"idle",message:"",details:[],created:[]};
export function CommercialBatchForm({suppliers}:{suppliers:Supplier[]}){
  const [rows,setRows]=useState<Product[]>([empty()]);
  const [state,action,pending]=useActionState(saveCommercialBatch,initial);
  const [photos,setPhotos]=useState<Record<number,File>>({});
  const [uploading,setUploading]=useState(false);
  const [uploadMessages,setUploadMessages]=useState<string[]>([]);
  const processed=useRef<BulkResult["created"]|null>(null);
  useEffect(()=>{
    if(state.status==="idle"||!state.created.length||processed.current===state.created)return;
    processed.current=state.created;
    let alive=true;
    async function process(){
      setUploading(true);
      const db=createClient();const errors:string[]=[];const eligible:string[]=[];
      for(const entry of state.created){
        const file=photos[entry.index];
        if(!file){errors.push("Produto "+(entry.index+1)+": falta foto. Não publicado.");continue;}
        let path="";
        try{
          const optimized=await optimizeProductImage(file);
          path=entry.productId+"/"+crypto.randomUUID()+".webp";
          const up=await db.storage.from("provisio-produtos").upload(path,optimized,{contentType:"image/webp",cacheControl:"3600",upsert:false});
          if(up.error)throw new Error("upload recusado");
          const saved=await db.from("product_images").insert({product_id:entry.productId,storage_path:path,mime_type:"image/webp",size_bytes:optimized.size});
          if(saved.error){await db.storage.from("provisio-produtos").remove([path]);throw new Error("vínculo da imagem recusado");}
          eligible.push(entry.productId);
        }catch(e){errors.push("Produto "+(entry.index+1)+": "+(e instanceof Error?e.message:"erro na foto"));}
      }
      if(eligible.length){
        try{
          const result=await publishCommercialBatch(eligible);
          errors.unshift(result.published+" produtos publicados na vitrine.");
          errors.push(...result.errors);
        }catch{errors.push("Não foi possível concluir a publicação. Confira o MFA e as permissões.");}
      }
      if(alive){setUploadMessages(errors);setUploading(false);}
    }
    void process();
    return ()=>{alive=false;};
  },[state,photos]);
  const [supplier,setSupplier]=useState("");
  const [uf,setUf]=useState("SP");
  const [approve,setApprove]=useState(true);
  function update(index:number,key:keyof Product,value:string){
    setRows(old=>old.map((r,i)=>i===index?{...r,[key]:value}:r));
  }
  const input="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-forest-deep";
  return <section className="mt-8 rounded-[2rem] border border-line bg-paper p-5 sm:p-7" aria-labelledby="batch-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-widest text-terra">Cadastro simplificado</p>
        <h2 id="batch-heading" className="mt-2 text-2xl font-black text-forest-deep">Cadastrar até 15 produtos de uma vez</h2>
        <p className="mt-2 text-sm text-muted">Um único formulário e um único envio. Fornecedor e região são compartilhados por todos os itens.</p></div>
      <span className="rounded-full bg-lime-soft px-4 py-2 text-sm font-bold text-forest">{rows.length}/15 produtos</span>
    </div>
    <form action={action} className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Fornecedor autorizado
          <select className={input+" mt-2"} name="supplier" value={supplier} onChange={e=>setSupplier(e.target.value)} required>
            <option value="">Selecione o fornecedor</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select></label>
        <label className="text-sm font-bold">Estado de atendimento (UF)
          <select className={input+" mt-2"} name="uf" value={uf} onChange={e=>setUf(e.target.value)}>
            {["SP","RJ","MG","ES","PR","SC","RS","DF","GO","MS","MT","BA","SE","AL","PE","PB","RN","CE","PI","MA","PA","AP","AM","RR","RO","AC","TO"].map(x=><option key={x}>{x}</option>)}
          </select></label>
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-lime-soft p-4 text-sm font-semibold text-forest">
        <input type="checkbox" name="approve" checked={approve} onChange={e=>setApprove(e.target.checked)} className="mt-1"/>
        Homologar automaticamente os produtos, SKUs e ofertas deste lote. Desmarque para salvar como rascunho. Com foto válida, o sistema tentará publicar os produtos após a homologação.
      </label>
      <input type="hidden" name="items" value={JSON.stringify(rows.map(r=>({
        name:r.name,gtin:r.gtin,sku:r.sku,unit:r.unit,pack:Number(r.pack),
        stock:Number(r.stock),price:Math.round(Number(r.price.replace(",","."))*100),minimum:Number(r.minimum)
      })))}/>
      <div className="space-y-4">{rows.map((r,i)=><fieldset key={i} className="rounded-2xl border border-line p-4">
        <legend className="px-2 font-black text-forest-deep">Produto {i+1}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([{key:"name",label:"Nome do produto",span:true,required:true},{key:"sku",label:"SKU do fornecedor",required:true},
            {key:"gtin",label:"GTIN (opcional)"},{key:"pack",label:"Quantidade na embalagem",required:true},
            {key:"stock",label:"Estoque disponível",required:true},{key:"price",label:"Preço unitário (R$)",required:approve},
            {key:"minimum",label:"Pedido mínimo",required:approve}] as {key:keyof Product;label:string;span?:boolean;required?:boolean}[]).map(f=>
            <label key={f.key} className={"text-xs font-bold "+(f.span?"sm:col-span-2":"")}>{f.label}
              <input className={input+" mt-1"} type="text" value={r[f.key]} required={f.required} onChange={e=>update(i,f.key,e.target.value)}
                inputMode={["pack","stock","price","minimum"].includes(f.key)?"decimal":"text"}/></label>)}
          <label className="text-xs font-bold">Unidade
            <select className={input+" mt-1"} value={r.unit} onChange={e=>update(i,"unit",e.target.value)}>
              <option value="un">Unidade</option><option value="kg">Quilograma</option><option value="l">Litro</option>
            </select></label>
          <label className="text-xs font-bold sm:col-span-2">Foto do produto (JPG, PNG ou WebP, convertida para WebP)
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif"
             className={input+" mt-1"} onChange={e=>{const f=e.target.files?.[0];if(f)setPhotos(old=>({...old,[i]:f}));}}/>
          </label>
        </div>
        {rows.length>1&&<button type="button" onClick={()=>{setRows(old=>old.filter((_,index)=>index!==i));setPhotos(old=>{const next:Record<number,File>={};Object.entries(old).forEach(([k,v])=>{const n=Number(k);if(n<i)next[n]=v;else if(n>i)next[n-1]=v;});return next;});}}
          className="mt-3 text-sm font-bold text-terra hover:underline">Remover produto {i+1}</button>}
      </fieldset>)}</div>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={rows.length>=15} onClick={()=>setRows(old=>[...old,empty()])}
          className="rounded-xl border border-forest px-5 py-3 text-sm font-bold text-forest disabled:opacity-40">+ Adicionar produto</button>
        <button type="submit" disabled={pending||uploading||!supplier}
          className="rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {pending?"Salvando lote...":approve?"Cadastrar e homologar lote":"Salvar lote como rascunho"}
        </button>
      </div>
      {uploading&&<p role="status" className="font-bold text-forest">Enviando as fotos e publicando os produtos aprovados…</p>}
      {!!uploadMessages.length&&<div role="status" className="rounded-xl border border-line p-4 text-sm"><strong>Resultado da publicação</strong><ul className="mt-2 list-disc pl-5">{uploadMessages.map((m,i)=><li key={i}>{m}</li>)}</ul></div>}
      {state.status!=="idle"&&<div role="status" className="rounded-xl border border-line p-4 text-sm">
        <p className="font-bold">{state.message}</p>
        {!!state.details.length&&<ul className="mt-2 list-disc space-y-1 pl-5">{state.details.map((d,i)=><li key={i}>{d}</li>)}</ul>}
      </div>}
    </form>
  </section>;
}
