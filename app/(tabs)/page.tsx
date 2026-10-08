import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, ChefHat, LayoutGrid, ShoppingBag, Store } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FilialChip } from "@/components/filial-chip";
import { CatalogSection } from "@/components/product-grid";
import { PromoStrip } from "@/components/promo-strip";
import { SectionTitle } from "@/components/section";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { iconFor } from "@/lib/categories";
import { getDepartments } from "@/lib/taxonomy";
import { WRAP } from "@/lib/ui";

// Fotos decorativas dos destaques (CDN da Distribuidora).
const ARROZ_IMG = "https://atacadaobr.vteximg.com.br/arquivos/ids/1508408-300-auto/m.jpg.jpg";
const CERVEJA_IMG = "https://atacadaobr.vteximg.com.br/arquivos/ids/1522972-300-auto/p.jpg.jpg";

export default async function HomePage() {
  // Atalhos = os primeiros departamentos, na ordem que o próprio site usa.
  const departments = (await getDepartments()).slice(0, 6);

  return (
    <>
      <WelcomeDialog />
      <AppHeader theme="forest" search>
        <FilialChip />

        <ul className="no-scrollbar mx-auto mt-4 flex w-fit max-w-full gap-4 overflow-x-auto pb-1 sm:gap-8">
          {departments.map((d) => {
            const Icon = iconFor(d.name);
            return (
              <li key={d.slug} className="shrink-0">
                <Link href={`/buscar?cat=${d.slug}`} className="group flex w-16 flex-col items-center gap-1.5 rounded-2xl p-1 text-xs font-bold transition-transform hover:-translate-y-1 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:w-20">
                  <span className="grid size-14 place-items-center rounded-full bg-white text-forest shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:shadow-float group-active:scale-90 sm:size-16">
                    <Icon size={24} aria-hidden />
                  </span>
                  <span className="max-w-full truncate">{d.name.split(/[\s,]/)[0]}</span>
                </Link>
              </li>
            );
          })}
          <li className="shrink-0">
            <Link href="/categorias" className="group flex w-16 flex-col items-center gap-1.5 rounded-2xl p-1 text-xs font-bold transition-transform hover:-translate-y-1 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:w-20">
              <span className="grid size-14 place-items-center rounded-full bg-white/15 text-white shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-white/25 group-hover:shadow-float group-active:scale-90 sm:size-16">
                <LayoutGrid size={24} aria-hidden />
              </span>
              Todas
            </Link>
          </li>
        </ul>
      </AppHeader>

      <main className={`${WRAP} pt-2`}>
        <section className="relative overflow-hidden rounded-[2rem] bg-forest px-6 py-8 text-white shadow-float sm:px-10 sm:py-10" aria-labelledby="home-title">
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Abasteça melhor</p>
            <h2 id="home-title" className="mt-3 text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">Tudo para o seu negócio continuar vendendo.</h2>
            <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-white/72 sm:text-base">Encontre produtos, compare volumes e monte seu pedido com a praticidade de comprar pelo celular.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/buscar" className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-extrabold text-forest-deep transition-transform active:scale-95">Explorar catálogo <ArrowRight size={16} aria-hidden /></Link>
              <Link href="/contato" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/12 px-5 text-sm font-extrabold text-white transition-colors hover:bg-white/20">Falar com o comercial</Link>
            </div>
          </div>
          <div aria-hidden className="absolute -right-14 -top-20 size-64 rounded-full border-[3rem] border-lime/15 sm:size-80" />
          <div aria-hidden className="absolute -bottom-28 right-24 size-52 rounded-full border-[2rem] border-terra/25" />
        </section>

        <section className="mt-8" aria-labelledby="business-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Compra do seu jeito</p>
              <h2 id="business-title" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Para cada tipo de operação</h2>
            </div>
            <Link href="/categorias" className="hidden items-center gap-1 text-sm font-bold text-forest sm:inline-flex">Ver categorias <ArrowRight size={14} aria-hidden /></Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Store, label: "Mercados e lojas", text: "Reposição diária" },
              { icon: ChefHat, label: "Restaurantes", text: "Volume e variedade" },
              { icon: Building2, label: "Empresas", text: "Compra recorrente" },
              { icon: ShoppingBag, label: "Revendedores", text: "Preço por volume" },
            ].map(({ icon: Icon, label, text }) => (
              <Link key={label} href="/buscar" className="group rounded-3xl bg-paper p-4 shadow-card ring-1 ring-line/70 transition-transform active:scale-[0.98] sm:p-5">
                <span className="grid size-10 place-items-center rounded-2xl bg-lime-soft text-forest transition-colors group-hover:bg-lime"><Icon size={20} aria-hidden /></span>
                <p className="mt-4 text-sm font-extrabold leading-tight">{label}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4" aria-label="Destaques">
          <Link
            href="/lista"
            className="group relative flex min-h-32 items-center overflow-hidden rounded-3xl bg-gradient-to-br from-sand to-[#efc98c] p-5 shadow-card"
          >
            <div className="relative z-10 max-w-[62%]">
              <p className="text-lg font-extrabold leading-tight text-[#5c3a06]">Monte seu pedido</p>
              <p className="mt-1 text-xs font-semibold text-[#5c3a06]/70">Encontre o mix certo para a sua reposição.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-xs font-extrabold text-forest">
                Começar compra <ArrowUpRight size={13} aria-hidden />
              </span>
            </div>
            <Image
              src={ARROZ_IMG}
              alt=""
              width={140}
              height={140}
              unoptimized
              className="absolute -bottom-3 -right-2 size-32 rotate-6 object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-110 sm:size-36"
            />
          </Link>

          <Link
            href="/promocoes"
            className="group relative flex min-h-32 items-center overflow-hidden rounded-3xl bg-gradient-to-br from-blush to-[#f4a9b6] p-5 shadow-card"
          >
            <div className="relative z-10 max-w-[62%]">
              <p className="text-lg font-extrabold leading-tight text-[#6d1830]">Ofertas para abastecer</p>
              <p className="mt-1 text-xs font-semibold text-[#6d1830]/70">Mais volume, mais eficiência no seu pedido.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-xs font-extrabold text-[#a02a4a]">
                Ver ofertas <ArrowUpRight size={13} aria-hidden />
              </span>
            </div>
            <Image
              src={CERVEJA_IMG}
              alt=""
              width={140}
              height={140}
              unoptimized
              className="absolute -bottom-3 -right-2 size-32 -rotate-6 object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-110 sm:size-36"
            />
          </Link>
        </section>

        {/* Catálogo real, com os preços da filial escolhida. */}
        <div className="mt-8">
          <SectionTitle href="/buscar?sort=orders_desc">Mais vendidos na sua filial</SectionTitle>
          <CatalogSection params={{ sort: "orders_desc", first: 6 }} />
        </div>

        <SectionTitle href="/promocoes">Condições por quantidade</SectionTitle>
        <PromoStrip count={6} />

        <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Benefícios da Distribuidora">
          {[
            ["Preço por volume", "Condições melhores para quem compra mais."],
            ["Catálogo organizado", "Encontre marcas e categorias sem perder tempo."],
            ["Atendimento próximo", "Fale com a equipe quando sua compra exigir atenção."],
          ].map(([title, text]) => (
            <div key={title} className="border-l-2 border-lime pl-4">
              <p className="text-sm font-extrabold">{title}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Atendimento e confiança">
          <div className="rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Para quem compra</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-forest-deep">Mercados, restaurantes e empresas.</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-muted">Organize a reposição de mercearia, bebidas, limpeza e utilidades em um só catálogo.</p>
            <Link href="/quem-somos" className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-forest">Conheça a Distribuidora <ArrowRight size={14} aria-hidden /></Link>
          </div>
          <div className="rounded-3xl bg-sand p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Compra recorrente</p>
            <p className="mt-4 text-xl font-extrabold leading-snug text-[#5c3a06]">“Quando o pedido é organizado, sobra tempo para cuidar do negócio.”</p>
            <p className="mt-5 text-xs font-bold text-[#5c3a06]/70">Atendimento comercial para volumes e rotas especiais.</p>
          </div>
        </section>

        <section className="group mt-10 flex flex-col justify-between gap-5 rounded-[2rem] bg-wine p-6 text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float focus-within:-translate-y-1 focus-within:shadow-float sm:flex-row sm:items-center sm:p-8" aria-label="Área para empresas">
          <div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Compra profissional</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Você compra para um negócio?</h2><p className="mt-2 text-sm font-medium leading-relaxed text-white/70">Tenha acesso a atendimento comercial, preço por volume, pedidos recorrentes e entrega para sua região.</p></div>
          <Link href="/empresas" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep outline-none transition-all duration-200 hover:bg-white hover:shadow-card focus-visible:ring-4 focus-visible:ring-lime/50 active:scale-95">Conhecer área empresarial <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden /></Link>
        </section>
      </main>
    </>
  );
}
