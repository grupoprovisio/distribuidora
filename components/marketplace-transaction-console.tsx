"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleAlert, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

type Org={id:string;name:string};
type Quote={id:string;buyer_org_id:string;supplier_org_id:string;offer_id:string;quantity:number;region_code:string;status:string;created_at:string};
type Proposal={id:string;quote_request_id:string;supplier_org_id:string;unit_price_minor:number;expires_at:string;status:string};
type Order={id:string;buyer_org_id:string;supplier_org_id:string;quantity:number;region_code:string;unit_price_minor:number;total_price_minor:number;status:string;created_at:string};
type JsonResult={ok:boolean;reason?:string;id?:string;items?:Quote[]|Order[];proposals?:Proposal[]};
type Mode="buyer-quotes"|"buyer-orders"|"supplier-quotes"|"supplier-orders";
type Props={mode:Mode;organizations:Org[];initialOffer?:string;initialRegion?:string};
const uuid=/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const real=(minor:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(minor/100);
const status:Record<string,string>={submitted:"Aguardando proposta",converted:"Convertida em solicitação de pedido",cancelled:"Cancelada",proposed:"Proposta recebida",withdrawn:"Retirada",awaiting_supplier_confirmation:"Aguardando confirmação do fornecedor"};
const reason:Record<string,string>={not_enabled:"As transações estão desligadas neste ambiente; nenhuma cotação ou pedido foi criado.",unauthorized:"A sessão expirou. Entre novamente.",forbidden:"Seu perfil não tem permissão para esta operação.",query_failed:"Não foi possível carregar os registros. Confira a autenticação e a conexão.",invalid_origin:"Origem não reconhecida para gravação.",invalid_request:"Revise os campos informados.",operation_not_allowed_or_changed:"O cadastro, a autorização ou a oferta mudou. Atualize e confira os dados.",operation_unavailable:"Não foi possível concluir a transação. Nada foi confirmado.",};
const classField="mt-2 h-12 w-full min-w-0 rounded-2xl border border-line bg-canvas px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
const classButton="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 py-2 text-sm font-extrabold text-white hover:bg-forest-deep disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

function readableTime(raw:string){const date=new Date(raw);return Number.isNaN(date.valueOf())?raw:date.toLocaleString("pt-BR");}

/**
 * All reads and writes go through a same-origin endpoint and authenticated
 * Supabase SSR session. The database RLS and private RPC check the tenant again.
 * No browser service key, no mock success and no charging.
 */
export function TransactionConsole({mode,organizations,initialOffer="",initialRegion="SP"}:Props) {
  const supplier=mode.startsWith("supplier");
  const orders=mode.endsWith("orders");
  const [rows,setRows]=useState<(Quote|Order)[]>([]);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [loading,setLoading]=useState(true);
  const [enabled,setEnabled]=useState(true);
  const [pending,setPending]=useState(false);
  const [feedback,setFeedback]=useState("");
  const [isError,setIsError]=useState(false);
  const [buyerOrg,setBuyerOrg]=useState(organizations[0]?.id??"");
  const [offer,setOffer]=useState(initialOffer);
  const [quantity,setQuantity]=useState(1);
  const [region,setRegion]=useState(initialRegion.replace(/^BR-/,""));
  const [notes,setNotes]=useState("");
  const [requestKey,setRequestKey]=useState("");
  const [proposalQuote,setProposalQuote]=useState("");
  const [price,setPrice]=useState("");
  const [expiry,setExpiry]=useState("");
  const [checkoutQuote,setCheckoutQuote]=useState("");
  const [checkoutProposal,setCheckoutProposal]=useState("");
  const [checkoutKey,setCheckoutKey]=useState("");

  const reload=useCallback(async()=>{
    setLoading(true);
    try{
      const selected=supplier?(orders?"supplier_orders":"supplier_quotes"):(orders?"orders":"quotes");
      const response=await fetch("/api/marketplace/transactions?mode="+selected,{cache:"no-store",credentials:"same-origin"});
      const body=await response.json() as JsonResult;
      if(!response.ok||!body.ok){
        setEnabled(body.reason!=="not_enabled");
        setRows([]);setProposals([]);
        setFeedback(reason[body.reason??""]??"Consulta indisponível.");
        setIsError(true);
        return;
      }
      setEnabled(true);
      setRows(body.items??[]);
      setProposals(body.proposals??[]);
      setFeedback("");setIsError(false);
    }catch{
      setRows([]);setProposals([]);setIsError(true);setFeedback("Não foi possível conectar ao servidor.");
    }finally{setLoading(false);}
  },[supplier,orders]);

  useEffect(()=>{void reload();},[reload]);

  async function submit(payload:Record<string,unknown>,key:string){
    setPending(true);setFeedback("");setIsError(false);
    try {
      const response=await fetch("/api/marketplace/transactions",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...payload,idempotencyKey:key}),
      });
      const data=await response.json() as JsonResult;
      if(!response.ok||!data.ok){
        setIsError(true);setFeedback(reason[data.reason??""]??"Operação recusada pelo servidor.");
        if(data.reason==="not_enabled")setEnabled(false);
      }else{
        setFeedback("Registro criado com segurança. ID: "+data.id+". Nenhum pagamento foi efetuado.");
        setIsError(false);
        if(payload.action==="quote")setRequestKey("");
        if(payload.action==="checkout")setCheckoutKey("");
        await reload();
        setFeedback("Solicitação registrada com segurança. ID: "+data.id+". Nenhum pagamento foi efetuado.");
      }
    }catch{
      setIsError(true);setFeedback("Falha na comunicação. Reenvie com a mesma chave para evitar duplicação.");
    }finally{setPending(false);}
  }

  function requestQuote(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!uuid.test(offer)||!uuid.test(buyerOrg)||!Number.isSafeInteger(quantity)||quantity<1||quantity>100000||
       !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(region.toUpperCase())) {
      setFeedback("Informe uma empresa aprovada, uma oferta válida, quantidade e UF brasileira.");setIsError(true);return;
    }
    const key=requestKey||crypto.randomUUID();setRequestKey(key);
    void submit({action:"quote",buyerOrgId:buyerOrg,offerId:offer,quantity,region:"BR-"+region.toUpperCase(),notes},key);
  }

  function propose(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const minor=Math.round(Number(price)*100);
    if(!uuid.test(proposalQuote)||!Number.isSafeInteger(minor)||minor<1||minor>1000000000||!expiry){
      setFeedback("Selecione uma cotação, preço e prazo válidos.");setIsError(true);return;
    }
    const date=new Date(expiry+"T12:00:00");
    if(!Number.isFinite(date.valueOf())||date.valueOf()<=Date.now()||date.valueOf()>Date.now()+60*86400000){
      setFeedback("O prazo da proposta precisa estar entre amanhã e os próximos 60 dias.");setIsError(true);return;
    }
    void submit({action:"proposal",quoteRequestId:proposalQuote,priceMinor:minor,expiresAt:date.toISOString()},"");
  }

  function checkout(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const quote=(rows as Quote[]).find(q=>q.id===checkoutQuote);
    if(!quote||!uuid.test(checkoutProposal)||!uuid.test(buyerOrg)||quote.buyer_org_id!==buyerOrg){
      setFeedback("Escolha uma cotação e proposta da sua empresa.");setIsError(true);return;
    }
    const proposal=proposals.find(p=>p.id===checkoutProposal&&p.quote_request_id===checkoutQuote&&p.status==="proposed"&&new Date(p.expires_at)>new Date());
    if(!proposal){setFeedback("A proposta escolhida não está vigente. Atualize as cotações.");setIsError(true);return;}
    const key=checkoutKey||crypto.randomUUID();setCheckoutKey(key);
    void submit({action:"checkout",buyerOrgId:buyerOrg,quoteRequestId:checkoutQuote,proposalId:checkoutProposal},key);
  }
  const quotes=orders?[]:rows as Quote[];
  const purch=orders?rows as Order[]:[];
  const selectedQuote=quotes.find(q=>q.id===checkoutQuote);
  const eligibleProposals=proposals.filter(p=>p.quote_request_id===checkoutQuote&&p.status==="proposed"&&new Date(p.expires_at)>new Date());

  return <section className="mt-7 space-y-6" aria-label="Operação transacional protegida">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-5">
      <div><p className="font-black text-forest-deep">{orders?"Solicitações de pedidos":"Cotações e propostas"}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">Registros reais somente após habilitação controlada. Consulta limitada às empresas autorizadas.</p></div>
      <button type="button" onClick={()=>void reload()} disabled={loading||pending} className={classButton}>
        <RefreshCcw size={16} aria-hidden/> Atualizar
      </button>
    </div>
    {!enabled?<div role="status" className="flex gap-3 rounded-2xl bg-sand p-5 text-sm text-forest-deep">
      <CircleAlert size={21} className="shrink-0" aria-hidden/><p><strong>Operações desativadas neste ambiente.</strong> A interface está pronta para Preview, mas só poderá gravar após migração, habilitação da flag e homologação de acessos.</p>
    </div>:null}
    {feedback&&<div role={isError?"alert":"status"} className={"rounded-2xl border border-line p-5 text-sm font-semibold "+(isError?"bg-sand text-[#5c3a06]":"bg-lime-soft text-forest")}>{feedback}</div>}
    {!orders&&enabled&&organizations.length>0&&(!supplier?<form onSubmit={requestQuote} className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
      <h2 className="text-xl font-black text-forest-deep">Nova cotação</h2>
      <p className="mt-2 text-sm text-muted">Selecione um produto autorizado no catálogo e use o identificador da oferta. O pedido não será criado nesta etapa.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold text-forest">Empresa compradora
          <select required value={buyerOrg} onChange={e=>{setBuyerOrg(e.target.value);setRequestKey("");}} className={classField}>
            {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-extrabold text-forest">ID da oferta homologada
          <input required value={offer} onChange={e=>{setOffer(e.target.value);setRequestKey("");}} pattern="[0-9a-fA-F-]{36}" placeholder="ID da oferta escolhida no catálogo" className={classField}/>
        </label>
        <label className="text-sm font-extrabold text-forest">Quantidade
          <input type="number" required min={1} max={100000} step={1} value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setRequestKey("");}} className={classField}/>
        </label>
        <label className="text-sm font-extrabold text-forest">UF de entrega
          <input required minLength={2} maxLength={2} value={region} onChange={e=>{setRegion(e.target.value.toUpperCase());setRequestKey("");}} placeholder="SP" className={classField}/>
        </label>
        <label className="text-sm font-extrabold text-forest sm:col-span-2">Observações
          <textarea maxLength={1000} rows={3} value={notes} onChange={e=>{setNotes(e.target.value);setRequestKey("");}} className={classField+" h-auto py-3"} placeholder="Especificações e necessidade de entrega"/>
        </label>
      </div>
      <button type="submit" disabled={pending||loading} className={classButton+" mt-6"}>{pending?<Loader2 size={16} className="animate-spin" aria-hidden/>:<ArrowRight size={16} aria-hidden/>} Enviar cotação</button>
    </form>:<form onSubmit={propose} className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
      <h2 className="text-xl font-black text-forest-deep">Responder cotação recebida</h2>
      <p className="mt-2 text-sm text-muted">Propostas exigem fornecedor autenticado e homologado, preço real e prazo de validade.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold text-forest sm:col-span-2">Cotação recebida
          <select required value={proposalQuote} onChange={e=>setProposalQuote(e.target.value)} className={classField}>
            <option value="">Selecione</option>
            {quotes.filter(q=>q.status==="submitted").map(q=><option key={q.id} value={q.id}>{q.id} · {q.quantity} un.</option>)}
          </select>
        </label>
        <label className="text-sm font-extrabold text-forest">Preço por unidade em R$
          <input required type="number" min="0.01" max="10000000" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className={classField}/>
        </label>
        <label className="text-sm font-extrabold text-forest">Proposta válida até
          <input required type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className={classField}/>
        </label>
      </div>
      <button type="submit" disabled={pending||loading} className={classButton+" mt-6"}>Registrar proposta</button>
    </form>)}
    {!orders&&!supplier&&enabled&&quotes.length>0&&<form onSubmit={checkout} className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
      <h2 className="text-xl font-black text-forest-deep">Solicitar pedido com proposta aprovada</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Confirma somente uma <strong>solicitação pendente de aprovação do fornecedor</strong>. Não cobra, não reserva estoque e não finaliza a compra.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold text-forest">Empresa compradora
          <select value={buyerOrg} onChange={e=>{setBuyerOrg(e.target.value);setCheckoutQuote("");setCheckoutProposal("");setCheckoutKey("");}} className={classField}>
            {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-extrabold text-forest">Cotação
          <select required value={checkoutQuote} onChange={e=>{setCheckoutQuote(e.target.value);setCheckoutProposal("");setCheckoutKey("");}} className={classField}>
            <option value="">Selecione cotação</option>
            {quotes.filter(q=>q.status==="submitted"&&q.buyer_org_id===buyerOrg).map(q=><option key={q.id} value={q.id}>{q.id}</option>)}
          </select>
        </label>
        <label className="text-sm font-extrabold text-forest sm:col-span-2">Proposta vigente
          <select required value={checkoutProposal} onChange={e=>{setCheckoutProposal(e.target.value);setCheckoutKey("");}} className={classField}>
            <option value="">Selecione uma proposta</option>
            {eligibleProposals.map(p=><option key={p.id} value={p.id}>{real(p.unit_price_minor)} por unidade · validade {readableTime(p.expires_at)}</option>)}
          </select>
        </label>
      </div>
      {selectedQuote&&<p className="mt-4 text-xs text-muted">Quantidade solicitada: {selectedQuote.quantity} · Região: {selectedQuote.region_code}</p>}
      <button type="submit" disabled={pending||loading||!eligibleProposals.length} className={classButton+" mt-5"}>Registrar solicitação pendente</button>
    </form>}
    {loading?<div role="status" className="flex items-center gap-2 rounded-2xl bg-paper p-6 text-sm text-muted"><Loader2 size={18} className="animate-spin" aria-hidden/> Consultando registros protegidos...</div>:
    <section aria-label="Histórico de solicitações" className="rounded-3xl border border-line bg-paper p-6">
      <h2 className="text-xl font-black text-forest-deep">{orders?"Pedidos registrados":"Cotações registradas"}</h2>
      {!rows.length?<p className="mt-4 text-sm text-muted">{enabled?"Nenhum registro autorizado encontrado para este perfil.":"As transações ainda não estão habilitadas."}</p>:
      <ul className="mt-5 grid gap-3">
        {orders?purch.map(o=><li key={o.id} className="rounded-2xl bg-canvas p-4 text-sm">
          <p className="font-extrabold text-forest-deep">Pedido {o.id}</p>
          <p className="mt-2 text-muted">{o.quantity} un. · {o.region_code} · Total {real(o.total_price_minor)} · {readableTime(o.created_at)}</p>
          <p className="mt-2 font-semibold text-terra">{status[o.status]??o.status} · Sem pagamento e sem reserva de estoque</p>
        </li>):quotes.map(q=><li key={q.id} className="rounded-2xl bg-canvas p-4 text-sm">
          <p className="break-all font-extrabold text-forest-deep">Cotação {q.id}</p>
          <p className="mt-2 text-muted">{q.quantity} un. · {q.region_code} · {readableTime(q.created_at)}</p>
          <p className="mt-2 font-semibold text-terra">{status[q.status]??q.status}</p>
          {proposals.filter(p=>p.quote_request_id===q.id).map(p=><p key={p.id} className="mt-2 break-all rounded-xl bg-lime-soft p-3 text-xs text-forest">Proposta {p.id} · {real(p.unit_price_minor)} por unidade · até {readableTime(p.expires_at)}</p>)}
        </li>)}
      </ul>}
      <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs leading-relaxed text-muted"><ShieldCheck size={17} className="shrink-0" aria-hidden/> Os registros são filtrados por autorização no PostgreSQL. Não há pagamento, emissão fiscal ou expedição nesta versão.</p>
    </section>}
  </section>;
}
