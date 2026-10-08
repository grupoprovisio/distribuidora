import "server-only";

import { catalogSearch } from "@/lib/atacadao";
import { getIndex, type IndexedProduct } from "@/lib/catalog-index";
import type { CatalogProduct } from "@/lib/catalog-types";
import { PROMO_NAME } from "@/lib/promos";

// Sugestões de lista completas. Nada fixo: os "modos" são as coleções temáticas da própria loja (as que juntam
// categorias diferentes, como "Café da Manhã" ou "Festa"), e cada lista é feita das categorias mais vendidas dessa
// coleção. Quando a loja criar outra coleção temática, ela aparece aqui sozinha.

export const HOME_MODE = "casa";

export type SuggestMode = {
  id: string;
  name: string;
  /** Quantas categorias (itens) a lista tem. */
  items: number;
  images: string[];
};

export type SuggestItem = {
  /** Caminho de categorias, ex.: "mercearia/graos/arroz-branco". */
  key: string;
  path: string[];
  label: string;
  dept: string;
  deptSlug: string;
  image?: string;
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const leafKey = (p: CatalogProduct) => (p.path ?? []).map((s) => s.slug).join("/");

type Group = { key: string; path: { slug: string; name: string }[]; score: number; image?: string };

function groupLeaves(products: IndexedProduct[] | (CatalogProduct & { rank?: number })[]): Group[] {
  const groups = new Map<string, Group>();
  products.forEach((p, i) => {
    if (!p.path || p.path.length === 0) return;
    const key = leafKey(p);
    const g = groups.get(key) ?? { key, path: p.path, score: 0, image: undefined };
    // Peso decrescente pela posição (mais vendido primeiro).
    g.score += 1 - (("rank" in p && typeof p.rank === "number" ? p.rank : i) / Math.max(products.length, 200));
    g.image ??= p.image;
    groups.set(key, g);
  });
  return [...groups.values()];
}

const toItem = (g: Group): SuggestItem => ({
  key: g.key,
  path: g.path.map((s) => s.slug),
  label: g.path[g.path.length - 1].name,
  dept: g.path[0].name,
  deptSlug: g.path[0].slug,
  image: g.image,
});

// ------------------------------------------------------------------ modos

/** "Compra do mês" + as coleções temáticas da loja (várias categorias, sem ser marca nem promoção). */
export async function suggestModes(seller: string): Promise<SuggestMode[]> {
  const index = await getIndex(seller);
  const brands = new Set(index.products.map((p) => norm(p.brand)));

  const modes: SuggestMode[] = [];
  const home = groupLeaves(index.products);
  modes.push({
    id: HOME_MODE,
    name: "Compra do mês (casa)",
    items: Math.min(home.length, HOME_LIMIT),
    images: index.leaves.slice(0, 3).flatMap((l) => (l.top[0]?.image ? [l.top[0].image] : [])),
  });

  for (const c of index.clusters) {
    // Fora: coleções enormes (genéricas), "mais vendidos" (já é a compra do mês), marcas e eventos/promoções.
    if (c.count < 12 || c.count >= index.products.length * 0.15) continue;
    if (/mais vendid/i.test(c.name) || brands.has(norm(c.name)) || PROMO_NAME.test(c.name)) continue;
    const members = index.products.filter((p) => p.clusters?.some((x) => x.id === c.id));
    const leaves = groupLeaves(members);
    const depts = new Set(members.flatMap((p) => (p.path?.[0] ? [p.path[0].slug] : [])));
    // Tema = junta categorias diferentes (marca e categoria única não são tema), mas sem cobrir boa parte da loja inteira.
    if (leaves.length < 6 || depts.size < 2 || leaves.length > index.leaves.length * 0.3) continue;
    modes.push({
      id: c.id,
      name: c.name,
      items: Math.min(leaves.length, THEME_LIMIT),
      images: members.filter((p) => p.image).slice(0, 3).map((p) => p.image!),
    });
  }
  return [modes[0], ...modes.slice(1).sort((a, b) => b.items - a.items)].slice(0, 9);
}

// ------------------------------------------------------------------ listas

const HOME_LIMIT = 48;
const THEME_LIMIT = 40;

/**
 * Vagas proporcionais ao peso de cada departamento nos produtos-base (maior resto): quem vende muito tem mais categorias na
 * lista, quem quase não aparece (ex.: automotivo numa compra do mês) fica de fora. Em cada departamento, as categorias de maior nota.
 */
function balanced(groups: Group[], products: CatalogProduct[], limit: number): Group[] {
  const weight = new Map<string, number>();
  for (const p of products) if (p.path?.[0]) weight.set(p.path[0].slug, (weight.get(p.path[0].slug) ?? 0) + 1);
  const total = [...weight.values()].reduce((a, b) => a + b, 0) || 1;

  const raw = [...weight].map(([slug, w]) => ({ slug, exact: (w / total) * limit }));
  const quota = new Map(raw.map((r) => [r.slug, Math.floor(r.exact)]));
  let left = limit - [...quota.values()].reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (left <= 0) break;
    quota.set(r.slug, (quota.get(r.slug) ?? 0) + 1);
    left--;
  }

  const byDept = new Map<string, Group[]>();
  for (const g of [...groups].sort((a, b) => b.score - a.score)) byDept.set(g.path[0].slug, [...(byDept.get(g.path[0].slug) ?? []), g]);
  return [...quota].flatMap(([slug, q]) => (byDept.get(slug) ?? []).slice(0, q)).sort((a, b) => b.score - a.score);
}

/** A coleção "mais vendidos" da loja (reconhecida pelo nome que a API informa): base da compra do mês. */
async function bestSellers(seller: string, index: Awaited<ReturnType<typeof getIndex>>) {
  const cluster = index.clusters.find((c) => /mais vendid/i.test(c.name));
  if (!cluster) return index.products;
  const pages = await Promise.all([0, 100, 200].map((after) => catalogSearch({ seller, cluster: cluster.id, sort: "orders_desc", first: 100 }, after).catch(() => null)));
  const products = pages.flatMap((p) => p?.products ?? []);
  return products.length >= 30 ? products : index.products;
}

export async function suggestList(seller: string, modeId: string): Promise<{ name: string; items: SuggestItem[] } | null> {
  const index = await getIndex(seller);

  if (modeId === HOME_MODE) {
    const base = await bestSellers(seller, index);
    return { name: "Compra do mês (casa)", items: balanced(groupLeaves(base), base, HOME_LIMIT).map(toItem) };
  }

  const name = index.clusters.find((c) => c.id === modeId)?.name;
  if (!name) return null;

  // Coleção inteira (até 200), para a lista ser completa e não só o que aparece nos mais vendidos.
  const pages = await Promise.all([0, 100].map((after) => catalogSearch({ seller, cluster: modeId, sort: "orders_desc", first: 100 }, after).catch(() => null)));
  const products = pages.flatMap((p) => p?.products ?? []);
  if (products.length === 0) return null;
  return { name, items: balanced(groupLeaves(products), products, THEME_LIMIT).map(toItem) };
}
