// Do que a pessoa digitou ("frango") às opções de produto. Tudo sai da resposta da API: as perguntas de refinamento
// vêm da distribuição de categorias dos resultados mais relevantes, os filtros de marca e tamanho, dos próprios produtos.
// Puro: roda no navegador.

import type { CatalogProduct } from "@/lib/catalog-types";
import { rankOptions, toOption, type Option, type OptionSort } from "@/lib/deals";
import { baseLabel } from "@/lib/size";

/** Um dos valores possíveis da pergunta ("Corte de frango", "Peito de frango"...). */
export type Choice = { slug: string; name: string; count: number };

export type Analysis = {
  /** Caminho de categorias já definido (o que a pessoa escolheu + o que ficou óbvio pelos resultados). */
  path: string[];
  /** Nomes do caminho, para exibir. */
  names: string[];
  /** Pergunta pendente: os resultados se dividem entre estas categorias. Null quando não há dúvida. */
  question: { level: number; choices: Choice[] } | null;
  /** Produtos dentro do caminho definido. */
  products: CatalogProduct[];
};

/** Parte dos resultados a partir da qual uma categoria é considerada "a resposta" e a pergunta é dispensada. */
const DOMINANT = 0.7;
const MAX_DEPTH = 3;

const under = (products: CatalogProduct[], path: string[]) => products.filter((p) => path.every((s, i) => p.path?.[i]?.slug === s));

/**
 * Decide se precisa perguntar algo. Parte do caminho escolhido e vai descendo enquanto uma categoria dominar os resultados
 * (não incomoda a pessoa à toa). Se os resultados se dividem, devolve a pergunta com as categorias como opções.
 */
export function analyze(products: CatalogProduct[], chosen: string[]): Analysis {
  const path = [...chosen];
  const names: string[] = [];

  for (;;) {
    const pool = under(products, path);
    names.length = 0;
    const first = pool.find((p) => (p.path?.length ?? 0) >= path.length);
    for (let i = 0; i < path.length; i++) names.push(first?.path?.[i]?.name ?? path[i]);

    if (path.length >= MAX_DEPTH || pool.length === 0) return { path, names, question: null, products: pool };

    const counts = new Map<string, Choice>();
    for (const p of pool) {
      const seg = p.path?.[path.length];
      if (!seg) continue;
      const cur = counts.get(seg.slug) ?? { slug: seg.slug, name: seg.name, count: 0 };
      cur.count++;
      counts.set(seg.slug, cur);
    }
    const choices = [...counts.values()].sort((a, b) => b.count - a.count);
    if (choices.length === 0) return { path, names, question: null, products: pool };

    const total = choices.reduce((a, c) => a + c.count, 0);
    if (choices.length === 1 || choices[0].count / total >= DOMINANT) {
      path.push(choices[0].slug);
      continue;
    }
    return { path, names, question: { level: path.length, choices: choices.slice(0, 8) }, products: pool };
  }
}

// ---------------------------------------------------------------- perguntas por atributo (palavras dos nomes)

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Só palavras de ligação e de embalagem; os atributos de verdade (corte, tipo, sabor...) vêm dos nomes dos produtos.
const STOP = new Set([
  "de", "da", "do", "das", "dos", "com", "sem", "para", "por", "em", "na", "no", "nas", "nos", "e", "ou", "ao", "aos",
  "kg", "gr", "ml", "und", "pct", "pacote", "embalagem", "caixa", "frasco", "lata", "garrafa", "preco", "quilo", "tipo",
  "pack", "unidade", "unidades", "cada", "peca", "pecas",
]);

export type AttrQuestion = { choices: { token: string; label: string; count: number }[] };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * Procura, nos nomes dos produtos, palavras que DIVIDEM os resultados (nem em todos, nem em quase nenhum): é o que
 * separa "peito" de "coxa" ou "integral" de "desnatado". Se houver pelo menos 3, vira uma pergunta.
 */
export function attributeQuestion(products: CatalogProduct[], term: string, used: string[]): AttrQuestion | null {
  if (products.length < 8) return null;
  const skip = new Set([...words(term), ...used]);
  const df = new Map<string, { label: string; count: number }>();

  for (const p of products) {
    const brand = new Set(words(p.brand));
    const seen = new Set<string>();
    for (const raw of p.name.split(/[^\p{L}\p{N}]+/u)) {
      const t = norm(raw);
      if (t.length < 3 || /\d/.test(t) || STOP.has(t) || skip.has(t) || brand.has(t) || seen.has(t)) continue;
      seen.add(t);
      const cur = df.get(t) ?? { label: raw, count: 0 };
      cur.count++;
      df.set(t, cur);
    }
  }

  const lo = Math.max(3, Math.ceil(products.length * 0.08));
  const hi = Math.floor(products.length * 0.65);
  const choices = [...df]
    .filter(([, v]) => v.count >= lo && v.count <= hi)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([token, v]) => ({ token, label: cap(v.label), count: v.count }));
  return choices.length >= 3 ? { choices } : null;
}

/** Produtos cujo nome tem todas as palavras escolhidas. */
export const filterByWords = (products: CatalogProduct[], tokens: string[]) =>
  tokens.length === 0 ? products : products.filter((p) => tokens.every((t) => words(p.name).includes(t)));

export type Filters = { brand?: string; size?: string };

/** Marcas e tamanhos presentes nas opções (para os filtros), do mais comum ao menos comum. */
export function facetsOf(options: Option[]) {
  const tally = (get: (o: Option) => string | undefined) => {
    const m = new Map<string, number>();
    for (const o of options) {
      const k = get(o);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  };
  return { brands: tally((o) => o.product.brand), sizes: tally((o) => o.size?.label) };
}

export type Unit = "un" | "kg" | "l";

/**
 * Transforma os produtos em opções para o que a pessoa quer:
 *  • "un": `qty` unidades de cada;
 *  • "kg"/"l": precisa de X kg ou L no total, então cada opção usa quantas embalagens forem necessárias
 *    (produtos sem tamanho legível na unidade pedida ficam de fora).
 */
export function buildOptions(products: CatalogProduct[], qty: number, unit: Unit, filters: Filters, sort: OptionSort): Option[] {
  const opts: Option[] = [];
  for (const p of products) {
    let units = qty;
    if (unit !== "un") {
      const probe = toOption(p, 1);
      if (!probe.size || probe.size.unit !== (unit === "kg" ? "kg" : "l")) continue;
      units = Math.max(1, Math.ceil(qty / probe.size.base));
    }
    opts.push(toOption(p, units));
  }
  const filtered = opts.filter((o) => (!filters.brand || o.product.brand === filters.brand) && (!filters.size || o.size?.label === filters.size));
  return rankOptions(filtered, sort);
}

/** Quantas unidades (embalagens) uma opção leva. */
export const unitsOf = (o: Option, qty: number, unit: Unit) => (unit === "un" ? qty : Math.max(1, Math.ceil(qty / (o.size?.base ?? 1))));

export type Badge = { key: string; label: string; tone: "good" | "warn" | "info" };

/** Avisos de cada opção, calculados dos degraus reais (nada de texto fixo por produto). */
export function badgesFor(o: Option, all: Option[], units: number): Badge[] {
  const out: Badge[] = [];
  const cheapest = all.reduce<Option | undefined>((best, x) => (!best || x.total < best.total ? x : best), undefined);
  if (cheapest && cheapest.product.id === o.product.id && all.length > 1) out.push({ key: "cheapest", label: "Mais barato", tone: "good" });

  const sized = all.filter((x) => x.perBase !== undefined);
  const bestPer = sized.reduce<Option | undefined>((best, x) => (!best || (x.perBase ?? Infinity) < (best.perBase ?? Infinity) ? x : best), undefined);
  if (bestPer && bestPer.product.id === o.product.id && sized.length > 1) out.push({ key: "perBase", label: `Melhor R$/${baseLabel(bestPer.size)}`, tone: "good" });

  if (o.atTier) out.push({ key: "tier", label: "Preço de atacado", tone: "good" });
  const g = o.gap;
  if (g && g.need <= Math.max(2, Math.ceil(units * 0.25))) {
    out.push({
      key: "gap",
      label: g.cheaperTotal ? `Leve +${g.need}: economiza R$ ${(g.totalNow - g.totalAtTier + 0).toFixed(2).replace(".", ",")} no total` : `Falta ${g.need} un p/ R$ ${g.price.toFixed(2).replace(".", ",")}/un`,
      tone: g.cheaperTotal ? "good" : "warn",
    });
  }
  return out;
}
