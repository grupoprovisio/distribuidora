import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { BuyerPaymentOrders } from "@/components/buyer-payment-orders";
import { SiteFooter } from "@/components/site-footer";
import { MarketplaceModule } from "@/components/marketplace-module";
import { WRAP } from "@/lib/ui";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { transactionEnabledForAccess } from "@/lib/marketplace/qa-transaction-gate";
export const metadata:Metadata={title:"Notas fiscais · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BuyerFiscalPage(){
  if(!transactionEnabledForAccess(await getMarketplaceAccess())) return <MarketplaceModule title="Notas fiscais" description="A documentação fiscal estará disponível após a confirmação do pagamento e autorização da NF-e pela SEFAZ." backHref="/app/comprador"/>;
  return <div className="min-h-dvh bg-canvas"><AppHeader theme="forest" title="Notas fiscais" backHref="/app/comprador" showListButton={false}/><main className={WRAP+" animate-page-in py-8 sm:py-12"}><h1 className="text-3xl font-black text-forest-deep sm:text-4xl">Notas fiscais</h1><p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">Acompanhe a emissão da NF-e. XML e DANFE só serão liberados depois da autorização da SEFAZ; uma prévia visual não tem validade fiscal.</p><BuyerPaymentOrders fiscalOnly/></main><SiteFooter/></div>;
}
