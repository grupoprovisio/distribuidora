import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { MarketplaceModule } from "@/components/marketplace-module";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { transactionEnabledForAccess } from "@/lib/marketplace/qa-transaction-gate";
import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { BuyerPaymentOrders } from "@/components/buyer-payment-orders";

export const metadata:Metadata={title:"Meus pedidos · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BuyerOrdersPage() {
  if(!transactionEnabledForAccess(await getMarketplaceAccess()))
    return <MarketplaceModule title="Pedidos e subpedidos" description="O checkout e as solicitações comerciais seguem desativados até a homologação do banco e do Preview. Nenhum pagamento está disponível." backHref="/app/comprador"/>;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Pedidos" backHref="/app/comprador" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <h1 className="text-3xl font-black text-forest-deep sm:text-4xl">Meus pedidos</h1>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">
        Acompanhe os pedidos pagos e as solicitações de pedido feitas por cotação.
      </p>
      <div className="space-y-6">
        <BuyerPaymentOrders />
        <TransactionConsole mode="buyer_orders" />
      </div>
    </main><SiteFooter/>
  </div>;
}
