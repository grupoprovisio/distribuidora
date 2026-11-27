import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { COMMERCIAL_EMAIL } from "@/lib/commercial-contact";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Contato · Distribuidora" };

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="plum" title="Contato" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-plum">Estamos por perto</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-forest-deep sm:text-5xl">Vamos conversar sobre sua operação.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-muted sm:text-lg">Escreva para pedir uma cotação, tirar dúvidas sobre entrega ou conversar sobre uma parceria.</p>
        </section>
        <section className="mt-10" aria-label="Canal de atendimento">
          <a href={`mailto:${COMMERCIAL_EMAIL}`} className="block max-w-xl rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70 focus-visible:ring-4 focus-visible:ring-forest/40">
            <span className="grid size-11 place-items-center rounded-2xl bg-mist text-forest"><Mail size={21} aria-hidden /></span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-muted">E-mail comercial</p>
            <p className="mt-2 break-all text-sm font-extrabold text-ink underline underline-offset-4">{COMMERCIAL_EMAIL}</p>
          </a>
        </section>
        <section className="mt-10 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8">
          <h2 className="text-xl font-extrabold">Para agilizar o atendimento</h2>
          <div className="mt-5 grid gap-3 text-sm font-semibold text-muted sm:grid-cols-3">
            <p className="rounded-2xl bg-canvas p-4">Informe sua cidade e região de entrega.</p>
            <p className="rounded-2xl bg-canvas p-4">Diga quais categorias e volumes você compra.</p>
            <p className="rounded-2xl bg-canvas p-4">Se já tiver uma lista, envie os SKUs ou fotos.</p>
          </div>
        </section>
        <section className="mt-10" aria-label="Formulário de contato"><ContactForm /></section>
      </main>
      <SiteFooter />
    </div>
  );
}
