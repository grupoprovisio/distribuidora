import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { BuyerQuoteRequests } from "@/components/buyer-quote-requests";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Minhas solicitações · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BuyerRequestsPage({searchParams}:{
  searchParams:Promise<{enviada?:string}>
}){
  const params=await searchParams;
  const submitted=/^[0-9a-f-]{36}$/i.test(params.enviada??"")?params.enviada:undefined;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Minhas solicitações" backHref="/app/comprador" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <h1 className="mb-2 text-3xl font-black text-forest-deep sm:text-4xl">Acompanhe suas cotações</h1>
      <p className="mb-6 text-sm text-muted">Veja suas solicitações, respostas dos fornecedores e a situação de cada pedido.</p>
      <BuyerQuoteRequests submittedId={submitted}/>
    </main><SiteFooter/>
  </div>;
}
