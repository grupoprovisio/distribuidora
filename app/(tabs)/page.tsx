import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Building2, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Grupo Provisio — Distribuidora e marketplace B2B",
  description: "Conheça a plataforma B2B em desenvolvimento do Grupo Provisio para compradores e fornecedores homologados.",
};

const profiles = [
  { href: "/compradores", label: "Sou comprador", icon: Building2, title: "Abastecimento para empresas", description: "Conheça o catálogo autorizado, condições por volume e o futuro processo de cotação e compra." },
  { href: "/fornecedores", label: "Sou fornecedor", icon: Boxes, title: "Ofertas de parceiros homologados", description: "Apresente sua empresa para uma futura homologação e publicação de produtos próprios." },
] as const;

export default function HomePage() {
  return (
    <>
      <AppHeader theme="forest" title="Grupo Provisio" showListButton={false} topContent={
        <nav aria-label="Perfis da Provisio" className="flex flex-wrap justify-center gap-2 pb-3">
          {profiles.map(({ href, label }) => (
            <Link key={href} href={href} className="rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-lime">
              {label}
            </Link>
          ))}
        </nav>
      } />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="relative overflow-hidden rounded-[2rem] bg-forest p-7 text-white shadow-float sm:p-12" aria-labelledby="home-title">
          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Distribuidora própria + marketplace B2B</p>
            <h1 id="home-title" className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-6xl">Um novo caminho para abastecer seu negócio.</h1>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/80 sm:text-lg">
              Estamos preparando uma plataforma para conectar compradores e fornecedores autorizados,
              com ofertas da própria Provisio e de parceiros homologados.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/compradores" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-forest-deep focus-visible:ring-4 focus-visible:ring-white/40">
                Sou comprador <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/como-funciona" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-extrabold text-white focus-visible:ring-4 focus-visible:ring-white/40">
                Como funciona
              </Link>
            </div>
          </div>
          <div aria-hidden className="absolute -right-16 -top-20 size-64 rounded-full border-[3rem] border-lime/10 sm:size-80" />
        </section>
        <section className="mt-12" aria-labelledby="profiles-title">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Para cada perfil</p>
          <h2 id="profiles-title" className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">Escolha como participar.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {profiles.map(({ href, label, icon: Icon, title, description }) => (
              <article key={href} className="flex flex-col rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70">
                <div className="grid size-12 place-items-center rounded-2xl bg-lime-soft text-forest"><Icon size={24} aria-hidden /></div>
                <h3 className="mt-5 text-xl font-extrabold text-forest-deep">{title}</h3>
                <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-muted">{description}</p>
                <Link href={href} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline focus-visible:ring-2 focus-visible:ring-lime">
                  {label} <ArrowRight size={16} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Princípios da plataforma">
          {[
            { icon: ShieldCheck, title: "Origem autorizada", text: "Apenas produtos próprios e ofertas de fornecedores expressamente homologados." },
            { icon: CheckCircle2, title: "Condições claras", text: "Preços, mínimos, embalagem e região vinculados à oferta aprovada." },
            { icon: Truck, title: "Operações separadas", text: "Cada fornecedor responde por seus pedidos, entregas e condições comerciais." },
          ].map(({icon:Icon,title,text}) => (
            <div key={title} className="rounded-3xl bg-paper p-6 ring-1 ring-line/70">
              <Icon size={24} className="text-forest" aria-hidden />
              <h3 className="mt-4 font-extrabold text-forest-deep">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </section>
        <section className="mt-12 rounded-[2rem] bg-sand p-7 sm:p-10" aria-labelledby="catalog-title">
          <h2 id="catalog-title" className="text-2xl font-black text-forest-deep">Catálogo comercial em preparação</h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-[#5c3a06]">
            Não há produtos, preços, pedidos ou pagamentos reais habilitados nesta etapa.
            Dados de catálogos de terceiros não são usados como ofertas do marketplace.
          </p>
          <Link href="/produtos" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-extrabold text-white">
            Entender o catálogo <ArrowRight size={16} aria-hidden />
          </Link>
        </section>
      </main>
    </>
  );
}
