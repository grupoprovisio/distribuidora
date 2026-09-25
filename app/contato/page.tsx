import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Contato · Distribuidora" };

const CHANNELS = [
  { icon: MessageCircle, label: "WhatsApp comercial", value: "Fale com a equipe", className: "bg-lime-soft text-forest" },
  { icon: Phone, label: "Telefone", value: "(00) 00000-0000", className: "bg-sand text-terra" },
  { icon: Mail, label: "E-mail", value: "comercial@distribuidora.com", className: "bg-mist text-forest" },
];

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="plum" title="Contato" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-plum">Estamos por perto</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-forest-deep sm:text-5xl">Vamos conversar sobre sua operação.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-muted sm:text-lg">Escolha o canal mais conveniente para pedir uma cotação, tirar dúvidas sobre entrega ou falar com o comercial.</p>
        </section>
        <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Canais de atendimento">
          {CHANNELS.map(({ icon: Icon, label, value, className }) => (
            <article key={label} className="rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70">
              <span className={`grid size-11 place-items-center rounded-2xl ${className}`}><Icon size={21} aria-hidden /></span>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</p>
              <p className="mt-2 text-sm font-extrabold text-ink">{value}</p>
            </article>
          ))}
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
