"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const COMMERCIAL_EMAIL = "contato@grupoprovisio.com";

type Props = { role: "comprador" | "fornecedor" };

const copy = {
  comprador: {
    title: "Solicite uma cotação",
    button: "Preparar pedido de cotação",
    note: "Informe os itens, os volumes e o CEP de entrega. Vamos preparar um rascunho; você envia pelo seu aplicativo de e-mail.",
    message: "Itens, volumes e CEP",
    subject: "Pedido de cotação B2B · Provisio",
  },
  fornecedor: {
    title: "Apresente sua empresa",
    button: "Preparar e-mail de apresentação",
    note: "Conte o que sua empresa fornece e quais regiões atende. Vamos preparar um rascunho; você envia pelo seu aplicativo de e-mail.",
    message: "Produtos e regiões atendidas",
    subject: "Apresentação de fornecedor · Provisio",
  },
} as const;

export function MarketplaceLeadForm({ role }: Props) {
  const [draft, setDraft] = useState("");
  const text = copy[role];
  return <form method="post" onChange={() => setDraft("")} onSubmit={(event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") || "").trim();
    const email = String(fields.get("email") || "").trim();
    const company = String(fields.get("company") || "").trim();
    const message = String(fields.get("message") || "").trim();
    if (!name || !email || !company || !message) return;
    const body = ["Nome: " + name, "E-mail: " + email, "Empresa: " + company, "", message].join("\r\n");
    setDraft("mailto:" + COMMERCIAL_EMAIL + "?subject=" + encodeURIComponent(text.subject) + "&body=" + encodeURIComponent(body));
  }} className="rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Próximo passo</p><h2 className="mt-2 text-2xl font-black tracking-tight text-forest-deep">{text.title}</h2><p className="mt-2 text-sm font-medium text-muted">{text.note}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold">Nome<input required name="name" maxLength={100} autoComplete="name" className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-4 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label><label className="text-sm font-extrabold">E-mail<input required type="email" name="email" maxLength={150} autoComplete="email" className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-4 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label><label className="text-sm font-extrabold sm:col-span-2">Empresa<input required name="company" maxLength={120} autoComplete="organization" className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-4 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label><label className="text-sm font-extrabold sm:col-span-2">{text.message}<textarea required name="message" maxLength={600} rows={4} className="mt-1 w-full resize-none rounded-2xl border border-line bg-canvas px-4 py-3 outline-none focus-visible:ring-4 focus-visible:ring-lime/50" /></label></div><button type="submit" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white transition-colors hover:bg-forest-deep focus-visible:ring-4 focus-visible:ring-forest/30 active:scale-95">{text.button}<ArrowRight size={16} aria-hidden /></button>
    <p className="mt-4 text-sm text-muted">Prefere escrever direto? <a className="break-all font-semibold underline underline-offset-4" href={`mailto:${COMMERCIAL_EMAIL}`}>{COMMERCIAL_EMAIL}</a></p>
    {draft && <div className="mt-4 rounded-2xl bg-lime-soft p-4 text-sm text-forest-deep">
      <p role="status"><CheckCircle2 className="mr-2 inline-block" size={16} aria-hidden />Rascunho pronto. Nada foi enviado automaticamente.</p>
      <a className="mt-2 inline-flex min-h-11 items-center font-extrabold underline underline-offset-4" href={draft}>Abrir no aplicativo de e-mail</a>
    </div>}
  </form>;
}
