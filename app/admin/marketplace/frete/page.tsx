import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminNav } from "@/components/admin-nav";
import { AdminFreightSettings } from "@/components/admin-freight-settings";
import { WRAP } from "@/lib/ui";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Fretes e entregas · ADM Provisio",robots:{index:false,follow:false}};
export default function AdminFreightPage(){
 return <div className="min-h-dvh bg-canvas">
  <AppHeader theme="wine" title="Fretes e entregas" backHref="/admin/marketplace" showListButton={false}/>
  <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
   <AdminNav/>
   <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">
    <ArrowLeft size={17} aria-hidden/> Administração
   </Link>
   <h1 className="mb-2 mt-5 text-3xl font-black text-forest-deep sm:text-4xl">
    Frete, origem e prazo de entrega
   </h1>
   <p className="mb-7 max-w-3xl text-sm leading-relaxed text-muted">
    Defina o endereço da unidade e as tarifas autorizadas por faixa de CEP.
    Os valores e prazos aparecem no checkout do comprador e ficam registrados na cotação.
   </p>
   <AdminFreightSettings/>
  </main><SiteFooter/>
 </div>;
}