"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, PackageCheck, RefreshCw } from "lucide-react";

type Basket={id:string;buyer_org_id:string;region_code:string;
 fulfillment_method:"delivery"|"pickup";payment_status:"unpaid"|"paid"|"refunded";created_at:string;
 freight_minor:number|null;min_business_days:number|null;max_business_days:number|null;
 recipient_snapshot:{fullName?:string;street?:string;number?:string;complement?:string;city?:string;state?:string;postalCode?:string}|null;
 origin_snapshot:{label?:string;street?:string;number?:string;city?:string;state?:string}|null;
};
type Quote={id:string;basket_id:string;offer_id:string;productName:string;
 supplierName:string;quantity:number;status:string};
type Proposal={id:string;quote_request_id:string;unit_price_minor:number;status:string;expires_at:string};
type Order={id:string;quote_request_id:string;status:string;total_price_minor:number};
type Fulfillment={order_id:string;status:string};
type Summary={ok:boolean;baskets?:Basket[];quotes?:Quote[];proposals?:Proposal[];
 orders?:Order[];fulfillments?:Fulfillment[]};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const brl=(value:number)=>money.format(value/100);
const date=(s:string)=>new Date(s).toLocaleDateString("pt-BR");
const status=(quote:Quote,proposal?:Proposal,order?:Order,fulfillment?:Fulfillment)=>{
  if(fulfillment?.status==="delivered")return "Entrega registrada";
  if(fulfillment?.status==="in_transit")return "Em transporte";
  if(fulfillment?.status==="ready_to_dispatch")return "Preparação concluída";
  if(fulfillment?.status==="separating")return "Em separação";
  if(order?.status==="confirmed")return "Pedido confirmado";
  if(order?.status==="awaiting_supplier_confirmation")return "Pedido aguardando fornecedor";
  if(order?.status==="cancelled")return "Pedido cancelado";
  if(proposal?.status==="proposed")return "Proposta recebida";
  if(quote.status==="cancelled")return "Cancelada";
  return "Em análise pelo fornecedor";
};
export function BuyerQuoteRequests({submittedId}: {submittedId?:string}){
  const [revision,setRevision]=useState(0);
  const [snapshot,setSnapshot]=useState<{revision:number;summary:Summary|null;error:boolean}|null>(null);
  const loading=snapshot?.revision!==revision;
  const error=!loading&&!!snapshot?.error;
  const summary=!loading?snapshot?.summary:null;
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/marketplace/baskets",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
      .then(async r=>{const data=await r.json() as Summary;
        if(!controller.signal.aborted)setSnapshot({revision,summary:r.ok&&data.ok?data:null,error:!r.ok||!data.ok});
      })
      .catch(()=>{if(!controller.signal.aborted)setSnapshot({revision,summary:null,error:true});});
    return ()=>controller.abort();
  },[revision]);
  const baskets=summary?.baskets??[];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/app/comprador/catalogo" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">
        <ArrowLeft size={17} aria-hidden/> Voltar aos produtos
      </Link>
      <button type="button" onClick={()=>setRevision(n=>n+1)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-bold text-forest">
        <RefreshCw size={16} aria-hidden/> Atualizar
      </button>
    </div>
    {submittedId&&<p role="status" className="rounded-2xl bg-lime-soft p-4 text-sm font-bold text-forest">
      Solicitação registrada. Você pode acompanhar suas cotações nesta página.
    </p>}
    {loading&&<p role="status" className="rounded-2xl bg-paper p-5 text-sm text-muted">Carregando solicitações...</p>}
    {error&&!loading&&<p role="alert" className="rounded-2xl bg-paper p-5 text-sm text-muted">
      Não foi possível consultar suas solicitações. Tente novamente.
    </p>}
    {!loading&&!error&&baskets.length===0&&<div className="rounded-3xl bg-paper p-8 text-center">
      <ClipboardList size={36} className="mx-auto text-forest" aria-hidden/>
      <h2 className="mt-3 text-xl font-black text-forest-deep">Nenhuma solicitação enviada</h2>
      <p className="mt-2 text-sm text-muted">Monte sua cesta e solicite uma cotação para começar.</p>
    </div>}
    {baskets.map(basket=>{
      const quotes=(summary?.quotes??[]).filter(q=>q.basket_id===basket.id);
      const value=quotes.reduce((sum,q)=>{
        const p=(summary?.proposals??[]).find(p=>p.quote_request_id===q.id&&p.status==="proposed");
        return p?sum+p.unit_price_minor*q.quantity:sum;
      },0);
      return <section key={basket.id} className="overflow-hidden rounded-3xl bg-paper shadow-card ring-1 ring-line/70">
        <div className="flex flex-wrap justify-between gap-3 border-b border-line p-5">
          <div><p className="text-xs font-bold uppercase text-muted">Solicitação · {date(basket.created_at)}</p>
            <h2 className="mt-1 text-lg font-black text-forest-deep">Cotação #{basket.id.slice(0,8)}</h2>
            <p className="mt-1 text-xs text-muted">{basket.fulfillment_method==="pickup"?"Retirada na unidade":"Entrega no endereço cadastrado"} · {basket.region_code}</p>
          </div>
          <span className="h-fit rounded-full bg-lime-soft px-3 py-2 text-xs font-black text-forest">
            {quotes.length} {quotes.length===1?"produto":"produtos"}
          </span>
        </div>
        <div className="border-b border-line bg-canvas px-5 py-3 text-xs text-muted">
          <p>
            {basket.fulfillment_method==="delivery"?
              "Endereço: "+(basket.recipient_snapshot?.street??"Não informado")+
              ", "+(basket.recipient_snapshot?.number??"")+" — "+
              (basket.recipient_snapshot?.city??"")+"/"+(basket.recipient_snapshot?.state??"")+
              " · CEP "+(basket.recipient_snapshot?.postalCode??""):
              "Retirada: "+(basket.origin_snapshot?.label??"unidade Provisio")+
              " — "+(basket.origin_snapshot?.street??"")+
              ", "+(basket.origin_snapshot?.number??"")}
          </p>
          <p className="mt-1">
            Frete: {basket.freight_minor!==null?brl(basket.freight_minor):"A confirmar"}
            {basket.min_business_days!==null&&basket.max_business_days!==null?
              " · "+basket.min_business_days+"–"+basket.max_business_days+" dias úteis estimados":""}
          </p>
        </div>
        <ul className="divide-y divide-line">
          {quotes.map(q=>{
            const p=(summary?.proposals??[]).find(p=>p.quote_request_id===q.id&&p.status==="proposed");
            const order=(summary?.orders??[]).find(o=>o.quote_request_id===q.id);
            const fulfillment=(summary?.fulfillments??[]).find(f=>f.order_id===order?.id);
            return <li key={q.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-forest-deep">{q.productName}</h3>
                <p className="text-xs text-muted">{q.supplierName} · {q.quantity} un.</p>
                <p className="mt-1 text-xs font-bold text-forest">{status(q,p,order,fulfillment)}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <span className="text-sm font-black tabular-nums text-forest-deep">{p?brl(p.unit_price_minor*q.quantity):"Aguardando proposta"}</span>
                {p&&!order&&<Link href={"/app/comprador/cotacoes?oferta="+encodeURIComponent(q.offer_id)+"&regiao="+encodeURIComponent(basket.region_code)}
                  className="inline-flex min-h-10 items-center rounded-full bg-forest px-4 text-xs font-extrabold text-white">
                  Analisar proposta
                </Link>}
              </div>
            </li>;
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas p-5">
          <div>
            <p className="text-xs font-medium text-muted">Total das propostas recebidas (itens)</p>
            <p className="text-xl font-black text-forest-deep">{brl(value)}</p>
            <p className="mt-1 text-xs font-semibold text-forest">
              Com frete registrado: {basket.freight_minor!==null?brl(value+basket.freight_minor):
                "A calcular"}
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs font-bold text-forest">
            <PackageCheck size={16} aria-hidden/>
            {basket.payment_status==="paid"?"Pagamento confirmado":
              basket.payment_status==="refunded"?"Pagamento estornado":
              "Pagamento ainda não confirmado"}
          </p>
        </div>
      </section>;
    })}
    <p className="text-xs leading-relaxed text-muted">
      As solicitações ficam registradas por empresa. Cada fornecedor responde às ofertas sob sua responsabilidade.
      A separação, a expedição e a entrega só podem avançar após confirmação válida de pagamento.
      O pagamento online ainda não está habilitado.
    </p>
  </div>;
}
