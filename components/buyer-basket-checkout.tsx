"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useBuyerBasket } from "@/lib/marketplace/buyer-basket-store";
import type { BasketValidation, ValidatedBasketLine } from "@/lib/marketplace/basket-validation";
import type { BuyerContact } from "@/lib/marketplace/buyer-contact";
import { normalizeCep } from "@/lib/marketplace/buyer-contact";
import { BuyerProfileForm } from "@/components/buyer-profile-form";
import { BuyerFreightCalculator, type FreightInfo } from "@/components/buyer-freight-calculator";

type Props={userId:string;buyerOrgId:string;region:string;mode:"basket"|"checkout";initialMethod?:"delivery"|"pickup"};
type BasketResponse=BasketValidation&{id?:string;status?:string;paymentStatus?:string};
type BasketSnapshot={key:string;value:BasketValidation|null;failure?:string};
const failureText=(code?:string)=>{
  switch(code){
    case "session_expired": return "Sua sessão precisa ser renovada para consultar os valores. Os produtos continuam na cesta.";
    case "buyer_not_authorized":return "Esta conta não possui permissão de comprador para os produtos da cesta.";
    case "region_not_authorized":return "Sua empresa ainda não tem autorização para esta região de entrega.";
    case "catalog_unavailable":case "offers_unavailable":
      return "O catálogo não respondeu à consulta de preços. Tente atualizar os valores.";
    default:return "Não foi possível confirmar os preços no momento. Os produtos foram preservados.";
  }
};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const brl=(value:number)=>money.format(value/100);
const URL="/api/marketplace/baskets";
export function BuyerBasketCheckout({userId,buyerOrgId,region,mode,initialMethod="delivery"}:Props){
  const basket=useBuyerBasket(userId,buyerOrgId,region);
  const [snapshot,setSnapshot]=useState<BasketSnapshot|null>(null);
  const [refresh,setRefresh]=useState(0);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [method,setMethod]=useState<"delivery"|"pickup">(initialMethod);
  const [savedContact,setSavedContact]=useState<BuyerContact|null>(null);
  const [cep,setCep]=useState("");
  const [freight,setFreight]=useState<FreightInfo|null>(null);
  const handleSaved=useCallback((profile:BuyerContact)=>{
    setSavedContact(profile);setCep(profile.postalCode);setFreight(null);
  },[]);
  const handleEdit=useCallback(()=>{setSavedContact(null);setFreight(null);},[]);
  const handlePostal=useCallback((next:string)=>{setCep(next);setFreight(null);},[]);
  const handleFreight=useCallback((value:FreightInfo|null)=>{setFreight(value);},[]);
  const router=useRouter();
  const rows=basket.items;
  // Names/supplier labels cached for display never enter the API. The server
  // accepts only offerId+quantity, and is the sole source of pricing.
  const selected=useMemo(()=>rows.map(({offerId,quantity})=>({offerId,quantity})),[rows]);
  const serialized=JSON.stringify(selected);
  const validation=rows.length>0&&snapshot?.key===serialized?snapshot.value:null;
  const loading=rows.length>0&&snapshot?.key!==serialized;
  const validationIssue=rows.length>0&&snapshot?.key===serialized?snapshot.failure:undefined;
  useEffect(()=>{
    if(rows.length===0)return;
    const controller=new AbortController();
    void fetch(URL,{
      method:"POST",headers:{"content-type":"application/json"},
      credentials:"same-origin",cache:"no-store",signal:controller.signal,
      body:JSON.stringify({action:"validate",buyerOrgId,region,lines:selected}),
    }).then(async response=>{
      const data=await response.json() as BasketResponse;
      if(!controller.signal.aborted){
        setSnapshot({key:serialized,value:response.ok&&data.ok?data:null,
          failure:response.ok&&data.ok?undefined:
            response.status===401?"session_expired":response.status===403?"buyer_not_authorized":
            data.reason??"request_failed"});
      }
    }).catch(()=>{if(!controller.signal.aborted){
      setSnapshot({key:serialized,value:null,failure:"network_error"});
    }});
    return ()=>controller.abort();
  },[serialized,buyerOrgId,region,refresh,selected]);
  async function submit(){
    if(submitting||!validation?.ready||!validation.quoteEnabled||!selected.length)return;
    if(mode!=="checkout"||!savedContact){
      setError("Confira e salve seu cadastro de contato e endereço antes de solicitar a cotação.");
      return;
    }
    if(normalizeCep(cep)!==savedContact.postalCode){
      setError("O CEP calculado precisa ser igual ao CEP salvo no cadastro. Atualize seu endereço.");
      return;
    }
    if(method==="delivery"&&(!freight?.available||!freight.quote||
      freight.quote.state!==savedContact.state||freight.cep!==savedContact.postalCode)){
      setError("Calcule o frete para seu endereço cadastrado antes de solicitar a cotação.");
      return;
    }
    if(method==="pickup"&&!freight?.pickupAvailable){
      setError("A retirada não está disponível. Confira a unidade Provisio cadastrada.");
      return;
    }
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
        body:JSON.stringify({action:"submit",buyerOrgId,region,lines:selected,method,requestKey}),
      });
      const data=await response.json() as BasketResponse;
      if(!response.ok||!data.ok||!data.id){
        if(response.status===409||data.reason==="basket_changed")setError("Algum item mudou. Revise a cesta antes de enviar.");
        else setError("Não foi possível enviar a solicitação. Tente novamente, sem duplicar os itens.");
        return;
      }
      basket.clear();
      try{window.sessionStorage.removeItem(storageKey);}catch{}
      router.push("/app/comprador/solicitacoes?enviada="+encodeURIComponent(data.id));
    }catch{setError("Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente.");}
    finally{setSubmitting(false);}
  }
  const productsTotal=validation?.lines.some(line=>line.valid)
    ?validation.totalMinor:null;
  const shippingMinor=method==="pickup"?0:
    (freight?.available&&freight.quote&&freight.cep===normalizeCep(cep)?freight.quote.freightMinor:null);
  const total=productsTotal!==null&&shippingMinor!==null&&validation?.ready
    ?productsTotal+shippingMinor:null;
  const deliveryValid=method==="pickup"?!!freight?.pickupAvailable:
    !!(freight?.available&&freight.quote&&savedContact&&
      freight.cep===savedContact.postalCode&&freight.quote.state===savedContact.state);
  const checkoutReady=!!(mode==="checkout"&&savedContact&&
    normalizeCep(cep)===savedContact.postalCode&&deliveryValid);
  const visibleLines=useMemo(()=>{
    const byId=new Map((validation?.lines??[]).map(line=>[line.offerId,line]));
    return rows.map((cached):ValidatedBasketLine=>{
      const live=byId.get(cached.offerId);
      if(live)return {
        ...live,
        productName:live.valid?live.productName:
          cached.productName||live.productName,
        supplier:live.valid?live.supplier:cached.supplier||live.supplier,
        pack:live.valid?live.pack:cached.pack||live.pack
      };
      return {offerId:cached.offerId,quantity:cached.quantity,
        productName:cached.productName||"Produto aguardando conferência",
        supplier:cached.supplier||"",sku:"",pack:cached.pack||"",
        imageUrl:null,minQuantity:1,available:0,unitPriceMinor:0,
        subtotalMinor:0,tiers:[],valid:false,
        reason:validationIssue?failureText(validationIssue):"Consultando preço e estoque..."}
    });
  },[rows,validation,validationIssue]);
  const invalidLines=visibleLines.filter(line=>!line.valid);
  const grouped=useMemo(()=>{
    const map=new Map<string,ValidatedBasketLine[]>();
    for(const item of visibleLines){
      const seller=item.supplier||"Itens que precisam de revisão";
      const current=map.get(seller)??[];
      current.push(item);map.set(seller,current);
    }
    return [...map.entries()];
  },[visibleLines]);
  const checkoutHref="/app/comprador/checkout?regiao="+encodeURIComponent(region)+
    "&recebimento="+(method==="pickup"?"retirada":"entrega");
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
        {!loading&&validationIssue&&<div role="alert" className="rounded-2xl border border-line bg-paper p-5 text-sm text-muted">
          <p>{failureText(validationIssue)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={()=>setRefresh(x=>x+1)}
              className="min-h-10 rounded-full border border-forest px-4 text-xs font-black text-forest">
              Tentar novamente
            </button>
            {validationIssue==="session_expired"&&
              <Link href="/entrar" className="inline-flex min-h-10 items-center rounded-full bg-forest px-4 text-xs font-bold text-white">
                Entrar novamente
              </Link>}
          </div>
        </div>}
        {!loading&&validation&&invalidLines.length>0&&
          <div role="status" className="rounded-2xl border border-line bg-paper p-4 text-sm text-muted">
            <p className="font-bold text-forest-deep">
              {invalidLines.length} {invalidLines.length===1?"produto precisa":"produtos precisam"} de revisão.
            </p>
            <p className="mt-1">Os itens válidos continuam com seus preços confirmados. Você pode retirar os indisponíveis sem perder o restante da cesta.</p>
            <button type="button"
              onClick={()=>{for(const item of invalidLines)basket.setQuantity(item.offerId,0);}}
              className="mt-3 min-h-10 rounded-full border border-line px-4 text-xs font-black text-forest">
              Remover itens indisponíveis
            </button>
          </div>}
        {grouped.map(([supplier,lines])=><section key={supplier} className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-2">
            <h2 className="text-lg font-black text-forest-deep">{supplier}</h2>
            <span className="text-sm font-extrabold text-forest">
              {lines.some(line=>line.valid)?
                brl(lines.reduce((n,row)=>n+row.subtotalMinor,0)):
                "Aguardando valores"}
            </span>
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
              {item.valid?<>
                <p className="mt-2 text-sm font-black tabular-nums text-forest">{brl(item.unitPriceMinor)} / un</p>
                <p className="mt-1 text-xs font-semibold text-muted">Subtotal: <strong>{brl(item.subtotalMinor)}</strong></p>
              </>:<p className="mt-2 text-xs font-bold text-muted">
                Preço não confirmado — não incluído no subtotal
              </p>}
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
                  disabled={!item.valid||item.quantity>=item.available||item.quantity>=100000}
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
        {mode==="checkout"&&<BuyerProfileForm buyerOrgId={buyerOrgId}
           compact onSaved={handleSaved} onEdited={handleEdit}/>}
        <button type="button" onClick={()=>{if(window.confirm("Remover todos os produtos da cesta?"))basket.clear();}}
          className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-muted">
          <Trash2 size={16} aria-hidden/> Limpar cesta
        </button>
      </section>
      <aside className="sticky top-4 rounded-[1.75rem] bg-paper p-5 shadow-card ring-1 ring-line/70">
        <h2 className="text-xl font-black text-forest-deep">Resumo da cesta</h2>
        <div className="mt-5 rounded-2xl border border-line bg-canvas p-3">
          <BuyerFreightCalculator buyerOrgId={buyerOrgId}
            postalCode={cep} onPostalCodeChange={handlePostal} onQuote={handleFreight}
            method={method} onMethodChange={setMethod}
            auto={mode==="checkout"&&!!savedContact}/>
        </div>
        <dl className="mt-5 space-y-3 text-sm text-muted">
          <div className="flex justify-between"><dt>Produtos diferentes</dt><dd className="font-bold text-ink">{basket.distinctCount}</dd></div>
          <div className="flex justify-between"><dt>Unidades</dt><dd className="font-bold text-ink">{basket.count}</dd></div>
          <div className="flex justify-between gap-3">
            <dt>{validation?.ready?"Produtos":"Produtos disponíveis"}</dt>
            <dd className="font-bold text-ink">{productsTotal===null?"A confirmar":brl(productsTotal)}</dd>
          </div>
          <div className="flex justify-between"><dt>Frete</dt><dd className="font-semibold">
           {shippingMinor!==null?shippingMinor===0?"Grátis":brl(shippingMinor):"A calcular"}
          </dd></div>
        </dl>
        <div className="mt-5 flex justify-between gap-3 border-t border-line pt-4">
          <span className="font-black text-forest-deep">
            {total!==null?"Total estimado (produtos + frete)":
              validation&&!validation.ready?"Total pendente de revisão":"Total a confirmar"}
          </span>
          <strong className="text-xl font-black tabular-nums text-forest-deep">
            {total!==null?brl(total):"—"}
          </strong>
        </div>
        {mode==="checkout"&&!savedContact&&
          <p className="mt-3 text-xs font-semibold text-muted">
            Preencha e salve os dados do destinatário para prosseguir.
          </p>}
        {mode==="checkout"&&method==="delivery"&&freight?.available&&freight.quote&&
          <p className="mt-3 text-xs font-semibold text-forest">
            Entrega estimada: {freight.quote.minBusinessDays}–{freight.quote.maxBusinessDays} dias úteis.
          </p>}
        {validation?.ready&&!validation.quoteEnabled&&
          <p role="status" className="mt-4 rounded-xl bg-canvas p-3 text-xs font-semibold text-muted">
            Você pode consultar os preços, mas esta conta não está habilitada
            para enviar a cotação. Entre com uma conta de comprador autorizada.
          </p>}
        {error&&<p role="alert" className="mt-4 rounded-xl bg-sand p-3 text-sm font-semibold text-wine">{error}</p>}
        {mode==="checkout"?<button type="button" disabled={!validation?.ready||!validation.quoteEnabled||loading||submitting||!checkoutReady}
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
          O frete informado usa tarifas configuradas pela administração e o prazo é estimado.
          Nenhum pagamento é realizado nesta etapa.
        </p>
      </aside>
    </div>}
  </div>;
}
