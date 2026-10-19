import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const dynamic = "force-dynamic";
export default async function BuyerOrdersPage() {
 const summary=await myMarketplaceOrganizations("comprador");
 return <div className="min-h-dvh bg-canvas"><AppHeader theme="forest" title="Pedidos" backHref="/app/comprador" showListButton={false}/><main className={WRAP+" py-8 sm:py-12"}><h1 className="text-3xl font-black text-forest-deep">Pedidos e acompanhamento</h1><p className="mt-3 text-sm text-muted">Solicitações aguardam confirmação do fornecedor. Não há pagamento, reserva ou entrega automática.</p>{summary.error?<p role="alert">Empresas indisponíveis.</p>:<TransactionConsole mode="buyer-orders" organizations={summary.organizations}/>}</main><SiteFooter/></div>;
}
