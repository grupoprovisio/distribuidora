import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { BuyerQuoteDraft } from "@/components/buyer-quote-draft";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Preparar cotação · Comprador · Provisio",
  robots: { index: false, follow: false },
};

export default function BuyerQuotesPage() {
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Cotações" backHref="/app/comprador" showListButton={false} />
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Área privada · Comprador</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Solicitações de cotação</h1>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">
        Prepare os dados de sua necessidade de abastecimento. O envio automático, a negociação e o acompanhamento de propostas estarão disponíveis somente após a homologação do marketplace.
      </p>
      <BuyerQuoteDraft />
    </main>
    <SiteFooter />
  </div>;
}
