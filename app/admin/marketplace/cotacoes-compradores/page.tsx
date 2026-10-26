import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "@/components/admin-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Cotações de compradores · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function AdminBuyerBasketsPage(){
  // /admin/layout requires verified AAL2. Supabase RLS limits to QA baskets.
  const db=await createClient();
  const baskets=await db.from("quote_baskets")
    .select("id,buyer_org_id,region_code,fulfillment_method,payment_status,created_at,recipient_snapshot,origin_snapshot,freight_minor,min_business_days,max_business_days")
    .order("created_at",{ascending:false}).limit(60);
  const ids=(baskets.data??[]).map(b=>b.id);
  const lines=ids.length?await db.from("quote_requests")
    .select("id,basket_id,offer_id,supplier_org_id,quantity,status").in("basket_id",ids).limit(200):null;
  const buyerIds=[...new Set((baskets.data??[]).map(b=>b.buyer_org_id))];
  const buyers=buyerIds.length?await db.from("organizations")
    .select("id,trade_name,legal_name").in("id",buyerIds):null;
  const quoteRows=lines?.data??[];
  const offerIds=[...new Set(quoteRows.map(q=>q.offer_id))];
  const supplierIds=[...new Set(quoteRows.map(q=>q.supplier_org_id))];
  const quoteIds=quoteRows.map(q=>q.id);
  const [offers,suppliers,proposals]=await Promise.all([
    offerIds.length?db.from("offers").select("id,supplier_product_id").in("id",offerIds):null,
    supplierIds.length?db.from("organizations")
      .select("id,trade_name,legal_name").in("id",supplierIds):null,
    quoteIds.length?db.from("quote_proposals")
      .select("quote_request_id,unit_price_minor,status").in("quote_request_id",quoteIds):null,
  ]);
  const skuIds=[...new Set((offers?.data??[]).map(o=>o.supplier_product_id))];
  const skus=skuIds.length?await db.from("supplier_products")
    .select("id,product_id").in("id",skuIds):null;
  const productIds=[...new Set((skus?.data??[]).map(s=>s.product_id))];
  const products=productIds.length?await db.from("products")
    .select("id,name").in("id",productIds):null;
  const error=!!(baskets.error||lines?.error||buyers?.error||offers?.error||
    suppliers?.error||proposals?.error||skus?.error||products?.error);
  const orgById=new Map((buyers?.data??[]).map(o=>[o.id,o.trade_name||o.legal_name]));
  const supplierById=new Map((suppliers?.data??[]).map(o=>[o.id,o.trade_name||o.legal_name]));
  const productById=new Map((products?.data??[]).map(o=>[o.id,o.name]));
  const skuById=new Map((skus?.data??[]).map(o=>[o.id,o.product_id]));
  const offerById=new Map((offers?.data??[]).map(o=>[o.id,o.supplier_product_id]));
  const proposalByQuote=new Map((proposals?.data??[]).filter(p=>p.status==="proposed")
    .map(p=>[p.quote_request_id,p.unit_price_minor]));
  const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Cotações recebidas" backHref="/admin/marketplace" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav/>
      <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">
        <ArrowLeft size={17} aria-hidden/> Administração
      </Link>
      <h1 className="mt-4 text-3xl font-black text-forest-deep sm:text-4xl">Cotações dos compradores</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        Solicitações agrupadas por comprador. Cada fornecedor responde às próprias ofertas.
      </p>
      {error?<p role="alert" className="mt-6 rounded-2xl bg-paper p-5 text-sm text-muted">
        Não foi possível consultar as cotações. Verifique sua sessão administrativa.
      </p>:!(baskets.data??[]).length?<div className="mt-6 rounded-3xl bg-paper p-8 text-center">
        <ClipboardList size={35} className="mx-auto text-forest" aria-hidden/>
        <h2 className="mt-4 text-xl font-black">Nenhuma cotação recebida</h2>
      </div>:<div className="mt-6 grid gap-4">
        {(baskets.data??[]).map(b=>{
          const items=(lines?.data??[]).filter(q=>q.basket_id===b.id);
          return <article key={b.id} className="rounded-3xl bg-paper p-5 shadow-card ring-1 ring-line/70">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-muted">
                  {new Date(b.created_at).toLocaleDateString("pt-BR")} · #{b.id.slice(0,8)}
                </p>
                <h2 className="mt-2 text-lg font-black text-forest-deep">
                  {orgById.get(b.buyer_org_id)??"Empresa compradora"}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {b.fulfillment_method==="pickup"?"Retirada na unidade":"Entrega"} · {b.region_code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-forest">{items.length} {items.length===1?"item":"itens"}</p>
                <span className="mt-2 inline-flex rounded-full bg-lime-soft px-3 py-1 text-xs font-bold text-forest">
                  {b.payment_status==="paid"?"Pago":b.payment_status==="refunded"?"Estornado":"Pagamento pendente"}
                </span>
              </div>
            </div>
            {(()=>{
              const c=b.recipient_snapshot as {fullName?:string;email?:string;phone?:string;street?:string;number?:string;
                complement?:string;neighborhood?:string;city?:string;state?:string;postalCode?:string;reference?:string}|null;
              const o=b.origin_snapshot as {label?:string;street?:string;number?:string;city?:string;state?:string}|null;
              return <div className="mt-4 grid gap-3 rounded-xl bg-canvas p-4 text-xs leading-relaxed text-forest-deep sm:grid-cols-2">
                <div>
                  <p className="font-black">Destinatário</p>
                  <p className="mt-1">{c?.fullName??"Cadastro antigo sem destinatário"}</p>
                  {c?.email&&<p>E-mail: {c.email}</p>}
                  {c?.phone&&<p>Telefone: {c.phone}</p>}
                  {c?.street&&<p>{c.street}, {c.number}{c.complement?", "+c.complement:""} — {c.neighborhood}, {c.city}/{c.state} · CEP {c.postalCode}</p>}
                  {c?.reference&&<p>Referência: {c.reference}</p>}
                </div>
                <div>
                  <p className="font-black">Modalidade e frete</p>
                  <p className="mt-1">{b.fulfillment_method==="pickup"?"Retirada no local":"Entrega no endereço cadastrado"}</p>
                  {o&&<p>Origem: {o.label}, {o.street}, {o.number} — {o.city}/{o.state}</p>}
                  <p>Frete: {b.freight_minor!==null?money.format(b.freight_minor/100):"Não calculado"}</p>
                  {b.min_business_days!==null&&b.max_business_days!==null&&
                    <p>Prazo estimado: {b.min_business_days}–{b.max_business_days} dias úteis</p>}
                </div>
              </div>;
            })()}
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {items.map(q=>{
                const name=productById.get(skuById.get(offerById.get(q.offer_id)??"")??"")
                  ??"Produto indisponível";
                const proposal=proposalByQuote.get(q.id);
                return <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
                  <div>
                    <p className="text-sm font-extrabold text-forest-deep">{name}</p>
                    <p className="mt-1 text-xs font-medium text-muted">
                      {supplierById.get(q.supplier_org_id)??"Fornecedor"} · {q.quantity} un.
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {q.status==="converted"?"Pedido gerado":"Cotação aguardando análise"}
                    </p>
                  </div>
                  <span className="text-sm font-black tabular-nums text-forest">
                    {proposal!==undefined?money.format(proposal*q.quantity/100):"Proposta pendente"}
                  </span>
                </li>;
              })}
            </ul>
          </article>;
        })}
      </div>}
      <p className="mt-5 text-xs text-muted">
        Operações fiscais e pagamento exigem integração verificada. Esta página não marca pedidos como pagos.
      </p>
    </main><SiteFooter/>
  </div>;
}
