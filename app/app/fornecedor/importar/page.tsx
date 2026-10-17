import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { SupplierCsvPreview } from "@/components/supplier-csv-preview";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Pré-validar catálogo CSV · Provisio",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** The /app/fornecedor/layout.tsx gate validates the user's active supplier capability. */
export default function SupplierCsvImportPreviewPage() {
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Preparar catálogo" backHref="/app/fornecedor/catalogo" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <Link href="/app/fornecedor/catalogo" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
        <ArrowLeft size={16} aria-hidden/> Meu catálogo
      </Link>
      <section className="mt-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-lime-soft text-forest"><FileSpreadsheet size={23} aria-hidden/></span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-terra">Ferramenta privada de preparação</p>
        <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Pré-validar produtos em CSV</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Confira nomes, unidades, embalagens, preços em centavos e regiões antes de solicitar homologação. Este processo não cadastra produtos nem publica ofertas.</p>
      </section>
      <aside className="mt-6 flex items-start gap-3 rounded-2xl bg-lime-soft p-5 text-sm text-forest">
        <ShieldCheck size={19} className="mt-0.5 shrink-0" aria-hidden/>
        <p>Seu arquivo é lido somente neste navegador, sem upload ao servidor. A prévia não altera o Supabase e não significa aprovação comercial.</p>
      </aside>
      <SupplierCsvPreview/>
    </main>
    <SiteFooter/>
  </div>;
}
