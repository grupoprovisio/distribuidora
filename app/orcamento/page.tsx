"use client";

import Link from "next/link";
import { Check, ClipboardPenLine, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { useList } from "@/lib/list-store";
import { WRAP } from "@/lib/ui";

export default function QuotePage() {
  const { count } = useList();
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="plum" title="Solicitar orçamento" backHref="/lista" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        {sent ? <section className="mx-auto max-w-xl rounded-[2rem] bg-paper p-8 text-center shadow-card ring-1 ring-line/70 sm:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-lime-soft text-forest"><Check size={30} aria-hidden /></span><h1 className="mt-5 text-3xl font-black tracking-tight text-forest-deep">Solicitação enviada.</h1><p className="mt-3 text-sm font-medium leading-relaxed text-muted">A equipe comercial pode ajustar volume, marcas, prazo e condição antes de enviar a proposta final.</p><Link href="/" className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-forest px-6 text-sm font-extrabold text-white">Voltar para o catálogo</Link></section> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"><section className="rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8"><span className="grid size-12 place-items-center rounded-2xl bg-blush text-plum"><ClipboardPenLine size={23} aria-hidden /></span><p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-plum">Condição sob medida</p><h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-forest-deep">Conte o que você precisa comprar.</h1><p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-muted">Envie uma lista de produtos, volumes ou categorias. O comercial retorna com disponibilidade, preço e prazo de entrega.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold">Nome ou empresa<input required className="mt-1 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold outline-none focus:border-forest" placeholder="Como podemos chamar você?" /></label><label className="text-sm font-extrabold">WhatsApp ou e-mail<input required className="mt-1 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold outline-none focus:border-forest" placeholder="Seu melhor contato" /></label><label className="text-sm font-extrabold sm:col-span-2">O que você precisa?<textarea required className="mt-1 h-36 w-full resize-none rounded-2xl border border-line bg-canvas px-4 py-3 text-sm font-semibold outline-none focus:border-forest" placeholder="Ex.: 20 caixas de bebidas, itens de limpeza para restaurante..." /></label></div><button type="submit" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-plum px-6 text-sm font-extrabold text-white active:scale-95">Enviar solicitação <Send size={16} aria-hidden /></button></section><aside className="rounded-[2rem] bg-forest p-6 text-white shadow-card"><MessageCircle size={22} className="text-lime" aria-hidden /><h2 className="mt-5 text-xl font-extrabold">Já tem uma lista?</h2><p className="mt-2 text-sm font-medium leading-relaxed text-white/70">Você já adicionou {count} {count === 1 ? "unidade" : "unidades"}. O orçamento pode começar por esses itens.</p><Link href="/lista" className="mt-6 inline-flex h-10 items-center rounded-full bg-white/10 px-4 text-xs font-extrabold text-white hover:bg-white/15">Revisar minha lista</Link></aside></form>}
      </main>
      <SiteFooter />
    </div>
  );
}
