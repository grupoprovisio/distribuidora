"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useBuyerBasket } from "@/lib/marketplace/buyer-basket-store";
import type { BasketValidation, ValidatedBasketLine } from "@/lib/marketplace/basket-validation";

type Props={userId:string;buyerOrgId:string;region:string;mode:"basket"|"checkout"};
type BasketResponse=BasketValidation&{id?:string;status?:string;paymentStatus?:string};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const brl=(value:number)=>money.format(value/100);
const URL="/api/marketplace/baskets";
export function BuyerBasketCheckout({userId,buyerOrgId,region,mode}:Props){
  const basket=useBuyerBasket(userId,buyerOrgId,region);
  const [validation,setValidation]=useState<BasketValidation|null>(null);
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [method,setMethod]=useState<"delivery"|"pickup">("delivery");
  const serialized=JSON.stringify(basket.items);
  const rows=useMemo(()=>basket.items,[serialized]); // stable while quantity data is unchanged
  useEffect(()=>{
    if(rows.length===0){setValidation(null);setLoading(false);return;}
    const controller=new AbortController();
    setLoading(true);
    setValidation(null);
    void fetch(URL,{
      method:"POST",headers:{"content-type":"application/json"},
      credentials:"same-origin",cache:"no-store",signal:controller.signal,
      body:JSON.stringify({action:"validate",buyerOrgId,region,lines:rows}),
    }).then(async response=>{
      const data=await response.json() as BasketResponse;
      if(!controller.signal.aborted) {
        setValidation(data.ok?data:null);
        if(!data.ok)setError("Não foi possível atualizar os valores. Verifique sua sessão ou suas permissões.");
        else setError("");
      }
    }).catch(()=>{if(!controller.signal.aborted)setError("Não foi possível consultar o catálogo. Tente novamente.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[serialized,buyerOrgId,region,rows]);
  async function submit(){
    if(submitting||!validation?.ready||!basket.items.length)return;
    setSubmitting(true);setError("");
    // Stable key across retries, but distinct baskets get different keys.
    const storageKey="provisio-rfq-idem:"+userId+":"+buyerOrgId+":"+region+":"+serialized;
    let requestKey="";
    try{requestKey=window.sessionStorage.getItem(storageKey)??"";}catch{}
    if(!/^[0-9a-f-]{36}$/i.test(requestKey)){
      requestKey=crypto.randomUUID();
      try{window.sessionStorage.setItem(storageKey,requestKey);}catch{}
    }
    try{
      const response=await fetch(URL,{
        method:"POST",headers:{"content-type":"application/json"},
        credentials:"same-origin",cache:"no-store",
        body:JSON.stringify({action:"submit",buyerOrgId,region,lines:basket.items,method,requestKey}),
      });
      const data=await response.json() as BasketResponse;
      if(!response.ok||!data.ok||!data.id){
        if(response.status===409||data.reason==="basket_changed")setError("Algum item mudou. Revise a cesta antes de enviar.");
        else setError("Não foi possível enviar a solicitação. Tente novamente, sem duplicar os itens.");
        return;
      }
      basket.clear();
      try{window.sessionStorage.removeItem(storageKey);}catch{}
      window.location.assign("/app/comprador/solicitacoes?enviada="+encodeURIComponent(data.id));
    }catch{setError("Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente.");}
    finally{setSubmitting(false);}
  }
  const total=validation?.totalMinor??0;
  const grouped=useMemo(()=>{
    const map=new Map<string,ValidatedBasketLine[]>();
    for(const item of validation?.lines??[]){
      const current=map.get(item.supplier)??[];
      current.push(item);map.set(item.supplier,current);
    }
    return [...map.entries()];
  },[validation]);
  const checkoutHref="/app/comprador/checkout?regiao="+encodeURIComponent(region);
  const catalogHref="/app/comprador/catalogo?regiao="+encodeURIComponent(region);
  return <div className="space-y-6 pb-20">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={catalogHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">
        <ArrowLeft size={18} aria-hidden/> Continuar comprando
      </Link>
      <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-4 py-2 text-sm font-black text-forest">
        <ShoppingBasket size={18} aria-hidden/>{basket.count} {basket.count===1?"unidade":"unidades"}
      </span>
    </div>
    {basket.items.length===0?<section className="rounded-3xl bg-paper p-10 text-center shadow-card">
      <ShoppingBasket className="mx-auto text-forest" size={40} aria-hidden/>
      <h2 className="mt-4 text-xl font-black text-forest-deep">Sua cesta está vazia</h2>
      <p className="mt-2 text-sm text-muted">Adicione produtos para montar sua próxima cotação.</p>
      <Link href={catalogHref} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-6 text-sm font-bold text-white">
        Ver produtos
      </Link>
    </section>:<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <section aria-label="Produtos na cesta" className="min-w-0 space-y-5">
        {loading&&<p role="status" className="rounded-2xl bg-paper p-5 text-sm text-muted">Atualizando preços e estoque...</p>}
        {!loading&&!validation&&<p role="alert" className="rounded-2xl bg-paper p-5 text-sm text-muted">Não foi possível conferir sua cesta.</p>}
        {grouped.map(([supplier,lines])=><section key={supplier} className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-2">
            <h2 className="text-lg font-black text-forest-deep">{supplier}</h2>
            <span className="text-sm font-extrabold text-forest">{brl(lines.reduce((n,row)=>n+row.subtotalMinor,0))}</span>
          </div>
          {lines.map(item=><article key={item.offerId}
            className="flex min-w-0 items-center gap-3 rounded-[1.75rem] bg-paper p-3 shadow-card ring-1 ring-line/70 sm:gap-5 sm:p-5">
            <div className="relative size-20 shrink-0 rounded-2xl bg-canvas sm:size-24">
              {item.imageUrl?<Image src={item.imageUrl} alt="" fill unoptimized sizes="96px" className="object-contain p-1"/>:
                <div className="grid h-full place-items-center"><ShoppingBasket className="text-muted" aria-hidden/></div>}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-black text-forest-deep sm:text-base">{item.productName}</h3>
              <p className="mt-1 text-xs text-muted">{item.pack}</p>
              <p className="mt-2 text-sm font-black tabular-nums text-forest">{brl(item.unitPriceMinor)} / un</p>
              <p className="mt-1 text-xs font-semibold text-muted">Subtotal: <strong>{brl(item.subtotalMinor)}</strong></p>
              {!item.valid&&<p role="alert" className="mt-1 text-xs font-bold text-wine">{item.reason}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              <div className="flex h-10 items-center rounded-full bg-lime text-forest-deep">
                <button type="button" aria-label={"Diminuir "+item.productName}
                  onClick={()=>basket.setQuantity(item.offerId,item.quantity<=item.minQuantity?0:item.quantity-1)}
                  className="grid size-9 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-forest">
                  <Minus size={16} aria-hidden/>
                </button>
                <span aria-live="polite" className="min-w-5 text-center text-sm font-black tabular-nums">{item.quantity}</span>
                <button type="button" aria-label={"Aumentar "+item.productName}
                  disabled={item.quantity>=item.available||item.quantity>=100000}
                  onClick={()=>basket.setQuantity(item.offerId,item.quantity+1)}
                  className="grid size-9 place-items-center rounded-full disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-forest">
                  <Plus size={16} aria-hidden/>
                </button>
              </div>
              <button type="button" onClick={()=>basket.setQuantity(item.offerId,0)}
                aria-label={"Remover "+item.productName} className="inline-flex min-h-9 items-center gap-1 text-xs text-muted">
                <Trash2 size={15} aria-hidden/> Remover
              </button>
            </div>
          </article>)}
        </section>)}
        <button type="button" onClick={()=>{if(window.confirm("Remover todos os produtos da cesta?"))basket.clear();}}
          className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-muted">
          <Trash2 size={16} aria-hidden/> Limpar cesta
        </button>
      </section>
      <aside className="sticky top-4 rounded-[1.75rem] bg-paper p-5 shadow-card ring-1 ring-line/70">
        <h2 className="text-xl font-black text-forest-deep">Resumo da cesta</h2>
        <dl className="mt-5 space-y-3 text-sm text-muted">
          <div className="flex justify-between"><dt>Produtos diferentes</dt><dd className="font-bold text-ink">{basket.distinctCount}</dd></div>
          <div className="flex justify-between"><dt>Unidades</dt><dd className="font-bold text-ink">{basket.count}</dd></div>
          <div className="flex justify-between"><dt>Frete</dt><dd className="font-semibold">A calcular</dd></div>
        </dl>
        <div className="mt-5 flex justify-between gap-3 border-t border-line pt-4">
          <span className="font-black text-forest-deep">Total estimado</span>
          <strong className="text-xl font-black tabular-nums text-forest-deep">{brl(total)}</strong>
        </div>
        {mode==="checkout"&&<fieldset className="mt-6 space-y-3">
          <legend className="text-sm font-extrabold text-forest-deep">Como deseja receber?</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm">
            <input type="radio" checked={method==="delivery"} onChange={()=>setMethod("delivery")} name="method"/>
            Entrega no endereço cadastrado
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm">
            <input type="radio" checked={method==="pickup"} onChange={()=>setMethod("pickup")} name="method"/>
            Retirada na Provisio
          </label>
          {method==="pickup"&&<p className="text-xs text-muted">
            O endereço e horário da retirada serão confirmados pela distribuidora.
          </p>}
        </fieldset>}
        {error&&<p role="alert" className="mt-4 rounded-xl bg-sand p-3 text-sm font-semibold text-wine">{error}</p>}
        {mode==="checkout"?<button type="button" disabled={!validation?.ready||loading||submitting}
          onClick={()=>void submit()}
          className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {submitting?"Registrando solicitação...":"Solicitar cotação"}
          {!submitting&&<ArrowRight size={18} aria-hidden/>}
        </button>:<Link href={checkoutHref} aria-disabled={!validation?.ready}
          className={"mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold "+(validation?.ready?"bg-forest text-white":"pointer-events-none bg-canvas text-muted")}>
          Revisar solicitação <ArrowRight size={18} aria-hidden/>
        </Link>}
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Os valores apresentados são estimativas. A cotação será registrada na sua conta
          e os preços finais dependerão das propostas recebidas.
          Nenhum pagamento é realizado nesta etapa.
        </p>
      </aside>
    </div>}
  </div>;
}
