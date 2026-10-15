import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Contato · Grupo Provisio",
  description: "Entre em contato com a equipe do Grupo Provisio sobre a futura plataforma B2B.",
};

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="plum" title="Contato" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-plum">Grupo Provisio</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-forest-deep sm:text-5xl">Vamos conversar sobre sua operação.</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            A plataforma comercial B2B está em desenvolvimento. Entre em contato por e-mail para dúvidas sobre a proposta de abastecimento, parcerias e representação.
          </p>
        </section>
        <section className="mt-10 max-w-3xl" aria-label="Contato comercial"><ContactForm /></section>
      </main>
      <SiteFooter />
    </div>
  );
}
