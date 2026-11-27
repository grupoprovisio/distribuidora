"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { COMMERCIAL_EMAIL, CONTACT_TOPICS, prepareContactEmail } from "@/lib/commercial-contact";

const fieldClass = "mt-1 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-ink outline-none focus-visible:ring-4 focus-visible:ring-lime/40";

export function ContactForm() {
  const [draft, setDraft] = useState<ReturnType<typeof prepareContactEmail>>(null);
  const [error, setError] = useState(false);

  return (
    <form method="post" onChange={() => { setDraft(null); setError(false); }} onSubmit={(event) => {
      event.preventDefault();
      const prepared = prepareContactEmail(new FormData(event.currentTarget));
      setDraft(prepared);
      setError(!prepared);
    }} className="rounded-3xl bg-forest p-6 text-white sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Fale com a equipe</p>
      <h2 className="mt-2 text-2xl font-black">Qual é o assunto?</h2>
      <p className="mt-2 text-sm leading-relaxed">Preencha os dados para montar um rascunho. Depois, abra seu aplicativo de e-mail e envie por lá.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold">Nome
          <input required name="name" autoComplete="name" maxLength={100} className={`${fieldClass} h-11`} placeholder="Seu nome" />
        </label>
        <label className="text-sm font-extrabold">Contato
          <input required name="contact" maxLength={120} className={`${fieldClass} h-11`} placeholder="E-mail ou WhatsApp" />
        </label>
        <label className="text-sm font-extrabold sm:col-span-2">Assunto
          <select name="topic" className={`${fieldClass} h-11`} defaultValue="compras">
            {CONTACT_TOPICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-extrabold sm:col-span-2">Mensagem
          <textarea required name="message" maxLength={600} rows={4} className={`${fieldClass} py-3`} placeholder="Como podemos ajudar?" />
        </label>
      </div>
      <button type="submit" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-extrabold text-forest-deep focus-visible:ring-4 focus-visible:ring-lime/40 active:scale-95">
        Preparar e-mail <Send size={15} aria-hidden />
      </button>
      {error && <p role="alert" className="mt-4 text-sm">Preencha seu nome, contato e mensagem para continuar.</p>}
      {draft && (
        <div className="mt-5 rounded-2xl bg-lime-soft p-4 text-sm text-forest-deep">
          <p role="status">Rascunho pronto. Nada foi enviado.</p>
          <a href={draft.href} onClick={() => track("contact_email_click", { source: "contact_form", topic: draft.category })} className="mt-2 inline-flex min-h-11 items-center gap-2 font-extrabold underline underline-offset-4">
            <Mail size={16} aria-hidden /> Abrir no aplicativo de e-mail
          </a>
          <p>Se preferir, copie <strong className="break-all">{COMMERCIAL_EMAIL}</strong> e escreva pelo seu webmail.</p>
        </div>
      )}
    </form>
  );
}
