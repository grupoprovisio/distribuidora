"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";

type Org = { id:string; name:string; role:string };
type Quote = {
  id:string; buyer_org_id:string; supplier_org_id:string; offer_id:string;
  quantity:number; region_code:string; status:string; created_at:string;
};
type Proposal = {
  id:string; quote_request_id:string; supplier_org_id:string;
  unit_price_minor:number; expires_at:string; status:string; created_at:string;
};
type Order = {
  id:string; buyer_org_id:string; supplier_org_id:string; quote_request_id:string;
  proposal_id:string; offer_id:string; quantity:number; region_code:string;
  unit_price_minor:number; total_price_minor:number; status:string; created_at:string;
};
type Mode = "buyer_quotes" | "supplier_quotes" | "buyer_orders" | "supplier_orders";
type PayloadResult = {ok:boolean;reason?:string;id?:string;items?:Quote[]|Order[];proposals?:Proposal[]};
const API="/api/marketplace/transactions";
const BRL=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const money=(cents:number)=>BRL.format(cents/100);
const modeParam:Record<Mode,string>={
  buyer_quotes:"quotes",supplier_quotes:"supplier_quotes",
  buyer_orders:"orders",supplier_orders:"supplier_orders",
};
const date=(v:string)=>new Date(v).toLocaleDateString("pt-BR");
const statusName=(value:string)=>({
  submitted:"Solicitada",converted:"Convertida em solicitação de pedido",
  cancelled:"Cancelada",proposed:"Proposta recebida",withdrawn:"Retirada",
  awaiting_supplier_confirmation:"Aguardando confirmação do fornecedor",
  confirmed:"Confirmado pelo fornecedor · estoque reservado",
  rejected:"Recusado pelo fornecedor",
} as Record<string,string>)[value]??"Em análise";

function parseCents(text:string) {
  const normalized=text.trim();
  if(!/^\d{1,7}([.,]\d{1,2})?$/.test(normalized)) return null;
  const [whole,decimal=""]=normalized.replace(",",".").split(".");
  const value=Number(whole)*100+Number(decimal.padEnd(2,"0"));
  return Number.isSafeInteger(value) && value>0 && value<=1000000000?value:null;
}

export function TransactionConsole({
  mode, organizations, initialOffer="",initialRegion="BR-SP",
}: {
  mode:Mode;organizations?:Org[];initialOffer?:string;initialRegion?:string;
}) {
  const [quotes,setQuotes]=useState<Quote[]>([]);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [orgId,setOrgId]=useState(organizations?.[0]?.id??"");
  const [offerId,setOfferId]=useState(initialOffer);
  const [quantity,setQuantity]=useState("1");
  const [region,setRegion]=useState(initialRegion);
  const [notes,setNotes]=useState("");
  const [priceInputs,setPriceInputs]=useState<Record<string,string>>({});
  const [validUntilInputs,setValidUntilInputs]=useState<Record<string,string>>({});
  const [requestKey,setRequestKey]=useState(() => crypto.randomUUID());
  const [pendingOperation,setPendingOperation]=useState<{
    prompt:string;payload:Record<string,unknown>;success:string;
  }|null>(null);
  const confirmButtonRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(pendingOperation)confirmButtonRef.current?.focus();},[pendingOperation]);

  const isBuyer=mode==="buyer_quotes"||mode==="buyer_orders";
  const isQuotes=mode==="buyer_quotes"||mode==="supplier_quotes";

  const refresh=useCallback(async ()=>{
    setLoading(true);
    try{
      const response=await fetch(API+"?mode="+modeParam[mode],{cache:"no-store",credentials:"same-origin"});
      const data:PayloadResult=await response.json();
      if(!response.ok||!data.ok)throw new Error("Consulta indisponível. Confirme sua sessão e suas permissões.");
      if(mode==="buyer_orders"||mode==="supplier_orders")setOrders((data.items??[]) as Order[]);
      else {
        setQuotes((data.items??[]) as Quote[]);
        setProposals(data.proposals??[]);
      }
      setError("");
    }catch {
      setError("Não foi possível consultar operações com segurança. Confirme suas permissões ou tente novamente.");
      setQuotes([]);setProposals([]);setOrders([]);
    }finally{setLoading(false);}
  },[mode]);

  useEffect(()=>{void Promise.resolve().then(refresh);},[refresh]);

  async function submit(payload:Record<string,unknown>,success:string) {
    setError("");setNotice("");setBusy(true);
    try{
      const response=await fetch(API,{
        method:"POST",headers:{"content-type":"application/json"},
        credentials:"same-origin",body:JSON.stringify(payload),
      });
      const data:PayloadResult=await response.json();
      if(!response.ok||!data.ok)throw new Error("A operação não foi concluída. Confira permissão, oferta, prazo, região e estoque; nenhuma confirmação foi registrada nesta tentativa.");
      setNotice(success+" Protocolo: "+String(data.id??"").slice(0,8)+".");
      if(payload.action==="quote"){setRequestKey(crypto.randomUUID());}
      await refresh();
    }catch {
      setError("A operação não foi confirmada. Verifique os dados e consulte a listagem antes de tentar novamente; se a conexão caiu, evite duplicar a solicitação.");
    }finally{setBusy(false);}
  }

  function createQuote(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const qty=Number(quantity);
    if(!orgId||!/^[0-9a-f-]{36}$/i.test(offerId.trim())||
      !Number.isSafeInteger(qty)||qty<1||qty>100000||!/^BR-[A-Z]{2}$/.test(region)) {
      setError("Informe empresa, código de oferta válido, quantidade inteira e UF no formato BR-SP.");return;
    }
    void submit({
      action:"quote",buyerOrgId:orgId,offerId:offerId.trim(),quantity:qty,
      region,notes:notes.trim(),idempotencyKey:requestKey,
    },"Cotação enviada ao fornecedor para análise.");
  }

  function propose(quoteId:string) {
    const price=parseCents(priceInputs[quoteId]??"");
    const day=validUntilInputs[quoteId];
    if(price===null||!day||isNaN(Date.parse(day))) {
      setError("Informe preço em reais (até duas casas decimais) e prazo válido.");return;
    }
    void submit({action:"proposal",quoteRequestId:quoteId,priceMinor:price,
      expiresAt:new Date(day+"T23:59:59").toISOString()},"Proposta registrada para o comprador.");
  }

  function checkout(quote:Quote,proposal:Proposal){
    setPendingOperation({
      prompt:"Enviar solicitação de pedido ao fornecedor? Não há pagamento, emissão fiscal ou reserva de estoque.",
      payload:{action:"checkout",buyerOrgId:quote.buyer_org_id,
        quoteRequestId:quote.id,proposalId:proposal.id,idempotencyKey:quote.id},
      success:"Solicitação de pedido registrada, aguardando confirmação do fornecedor.",
    });
  }

  function transition(order:Order,action:"supplier_confirm"|"supplier_reject"|"supplier_cancel"|"buyer_cancel"){
    const copy:Record<typeof action,string>={
      supplier_confirm:"Confirmar o pedido e reservar unidades do estoque? Não há pagamento nem expedição.",
      supplier_reject:"Recusar esta solicitação de pedido?",
      supplier_cancel:"Cancelar o pedido confirmado e liberar a reserva de estoque?",
      buyer_cancel:"Cancelar esta solicitação antes da confirmação do fornecedor?",
    };
    const success:Record<typeof action,string>={
      supplier_confirm:"Pedido confirmado e unidades reservadas no estoque.",
      supplier_reject:"Solicitação recusada, sem reserva de estoque.",
      supplier_cancel:"Pedido cancelado e reserva de estoque liberada.",
      buyer_cancel:"Solicitação cancelada antes da confirmação.",
    };
    setPendingOperation({
      prompt:copy[action],
      payload:{action:"order_transition",transition:action,orderId:order.id},
      success:success[action],
    });
  }

  const label="block text-sm font-extrabold text-forest-deep";
  const field="mt-2 min-h-12 w-full rounded-xl border border-line bg-canvas px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-forest";
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lime-soft p-4 text-sm text-forest">
      <p className="flex items-center gap-2"><ShieldCheck size={18} aria-hidden /> Registros reais com permissão por empresa. <strong>Confirmação do fornecedor reserva estoque; não há cobrança, nota fiscal nem expedição automática.</strong></p>
      <button type="button" disabled={loading||busy} onClick={()=>void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 text-sm font-extrabold text-white disabled:opacity-50"><RefreshCw size={17} aria-hidden/> Atualizar</button>
    </div>
    {pendingOperation&&<section role="group" aria-labelledby="transaction-confirm-title"
      className="rounded-2xl border border-terra/30 bg-sand p-5">
      <h3 id="transaction-confirm-title" className="text-base font-black text-forest-deep">Confirmar operação comercial</h3>
      <p className="mt-2 text-sm leading-relaxed text-forest" role="status">{pendingOperation.prompt}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button ref={confirmButtonRef} type="button" disabled={busy} onClick={()=>{
          const operation=pendingOperation;setPendingOperation(null);
          void submit(operation.payload,operation.success);
        }} className="min-h-11 rounded-full bg-forest px-5 text-sm font-extrabold text-white hover:bg-forest-deep focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-50">
          Confirmar operação
        </button>
        <button type="button" disabled={busy} onClick={()=>setPendingOperation(null)}
          className="min-h-11 rounded-full border border-line bg-paper px-5 text-sm font-extrabold text-forest focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-50">
          Voltar sem alterar
        </button>
      </div>
    </section>}
    {error&&<p role="alert" className="rounded-xl bg-sand p-4 text-sm font-bold text-forest-deep">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-lime-soft p-4 text-sm font-bold text-forest-deep">{notice}</p>}

    {mode==="buyer_quotes"&&<section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-8">
      <h2 className="text-xl font-black text-forest-deep">Solicitar cotação de uma oferta homologada</h2>
      <p className="mt-2 text-sm text-muted">Use o botão de cotação dentro do catálogo autorizado para preencher a oferta automaticamente. O banco verifica a empresa, a UF, a vigência e o fornecedor novamente.</p>
      <Link href="/app/comprador/catalogo" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">Ver catálogo autorizado <ArrowRight size={16} aria-hidden/></Link>
      <form onSubmit={createQuote} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>Empresa compradora
          <select required value={orgId} onChange={e=>setOrgId(e.target.value)} className={field}>
            {(organizations??[]).length===0?<option value="">Nenhuma empresa autorizada</option>:(organizations??[]).map(org=><option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        </label>
        <label className={label}>UF de entrega autorizada
          <input required value={region} maxLength={5} pattern="BR-[A-Z]{2}" onChange={e=>setRegion(e.target.value.toUpperCase())} placeholder="BR-SP" className={field}/>
        </label>
        <label className={label+" sm:col-span-2"}>ID da oferta
          <input required value={offerId} maxLength={36} onChange={e=>setOfferId(e.target.value)} placeholder="Selecione uma oferta no catálogo" className={field}/>
        </label>
        <label className={label}>Quantidade
          <input required min={1} max={100000} step={1} inputMode="numeric" type="number" value={quantity} onChange={e=>setQuantity(e.target.value)} className={field}/>
        </label>
        <label className={label+" sm:col-span-2"}>Observações (opcional)
          <textarea maxLength={1000} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className={field+" py-3"} />
        </label>
        <div className="sm:col-span-2">
          <button disabled={busy||loading||!organizations?.length} type="submit" className="min-h-12 rounded-full bg-forest px-6 text-sm font-extrabold text-white disabled:opacity-50">Solicitar cotação</button>
        </div>
      </form>
    </section>}

    <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-8">
      <h2 className="text-xl font-black text-forest-deep">{isQuotes?(isBuyer?"Minhas cotações":"Cotações recebidas"):(isBuyer?"Solicitações de pedido":"Pedidos para minha operação")}</h2>
      <p className="mt-2 text-sm text-muted">Últimos registros visíveis pelas permissões da sua empresa. Nenhuma informação de outra organização é compartilhada.</p>
      {loading?<p role="status" className="mt-5 text-sm text-muted">Consultando registros autorizados...</p>
      :isQuotes?(quotes.length?<ul className="mt-6 space-y-3">{quotes.map(quote=>{
        const proposal=proposals.find(p=>p.quote_request_id===quote.id && p.status==="proposed");
        return <li key={quote.id} className="rounded-2xl border border-line bg-canvas p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-black text-forest-deep">Cotação #{quote.id.slice(0,8)}</p>
            <span className="text-xs font-extrabold text-forest">{statusName(quote.status)}</span>
          </div>
          <p className="mt-2 text-sm text-muted">Quantidade: {quote.quantity} · UF: {quote.region_code} · {date(quote.created_at)}</p>
          <p className="mt-2 break-all text-xs text-muted">Oferta: {quote.offer_id}</p>
          {proposal?<div className="mt-4 rounded-xl bg-lime-soft p-4 text-sm text-forest">
            <strong>Proposta: {money(proposal.unit_price_minor)} por unidade</strong>
            <p className="mt-1">Total proposto: {money(proposal.unit_price_minor*quote.quantity)} · Válida até {date(proposal.expires_at)}</p>
          </div>:<p className="mt-3 text-sm text-muted">Aguardando proposta do fornecedor.</p>}
          {mode==="buyer_quotes" && quote.status==="submitted" && proposal &&
            <button type="button" disabled={busy}
            onClick={()=>checkout(quote,proposal)} className="mt-4 min-h-11 rounded-full bg-forest px-5 text-sm font-extrabold text-white disabled:opacity-50">Solicitar pedido sem pagamento</button>}
          {mode==="supplier_quotes"&&!proposal&&quote.status==="submitted"&&<div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className={label}>Preço unitário (R$)
              <input inputMode="decimal" placeholder="Ex.: 25,90" value={priceInputs[quote.id]??""} onChange={e=>setPriceInputs(prev=>({...prev,[quote.id]:e.target.value}))} className={field}/>
            </label>
            <label className={label}>Proposta válida até
              <input type="date" value={validUntilInputs[quote.id]??""} onChange={e=>setValidUntilInputs(prev=>({...prev,[quote.id]:e.target.value}))} className={field}/>
            </label>
            <div className="sm:col-span-2"><button type="button" disabled={busy} onClick={()=>propose(quote.id)} className="min-h-11 rounded-full bg-forest px-5 text-sm font-extrabold text-white disabled:opacity-50">Enviar proposta</button></div>
          </div>}
        </li>;
      })}</ul>:<p role="status" className="mt-6 rounded-2xl bg-canvas p-7 text-sm text-muted">Nenhuma cotação disponível para seu perfil no momento.</p>)
      :(orders.length?<ul className="mt-6 space-y-3">{orders.map(order=><li key={order.id} className="rounded-2xl border border-line bg-canvas p-5">
        <div className="flex flex-wrap justify-between gap-3"><strong className="text-forest-deep">Pedido #{order.id.slice(0,8)}</strong><span className="text-xs font-extrabold text-forest">{statusName(order.status)}</span></div>
        <p className="mt-3 text-sm text-muted">Quantidade: {order.quantity} · UF: {order.region_code} · Data: {date(order.created_at)}</p>
        <p className="mt-2 font-black text-forest-deep">{money(order.total_price_minor)}</p>
        <p className="mt-2 text-xs text-muted">Sem pagamento, emissão fiscal ou expedição. Estoque é reservado somente após confirmação do fornecedor.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {mode==="supplier_orders"&&order.status==="awaiting_supplier_confirmation"&&<>
            <button type="button" disabled={busy} onClick={()=>transition(order,"supplier_confirm")} className="min-h-11 rounded-full bg-forest px-5 text-sm font-extrabold text-white disabled:opacity-50">Confirmar e reservar</button>
            <button type="button" disabled={busy} onClick={()=>transition(order,"supplier_reject")} className="min-h-11 rounded-full border border-line px-5 text-sm font-extrabold text-forest disabled:opacity-50">Recusar solicitação</button>
          </>}
          {mode==="supplier_orders"&&order.status==="confirmed"&&
            <button type="button" disabled={busy} onClick={()=>transition(order,"supplier_cancel")} className="min-h-11 rounded-full border border-line px-5 text-sm font-extrabold text-forest disabled:opacity-50">Cancelar e liberar estoque</button>}
          {mode==="buyer_orders"&&order.status==="awaiting_supplier_confirmation"&&
            <button type="button" disabled={busy} onClick={()=>transition(order,"buyer_cancel")} className="min-h-11 rounded-full border border-line px-5 text-sm font-extrabold text-forest disabled:opacity-50">Cancelar solicitação</button>}
        </div>
      </li>)}</ul>:<p role="status" className="mt-6 rounded-2xl bg-canvas p-7 text-sm text-muted">Nenhuma solicitação de pedido encontrada.</p>)}
    </section>
  </div>;
}
