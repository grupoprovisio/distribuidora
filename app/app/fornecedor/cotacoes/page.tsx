import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { MarketplaceModule } from "@/components/marketplace-module";
import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { transactionEnabledForAccess } from "@/lib/marketplace/qa-transaction-gate";

export const metadata:Metadata={title:"Cotações recebidas · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function SupplierQuotesPage() {
  if(!transactionEnabledForAccess(await getMarketplaceAccess()))
    return <MarketplaceModule title="Cotações" description="As propostas comerciais permanecem desativadas até migração, autenticação e testes de isolamento no Preview." backHref="/app/fornecedor" accent="terra"/>;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Cotações recebidas" backHref="/app/fornecedor" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <h1 className="text-3xl font-black text-forest-deep sm:text-4xl">Cotações para seu fornecimento</h1>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">
        Analise solicitações do comprador e proponha um preço válido. Só sua organização autorizada pode responder.
      </p>
      <TransactionConsole mode="supplier_quotes"/>
    </main><SiteFooter/>
  </div>;
}
