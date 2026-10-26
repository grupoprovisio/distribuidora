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
    .select("id,buyer_org_id,region_code,fulfillment_method,payment_status,created_at")
    .order("created_at",{ascending:false}).limit(60);
  const ids=(baskets.data??[]).map(b=>b.id);
  const lines=ids.length?await db.from("quote_requests")
    .select("id,basket_id,supplier_org_id,quantity,status").in("basket_id",ids).limit(200):null;
  const buyerIds=[...new Set((baskets.data??[]).map(b=>b.buyer_org_id))];
  const buyers=buyerIds.length?await db.from("organizations")
    .select("id,trade_name,legal_name").in("id",buyerIds):null;
  const error=!!(baskets.error||lines?.error||buyers?.error);
  const orgById=new Map((buyers?.data??[]).map(o=>[o.id,o.trade_name||o.legal_name]));
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
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {items.map(q=><span key={q.id}
                className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">
                {q.quantity} un · {q.status==="converted"?"Pedido gerado":"Cotação em andamento"}
              </span>)}
            </div>
          </article>;
        })}
      </div>}
      <p className="mt-5 text-xs text-muted">
        Operações fiscais e pagamento exigem integração verificada. Esta página não marca pedidos como pagos.
      </p>
    </main><SiteFooter/>
  </div>;
}
