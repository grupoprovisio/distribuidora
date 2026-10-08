import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, ClipboardCheck, Handshake, MapPinned, ShieldCheck, ShoppingBasket, Sparkles, Users } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FloatingNav } from "@/components/floating-nav";
import { MarketplaceLeadForm } from "@/components/marketplace-lead-form";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Sou vendedor | Provisio — Conecte negócios",
  description: "Conheça a proposta comercial da Provisio para vendedores e representantes que conectam restaurantes, compradores e fornecedores.",
};

const assets = {
  hero: "/images/vendedores/chef-hero.png",
  portrait: "/images/vendedores/chef-retrato.png",
  produce: "/images/vendedores/chef-insumos.png",
};

const advantages = [
  { icon: ShoppingBasket, title: "Portfólio com contexto", text: "Apresente soluções de abastecimento com produtos, apresentações e condições comerciais organizadas." },
  { icon: Users, title: "Relacionamento de verdade", text: "Acompanhe seus compradores com histórico e comunicação pensados para o negócio." },
  { icon: MapPinned, title: "Atuação por região", text: "Estruture sua carteira e oportunidades de acordo com seu território de atendimento." },
  { icon: ClipboardCheck, title: "Processos claros", text: "Pedidos, propostas e acompanhamento em uma jornada mais previsível para todos." },
];

export default function VendedoresPage() {
  return <div className="min-h-dvh bg-[#f8f7f3] text-[#263b32]">
    <AppHeader theme="forest" title="Sou vendedor" backHref="/" />
    <main>
      <section aria-labelledby="vendedor-title" className="relative isolate overflow-hidden bg-[#102f26] text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-[center_35%]" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,37,29,.97) 0%, rgba(10,37,29,.84) 44%, rgba(10,37,29,.34) 100%),url("${assets.hero}")` }} />
        <div className={`${WRAP} relative z-10 grid min-h-[620px] items-center gap-12 py-20 sm:min-h-[690px] lg:grid-cols-[minmax(0,1fr)_330px] lg:py-28`}>
          <div className="max-w-[720px]">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.17em] text-[#d5edaa]"><Sparkles size={14} aria-hidden /> Para quem conecta bons negócios</p>
            <h1 id="vendedor-title" className="mt-7 text-[clamp(2.8rem,5.2vw,5.2rem)] font-black leading-[1.04] tracking-[-.045em]">Seu relacionamento vale mais quando encontra <span className="text-[#d5edaa]">as oportunidades certas.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/80 sm:text-xl">Aproxime restaurantes e negócios de alimentação de uma nova experiência de abastecimento. Mais clareza para vender, mais confiança para comprar.</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="#interesse" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d5edaa] px-7 py-4 text-sm font-extrabold text-[#173b30] transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#d5edaa]">Quero ser vendedor <ArrowRight size={18} aria-hidden /></a><a href="#como-funciona" className="inline-flex min-h-12 items-center rounded-full border border-white/60 px-7 py-4 text-sm font-bold transition hover:bg-white/10">Entenda a proposta</a></div>
          </div>
          <aside className="rounded-[1.75rem] border border-white/20 bg-[#0b2c23]/85 p-7 shadow-2xl backdrop-blur-md sm:p-8" aria-label="Conheça a oportunidade">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#d5edaa]/15 text-[#d5edaa]"><Handshake size={24} aria-hidden /></span>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight">Sua próxima conexão começa aqui.</h2><p className="mt-3 text-sm leading-7 text-white/75">Venda com foco nas necessidades reais de cada cozinha e desenvolva novas relações comerciais.</p>
            <div className="my-6 h-px bg-white/15" /><div className="space-y-4 text-sm font-semibold text-white/85"><p className="flex items-center gap-3"><BadgeCheck size={18} className="shrink-0 text-[#d5edaa]"/> Mercado B2B de alimentação</p><p className="flex items-center gap-3"><Users size={18} className="shrink-0 text-[#d5edaa]"/> Relacionamento com empresas</p><p className="flex items-center gap-3"><BriefcaseBusiness size={18} className="shrink-0 text-[#d5edaa]"/> Estrutura comercial organizada</p></div>
            <a href="#interesse" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d5edaa] px-4 py-4 text-sm font-extrabold text-[#173b30] transition hover:bg-white">Tenho interesse <ArrowRight size={17} aria-hidden /></a><p className="mt-3 text-center text-[11px] leading-5 text-white/60">Cadastro de interesse demonstrativo, sem envio de dados nesta etapa.</p>
          </aside>
        </div>
      </section>

      <section className={`${WRAP} py-20 sm:py-24`} aria-labelledby="beneficios-vendedor">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Por que fazer parte</p><h2 id="beneficios-vendedor" className="mt-3 max-w-3xl text-3xl font-black tracking-[-.03em] sm:text-5xl">Tudo o que um bom vendedor precisa para <span className="text-[#597a4e]">ir mais longe.</span></h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{advantages.map(({icon:Icon,title,text})=><article key={title} className="rounded-[1.5rem] border border-[#e3e9df] bg-white p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1"><span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#e8f0dc] text-[#23563f]"><Icon size={22} aria-hidden /></span><h3 className="mt-6 text-xl font-extrabold leading-snug">{title}</h3><p className="mt-3 text-sm leading-7 text-[#64736a]">{text}</p></article>)}</div>
      </section>

      <section className="bg-[#e9eee5] py-20 sm:py-24" aria-labelledby="historia-vendedor"><div className={WRAP}>
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Quem faz a diferença</p><h2 id="historia-vendedor" className="mt-3 text-3xl font-black tracking-[-.03em] sm:text-5xl">Por trás de cada grande prato, existe uma <span className="text-[#597a4e]">grande parceria.</span></h2><p className="mt-5 text-base leading-8 text-[#64736a]">Nosso compromisso começa ouvindo quem vive a rotina de uma cozinha profissional.</p></div>
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative min-h-[380px] overflow-hidden rounded-[1.75rem] bg-[#275342] sm:min-h-[510px]"><div role="img" aria-label="Chef profissional em cozinha de restaurante" className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:`linear-gradient(0deg,rgba(8,33,26,.72),transparent 55%),url("${assets.portrait}")`}}/><div className="relative flex h-full min-h-[380px] flex-col justify-end p-8 text-white sm:min-h-[510px] sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d5edaa]">A cozinha é o nosso ponto de partida</p><h3 className="mt-3 max-w-lg text-2xl font-black leading-tight sm:text-4xl">Gente que entende de comida merece parceiros que entendem de negócios.</h3></div></div>
          <div className="relative min-h-[330px] overflow-hidden rounded-[1.75rem] bg-[#275342] sm:min-h-[510px]"><div role="img" aria-label="Chef selecionando ingredientes frescos" className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:`linear-gradient(0deg,rgba(8,33,26,.77),transparent 55%),url("${assets.produce}")`}}/><div className="relative flex h-full min-h-[330px] flex-col justify-end p-8 text-white sm:min-h-[510px]"><p className="text-sm font-medium text-[#d5edaa]">Para cada desafio</p><h3 className="mt-2 text-2xl font-extrabold">Uma oportunidade de construir confiança.</h3></div></div>
        </div>
        <p className="mt-4 text-xs text-[#64736a]">Imagens ilustrativas produzidas para a comunicação da Provisio. Não representam depoimentos reais de clientes.</p>
      </div></section>

      <section id="como-funciona" className={`${WRAP} scroll-mt-20 grid gap-12 py-20 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:gap-24`} aria-labelledby="passos-vendedor">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Como funciona</p><h2 id="passos-vendedor" className="mt-3 text-3xl font-black tracking-[-.03em] sm:text-5xl">Simples para começar. <span className="text-[#597a4e]">Feito para evoluir.</span></h2><p className="mt-5 text-base leading-8 text-[#64736a]">Uma proposta de relacionamento comercial para quem quer atender melhor e criar novas oportunidades no setor alimentício.</p><Link href="/compradores" className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#245b40] underline underline-offset-4">Conheça a experiência do comprador <ArrowUpRight size={17} aria-hidden /></Link></div>
        <ol className="space-y-0">{[["01","Apresente seu interesse","Conte sobre sua experiência e sua região de atuação."],["02","Conheça nossa proposta","Entenda o modelo B2B e os critérios de participação."],["03","Conecte oportunidades","Desenvolva relacionamentos com compradores e operações de alimentação."],["04","Acompanhe sua atuação","Tenha uma visão mais organizada do relacionamento comercial conforme o serviço evoluir."]].map(([n,t,b],i)=><li key={n} className="flex gap-5 border-b border-[#d8dfd7] py-6 first:pt-0"><span className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-black ${i===0?"bg-[#245b40] text-white":"bg-[#e7ecdf] text-[#245b40]"}`}>{n}</span><div><h3 className="text-xl font-extrabold">{t}</h3><p className="mt-2 text-sm leading-7 text-[#64736a]">{b}</p></div></li>)}</ol>
      </section>

      <section className="bg-[#102f26] py-20 text-center text-white"><div className={WRAP}><p className="text-xs font-black uppercase tracking-[.2em] text-[#d5edaa]">Próximas oportunidades</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">Seu próximo grande negócio pode começar com uma conversa.</h2><p className="mx-auto mt-5 max-w-2xl leading-8 text-white/75">Faça parte do desenvolvimento de uma rede de abastecimento mais conectada.</p><a href="#interesse" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#d5edaa] px-8 py-4 text-sm font-extrabold text-[#173b30] transition hover:bg-white">Quero ser vendedor <ArrowRight size={18} aria-hidden /></a></div></section>
      <section id="interesse" aria-label="Cadastro de interesse de vendedores" className={`${WRAP} scroll-mt-20 py-20`}><MarketplaceLeadForm role="vendedor"/><p className="mt-6 flex items-start gap-2 text-sm leading-6 text-[#64736a]"><ShieldCheck size={18} className="shrink-0" aria-hidden /> Esta etapa é demonstrativa. O formulário não envia seus dados, e nenhuma comissão ou remuneração é prometida nesta página.</p></section>
    </main>
    <SiteFooter/><FloatingNav/>
  </div>;
}
