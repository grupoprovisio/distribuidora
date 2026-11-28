import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BuyerProfileForm } from "@/components/buyer-profile-form";
import { SiteFooter } from "@/components/site-footer";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { WRAP } from "@/lib/ui";
export const metadata:Metadata={title:"Meu cadastro · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function BuyerProfilePage({searchParams}:{searchParams:Promise<{empresa?:string}>}){
 const params=await searchParams;
 await requireMarketplacePortal("comprador");
 const summary=await myMarketplaceOrganizations("comprador");
 const orgId=summary.organizations.some(org=>org.id===params.empresa)?params.empresa:summary.organizations.length===1?summary.organizations[0]?.id:undefined;
 return <div className="min-h-dvh bg-canvas">
   <AppHeader theme="forest" title="Meu cadastro" backHref="/app/comprador" showListButton={false}/>
   <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
    <Link href="/app/comprador" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">
      <ArrowLeft size={17} aria-hidden/> Área do comprador
    </Link>
    <h1 className="mb-5 mt-4 text-3xl font-black text-forest-deep sm:text-4xl">Meu cadastro</h1>
    {orgId&&!summary.error?<BuyerProfileForm buyerOrgId={orgId}/>:
     <p role="alert" className="rounded-2xl bg-paper p-5 text-sm text-muted">
      Selecione sua empresa autorizada na Área do comprador para editar o cadastro correto.
     </p>}
   </main><SiteFooter/>
 </div>;
}