"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const body = await response.json() as { url?: string; message?: string };
      if (!response.ok || !body.url) {
        setMessage(body.message ?? "O checkout ainda está em homologação.");
        return;
      }
      window.location.assign(body.url);
    } catch {
      setMessage("Não foi possível iniciar o checkout. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Checkout seguro" backHref="/produtos" showListButton={false} />
      <main className={WRAP + " animate-page-in py-8 sm:py-12"}>
        <section className="mx-auto max-w-3xl rounded-[2rem] bg-paper p-6 shadow-float ring-1 ring-line/70 sm:p-10">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest"><LockKeyhole size={24} aria-hidden /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-terra">Pagamento protegido</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">Finalize sua compra com a Stripe.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">Você será direcionado ao ambiente seguro da Stripe para escolher o meio de pagamento disponível para sua compra.</p>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Checkout hospedado", "Seus dados de pagamento não passam pelo nosso servidor."],
              ["Meios configurados", "A Stripe mostra as opções habilitadas para sua conta e região."],
              ["Confirmação clara", "Depois do pagamento, você volta para a página de confirmação."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-canvas p-4">
                <CheckCircle2 size={18} className="text-forest" aria-hidden />
                <p className="mt-3 text-sm font-extrabold text-forest-deep">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={startCheckout} disabled={loading} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white transition hover:bg-forest-deep disabled:cursor-wait disabled:opacity-60">
            {loading ? "Abrindo checkout..." : "Continuar para pagamento"} <ArrowRight size={17} aria-hidden />
          </button>
          {message && <p role="alert" className="mt-4 rounded-2xl bg-sand p-4 text-sm font-semibold text-forest-deep">{message}</p>}
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted"><ShieldCheck size={17} className="shrink-0 text-forest" aria-hidden />O pagamento só será ativado após a homologação comercial e a configuração das variáveis Stripe no ambiente de produção.</p>
          <Link href="/produtos" className="mt-6 inline-block text-sm font-extrabold text-forest underline-offset-4 hover:underline">Voltar ao catálogo</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
