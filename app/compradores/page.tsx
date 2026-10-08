import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, ClipboardList, PackageCheck, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FloatingNav } from "@/components/floating-nav";
import { MarketplaceLeadForm } from "@/components/marketplace-lead-form";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Sou comprador | Provisio", description: "Abastecimento profissional para restaurantes e negócios de alimentação. Conheça a proposta B2B da Provisio." };
const hero = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1800&q=85";
const produce = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80";
const kitchen = "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=85";
const dishes = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80";
const benefits = [
  { icon: ClipboardList, title: "Compras mais organizadas", body: "Encontre informações de produtos e condições comerciais em uma experiência pensada para sua rotina." },
  { icon: BadgeCheck, title: "Fornecedores homologados", body: "Conheça ofertas de empresas avaliadas conforme as regras da plataforma." },
  { icon: PackageCheck, title: "Clareza para decidir", body: "Consulte unidades, embalagens e mínimos conforme as ofertas disponibilizadas." },
];
export default function CompradoresPage() {
  return <div className="min-h-dvh bg-[#f8f7f2] text-[#173b30]">
    <AppHeader theme="forest" title="Sou comprador" backHref="/" />
    <main>
      <section aria-labelledby="comprador-title" className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-[#102f26] text-white sm:min-h-[700px]">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg,rgba(8,33,26,.95),rgba(8,33,26,.78) 48%,rgba(8,33,26,.22)),url("${hero}")` }} />
        <div className={`${WRAP} relative z-10 w-full py-24 sm:py-32`}>
          <div className="max-w-[710px]"><p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#d5edaa]"><UtensilsCrossed size={16} /> Provisio para compradores</p>
          <h1 id="comprador-title" className="mt-7 text-5xl font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">Sua cozinha merece uma compra <span className="text-[#d5edaa]">mais inteligente.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">Mais clareza na escolha dos insumos, mais organização no abastecimento e mais tempo para você cuidar do que faz melhor.</p>
          <div className="mt-9 flex flex-wrap gap-3"><a href="#interesse" className="inline-flex items-center gap-2 rounded-full bg-[#d5edaa] px-7 py-4 text-sm font-extrabold text-[#173b30] hover:bg-white">Quero comprar com a Provisio <ArrowRight size={18}/></a><a href="#como-funciona" className="rounded-full border border-white/70 px-7 py-4 text-sm font-bold text-white hover:bg-white/10">Como funciona</a></div>
          <p className="mt-6 text-xs text-white/75">Para restaurantes, bares, hotéis e negócios de alimentação.</p></div>
        </div>
      </section>
      <section className={`${WRAP} py-20 sm:py-24`} aria-labelledby="beneficios-title">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#9d6438]">Seu negócio em primeiro lugar</p><h2 id="beneficios-title" className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Comprar bem faz parte de servir melhor.</h2>
        <p className="mt-5 max-w-2xl leading-7 text-[#63736a]">Uma experiência de abastecimento construída para quem precisa de qualidade, previsibilidade e decisões mais simples.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{benefits.map(({icon:Icon,title,body})=><article key={title} className="rounded-[1.75rem] border border-[#e4e9dd] bg-white p-8 shadow-sm"><span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#eaf2df]"><Icon size={24}/></span><h3 className="mt-7 text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-7 text-[#63736a]">{body}</p></article>)}</div>
      </section>
      <section className="bg-[#e9eee4] py-20 sm:py-24" aria-labelledby="categorias-title"><div className={WRAP}>
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#9d6438]">Para sua operação</p><h2 id="categorias-title" className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Do ingrediente ao prato, tudo começa com uma boa escolha.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">{[{photo:produce,title:"Hortifrúti e ingredientes frescos",sub:"Insumos para sua rotina"},{photo:dishes,title:"Alimentos e mercearia",sub:"Variedade para diferentes preparações"}].map(item=><article key={item.title} className="relative min-h-[340px] overflow-hidden rounded-[1.75rem] bg-[#244638] text-white"><div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:`linear-gradient(0deg,rgba(7,29,23,.9),transparent 75%),url("${item.photo}")`}}/><div className="relative flex min-h-[340px] flex-col justify-end p-8"><p className="text-sm text-white/80">{item.sub}</p><h3 className="mt-2 text-2xl font-extrabold sm:text-3xl">{item.title}</h3></div></article>)}</div>
        <p className="mt-5 text-sm text-[#63736a]">A disponibilidade de produtos depende das ofertas habilitadas na plataforma.</p>
      </div></section>
      <section id="como-funciona" className={`${WRAP} grid scroll-mt-20 items-center gap-12 py-20 sm:py-28 lg:grid-cols-2`} aria-labelledby="como-title">
        <div role="img" aria-label="Cozinha profissional" className="min-h-[400px] rounded-[2rem] bg-cover bg-center shadow-xl sm:min-h-[510px]" style={{backgroundImage:`url("${kitchen}")`}}/>
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#9d6438]">Simples desde o início</p><h2 id="como-title" className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Menos tempo comprando. Mais tempo criando.</h2>
          <div className="mt-9 space-y-7">{[["01","Conte sobre seu negócio","Apresente sua operação e seu interesse comercial."],["02","Conheça as possibilidades","Descubra a proposta de catálogo B2B e condições comerciais."],["03","Prepare seu abastecimento","Organize sua rotina com informações mais claras."]].map(([n,t,b])=><div key={n} className="flex gap-5"><span className="text-2xl font-black text-[#9aab81]">{n}</span><div><h3 className="text-lg font-extrabold">{t}</h3><p className="mt-2 text-sm leading-7 text-[#63736a]">{b}</p></div></div>)}</div>
          <a href="#interesse" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#173b30] px-7 py-4 text-sm font-extrabold text-white hover:bg-[#2c5c49]">Tenho interesse <ArrowRight size={18}/></a>
        </div>
      </section>
      <section className="bg-[#173b30] py-16 text-white"><div className={`${WRAP} flex flex-wrap items-center justify-between gap-8`}><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#d5edaa]">Provisio para negócios</p><h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">Uma nova relação com o abastecimento começa aqui.</h2></div><a href="#interesse" className="inline-flex items-center gap-2 rounded-full bg-[#d5edaa] px-7 py-4 text-sm font-extrabold text-[#173b30]">Saiba mais <ArrowRight size={18}/></a></div></section>
      <section id="interesse" className={`${WRAP} scroll-mt-20 py-20`} aria-label="Formulário de interesse"><MarketplaceLeadForm role="comprador"/><p className="mt-6 flex items-start gap-2 text-sm text-[#63736a]"><ShieldCheck size={18} className="shrink-0"/> Esta é uma demonstração. O formulário não envia dados; pedidos e cobranças reais ainda não estão habilitados.</p></section>
    </main><SiteFooter/><FloatingNav/>
  </div>;
}
