import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { CheckoutView } from "@/components/checkout-view";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Finalizar pedido · Distribuidora" };

export default function CheckoutPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Finalizar pedido" backHref="/lista" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}><CheckoutView /></main>
      <SiteFooter />
    </div>
  );
}
