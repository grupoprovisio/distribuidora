"use client";

import Link from "next/link";
import { GridMessage, GridSkeleton, useCatalog } from "@/components/product-grid";
import { InfiniteFooter } from "@/components/infinite-footer";
import { ProductCard } from "@/components/product-card";
import type { CatalogFail, CatalogResponse, CatalogSort, FacetValue } from "@/lib/catalog-types";
import { useInfinite } from "@/lib/infinite";
import { usePrefs } from "@/lib/prefs-store";
import { PRODUCT_GRID } from "@/lib/ui";

const PAGE = 24;

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: "score_desc", label: "Relevância" },
  { value: "orders_desc", label: "Mais vendidos" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
];

type Filters = { q: string; cat: string[]; brand?: string; sort: CatalogSort; min?: number; max?: number };

function href(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.cat.length) p.set("cat", f.cat.join("/"));
  if (f.brand) p.set("brand", f.brand);
  if (f.min) p.set("min", String(f.min));
  if (f.max) p.set("max", String(f.max));
  if (f.sort !== "score_desc") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `/buscar?${s}` : "/buscar";
}

const chip = "shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold ring-1 transition-colors";
const on = "bg-forest text-white ring-forest";
const off = "bg-paper ring-line hover:bg-lime-soft";

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">{children}</div>
    </div>
  );
}

/** Lista que se estende sozinha ao rolar. Recriada (via `key`) quando muda filtro ou filial. */
function Results({ seller, filters }: { seller: string; filters: Filters }) {
  const { q, cat, brand, sort, min, max } = filters;

  const inf = useInfinite(async (after) => {
    const qs = new URLSearchParams({ seller, sort, first: String(PAGE), after: String(after) });
    if (q) qs.set("term", q);
    if (cat.length) qs.set("cat", cat.join("/"));
    if (brand) qs.set("brand", brand);
    const res = await fetch(`/api/catalog?${qs}`);
    const json = (await res.json()) as CatalogResponse | CatalogFail;
    if (!json.ok) throw new Error("catalog");
    return { items: json.products, total: json.total, next: json.next };
  });

  // Enquanto há mais, o total da busca; no fim, o que de fato está à venda nesta filial.
  const visible = inf.items.filter((p) => (min === undefined || p.unit >= min) && (max === undefined || p.unit <= max));
  const shownTotal = inf.hasMore ? inf.total : visible.length;

  return (
    <>
      <p className="mb-4 text-sm font-semibold text-muted" aria-live="polite">
        {shownTotal !== null ? (
          <>
            <span className="font-extrabold text-ink">{shownTotal.toLocaleString("pt-BR")}</span> {shownTotal === 1 ? "produto" : "produtos"} na sua filial
          </>
        ) : (
          "Buscando…"
        )}
      </p>

      {inf.initial ? (
        <GridSkeleton count={PAGE / 2} />
      ) : inf.error && inf.items.length === 0 ? (
        <GridMessage kind="error" onRetry={inf.retry} />
      ) : visible.length === 0 ? (
        <GridMessage kind="empty" />
      ) : (
        <>
          <div className={PRODUCT_GRID}>
            {visible.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
          <InfiniteFooter sentinel={inf.sentinel} busy={inf.busy} error={inf.error} hasMore={inf.hasMore} retry={inf.retry} shown={visible.length} total={inf.total} />
        </>
      )}
    </>
  );
}

/** Resultados reais da busca na filial escolhida: filtros de subcategoria/marca, ordenação e rolagem infinita. */
export function SearchResults(filters: Filters) {
  const { filial } = usePrefs();
  const { q, cat, brand, sort, min, max } = filters;

  // Facetas em consulta própria: não são refeitas a cada página.
  const facets = useCatalog({ term: q, cat: cat.join("/"), brand, first: 1, facets: 1 }).data?.facets;
  const subs: FacetValue[] = facets?.categories ?? [];
  const brands: FacetValue[] = facets?.brands ?? [];
  // No nível mais fundo (3) as subcategorias listadas são irmãs da atual.
  const base = cat.length >= 3 ? cat.slice(0, 2) : cat;

  return (
    <div>
      {cat.length > 0 && subs.length > 0 ? (
        <ChipRow label="Subcategorias">
          <Link href={href({ ...filters, cat: cat.slice(0, 1), brand: undefined })} className={`${chip} ${cat.length === 1 ? on : off}`}>
            Todas
          </Link>
          {subs.map((s) => (
            <Link key={s.slug} href={href({ ...filters, cat: [...base, s.slug], brand: undefined })} className={`${chip} ${s.selected ? on : off}`}>
              {s.label} <span className="opacity-60">{s.count}</span>
            </Link>
          ))}
        </ChipRow>
      ) : null}

      {brands.length > 1 || brand ? (
        <ChipRow label="Marcas">
          {brands.map((b) => (
            <Link key={b.slug} href={href({ ...filters, brand: b.selected ? undefined : b.slug })} className={`${chip} ${b.selected ? on : off}`}>
              {b.label} <span className="opacity-60">{b.count}</span>
            </Link>
          ))}
        </ChipRow>
      ) : null}

      <div role="group" aria-label="Ordenar" className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {SORTS.map((s) => (
          <Link key={s.value} href={href({ ...filters, sort: s.value })} replace aria-current={sort === s.value} className={`${chip} ${sort === s.value ? on : off}`}>
            {s.label}
          </Link>
        ))}
      </div>

      <ChipRow label="Faixa de preço">
        {[
          { label: "Todos", min: undefined, max: undefined },
          { label: "Até R$ 10", max: 10 },
          { label: "R$ 10 a R$ 30", min: 10, max: 30 },
          { label: "Acima de R$ 30", min: 30 },
        ].map((range) => <Link key={range.label} href={href({ ...filters, min: range.min, max: range.max })} className={`${chip} ${min === range.min && max === range.max ? on : off}`}>{range.label}</Link>)}
      </ChipRow>

      <Results key={`${filial.seller}|${q}|${cat.join("/")}|${brand}|${sort}`} seller={filial.seller} filters={filters} />
    </div>
  );
}
