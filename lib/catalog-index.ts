import "server-only";

import { catalogSearch } from "@/lib/atacadao";
import type { CatalogProduct } from "@/lib/catalog-types";
import { getDepartments } from "@/lib/taxonomy";

// Índice do catálogo de UMA filial, montado a partir das APIs do Atacadão: para cada departamento (lidos da árvore de
// categorias, nada fixo), os mais vendidos. Dele saem as promoções (produtos com degrau de atacado), as coleções
// (`productClusters`) e as categorias mais compradas (base das sugestões de lista). Fica em cache por alguns minutos.

/** `rank` = posição nos mais vendidos do departamento (0 = o mais vendido). */
export type IndexedProduct = CatalogProduct & { rank: number };

export type Leaf = {
  /** Slugs do caminho, ex.: "mercearia/graos/arroz-branco". */
  key: string;
  path: { slug: string; name: string }[];
  /** Quanto essa categoria pesa nos mais vendidos (soma de 1 − posição relativa). */
  score: number;
  /** Os mais vendidos dela, do primeiro para o último. */
  top: IndexedProduct[];
};

export type ClusterInfo = { id: string; name: string; count: number; withTier: number };

export type CatalogIndex = { at: number; products: IndexedProduct[]; leaves: Leaf[]; clusters: ClusterInfo[] };

const TTL_MS = 10 * 60_000;
const PAGE = 100;
const PAGES = 2;

const cache = new Map<string, { at: number; value: Promise<CatalogIndex> }>();

async function pool<T, R>(list: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i]);
      }
    }),
  );
  return out;
}

async function build(seller: string): Promise<CatalogIndex> {
  const departments = await getDepartments();
  const jobs = departments.flatMap((d) => Array.from({ length: PAGES }, (_, page) => ({ slug: d.slug, after: page * PAGE })));

  const pages = await pool(jobs, 8, async (job) => {
    try {
      const { products } = await catalogSearch({ seller, cat: [job.slug], sort: "orders_desc", first: PAGE }, job.after);
      return products.map((p, i): IndexedProduct => ({ ...p, rank: job.after + i }));
    } catch {
      return [];
    }
  });

  const byId = new Map<string, IndexedProduct>();
  for (const list of pages) for (const p of list) if (!byId.has(p.id)) byId.set(p.id, p);
  const products = [...byId.values()];

  const leaves = new Map<string, Leaf>();
  const clusters = new Map<string, ClusterInfo>();
  for (const p of products) {
    const path = p.path ?? [];
    if (path.length > 0) {
      const key = path.map((s) => s.slug).join("/");
      const leaf = leaves.get(key) ?? { key, path, score: 0, top: [] };
      leaf.score += 1 - p.rank / (PAGE * PAGES);
      leaf.top.push(p);
      leaves.set(key, leaf);
    }
    for (const c of p.clusters ?? []) {
      const info = clusters.get(c.id) ?? { id: c.id, name: c.name, count: 0, withTier: 0 };
      info.count++;
      if ((p.tiers?.length ?? 0) > 0) info.withTier++;
      clusters.set(c.id, info);
    }
  }
  for (const leaf of leaves.values()) leaf.top.sort((a, b) => a.rank - b.rank);

  return {
    at: Date.now(),
    products,
    leaves: [...leaves.values()].sort((a, b) => b.score - a.score),
    clusters: [...clusters.values()],
  };
}

/** Índice da filial (em cache por 10 min; chamadas simultâneas compartilham a mesma montagem). */
export function getIndex(seller: string): Promise<CatalogIndex> {
  const hit = cache.get(seller);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = build(seller).catch((e) => {
    cache.delete(seller);
    throw e;
  });
  cache.set(seller, { at: Date.now(), value });
  return value;
}
