import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  ChefHat,
  ClipboardCheck,
  Handshake,
  Headset,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Grupo Provisio | Distribuição e abastecimento para empresas",
  description:
    "Conheça a distribuição B2B do Grupo Provisio. Soluções de abastecimento para restaurantes, comércios e empresas, com atendimento comercial.",
};

const services = [
  {
    icon: Boxes,
    title: "Distribuição para negócios",
    description:
      "Soluções de abastecimento para operações profissionais, com foco nas necessidades de cada empresa.",
  },
  {
    icon: ClipboardCheck,
    title: "Planejamento de reposição",
    description:
      "Converse com nossa equipe sobre frequência, volume e organização das suas compras.",
  },
  {
    icon: Headset,
    title: "Atendimento comercial",
    description:
      "Um canal para avaliar solicitações, condições comerciais e possibilidades de atendimento.",
  },
] as const;

const segments = [
  {
    icon: ChefHat,
    title: "Restaurantes e cozinhas",
    description: "Insumos e materiais para a rotina de produção e atendimento.",
  },
  {
    icon: Store,
    title: "Comércios e revendedores",
    description: "Abastecimento de acordo com o perfil e o volume do negócio.",
  },
  {
    icon: Building2,
    title: "Empresas e operações",
    description: "Reposição de materiais para estruturas de diferentes portes.",
  },
  {
    icon: Handshake,
    title: "Parceiros comerciais",
    description: "Relacionamentos para construir soluções de fornecimento B2B.",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Conte o que precisa",
    description: "Compartilhe o segmento, a região e as necessidades da sua operação.",
  },
  {
    number: "02",
    title: "Avaliação comercial",
    description: "Nossa equipe analisa o perfil e as possibilidades de atendimento.",
  },
  {
    number: "03",
    title: "Abastecimento planejado",
    description: "Alinhe condições, volumes e organização da reposição conforme a proposta.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <AppHeader theme="forest" title="Grupo Provisio" />

      <main className={`${WRAP} pt-2`}>
        <section
          aria-labelledby="home-title"
          className="relative overflow-hidden rounded-[2rem] bg-forest px-6 py-9 text-white shadow-float sm:px-10 sm:py-12 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)] lg:items-center lg:gap-10"
        >
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">
              Grupo Provisio · Distribuição B2B
            </p>
            <h1
              id="home-title"
              className="mt-4 max-w-3xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl"
            >
              Abastecimento que acompanha o ritmo do seu negócio.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/80 sm:text-base">
              Somos uma distribuidora voltada a empresas. Conectamos necessidades de
              abastecimento a atendimento comercial e soluções para a rotina de cada operação.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/empresas"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-extrabold text-forest-deep transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                Conhecer nossas soluções <ArrowRight size={17} aria-hidden />
              </Link>
              <Link
                href="/contato"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/50"
              >
                Falar com o comercial
              </Link>
            </div>
          </div>
          <div
            aria-label="Atuação em distribuição, abastecimento e relacionamento empresarial"
            className="relative z-10 mt-9 rounded-3xl border border-white/20 bg-white/10 p-5 sm:p-6 lg:mt-0"
          >
            <p className="text-xs font-black uppercase tracking-[0.12em] text-lime">
              O que nos move
            </p>
            <div className="mt-5 space-y-4">
              {[
                { icon: PackageCheck, label: "Fornecimento para empresas" },
                { icon: Truck, label: "Abastecimento organizado" },
                { icon: ShieldCheck, label: "Relacionamento de confiança" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime">
                    <Icon size={20} aria-hidden />
                  </span>
                  <p className="text-sm font-bold leading-snug text-white">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[3rem] border-lime/10 sm:size-80"
          />
        </section>

        <section className="mt-11" aria-labelledby="solutions-title">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">
            Nossas soluções
          </p>
          <h2
            id="solutions-title"
            className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-forest-deep sm:text-3xl"
          >
            Mais do que produtos: uma parceria para abastecer.
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {services.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-lime-soft text-forest">
                  <Icon size={23} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-extrabold leading-snug">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="segments-title">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">
            Quem atendemos
          </p>
          <h2
            id="segments-title"
            className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl"
          >
            Soluções para diferentes operações.
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {segments.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="flex flex-col rounded-3xl border border-line bg-paper p-5"
              >
                <Icon size={24} className="text-forest" aria-hidden />
                <h3 className="mt-4 text-base font-extrabold leading-tight">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="mt-12 rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8"
          aria-labelledby="how-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">
                Como funciona
              </p>
              <h2
                id="how-title"
                className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl"
              >
                Do primeiro contato ao planejamento de fornecimento.
              </h2>
            </div>
            <Truck size={30} className="hidden text-forest sm:block" aria-hidden />
          </div>
          <ol className="mt-7 grid gap-6 sm:grid-cols-3">
            {steps.map(({ number, title, description }) => (
              <li key={number} className="border-l-2 border-lime pl-4">
                <span className="text-xs font-black tracking-widest text-terra">{number}</span>
                <h3 className="mt-2 text-base font-extrabold">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mt-12 flex flex-col justify-between gap-6 rounded-[2rem] bg-forest-deep p-7 text-white sm:flex-row sm:items-center sm:p-10"
          aria-labelledby="commercial-title"
        >
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">
              Atendimento para empresas
            </p>
            <h2
              id="commercial-title"
              className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl"
            >
              Vamos conversar sobre o abastecimento do seu negócio?
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/75">
              Entre em contato para apresentar sua necessidade e conhecer as
              possibilidades comerciais da Provisio.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/contato"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-extrabold text-forest-deep transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/50"
            >
              Falar com a equipe <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/quem-somos"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/50"
            >
              Conheça a Provisio
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
