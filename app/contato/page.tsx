import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contact-form";
import { ContactTips } from "@/components/contact-tips";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Contato · Distribuidora Provisio" };

const CHANNELS = [
  { icon: MessageCircle, label: "WhatsApp comercial", value: "Fale com a equipe", className: "bg-lime-soft text-forest" },
  { icon: Phone, label: "Telefone", value: "(11) 98269-8119", className: "bg-sand text-terra" },
  { icon: Mail, label: "E-mail", value: "Contato@grupoprovisio.com", className: "bg-mist text-forest" },
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
        <section className="mt-8 grid gap-2 sm:mt-10 sm:grid-cols-3 sm:gap-3" aria-label="Canais de atendimento">
          {CHANNELS.map(({ icon: Icon, label, value, className }) => (
            <article key={label} className="flex items-center gap-4 rounded-2xl bg-paper p-4 shadow-card ring-1 ring-line/70 sm:block sm:rounded-3xl sm:p-6">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${className}`}><Icon size={21} aria-hidden /></span>
              <div className="min-w-0 sm:mt-5">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">{label}</p>
                <p className="mt-1 break-words text-sm font-extrabold text-ink sm:mt-2">{value}</p>
              </div>
            </article>
          ))}
        </section>
        <ContactTips />
        <section className="mt-10" aria-label="Formulário de contato"><ContactForm /></section>
      </main>
      <SiteFooter />
    </div>
  );
}
