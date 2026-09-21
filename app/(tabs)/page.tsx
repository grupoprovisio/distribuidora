import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FilialChip } from "@/components/filial-chip";
import { CatalogSection } from "@/components/product-grid";
import { PromoStrip } from "@/components/promo-strip";
import { SectionTitle } from "@/components/section";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { iconFor } from "@/lib/categories";
import { getDepartments } from "@/lib/taxonomy";
import { WRAP } from "@/lib/ui";

// Fotos decorativas dos destaques (CDN do Atacadão).
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
                <Link href={`/buscar?cat=${d.slug}`} className="group flex w-16 flex-col items-center gap-1.5 text-xs font-bold sm:w-20">
                  <span className="grid size-14 place-items-center rounded-full bg-white text-forest transition-transform group-active:scale-90 sm:size-16">
                    <Icon size={24} aria-hidden />
                  </span>
                  <span className="max-w-full truncate">{d.name.split(/[\s,]/)[0]}</span>
                </Link>
              </li>
            );
          })}
          <li className="shrink-0">
            <Link href="/categorias" className="group flex w-16 flex-col items-center gap-1.5 text-xs font-bold sm:w-20">
              <span className="grid size-14 place-items-center rounded-full bg-white/15 text-white transition-transform group-active:scale-90 sm:size-16">
                <LayoutGrid size={24} aria-hidden />
              </span>
              Todas
            </Link>
          </li>
        </ul>
      </AppHeader>

      <main className={`${WRAP} pt-2`}>
        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4" aria-label="Destaques">
          <Link
            href="/lista"
            className="relative flex min-h-32 items-center overflow-hidden rounded-3xl bg-gradient-to-br from-sand to-[#efc98c] p-5 shadow-card"
          >
            <div className="relative z-10 max-w-[62%]">
              <p className="text-lg font-extrabold leading-tight text-[#5c3a06]">Compare preços e marcas</p>
              <p className="mt-1 text-xs font-semibold text-[#5c3a06]/70">Veja onde a sua lista sai mais barata.</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-xs font-extrabold text-forest">
                Ver comparativo <ArrowUpRight size={13} aria-hidden />
              </span>
            </div>
            <Image
              src={ARROZ_IMG}
              alt=""
              width={140}
              height={140}
              unoptimized
              className="absolute -bottom-3 -right-2 size-32 rotate-6 object-contain mix-blend-multiply sm:size-36"
            />
          </Link>

          <Link
            href="/promocoes"
            className="relative flex min-h-32 items-center overflow-hidden rounded-3xl bg-gradient-to-br from-blush to-[#f4a9b6] p-5 shadow-card"
          >
            <div className="relative z-10 max-w-[62%]">
              <p className="text-lg font-extrabold leading-tight text-[#6d1830]">Ofertas de atacado</p>
              <p className="mt-1 text-xs font-semibold text-[#6d1830]/70">Quanto mais leva, menos paga por unidade.</p>
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
              className="absolute -bottom-3 -right-2 size-32 -rotate-6 object-contain mix-blend-multiply sm:size-36"
            />
          </Link>
        </section>

        {/* Catálogo real, com os preços da filial escolhida. */}
        <div className="mt-8">
          <SectionTitle href="/buscar?sort=orders_desc">Mais vendidos na sua filial</SectionTitle>
          <CatalogSection params={{ sort: "orders_desc", first: 6 }} />
        </div>

        <SectionTitle href="/promocoes">Maiores descontos por quantidade</SectionTitle>
        <PromoStrip count={6} />
      </main>
    </>
  );
}
