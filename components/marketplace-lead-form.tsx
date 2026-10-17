"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Mail } from "lucide-react";

type Role = "comprador" | "fornecedor";
const DESTINATION = "contato@grupoprovisio.com";
const messages = {
  comprador: { title: "Converse sobre sua operação", label: "Tenho interesse em comprar", subject: "Interesse B2B — Sou comprador", detail: "Conte quais produtos, volumes e região você precisa atender." },
  fornecedor: { title: "Apresente sua empresa fornecedora", label: "Tenho interesse em fornecer", subject: "Parceria B2B — Sou fornecedor", detail: "Conte quais produtos e regiões sua empresa atende." },
} as const;

export function MarketplaceLeadForm({ role }: { role: Role }) {
  const config = messages[role];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim() || !company.trim() || !email.trim() || !message.trim()) {
      setError("Preencha os quatro campos antes de preparar sua mensagem.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido para que possamos responder.");
      return;
    }
    const body = [
      config.subject, "",
      "Nome: " + name.trim(),
      "Empresa: " + company.trim(),
      "E-mail de retorno: " + email.trim(), "",
      message.trim(),
    ].join("\n");
    const url = "mailto:" + DESTINATION + "?subject=" +
      encodeURIComponent(config.subject) + "&body=" + encodeURIComponent(body);
    setNotice("Seu aplicativo de e-mail deverá abrir. Revise e envie a mensagem: nada foi enviado automaticamente.");
    window.location.assign(url);
  }

  return (
    <section aria-labelledby="interest-title" className="grid overflow-hidden rounded-[2rem] bg-paper shadow-card ring-1 ring-line/70 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Primeiro contato</p>
        <h2 id="interest-title" className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">{config.title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{config.detail}</p>
        <form noValidate onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-extrabold text-forest">Seu nome
            <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={120} className="min-h-12 rounded-xl border border-line bg-canvas px-4 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-forest">E-mail profissional
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} className="min-h-12 rounded-xl border border-line bg-canvas px-4 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-forest sm:col-span-2">Empresa
            <input value={company} onChange={e => setCompany(e.target.value)} autoComplete="organization" maxLength={150} className="min-h-12 rounded-xl border border-line bg-canvas px-4 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-forest sm:col-span-2">Sua necessidade
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={1800} className="min-h-32 resize-none rounded-xl border border-line bg-canvas px-4 py-3 text-base font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest" />
          </label>
          {error ? <p role="alert" className="rounded-xl bg-blush p-3 text-sm font-semibold text-wine sm:col-span-2">{error}</p> : null}
          {notice ? <p role="status" className="rounded-xl bg-lime-soft p-3 text-sm font-semibold text-forest sm:col-span-2">{notice}</p> : null}
          <button type="submit" className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white transition-colors hover:bg-forest-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:col-span-2">
            Preparar e-mail <ArrowUpRight size={17} aria-hidden />
          </button>
        </form>
      </div>
      <aside className="flex flex-col justify-between gap-5 bg-lime-soft p-6 sm:p-9">
        <div>
          <span className="inline-grid size-12 place-items-center rounded-2xl bg-paper text-forest"><Mail size={22} aria-hidden /></span>
          <h3 className="mt-5 text-xl font-black text-forest-deep">Contato sem compromisso</h3>
          <p className="mt-3 text-sm leading-relaxed text-forest">Esta etapa abre um rascunho no seu aplicativo de e-mail. Não cria cadastro, pedido nem cobrança.</p>
        </div>
        <a href={"mailto:" + DESTINATION} className="break-all text-sm font-extrabold text-forest underline underline-offset-4">{DESTINATION}</a>
      </aside>
    </section>
  );
}
