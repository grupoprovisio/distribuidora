import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export function MarketplaceInfoPage({ eyebrow, title, intro, bullets, cta = "/compradores" }: { eyebrow: string; title: string; intro: string; bullets: string[]; cta?: string }) {
  return <div className="min-h-dvh bg-canvas"><AppHeader theme="forest" title={title} backHref="/" /><main className={`${WRAP} animate-page-in py-8 sm:py-12`}><section className="mx-auto max-w-3xl rounded-[2rem] bg-paper p-7 shadow-card ring-1 ring-line/70 sm:p-10"><span className="grid size-12 place-items-center rounded-2xl bg-lime-soft text-forest"><ShieldCheck size={24} aria-hidden /></span><p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-terra">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-5xl">{title}</h1><p className="mt-5 text-base font-medium leading-relaxed text-muted">{intro}</p><ul className="mt-7 space-y-4">{bullets.map((bullet) => <li key={bullet} className="flex gap-3 text-sm font-semibold leading-relaxed"><Check className="mt-0.5 shrink-0 text-forest" size={18} aria-hidden />{bullet}</li>)}</ul><Link href={cta} className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white hover:bg-forest-deep focus-visible:ring-4 focus-visible:ring-lime/50">Conhecer a plataforma <ArrowRight size={15} aria-hidden /></Link></section></main><SiteFooter /></div>;
}
