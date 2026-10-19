import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { MarketplaceModule } from "@/components/marketplace-module";
import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Pedidos recebidos · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function SupplierOrdersPage() {
  if(process.env.MARKETPLACE_TRANSACTIONS_ENABLED!=="true")
    return <MarketplaceModule title="Pedidos e subpedidos" description="A consulta real de pedidos aguarda homologação do fluxo e liberação do ambiente Preview." backHref="/app/fornecedor" accent="terra"/>;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Pedidos recebidos" backHref="/app/fornecedor" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <h1 className="text-3xl font-black text-forest-deep sm:text-4xl">Solicitações recebidas</h1>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">
        Solicitações para confirmação comercial do fornecedor. Sem pagamento, separação ou expedição automáticos.
      </p>
      <TransactionConsole mode="supplier_orders"/>
    </main><SiteFooter/>
  </div>;
}
