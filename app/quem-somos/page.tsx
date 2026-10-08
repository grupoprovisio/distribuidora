import type { Metadata } from "next";
import { Boxes, Handshake, Route, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Quem somos · Distribuidora" };

const PILLARS = [
  { icon: Boxes, title: "Mix para o negócio", text: "Um catálogo pensado para reposição, operação e compras recorrentes." },
  { icon: Route, title: "Entrega que combina", text: "Regras claras por região e uma experiência simples para acompanhar o pedido." },
  { icon: Handshake, title: "Relação comercial", text: "Atendimento próximo para encontrar a melhor condição para cada cliente." },
  { icon: ShieldCheck, title: "Compra com clareza", text: "Preço, embalagem, quantidade e disponibilidade apresentados sem surpresa." },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Quem somos" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-terra">Para comprar melhor</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-forest-deep sm:text-6xl">Abastecimento sem complicação.</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            A Distribuidora aproxima bons produtos de quem faz o comércio acontecer. Nossa plataforma organiza catálogo, volume e atendimento em uma experiência rápida para o dia a dia do seu negócio.
          </p>
        </section>
        <section className="mt-12 grid gap-3 sm:grid-cols-2" aria-label="Nossos diferenciais">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70">
              <span className="grid size-11 place-items-center rounded-2xl bg-lime-soft text-forest"><Icon size={21} aria-hidden /></span>
              <h2 className="mt-5 text-lg font-extrabold">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{text}</p>
            </article>
          ))}
        </section>
        <section className="mt-10 rounded-3xl bg-forest p-6 text-white sm:p-8">
          <p className="max-w-2xl text-lg font-extrabold leading-snug sm:text-2xl">Da primeira compra à reposição da semana, a ideia é deixar cada decisão mais simples.</p>
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/70">Conheça o catálogo, monte sua lista e fale com a equipe quando precisar de uma condição comercial.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
