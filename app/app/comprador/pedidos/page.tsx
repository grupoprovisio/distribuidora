import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { MarketplaceModule } from "@/components/marketplace-module";
import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { transactionEnabledForAccess } from "@/lib/marketplace/qa-transaction-gate";

export const metadata:Metadata={title:"Solicitações de pedido · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BuyerOrdersPage() {
  if(!transactionEnabledForAccess(await getMarketplaceAccess()))
    return <MarketplaceModule title="Pedidos e subpedidos" description="O checkout e as solicitações comerciais seguem desativados até a homologação do banco e do Preview. Nenhum pagamento está disponível." backHref="/app/comprador"/>;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Pedidos" backHref="/app/comprador" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <h1 className="text-3xl font-black text-forest-deep sm:text-4xl">Minhas solicitações de pedido</h1>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">
        Confira os pedidos enviados a fornecedores após aceitar uma proposta de cotação. São solicitações pendentes de confirmação, sem cobrança ou baixa de estoque.
      </p>
      <TransactionConsole mode="buyer_orders"/>
    </main><SiteFooter/>
  </div>;
}
