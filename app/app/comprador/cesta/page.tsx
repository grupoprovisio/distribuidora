import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { BuyerBasketCheckout } from "@/components/buyer-basket-checkout";
import { SiteFooter } from "@/components/site-footer";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Minha cesta · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BuyerBasketPage({
 searchParams,
}:{searchParams:Promise<{regiao?:string}>}){
  const params=await searchParams;
  const access=await requireMarketplacePortal("comprador");
  const summary=await myMarketplaceOrganizations("comprador",access);
  const orgId=summary.organizations[0]?.id;
  const raw=(params.regiao??"BR-SP").trim().toUpperCase();
  const region=/^BR-[A-Z]{2}$/.test(raw)?raw:/^[A-Z]{2}$/.test(raw)?"BR-"+raw:"BR-SP";
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Minha cesta" backHref="/app/comprador/catalogo" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <h1 className="mb-6 text-3xl font-black text-forest-deep sm:text-4xl">Minha cesta</h1>
      {orgId&&!summary.error?
        <BuyerBasketCheckout userId={access.userId} buyerOrgId={orgId} region={region} mode="basket"/>:
        <p role="alert" className="rounded-2xl bg-paper p-5 text-sm text-muted">
          Sua empresa compradora não está disponível nesta sessão.
        </p>}
    </main>
    <SiteFooter/>
  </div>;
}
