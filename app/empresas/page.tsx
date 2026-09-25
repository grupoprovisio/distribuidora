import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck, ChefHat, CircleDollarSign, ClipboardCheck, Headset, Hotel, PackageCheck, Store, Truck, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BusinessRegistrationForm } from "@/components/business-registration-form";
import { FloatingNav } from "@/components/floating-nav";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Para empresas · Distribuidora",
  description: "Condições comerciais, pedidos por volume e atendimento para restaurantes, bares, mercados e empresas.",
};

const SEGMENTS = [
  { icon: ChefHat, title: "Restaurantes e bares", text: "Reposição de ingredientes, bebidas, descartáveis e limpeza." },
  { icon: Store, title: "Mercados e varejo", text: "Mix para gôndola, giro rápido e compras recorrentes." },
  { icon: Hotel, title: "Hotéis e condomínios", text: "Abastecimento organizado para operações contínuas." },
  { icon: UsersRound, title: "Revendedores", text: "Volume, previsibilidade e condições para revenda." },
];

const BENEFITS = [
  { icon: CircleDollarSign, title: "Preço por volume", text: "Condições progressivas conforme quantidade e perfil de compra." },
  { icon: CalendarCheck, title: "Pedido recorrente", text: "Repita sua operação e programe a reposição com mais agilidade." },
  { icon: Headset, title: "Vendedor parceiro", text: "Atendimento comercial para negociar mix, prazo e condição." },
  { icon: Truck, title: "Entrega regional", text: "Rotas, janelas e frete avaliados conforme sua região." },
];

const STEPS = [
  ["01", "Conte sobre seu negócio", "Informe segmento, cidade e volume médio de compra."],
  ["02", "Receba uma condição", "Nossa equipe avalia o perfil e prepara a melhor proposta."],
  ["03", "Monte seus pedidos", "Use o catálogo, solicite orçamento ou fale com seu vendedor."],
  ["04", "Abasteça no ritmo certo", "Acompanhe a entrega e repita seus pedidos com facilidade."],
] as const;

export default function BusinessPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Para empresas" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="group relative overflow-hidden rounded-[2rem] bg-forest px-6 py-10 text-white shadow-float transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-18px_rgb(8_54_45_/_0.6)] focus-within:-translate-y-1 sm:px-10 sm:py-14" aria-labelledby="business-title">
          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Atendimento B2B</p>
            <h1 id="business-title" className="mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">Sua operação precisa de uma distribuidora parceira.</h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/75 sm:text-lg">Compre em volume, receba condições comerciais e organize seu abastecimento com catálogo, atendimento e entrega pensados para empresas.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#cadastro" className="inline-flex h-12 items-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep outline-none transition-all duration-200 hover:bg-white hover:shadow-card focus-visible:ring-4 focus-visible:ring-lime/50 active:scale-95">Solicitar cadastro <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden /></a>
              <Link href="/orcamento" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/12 px-6 text-sm font-extrabold text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-lime/50">Solicitar orçamento</Link>
            </div>
          </div>
          <div aria-hidden className="absolute -right-20 -top-24 size-80 rounded-full border-[3rem] border-lime/15 sm:size-[28rem]" />
          <div aria-hidden className="absolute -bottom-32 right-24 size-64 rounded-full border-[2rem] border-terra/25" />
        </section>

        <section className="mt-12" aria-labelledby="segments-title">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Para quem fornecemos</p>
          <h2 id="segments-title" className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">Uma operação, vários tipos de negócio.</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">{SEGMENTS.map(({ icon: Icon, title, text }, index) => <article key={title} className="group animate-page-in rounded-3xl bg-paper p-4 shadow-card ring-1 ring-line/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-float focus-within:-translate-y-1 focus-within:shadow-float sm:p-5" style={{ animationDelay: `${index * 90}ms` }}><span className="grid size-10 place-items-center rounded-2xl bg-lime-soft text-forest transition-all duration-300 group-hover:scale-110 group-hover:bg-lime sm:size-11"><Icon size={20} aria-hidden /></span><h3 className="animate-text-rise mt-4 text-sm font-extrabold leading-tight sm:mt-5 sm:text-base" style={{ animationDelay: `${index * 90 + 140}ms` }}>{title}</h3><p className="animate-text-rise mt-2 text-xs font-medium leading-relaxed text-muted sm:text-sm" style={{ animationDelay: `${index * 90 + 220}ms` }}>{text}</p></article>)}</div>
        </section>

        <section className="mt-12" aria-labelledby="benefits-title">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-plum">Mais que um catálogo</p><h2 id="benefits-title" className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">Condições para a rotina real.</h2></div><BarChart3 className="hidden size-9 text-plum sm:block" aria-hidden /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{BENEFITS.map(({ icon: Icon, title, text }, index) => <article key={title} className="group animate-page-in flex gap-4 rounded-3xl bg-paper p-5 shadow-card ring-1 ring-line/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-float" style={{ animationDelay: `${index * 90}ms` }}><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blush text-plum transition-all duration-300 group-hover:scale-110 group-hover:bg-[#f4c9d4]"><Icon size={21} aria-hidden /></span><div><h3 className="animate-text-rise text-base font-extrabold" style={{ animationDelay: `${index * 90 + 140}ms` }}>{title}</h3><p className="animate-text-rise mt-1 text-sm font-medium leading-relaxed text-muted" style={{ animationDelay: `${index * 90 + 220}ms` }}>{text}</p></div></article>)}</div>
        </section>

        <section className="mt-12 rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8" aria-labelledby="how-title">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-sand text-terra"><ClipboardCheck size={21} aria-hidden /></span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Como funciona</p><h2 id="how-title" className="mt-1 text-2xl font-black tracking-tight text-forest-deep">Da primeira conversa ao próximo pedido.</h2></div></div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map(([number, title, text]) => <div key={number}><span className="text-xs font-black text-terra">{number}</span><h3 className="mt-3 text-base font-extrabold">{title}</h3><p className="mt-2 text-sm font-medium leading-relaxed text-muted">{text}</p></div>)}</div>
        </section>

        <section id="cadastro" className="mt-12 grid scroll-mt-6 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <BusinessRegistrationForm />
          <aside className="group rounded-[2rem] bg-wine p-6 text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float focus-within:-translate-y-1 sm:p-8"><PackageCheck size={25} className="text-lime transition-transform duration-300 group-hover:scale-110" aria-hidden /><h2 className="mt-5 text-2xl font-black">O que acontece depois?</h2><ul className="mt-5 space-y-4 text-sm font-medium leading-relaxed text-white/75"><li>Seu cadastro entra em análise comercial.</li><li>A equipe confirma área de atendimento e categorias.</li><li>Você recebe orientação sobre preços, volume e entrega.</li><li>O acesso ao perfil empresarial pode ser liberado após aprovação.</li></ul><Link href="/contato" className="mt-7 inline-flex items-center gap-1 text-sm font-extrabold text-lime outline-none transition-transform hover:translate-x-1 focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-lime">Falar com a equipe <ArrowRight size={15} aria-hidden /></Link></aside>
        </section>

        <section className="group mt-12 flex flex-col justify-between gap-5 rounded-3xl bg-sand p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float focus-within:-translate-y-1 sm:flex-row sm:items-center sm:p-8"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Já sabe o que precisa?</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#5c3a06]">Monte seu pedido ou envie sua lista.</h2></div><div className="flex flex-wrap gap-2"><Link href="/buscar" className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white outline-none transition-all hover:bg-forest-deep hover:shadow-card focus-visible:ring-4 focus-visible:ring-forest/30">Comprar agora <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden /></Link><Link href="/orcamento" className="inline-flex h-11 items-center rounded-full bg-paper px-5 text-sm font-extrabold text-forest outline-none transition-all hover:bg-white hover:shadow-card focus-visible:ring-4 focus-visible:ring-forest/30">Pedir orçamento</Link></div></section>
      </main>
      <SiteFooter />
      <FloatingNav />
    </div>
  );
}
