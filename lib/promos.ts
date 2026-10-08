import "server-only";

import { catalogSearch } from "@/lib/atacadao";
import { getIndex } from "@/lib/catalog-index";
import type { CatalogProduct } from "@/lib/catalog-types";

// Promoções reais da filial. Nada é fixo: as coleções são descobertas nas páginas de coleção do próprio site e nas
// coleções (`productClusters`) dos produtos; só entram as que de fato têm desconto (degrau de atacado). As seções e os
// filtros usam quantis dos dados de hoje.

const SITE = "https://www.atacadao.com.br";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export type PromoCollection = {
  id: string;
  name: string;
  description?: string;
  /** Destaque: curada pelo site (tem página de coleção) ou de nome promocional, em vez de só agrupar produtos. */
  curated: boolean;
  /** Total de produtos da coleção na filial. */
  total: number;
  /** Maior desconto (%) entre os primeiros produtos. */
  maxPct: number;
  images: string[];
};

export type PromoSection = { key: string; title: string; hint: string; products: CatalogProduct[] };

export type PromoOverview = {
  collections: PromoCollection[];
  departments: { slug: string; name: string; count: number }[];
  /** Quantidades mínimas de degrau que existem hoje (para o filtro). */
  qtys: number[];
  stats: { deals: number; maxPct: number; avgPct: number };
  sections: PromoSection[];
};

export type PromoSort = "pct" | "save" | "price" | "near";

const pctOf = (p: CatalogProduct) => (p.tier ? 1 - p.tier.price / p.unit : 0);
const saveOf = (p: CatalogProduct) => (p.tier ? (p.unit - p.tier.price) * p.tier.qty : 0);

const quantile = (sorted: number[], q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0);

// ------------------------------------------------------------------ coleções do site (CMS)

type CmsCollection = { id: string; name: string; description?: string };

async function html(path: string): Promise<string | null> {
  try {
    const res = await fetch(SITE + path, {
      headers: { "user-agent": UA, accept: "text/html" },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/**
 * Páginas de coleção do site: os links de 1 nível da home cujo `cmsProductListLandingPage` aponta para uma coleção
 * (ex.: "/boa-do-dia" -> coleção de ofertas de 24 h). Melhor esforço: se o site mudar, as coleções dos produtos ainda valem.
 */
async function siteCollections(): Promise<CmsCollection[]> {
  const home = await html("/");
  if (!home) return [];
  const paths = [...new Set([...home.matchAll(/href="(\/[a-z0-9-]+)"/g)].map((m) => m[1]))].slice(0, 40);

  const found = await Promise.all(
    paths.map(async (path): Promise<CmsCollection | null> => {
      const page = await html(path);
      const data = page?.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
      if (!data) return null;
      try {
        const plp = (JSON.parse(data) as { props?: { pageProps?: { cmsProductListLandingPage?: PlpNode } } }).props?.pageProps?.cmsProductListLandingPage;
        const id = plp?.parameters?.productListLandingPageParams?.collection;
        return id ? { id: String(id), name: plp?.name ?? "", description: plp?.seo?.siteMetadataWithSlug?.description?.trim() } : null;
      } catch {
        return null;
      }
    }),
  );
  return found.flatMap((c) => (c ? [c] : []));
}

type PlpNode = {
  name?: string;
  parameters?: { productListLandingPageParams?: { collection?: string | number } };
  seo?: { siteMetadataWithSlug?: { description?: string } };
};

// ------------------------------------------------------------------ visão geral

const OVERVIEW_TTL_MS = 5 * 60_000;
/** Nomes de coleção que já dizem "promoção" (vêm da API; só reconhecemos o sentido da palavra). */
export const PROMO_NAME = /ofert|promo|desconto|arrasa|imperd|compensou|\bleve\b|super|festival|final de semana|feir[aã]o|black|feriado/i;
const overviewCache = new Map<string, { at: number; value: Promise<PromoOverview> }>();

/** Visão geral das promoções da filial (em cache por 5 min). */
export function promoOverview(seller: string): Promise<PromoOverview> {
  const hit = overviewCache.get(seller);
  if (hit && Date.now() - hit.at < OVERVIEW_TTL_MS) return hit.value;
  const value = buildOverview(seller).catch((e) => {
    overviewCache.delete(seller);
    throw e;
  });
  overviewCache.set(seller, { at: Date.now(), value });
  return value;
}

async function buildOverview(seller: string): Promise<PromoOverview> {
  const [index, cms, catalog] = await Promise.all([getIndex(seller), siteCollections(), catalogSearch({ seller, first: 1 })]);
  const deals = index.products.filter((p) => p.tier);

  // Degrau de atacado existe em boa parte do catálogo; uma coleção só é "de promoção" se estiver ACIMA dessa média.
  const baseline = deals.length / Math.max(1, index.products.length);
  const lift = (c: { count: number; withTier: number }) => c.withTier / c.count / Math.max(baseline, 0.01);

  // Candidatas: as coleções curadas pelo site + as que mais se destacam pelo desconto entre os produtos.
  const candidates = new Map<string, { name: string; description?: string; curated: boolean }>();
  for (const c of [...index.clusters].filter((c) => c.count >= 3 && lift(c) >= 1.1).sort((a, b) => lift(b) - lift(a) || b.count - a.count).slice(0, 16)) {
    candidates.set(c.id, { name: c.name, curated: false });
  }
  // Destaque = curada pelo site OU cujo nome (como a API informa) é de promoção.
  for (const c of index.clusters) if (PROMO_NAME.test(c.name)) candidates.set(c.id, { name: c.name, curated: true });
  for (const c of cms) {
    candidates.set(c.id, { name: c.name || candidates.get(c.id)?.name || "", description: c.description, curated: true });
  }

  const detailed = await Promise.all(
    [...candidates].map(async ([id, meta]): Promise<PromoCollection | null> => {
      try {
        const { products, total } = await catalogSearch({ seller, cluster: id, sort: "orders_desc", first: 100 });
        const tiered = products.filter((p) => p.tier);
        if (total === 0 || tiered.length === 0) return null;
        // Coleções que abrangem boa parte do catálogo ("Estoque", "Catálogo"...) não são uma promoção específica.
        if (total >= catalog.total * 0.15 && !meta.curated) return null;
        if (!meta.curated && tiered.length / products.length < baseline) return null;
        return {
          id,
          name: meta.name || `Coleção ${id}`,
          description: meta.description,
          curated: meta.curated,
          total,
          maxPct: Math.max(...tiered.map(pctOf)) * 100,
          images: tiered.filter((p) => p.image).slice(0, 3).map((p) => p.image!),
        };
      } catch {
        return null;
      }
    }),
  );
  // Curadas pelo site primeiro; depois as de maior desconto.
  const collections = detailed
    .flatMap((c) => (c ? [c] : []))
    .filter((c) => c.total < catalog.total * 0.15)
    .sort((a, b) => Number(b.curated) - Number(a.curated) || b.maxPct - a.maxPct || b.total - a.total)
    .slice(0, 14);

  const departments = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of deals) {
    const d = p.path?.[0];
    if (!d) continue;
    const cur = departments.get(d.slug) ?? { slug: d.slug, name: d.name, count: 0 };
    cur.count++;
    departments.set(d.slug, cur);
  }

  const qtys = [...new Set(deals.map((p) => p.tier!.qty))].sort((a, b) => a - b);
  const pcts = deals.map(pctOf).sort((a, b) => a - b);
  const q1 = quantile(qtys, 0.25);
  const q3 = quantile(qtys, 0.75);
  const by = (arr: CatalogProduct[], fn: (p: CatalogProduct) => number) => [...arr].sort((a, b) => fn(b) - fn(a)).slice(0, 12);

  const sections: PromoSection[] = [
    { key: "pct", title: "Maiores descontos", hint: "Quanto mais barato o preço unitário no degrau", products: by(deals, pctOf) },
    { key: "save", title: "Maior economia em reais", hint: "O quanto você deixa de pagar ao levar a quantidade do degrau", products: by(deals, saveOf) },
    {
      key: "low",
      title: `Leve até ${q1} un e economize`,
      hint: "Degraus baixos: fáceis de alcançar",
      products: by(deals.filter((p) => p.tier!.qty <= q1), pctOf),
    },
    {
      key: "high",
      title: `Atacado: a partir de ${q3} un`,
      hint: "Para quem compra em quantidade",
      products: by(deals.filter((p) => p.tier!.qty >= q3), pctOf),
    },
  ].filter((s) => s.products.length >= 3);

  return {
    collections,
    departments: [...departments.values()].sort((a, b) => b.count - a.count),
    qtys,
    stats: {
      deals: deals.length,
      maxPct: (pcts[pcts.length - 1] ?? 0) * 100,
      avgPct: pcts.length ? (pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100 : 0,
    },
    sections,
  };
}

// ------------------------------------------------------------------ lista

export type PromoListQuery = { collection?: string; dept?: string; qty?: number; sort: PromoSort; after: number; first: number };

/** Quantas unidades faltam para chegar ao degrau, dado o que a pessoa pretende levar. */
const need = (p: CatalogProduct, qty: number) => Math.max(0, (p.tier?.qty ?? 0) - qty);

export async function promoList(seller: string, q: PromoListQuery): Promise<{ products: CatalogProduct[]; total: number }> {
  let pool: CatalogProduct[];
  if (q.collection) {
    // Coleção: pega tudo o que ela tem (até 200) e ordena aqui; a coleção pode ter itens sem degrau.
    const first = await catalogSearch({ seller, cluster: q.collection, sort: "orders_desc", first: 100 });
    const second = first.total > 100 ? await catalogSearch({ seller, cluster: q.collection, sort: "orders_desc", first: 100 }, 100) : { products: [] };
    pool = [...first.products, ...second.products];
  } else {
    pool = (await getIndex(seller)).products.filter((p) => p.tier);
  }
  if (q.dept) pool = pool.filter((p) => p.path?.[0]?.slug === q.dept);

  const qty = q.qty ?? 0;
  const cmp: Record<PromoSort, (a: CatalogProduct, b: CatalogProduct) => number> = {
    pct: (a, b) => pctOf(b) - pctOf(a),
    save: (a, b) => saveOf(b) - saveOf(a),
    price: (a, b) => (a.tier?.price ?? a.unit) - (b.tier?.price ?? b.unit),
    // "Falta pouco": os que já estão no degrau ou quase, depois pelo desconto.
    near: (a, b) => need(a, qty) - need(b, qty) || pctOf(b) - pctOf(a),
  };
  pool = [...pool].sort(cmp[q.sort]);
  return { products: pool.slice(q.after, q.after + q.first), total: pool.length };
}
