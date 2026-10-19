import type { Metadata } from "next";
import { TransactionConsole } from "@/components/marketplace-transaction-console";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Cotações recebidas · Fornecedor · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function SupplierQuotesPage(){
  const summary=await myMarketplaceOrganizations("fornecedor");
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Cotações recebidas" backHref="/app/fornecedor" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <p className="text-xs font-black uppercase tracking-wider text-terra">Área privada · Fornecedor</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Cotações recebidas</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted">Receba solicitações e responda com valores e validade reais da sua organização. As propostas são registradas somente com autorização e habilitação de transações no ambiente.</p>
      {summary.error?<div role="alert" className="mt-6 rounded-2xl bg-sand p-5 text-sm text-forest">Não foi possível confirmar suas organizações de fornecimento.</div>:
      <TransactionConsole mode="supplier-quotes" organizations={summary.organizations}/>}
    </main>
    <SiteFooter/>
  </div>;
}
