"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ClipboardList,
  PackageSearch,
  Store,
  Tags,
} from "lucide-react";

const HIGHLIGHT_MARQUEE_SECONDS = 52;
const STEP_ROTATION_MS = 5_000;

const highlights = [
  {
    icon: PackageSearch,
    title: "Encontre o que seu negócio precisa",
    text: "Explore categorias, marcas e produtos em um só catálogo.",
    href: "/produtos",
    action: "Explorar catálogo",
  },
  {
    icon: Tags,
    title: "Confira condições por volume",
    text: "Veja preços e quantidades disponíveis para cada produto.",
    href: "/produtos",
    action: "Ver condições",
  },
  {
    icon: ClipboardList,
    title: "Organize seu próximo pedido",
    text: "Monte uma lista com os itens e quantidades da sua reposição.",
    href: "/app/comprador",
    action: "Montar lista",
  },
  {
    icon: Store,
    title: "Conte com atendimento próximo",
    text: "Converse com a equipe comercial sobre as necessidades do seu negócio.",
    href: "/contato",
    action: "Falar com a equipe",
  },
];

const steps = [
  {
    title: "Encontre seus produtos",
    text: "Pesquise por nome, navegue pelas categorias e descubra as marcas disponíveis na filial selecionada.",
    href: "/produtos",
    action: "Abrir catálogo",
  },
  {
    title: "Monte uma lista organizada",
    text: "Escolha os itens e as quantidades para deixar sua reposição pronta para revisar.",
    href: "/app/comprador",
    action: "Começar uma lista",
  },
  {
    title: "Confira as condições",
    text: "Consulte preços e opções por quantidade antes de concluir seu pedido.",
    href: "/produtos",
    action: "Ver condições",
  },
];

export function HomeMarketplaceShowcase() {
  const [activeStep, setActiveStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((index) => (index + 1) % steps.length);
    }, STEP_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [activeStep]);


  return (
    <>
    <section
      className="home-showcase mt-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-paper via-paper to-lime-soft/50 px-5 py-8 shadow-card ring-1 ring-line/70 sm:mt-12 sm:rounded-[3rem] sm:px-8 sm:py-12 lg:px-12 lg:py-14"
      aria-labelledby="home-showcase-title"
    >
      <div className="mb-8 max-w-3xl sm:mb-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-terra">Abastecimento profissional</p>
          <h2 id="home-showcase-title" className="mt-3 text-3xl font-black leading-tight tracking-tight text-forest-deep sm:text-4xl lg:text-5xl">
            Uma rotina de compras mais simples para o seu negócio.
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            Encontre produtos, organize sua reposição e confira as condições disponíveis para a filial escolhida.
          </p>
      </div>
      <div className="home-highlight-window" role="region" aria-label="Destaques da plataforma">
        <div className="home-highlight-track" style={{ "--home-highlight-duration": `${HIGHLIGHT_MARQUEE_SECONDS}s` } as CSSProperties}>
          {[false, true].map((duplicate) => (
            <div key={String(duplicate)} className="home-highlight-group" aria-hidden={duplicate}>
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={`home-highlight-card flex min-h-64 flex-col rounded-[1.75rem] p-5 shadow-card ring-1 ring-line/70 sm:min-h-80 sm:rounded-[2rem] sm:p-7 ${
                      index % 2 === 0 ? "bg-forest text-white" : "bg-canvas text-ink"
                    }`}
                  >
                    <span className={`grid size-12 place-items-center rounded-2xl ${index % 2 === 0 ? "bg-white/15 text-lime" : "bg-lime-soft text-forest"}`}>
                      <Icon size={24} aria-hidden />
                    </span>
                    <p className="mt-6 text-lg font-extrabold leading-tight sm:text-xl">{item.title}</p>
                    <p className={`mt-3 text-sm font-medium leading-relaxed ${index % 2 === 0 ? "text-white/75" : "text-muted"}`}>{item.text}</p>
                    <Link
                      href={item.href}
                      tabIndex={duplicate ? -1 : undefined}
                      className={`mt-auto inline-flex items-center gap-1 pt-4 text-xs font-extrabold ${index % 2 === 0 ? "text-lime" : "text-forest"}`}
                    >
                      {item.action} <ArrowRight size={13} aria-hidden />
                    </Link>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      </section>

      <article className="group mt-8 grid overflow-hidden rounded-[2rem] bg-forest text-white shadow-card sm:mt-10 sm:min-h-[320px] sm:grid-cols-[1.05fr_0.95fr] sm:rounded-[2.5rem]" aria-label="Compra recorrente">
        <div className="relative h-52 overflow-hidden sm:order-2 sm:h-auto sm:min-h-[320px]">
          <Image
            src="/images/provisio/chef-retrato.png"
            alt="Profissional de cozinha sorrindo em seu ambiente de trabalho"
            fill
            sizes="(max-width: 639px) 100vw, 50vw"
            className="object-cover object-[center_22%] transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col justify-center p-6 sm:order-1 sm:p-8 lg:p-12">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Compra recorrente</p>
          <blockquote className="mt-4 text-xl font-extrabold leading-snug sm:text-2xl lg:text-3xl">“Quando o pedido é organizado, sobra tempo para cuidar do negócio.”</blockquote>
          <p className="mt-5 text-xs font-bold text-white/80 sm:text-sm">Atendimento comercial para volumes e rotas especiais.</p>
        </div>
      </article>

    <section className="mt-10 grid gap-6 rounded-[2.5rem] bg-forest p-5 text-white shadow-float sm:mt-12 sm:rounded-[3rem] sm:p-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12 lg:p-12" aria-labelledby="home-how-title">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Do catálogo ao pedido</p>
          <h3 id="home-how-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Como funciona</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-white/75 sm:text-base">Acompanhe cada etapa. O próximo passo abre automaticamente a cada 5 segundos, em um ciclo contínuo.</p>
        </div>

        <div className="divide-y divide-line rounded-[1.75rem] bg-paper px-4 text-ink shadow-card ring-1 ring-white/40 sm:px-7">
          {steps.map((step, index) => {
            const expanded = activeStep === index;
            return (
              <div key={step.title} className="relative">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`home-how-step-${index}`}
                  onClick={() => setActiveStep(index)}
                  className="flex min-h-16 w-full items-center gap-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${expanded ? "bg-forest text-white" : "bg-canvas text-muted"}`}>
                    0{index + 1}
                  </span>
                  <span className={`flex-1 text-sm font-extrabold ${expanded ? "text-forest-deep" : "text-ink"}`}>{step.title}</span>
                  <span className={`text-xl font-medium transition-transform ${expanded ? "rotate-45 text-terra" : "text-muted"}`} aria-hidden>+</span>
                </button>
                {expanded ? (
                  <div id={`home-how-step-${index}`} className="home-step-content pb-5 pl-11">
                    <div className="home-step-timer mb-3 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <span key={activeStep} style={{ animationDuration: `${STEP_ROTATION_MS}ms`, animationPlayState: reducedMotion ? "paused" : "running" }} />
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-muted">{step.text}</p>
                    <Link href={step.href} className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-forest">
                      {step.action} <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-[2.5rem] bg-paper px-5 py-8 shadow-card ring-1 ring-line/70 sm:mt-12 sm:rounded-[3rem] sm:px-8 sm:py-10 lg:px-12" aria-labelledby="home-brand-title">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Uma seleção do catálogo</p>
            <h3 id="home-brand-title" className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">Marcas que fazem parte da sua rotina.</h3>
          </div>
          <p className="text-sm font-medium text-muted">Disponibilidade conforme a filial selecionada.</p>
        </div>
        <div className="min-w-0">
          <div className="home-brand-window h-8" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
