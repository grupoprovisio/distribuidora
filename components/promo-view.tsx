"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgePercent, Minus, Plus, Sparkles, Tag } from "lucide-react";
import { GridMessage, GridSkeleton } from "@/components/product-grid";
import { InfiniteFooter } from "@/components/infinite-footer";
import { PromoCard } from "@/components/promo-card";
import { SectionTitle } from "@/components/section";
import type { CatalogProduct } from "@/lib/catalog-types";
import { useInfinite } from "@/lib/infinite";
import { usePrefs } from "@/lib/prefs-store";
import { PRODUCT_GRID } from "@/lib/ui";

type Collection = { id: string; name: string; description?: string; curated: boolean; total: number; maxPct: number; images: string[] };
type Overview = {
  ok: true;
  collections: Collection[];
  departments: { slug: string; name: string; count: number }[];
  qtys: number[];
  stats: { deals: number; maxPct: number; avgPct: number };
  sections: { key: string; title: string; hint: string; products: CatalogProduct[] }[];
};

type Sort = "pct" | "save" | "price" | "near";
const SORTS: { value: Sort; label: string }[] = [
  { value: "pct", label: "Maior desconto" },
  { value: "save", label: "Maior economia" },
  { value: "price", label: "Menor preço" },
  { value: "near", label: "Falta pouco" },
];

export type PromoFilters = { colecao?: string; depto?: string; ordem: Sort };

const href = (f: PromoFilters) => {
  const p = new URLSearchParams();
  if (f.colecao) p.set("colecao", f.colecao);
  if (f.depto) p.set("depto", f.depto);
  if (f.ordem !== "pct") p.set("ordem", f.ordem);
  const s = p.toString();
  return s ? `/promocoes?${s}` : "/promocoes";
};

const chip = "shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold ring-1 transition-colors";
const on = "bg-forest text-white ring-forest";
const off = "bg-paper ring-line hover:bg-lime-soft";

/** Visão geral das promoções da filial (coleções, departamentos e seções vêm da API). */
function useOverview() {
  const { filial } = usePrefs();
  const [done, setDone] = useState<{ seller: string; data?: Overview; failed?: boolean } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/promos?seller=${filial.seller}&view=overview`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<Overview | { ok: false }>)
      .then((d) => setDone(d.ok ? { seller: filial.seller, data: d } : { seller: filial.seller, failed: true }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ seller: filial.seller, failed: true });
      });
    return () => ctrl.abort();
  }, [filial.seller]);

  const current = done && done.seller === filial.seller ? done : null;
  return { status: !current ? "loading" : current.failed ? "error" : "ready", data: current?.data } as const;
}

/** Quantas unidades a pessoa pretende levar: muda os avisos de "falta pouco" e a ordenação "Falta pouco". */
function QtyPicker({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-muted">Vou levar</span>
      <div className="flex h-9 items-center rounded-full bg-paper ring-1 ring-line">
        <button type="button" onClick={() => onChange(Math.max(1, qty - 1))} aria-label="Diminuir quantidade" className="grid size-9 place-items-center rounded-full active:scale-90">
          <Minus size={14} strokeWidth={2.6} aria-hidden />
        </button>
        <span className="min-w-6 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
          {qty}
        </span>
        <button type="button" onClick={() => onChange(Math.min(999, qty + 1))} aria-label="Aumentar quantidade" className="grid size-9 place-items-center rounded-full active:scale-90">
          <Plus size={14} strokeWidth={2.6} aria-hidden />
        </button>
      </div>
      <span className="text-xs font-bold text-muted">un de cada</span>
    </div>
  );
}

function CollectionCard({ c, active, filters }: { c: Collection; active: boolean; filters: PromoFilters }) {
  return (
    <Link
      href={href({ ...filters, colecao: active ? undefined : c.id })}
      replace
      aria-current={active}
      className={`flex w-60 shrink-0 flex-col gap-2 rounded-3xl p-3.5 shadow-card ring-1 transition-colors ${active ? "bg-forest text-white ring-forest" : "bg-paper ring-line/70 hover:bg-lime-soft"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-extrabold leading-snug">{c.name}</p>
          <p className={`mt-0.5 text-[11px] font-semibold ${active ? "text-white/70" : "text-muted"}`}>
            {c.total.toLocaleString("pt-BR")} produtos · até {Math.round(c.maxPct)}%
          </p>
        </div>
        {c.curated ? (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${active ? "bg-lime text-forest-deep" : "bg-lime-soft text-forest"}`}>
            <Sparkles size={10} aria-hidden /> Destaque
          </span>
        ) : null}
      </div>
      {c.description ? <p className={`line-clamp-2 text-[11px] font-medium ${active ? "text-white/75" : "text-muted"}`}>{c.description}</p> : null}
      <div className="mt-auto flex -space-x-2">
        {c.images.map((src) => (
          <span key={src} className="relative size-10 overflow-hidden rounded-full bg-canvas ring-2 ring-paper">
            <Image src={src} alt="" fill unoptimized sizes="40px" className="object-contain p-1" />
          </span>
        ))}
      </div>
    </Link>
  );
}

/** Lista infinita de promoções. Recriada (via `key`) quando muda coleção, departamento, ordem, quantidade ou filial. */
function DealsList({ seller, filters, qty }: { seller: string; filters: PromoFilters; qty: number }) {
  const inf = useInfinite<CatalogProduct>(async (after) => {
    const qs = new URLSearchParams({ seller, view: "list", sort: filters.ordem, qty: String(qty), first: "24", after: String(after) });
    if (filters.colecao) qs.set("collection", filters.colecao);
    if (filters.depto) qs.set("dept", filters.depto);
    const res = await fetch(`/api/promos?${qs}`);
    const json = (await res.json()) as { ok: boolean; products?: CatalogProduct[]; total?: number };
    if (!json.ok || !json.products) throw new Error("promos");
    return { items: json.products, total: json.total ?? 0 };
  });

  if (inf.initial) return <GridSkeleton count={8} />;
  if (inf.error && inf.items.length === 0) return <GridMessage kind="error" onRetry={inf.retry} />;
  if (inf.items.length === 0) return <GridMessage kind="empty" />;
  return (
    <>
      <div className={PRODUCT_GRID}>
        {inf.items.map((p, i) => (
          <PromoCard key={p.id} product={p} qty={qty} priority={i < 2} />
        ))}
      </div>
      <InfiniteFooter sentinel={inf.sentinel} busy={inf.busy} error={inf.error} hasMore={inf.hasMore} retry={inf.retry} shown={inf.items.length} total={inf.total} />
    </>
  );
}

/** Aba de promoções: coleções, destaques por critério e lista completa com filtros e rolagem infinita. */
export function PromoView(filters: PromoFilters) {
  const { filial, prefs } = usePrefs();
  const [override, setOverride] = useState<number | null>(null);
  const qty = override ?? prefs.qty;
  const overview = useOverview();
  const data = overview.data;

  const filtered = !!(filters.colecao || filters.depto || filters.ordem !== "pct");
  const activeCollection = data?.collections.find((c) => c.id === filters.colecao);

  return (
    <div>
      {/* Resumo */}
      {data ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl bg-forest px-4 py-3 text-white shadow-card">
          <span className="grid size-9 place-items-center rounded-full bg-lime text-forest-deep">
            <BadgePercent size={18} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm font-bold leading-snug">
            <span className="font-extrabold text-lime">{data.stats.deals.toLocaleString("pt-BR")}</span> produtos com preço de atacado em {filial.name}, com até{" "}
            <span className="font-extrabold text-lime">{Math.round(data.stats.maxPct)}%</span> de desconto (média {Math.round(data.stats.avgPct)}%).
          </p>
        </div>
      ) : null}

      {/* Coleções */}
      {data && data.collections.length > 0 ? (
        <section aria-label="Coleções de promoção">
          <SectionTitle>Coleções</SectionTitle>
          <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {data.collections.map((c) => (
              <div key={c.id} className="snap-start">
                <CollectionCard c={c} active={filters.colecao === c.id} filters={filters} />
              </div>
            ))}
          </div>
        </section>
      ) : overview.status === "loading" ? (
        <div className="h-32 animate-pulse rounded-3xl bg-paper shadow-card ring-1 ring-line/70" role="status" aria-label="Carregando coleções" />
      ) : null}

      {/* Destaques por critério (só sem filtro) */}
      {!filtered && data
        ? data.sections.map((s) => (
            <section key={s.key} className="mt-2" aria-label={s.title}>
              <SectionTitle>{s.title}</SectionTitle>
              <p className="-mt-2 mb-3 text-xs font-medium text-muted">{s.hint}</p>
              <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {s.products.map((p) => (
                  <div key={p.id} className="w-44 shrink-0 snap-start">
                    <PromoCard product={p} qty={qty} />
                  </div>
                ))}
              </div>
            </section>
          ))
        : null}

      {/* Lista completa */}
      <section className="mt-6" aria-label="Todas as promoções">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-lg font-extrabold tracking-tight">{activeCollection ? activeCollection.name : "Todas as promoções"}</h2>
          <QtyPicker qty={qty} onChange={setOverride} />
        </div>

        {data && data.departments.length > 0 ? (
          <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Departamentos">
            <Link href={href({ ...filters, depto: undefined })} replace className={`${chip} ${!filters.depto ? on : off}`}>
              Todos
            </Link>
            {data.departments.map((d) => (
              <Link key={d.slug} href={href({ ...filters, depto: filters.depto === d.slug ? undefined : d.slug })} replace className={`${chip} ${filters.depto === d.slug ? on : off}`}>
                {d.name} <span className="opacity-60">{d.count}</span>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Ordenar">
          {SORTS.map((s) => (
            <Link key={s.value} href={href({ ...filters, ordem: s.value })} replace aria-current={filters.ordem === s.value} className={`${chip} ${filters.ordem === s.value ? on : off}`}>
              {s.label}
            </Link>
          ))}
          {filters.colecao ? (
            <Link href={href({ ...filters, colecao: undefined })} replace className={`${chip} bg-blush text-[#a02a4a] ring-line`}>
              <Tag size={11} className="mr-1 inline" aria-hidden />
              Limpar coleção
            </Link>
          ) : null}
        </div>

        <DealsList key={`${filial.seller}|${filters.colecao}|${filters.depto}|${filters.ordem}|${qty}`} seller={filial.seller} filters={filters} qty={qty} />
      </section>
    </div>
  );
}
