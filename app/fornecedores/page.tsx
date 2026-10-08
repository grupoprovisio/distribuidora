import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, Boxes, Building2, Check, ClipboardList, Handshake, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FloatingNav } from "@/components/floating-nav";
import { MarketplaceLeadForm } from "@/components/marketplace-lead-form";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Sou fornecedor | Provisio — Leve seus produtos a quem precisa",
  description: "Conheça a proposta B2B da Provisio para fornecedores e distribuidores que desejam apresentar produtos a restaurantes e negócios de alimentação.",
};

const photos = {
  hero: "/images/fornecedores/chef-hero.png",
  partners: "/images/fornecedores/parceria-cozinha.png",
  operation: "/images/fornecedores/operacao-abastecimento.png",
};

const benefits = [
  { icon: Building2, title: "Mais oportunidades comerciais", detail: "Apresente sua empresa e seu portfólio para uma rede de negócios de alimentação." },
  { icon: ShieldCheck, title: "Uma operação com critérios claros", detail: "Homologação e regras comerciais antes da publicação de ofertas no marketplace." },
  { icon: Boxes, title: "Seu portfólio, sua identidade", detail: "Produtos, embalagens, volumes mínimos e regiões de atendimento organizados por fornecedor." },
  { icon: Truck, title: "Da oferta à entrega", detail: "Uma jornada projetada para dar visibilidade aos pedidos e à responsabilidade de cada operação." },
];

const steps = [
  ["01", "Apresente sua empresa", "Informe o perfil da sua operação e os produtos que deseja oferecer."],
  ["02", "Conheça a homologação", "Entenda os requisitos e a análise necessária para disponibilizar ofertas."],
  ["03", "Estruture seu portfólio", "Organize itens, condições, região e capacidade de atendimento."],
  ["04", "Conecte-se à demanda", "Receba oportunidades de compra quando os fluxos comerciais estiverem habilitados."],
  ["05", "Acompanhe sua operação", "Evolua pedidos e entregas com informações claras para sua equipe."],
];

export default function FornecedoresPage() {
 return <div className="min-h-dvh bg-[#f8f7f3] text-[#263b32]">
  <AppHeader theme="forest" title="Sou fornecedor" backHref="/" />
  <main>
   <section aria-labelledby="supplier-hero" className="relative isolate overflow-hidden bg-[#0e3026] text-white">
    <div className="absolute inset-0 bg-cover bg-[center_40%]" aria-hidden="true" style={{backgroundImage:`linear-gradient(90deg,rgba(8,31,24,.98) 0%,rgba(8,31,24,.85) 43%,rgba(8,31,24,.34) 100%),url("${photos.hero}")`}} />
    <div className={`${WRAP} relative z-10 grid min-h-[650px] gap-12 py-20 lg:min-h-[680px] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-16 lg:py-24`}>
     <div className="max-w-3xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-[#d5edaa]"><Sparkles size={14} aria-hidden="true"/> Para quem produz e distribui</p>
      <h1 id="supplier-hero" className="mt-7 max-w-[770px] text-[clamp(2.8rem,5.2vw,5.2rem)] font-black leading-[1.04] tracking-[-.045em]">Seu produto merece chegar a <span className="text-[#d5edaa]">mais cozinhas.</span></h1>
      <p className="mt-7 max-w-xl text-base leading-8 text-white/85 sm:text-xl">A Provisio aproxima fornecedores de restaurantes e outros negócios de alimentação. Mais visibilidade para sua oferta e relações comerciais construídas com transparência.</p>
      <div className="mt-9 flex flex-wrap gap-3">
       <a href="#interesse" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d5edaa] px-7 py-4 text-sm font-extrabold text-[#173b30] transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#d5edaa]">Quero ser fornecedor <ArrowRight size={18} aria-hidden="true"/></a>
       <a href="#como-funciona" className="inline-flex min-h-12 items-center rounded-full border border-white/60 px-7 py-4 text-sm font-bold transition hover:bg-white/10">Como funciona</a>
      </div>
     </div>
     <aside className="rounded-[1.75rem] border border-white/25 bg-[#0b2c23]/90 p-7 shadow-2xl backdrop-blur-md sm:p-8" aria-label="Oportunidade para fornecedores">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#d5edaa]/15 text-[#d5edaa]"><PackageCheck size={24} aria-hidden="true"/></span>
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight">Sua empresa. Novas conexões.</h2>
      <p className="mt-3 text-sm leading-7 text-white/75">Uma proposta de canal B2B para quem fornece ingredientes, alimentos e soluções de abastecimento.</p>
      <div className="my-6 h-px bg-white/15"/>
      <div className="space-y-4 text-sm font-semibold text-white/85">
       <p className="flex items-center gap-3"><Check size={18} className="shrink-0 text-[#d5edaa]"/> Portfólio estruturado</p>
       <p className="flex items-center gap-3"><Check size={18} className="shrink-0 text-[#d5edaa]"/> Regras de operação transparentes</p>
       <p className="flex items-center gap-3"><Check size={18} className="shrink-0 text-[#d5edaa]"/> Conexão com o setor alimentício</p>
      </div>
      <a href="#interesse" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d5edaa] px-4 py-4 text-sm font-extrabold text-[#173b30] transition hover:bg-white">Apresentar minha empresa <ArrowRight size={17} aria-hidden="true"/></a>
      <p className="mt-3 text-center text-[11px] leading-5 text-white/65">Interesse demonstrativo; cadastro público e vendas reais ainda não habilitados.</p>
     </aside>
    </div>
   </section>

   <section className={`${WRAP} py-20 sm:py-24`} aria-labelledby="supplier-benefits">
    <p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Por que se conectar à Provisio</p>
    <h2 id="supplier-benefits" className="mt-3 max-w-3xl text-3xl font-black tracking-[-.03em] sm:text-5xl">Nosso negócio é ajudar o <span className="text-[#597a4e]">seu a crescer.</span></h2>
    <p className="mt-5 max-w-2xl text-base leading-8 text-[#64736a]">Do pequeno produtor à distribuidora estruturada: uma proposta de atendimento para quem vive o abastecimento profissional.</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(({icon:Icon,title,detail})=><article key={title} className="rounded-[1.5rem] border border-[#e3e9df] bg-white p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1"><span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#e8f0dc] text-[#23563f]"><Icon size={22} aria-hidden="true"/></span><h3 className="mt-6 text-xl font-extrabold leading-snug">{title}</h3><p className="mt-3 text-sm leading-7 text-[#64736a]">{detail}</p></article>)}</div>
   </section>

   <section className="bg-[#15382d] py-20 text-white sm:py-24" aria-labelledby="supplier-partnership"><div className={WRAP}>
    <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-[#d5edaa]">Parcerias que fazem sentido</p><h2 id="supplier-partnership" className="mt-3 text-3xl font-black tracking-[-.03em] sm:text-5xl">O valor de uma parceria está no que <span className="text-[#d5edaa]">ela entrega.</span></h2><p className="mt-5 text-base leading-8 text-white/75">Qualidade, transparência e atenção a cada detalhe aproximam quem fornece de quem transforma ingredientes em experiências.</p></div>
    <div className="mt-12 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
     <article className="relative min-h-[370px] overflow-hidden rounded-[1.75rem] bg-[#325947] sm:min-h-[510px]"><div role="img" aria-label="Fornecedor e chef avaliando produtos frescos em cozinha profissional" className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:`linear-gradient(0deg,rgba(9,37,28,.8),transparent 63%),url("${photos.partners}")`}}/><div className="relative flex h-full min-h-[370px] flex-col justify-end p-8 sm:min-h-[510px] sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d5edaa]">Da origem à cozinha</p><h3 className="mt-3 max-w-xl text-2xl font-black sm:text-4xl">Boas relações comerciais começam com produtos de confiança.</h3></div></article>
     <article className="relative min-h-[310px] overflow-hidden rounded-[1.75rem] bg-[#325947] sm:min-h-[510px]"><div role="img" aria-label="Chef conferindo a qualidade dos insumos recebidos" className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:`linear-gradient(0deg,rgba(9,37,28,.8),transparent 63%),url("${photos.operation}")`}}/><div className="relative flex h-full min-h-[310px] flex-col justify-end p-8 sm:min-h-[510px]"><p className="text-sm font-bold text-[#d5edaa]">Mais do que distribuir</p><h3 className="mt-2 text-2xl font-extrabold">Conectar oferta, demanda e qualidade.</h3></div></article>
    </div>
    <p className="mt-4 text-xs text-white/65">Fotografias ilustrativas geradas para a Provisio; não são depoimentos nem registros de parceiros reais.</p>
   </div></section>

   <section id="como-funciona" className={`${WRAP} scroll-mt-20 grid gap-12 py-20 sm:py-28 lg:grid-cols-[.85fr_1.15fr] lg:gap-24`} aria-labelledby="supplier-process">
    <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Como funciona</p><h2 id="supplier-process" className="mt-3 text-3xl font-black tracking-[-.03em] sm:text-5xl">Simples no início. <span className="text-[#597a4e]">Profissional em cada etapa.</span></h2><p className="mt-5 text-base leading-8 text-[#64736a]">Conheça a jornada planejada para que os produtos certos cheguem a quem compra para trabalhar.</p><Link href="/compradores" className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#245b40] underline underline-offset-4">Conheça a experiência de quem compra <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
    <ol>{steps.map(([n,title,description],i)=><li key={n} className="flex gap-5 border-b border-[#d8dfd7] py-6 first:pt-0"><span className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-black ${i===0?"bg-[#245b40] text-white":"bg-[#e7ecdf] text-[#245b40]"}`}>{n}</span><div><h3 className="text-xl font-extrabold">{title}</h3><p className="mt-2 text-sm leading-7 text-[#64736a]">{description}</p></div></li>)}</ol>
   </section>

   <section className="bg-[#e9eee5] py-20 sm:py-24" aria-labelledby="supplier-standards"><div className={WRAP}><p className="text-xs font-black uppercase tracking-[.2em] text-[#a16c43]">Pensado para o mercado B2B</p><h2 id="supplier-standards" className="mt-3 max-w-4xl text-3xl font-black tracking-[-.03em] sm:text-5xl">Crescimento com responsabilidade, do primeiro contato ao último pedido.</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{[{icon:BadgeCheck,title:"Homologação responsável",text:"Identificação e avaliação antes da oferta comercial."},{icon:ClipboardList,title:"Informações completas",text:"Embalagem, quantidade e condições claras para quem compra."},{icon:Handshake,title:"Parcerias sustentáveis",text:"Propostas comerciais conectadas à capacidade real de atendimento."}].map(({icon:Icon,title,text})=><div key={title} className="rounded-2xl bg-white p-7"><Icon size={27} className="text-[#23563f]" aria-hidden="true"/><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-[#64736a]">{text}</p></div>)}</div></div></section>

   <section className="bg-[#102f26] py-20 text-center text-white"><div className={WRAP}><p className="text-xs font-black uppercase tracking-[.2em] text-[#d5edaa]">O próximo passo</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">Pronto para levar sua oferta a <span className="text-[#d5edaa]">novas oportunidades?</span></h2><p className="mx-auto mt-5 max-w-2xl leading-8 text-white/75">Apresente sua empresa e participe da construção de uma cadeia de abastecimento mais conectada.</p><a href="#interesse" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#d5edaa] px-8 py-4 text-sm font-extrabold text-[#173b30] transition hover:bg-white">Quero ser fornecedor <ArrowRight size={18} aria-hidden="true"/></a></div></section>
   <section id="interesse" aria-label="Interesse de fornecedores" className={`${WRAP} scroll-mt-20 py-20`}><MarketplaceLeadForm role="fornecedor"/><p className="mt-6 flex items-start gap-2 text-sm leading-6 text-[#64736a]"><ShieldCheck size={18} className="shrink-0" aria-hidden="true"/> Esta etapa é uma demonstração local. O formulário não envia dados nem habilita cadastros ou vendas reais.</p></section>
  </main>
  <SiteFooter/><FloatingNav/>
 </div>;
}
