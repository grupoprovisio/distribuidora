import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Boxes, ClipboardList, DollarSign, PackageSearch, Truck, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "@/components/admin-nav";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Painel operacional · Distribuidora" };

const METRICS = [
  { label: "Pedidos hoje", value: "24", detail: "+12% vs. ontem", icon: ClipboardList, tone: "bg-lime-soft text-forest" },
  { label: "Em separação", value: "08", detail: "prioridade operacional", icon: Boxes, tone: "bg-sand text-terra" },
  { label: "Clientes ativos", value: "186", detail: "+9 neste mês", icon: UsersRound, tone: "bg-mist text-forest" },
  { label: "Faturamento", value: "R$ 18,4 mil", detail: "últimos 7 dias", icon: DollarSign, tone: "bg-blush text-plum" },
];

const ORDERS = [
  ["#1048", "Mercado Boa Praça", "Separação", "R$ 2.840,00"],
  ["#1047", "Restaurante Sabor", "Aguardando aprovação", "R$ 1.260,50"],
  ["#1046", "Condomínio Horizonte", "Em rota", "R$ 890,00"],
];

export default function AdminPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="wine" title="Painel operacional" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <AdminNav />
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-wine">Visão geral</p><h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">Bom dia, equipe.</h1><p className="mt-2 text-sm font-medium text-muted">Acompanhe a operação comercial e as próximas entregas.</p></div><Link href="/contato" className="inline-flex h-10 items-center gap-2 self-start rounded-full bg-forest px-4 text-xs font-extrabold text-white sm:self-auto">Abrir atendimento <ArrowUpRight size={15} aria-hidden /></Link></section>
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{METRICS.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-3xl bg-paper p-5 shadow-card ring-1 ring-line/70"><span className={`grid size-10 place-items-center rounded-2xl ${tone}`}><Icon size={19} aria-hidden /></span><p className="mt-5 text-xs font-black uppercase tracking-[0.1em] text-muted">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs font-semibold text-forest">{detail}</p></article>)}</section>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"><section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Pedidos recentes</h2><p className="mt-1 text-xs font-medium text-muted">Acompanhe as próximas ações da equipe.</p></div><ClipboardList size={22} className="text-forest" aria-hidden /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-line text-[11px] font-black uppercase tracking-[0.1em] text-muted"><tr><th className="pb-3">Pedido</th><th className="pb-3">Cliente</th><th className="pb-3">Status</th><th className="pb-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-line">{ORDERS.map(([id, customer, status, total]) => <tr key={id}><td className="py-4 font-extrabold text-forest">{id}</td><td className="py-4 font-bold">{customer}</td><td className="py-4"><span className="rounded-full bg-lime-soft px-2.5 py-1 text-xs font-extrabold text-forest">{status}</span></td><td className="py-4 text-right font-extrabold tabular-nums">{total}</td></tr>)}</tbody></table></div></section><aside className="space-y-3"><div className="rounded-[2rem] bg-forest p-6 text-white"><Truck size={23} className="text-lime" aria-hidden /><h2 className="mt-5 text-xl font-extrabold">Rota de hoje</h2><p className="mt-2 text-sm font-medium leading-relaxed text-white/70">6 pedidos aguardam separação para a rota da tarde.</p><Link href="/entregas" className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-lime">Ver logística <ArrowUpRight size={14} aria-hidden /></Link></div><div className="rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70"><PackageSearch size={22} className="text-terra" aria-hidden /><h2 className="mt-4 text-lg font-extrabold">Estoque em atenção</h2><p className="mt-2 text-sm font-medium leading-relaxed text-muted">12 produtos estão abaixo do estoque mínimo configurado.</p></div></aside></div>
      </main>
      <SiteFooter />
    </div>
  );
}
