"use client";

import { Check, Mail, Pencil, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

const CONTACT_EMAIL = "contato@grupoprovisio.com";
const SUBJECTS: Record<string,string> = {
  compras: "Compras e catálogo",
  fornecedor: "Parceria de fornecimento",
  entrega: "Regiões e entregas",
  outros: "Outros assuntos",
};

/** Prepara mensagem em cliente de e-mail, nunca simula uma API ou envio confirmado. */
export function ContactForm() {
  const [prepared, setPrepared] = useState(false);
  const [emailLink, setEmailLink] = useState("");

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const subject = String(data.get("subject") || "outros");
    const message = String(data.get("message") || "").trim();
    if (!name || !email || !message || !Object.hasOwn(SUBJECTS,subject)) return;
    const body = [
      "Nome: " + name, "E-mail: " + email, "Assunto: " + SUBJECTS[subject],
      "", message,
    ].join("\n");
    const link = "mailto:" + CONTACT_EMAIL + "?subject=" +
      encodeURIComponent("Grupo Provisio - " + SUBJECTS[subject]) +
      "&body=" + encodeURIComponent(body);
    setEmailLink(link);
    setPrepared(true);
    window.location.href = link;
  }

  if (prepared) return <div className="rounded-3xl bg-lime-soft p-6 text-forest" role="status">
    <Check size={22} className="mb-3" aria-hidden />
    <h2 className="text-xl font-black text-forest-deep">Rascunho de e-mail preparado</h2>
    <p className="mt-2 text-sm leading-relaxed">Nenhum formulário foi enviado ao site. Confira o aplicativo de e-mail e envie a mensagem manualmente. Se o aplicativo não abrir, escreva para <strong>{CONTACT_EMAIL}</strong>.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <a href={emailLink} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white"><Mail size={17} aria-hidden /> Reabrir e-mail</a>
      <button type="button" onClick={() => { setPrepared(false); setEmailLink(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/20 px-5 text-sm font-extrabold text-forest"><Pencil size={17} aria-hidden /> Preencher novamente</button>
    </div>
  </div>;

  return <form onSubmit={prepare} className="rounded-3xl bg-forest p-6 text-white sm:p-8">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Fale com a equipe</p>
    <h2 className="mt-2 text-2xl font-black">Qual é o assunto?</h2>
    <p className="mt-3 text-sm leading-relaxed text-white/80">Este formulário prepara um e-mail para você revisar e enviar. Nenhum dado é enviado automaticamente ao Grupo Provisio.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-extrabold">Nome
        <input required name="name" maxLength={120} autoComplete="name" className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-base font-semibold text-ink outline-none focus-visible:ring-4 focus-visible:ring-lime/40" placeholder="Seu nome" />
      </label>
      <label className="text-sm font-extrabold">E-mail
        <input required name="email" type="email" autoComplete="email" maxLength={254} className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-base font-semibold text-ink outline-none focus-visible:ring-4 focus-visible:ring-lime/40" placeholder="Seu e-mail" />
      </label>
      <label className="text-sm font-extrabold sm:col-span-2">Assunto
        <select required name="subject" className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-base font-semibold text-ink outline-none focus-visible:ring-4 focus-visible:ring-lime/40" defaultValue="compras">
          <option value="compras">Compras e catálogo</option>
          <option value="fornecedor">Fornecedor</option>
          <option value="entrega">Regiões e entregas</option>
          <option value="outros">Outros assuntos</option>
        </select>
      </label>
      <label className="text-sm font-extrabold sm:col-span-2">Mensagem
        <textarea required name="message" maxLength={2000} rows={4} className="mt-2 w-full resize-y rounded-2xl bg-white px-4 py-3 text-base font-semibold text-ink outline-none focus-visible:ring-4 focus-visible:ring-lime/40" placeholder="Como podemos ajudar?" />
      </label>
    </div>
    <button type="submit" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep hover:bg-white focus-visible:ring-4 focus-visible:ring-lime/40">Preparar e-mail <Send size={17} aria-hidden /></button>
  </form>;
}
