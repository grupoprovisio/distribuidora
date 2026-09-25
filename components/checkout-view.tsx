"use client";

import Link from "next/link";
import { ArrowLeft, Check, ClipboardList, MapPin, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { useList } from "@/lib/list-store";

const field = "mt-1 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold outline-none transition-colors focus:border-forest focus:bg-paper";

export function CheckoutView() {
  const { qty, meta, count } = useList();
  const [sent, setSent] = useState(false);
  const lines = Object.entries(qty).map(([id, quantity]) => ({ id, quantity, name: meta[id]?.name ?? `Produto ${id}` }));

  if (sent) {
    return (
      <section className="mx-auto max-w-xl rounded-[2rem] bg-paper p-8 text-center shadow-card ring-1 ring-line/70 sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-lime-soft text-forest"><Check size={30} aria-hidden /></span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-forest">Pedido preparado</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-forest-deep">Recebemos seus dados.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-muted">Nesta etapa visual, a equipe comercial ainda precisa confirmar estoque, preço final, frete e condição de pagamento antes de gerar o pedido real.</p>
        <Link href="/contato" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-forest px-6 text-sm font-extrabold text-white active:scale-95">Falar com o comercial</Link>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl rounded-[2rem] bg-paper p-8 text-center shadow-card ring-1 ring-line/70 sm:p-12">
        <ClipboardList size={40} className="mx-auto text-forest" aria-hidden />
        <h2 className="mt-5 text-xl font-extrabold">Seu pedido ainda está vazio</h2>
        <p className="mt-2 text-sm font-medium text-muted">Adicione produtos ao pedido para continuar.</p>
        <Link href="/buscar" className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-forest px-6 text-sm font-extrabold text-white">Explorar catálogo</Link>
      </section>
    );
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); track("begin_checkout", { item_count: lines.length, unit_count: count }); setSent(true); }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="mb-[-0.75rem] flex items-center gap-2 text-xs font-extrabold text-muted lg:col-span-2" aria-label="Etapas do pedido">
        <span className="grid size-7 place-items-center rounded-full bg-forest text-white">1</span><span className="text-forest">Dados</span><span className="h-px flex-1 bg-line" /><span className="grid size-7 place-items-center rounded-full bg-canvas text-muted ring-1 ring-line">2</span><span>Entrega</span><span className="h-px flex-1 bg-line" /><span className="grid size-7 place-items-center rounded-full bg-canvas text-muted ring-1 ring-line">3</span><span>Condição</span>
      </div>
      <div className="space-y-4">
        <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-lime-soft text-forest"><ClipboardList size={19} aria-hidden /></span><div><p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Etapa 1</p><h2 className="text-lg font-extrabold">Seus dados</h2></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-extrabold sm:col-span-2">Nome ou razão social<input required className={field} placeholder="Como devemos identificar sua compra?" /></label>
            <label className="text-sm font-extrabold">E-mail<input required type="email" className={field} placeholder="voce@empresa.com" /></label>
            <label className="text-sm font-extrabold">WhatsApp<input required type="tel" className={field} placeholder="(00) 00000-0000" /></label>
          </div>
        </section>
        <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-mist text-forest"><MapPin size={19} aria-hidden /></span><div><p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Etapa 2</p><h2 className="text-lg font-extrabold">Entrega</h2></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-extrabold">CEP<input required className={field} placeholder="00000-000" /></label><label className="text-sm font-extrabold sm:col-span-2">Endereço<input required className={field} placeholder="Rua, número e complemento" /></label><label className="text-sm font-extrabold sm:col-span-2">Cidade e estado<input required className={field} placeholder="Sua cidade - UF" /></label><label className="text-sm font-extrabold">Preferência<select className={field} defaultValue="rota"><option value="rota">Próxima rota</option><option value="retirada">Retirada</option><option value="combinar">Combinar</option></select></label></div>
        </section>
        <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-sand text-terra"><Truck size={19} aria-hidden /></span><div><p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Etapa 3</p><h2 className="text-lg font-extrabold">Condição comercial</h2></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold">Forma de pagamento<select className={field} defaultValue="pix"><option value="pix">PIX</option><option value="card">Cartão</option><option value="boleto">Boleto, sujeito a aprovação</option><option value="talk">Quero combinar</option></select></label><label className="text-sm font-extrabold">Observação<textarea className={`${field} h-24 resize-none py-3`} placeholder="Alguma instrução para a equipe?" /></label></div></section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-6"><section className="rounded-[2rem] bg-forest p-5 text-white shadow-card sm:p-6"><p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Resumo do pedido</p><div className="mt-4 divide-y divide-white/10">{lines.slice(0, 6).map((line) => <div key={line.id} className="flex justify-between gap-3 py-3 text-sm"><span className="min-w-0 truncate font-semibold text-white/80">{line.name}</span><span className="shrink-0 font-extrabold">{line.quantity} un</span></div>)}</div>{lines.length > 6 ? <p className="mt-2 text-xs font-semibold text-white/60">+ {lines.length - 6} itens no pedido</p> : null}<div className="mt-4 border-t border-white/15 pt-4"><p className="text-xs font-semibold text-white/60">{count} unidades · total e frete confirmados pelo comercial</p><p className="mt-1 text-lg font-extrabold text-lime">Aguardando cotação final</p></div><button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-5 text-sm font-extrabold text-forest-deep active:scale-95">Enviar para análise <ArrowLeft size={16} className="rotate-180" aria-hidden /></button></section><p className="flex gap-2 px-2 text-xs font-semibold leading-relaxed text-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-forest" aria-hidden /> Seus dados serão usados apenas para preparar o atendimento comercial.</p></aside>
    </form>
  );
}
