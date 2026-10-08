import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Produto autorizado · Distribuidora" };

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <div className="min-h-dvh bg-canvas"><AppHeader theme="forest" title="Produto autorizado" backHref="/produtos" /><main className={`${WRAP} animate-page-in py-8 sm:py-12`}><section className="mx-auto max-w-2xl rounded-[2rem] bg-paper p-7 text-center shadow-card ring-1 ring-line/70 sm:p-10"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-lime-soft text-forest"><ShieldCheck size={27} aria-hidden /></span><p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-terra">Catálogo próprio</p><h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep">Oferta ainda não publicada</h1><p className="mt-4 text-sm font-medium leading-relaxed text-muted">O item “{slug}” só poderá aparecer aqui quando estiver vinculado a uma oferta aprovada e vigente. Nenhum dado externo é convertido automaticamente.</p><Link href="/produtos" className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white hover:bg-forest-deep"><ArrowLeft size={15} aria-hidden /> Voltar aos produtos</Link></section></main><SiteFooter /></div>;
}
