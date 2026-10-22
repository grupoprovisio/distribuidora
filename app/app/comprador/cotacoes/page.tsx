import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { BuyerQuoteDraft } from "@/components/buyer-quote-draft";
import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { SiteFooter } from "@/components/site-footer";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Cotações empresariais · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function BuyerQuotesPage({searchParams}:{searchParams:Promise<{oferta?:string;regiao?:string}>}) {
  const params=await searchParams;
  const summary=await myMarketplaceOrganizations("comprador");
  const enabled=process.env.MARKETPLACE_TRANSACTIONS_ENABLED==="true";
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Cotações" backHref="/app/comprador" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Área privada · Comprador</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Solicitações de cotação</h1>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-muted">
        Solicite condições a fornecedores homologados e acompanhe propostas válidas.
        A ativação transacional depende de migração e homologação; nenhuma operação processa pagamento.
      </p>
      {enabled&&!summary.error
        ? <TransactionConsole mode="buyer_quotes" organizations={summary.organizations}
            initialOffer={params.oferta??""} initialRegion={params.regiao??"BR-SP"}/>
        : <><p role="status" className="mb-6 rounded-2xl bg-sand p-4 text-sm font-bold text-forest-deep">
            Operação transacional ainda desativada neste ambiente. Você pode preparar um rascunho para enviar manualmente.
          </p><BuyerQuoteDraft/></>}
    </main><SiteFooter/>
  </div>;
}
