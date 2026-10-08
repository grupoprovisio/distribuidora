"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type Props = { role: "comprador" | "vendedor" | "fornecedor" };

const copy = {
  comprador: { title: "Conte sobre sua operação", button: "Solicitar acesso", note: "Cadastro demonstrativo: nenhum dado é enviado nesta etapa." },
  vendedor: { title: "Quero atuar com a plataforma", button: "Demonstrar interesse", note: "Demonstração local: o cadastro público ainda não está ativado." },
  fornecedor: { title: "Apresente sua empresa", button: "Entrar na fila de homologação", note: "Demonstração local: não enviamos documentos nem dados para terceiros." },
} as const;

export function MarketplaceLeadForm({ role }: Props) {
  const [sent, setSent] = useState(false);
  const text = copy[role];
  if (sent) return <div className="rounded-[2rem] bg-lime-soft p-7 ring-1 ring-lime" role="status"><CheckCircle2 className="text-forest" size={28} aria-hidden /><h2 className="mt-4 text-2xl font-black text-forest-deep">Interesse registrado nesta demonstração.</h2><p className="mt-2 text-sm font-medium leading-relaxed text-forest/75">O próximo passo será conectado a um backend seguro após a aprovação do fluxo de identidade e LGPD.</p><button type="button" onClick={() => setSent(false)} className="mt-5 text-sm font-extrabold text-forest underline underline-offset-4">Preencher novamente</button></div>;
  return <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Próximo passo</p><h2 className="mt-2 text-2xl font-black tracking-tight text-forest-deep">{text.title}</h2><p className="mt-2 text-sm font-medium text-muted">{text.note}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold">Nome<input required name="name" autoComplete="name" className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-4 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label><label className="text-sm font-extrabold">E-mail<input required type="email" name="email" autoComplete="email" className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-4 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label><label className="text-sm font-extrabold sm:col-span-2">Empresa<input required name="company" autoComplete="organization" className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-4 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label><label className="text-sm font-extrabold sm:col-span-2">O que você precisa?<textarea required name="message" rows={4} className="mt-1 w-full resize-none rounded-2xl border border-line bg-canvas px-4 py-3 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label></div><button type="submit" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white transition-colors hover:bg-forest-deep focus-visible:ring-4 focus-visible:ring-forest/30 active:scale-95">{text.button}<ArrowRight size={16} aria-hidden /></button></form>;
}
