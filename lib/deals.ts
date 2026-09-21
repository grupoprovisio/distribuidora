// Contas de preço por quantidade a partir dos degraus de atacado que a API informa (nada fixo).
// Puro: roda no navegador e no servidor.

import type { CatalogProduct } from "@/lib/catalog-types";
import { parseSize, perBase, type Size } from "@/lib/size";

type Tier = { qty: number; price: number };

/** Degraus do produto, do menor para o maior (só os que de fato baixam o preço). */
export const tiersOf = (p: Pick<CatalogProduct, "unit" | "tier" | "tiers">): Tier[] =>
  (p.tiers && p.tiers.length > 0 ? p.tiers : p.tier ? [p.tier] : []).filter((t) => t.price < p.unit).sort((a, b) => a.qty - b.qty);

/** Preço unitário ao levar `qty` unidades (aplica o maior degrau atingido). */
export function priceAt(p: Pick<CatalogProduct, "unit" | "tier" | "tiers">, qty: number) {
  let price = p.unit;
  for (const t of tiersOf(p)) if (qty >= t.qty && t.price < price) price = t.price;
  return price;
}

export type TierGap = {
  /** Unidades que faltam para chegar ao próximo degrau. */
  need: number;
  /** Quantidade total no degrau. */
  qty: number;
  /** Preço unitário no degrau. */
  price: number;
  /** Quanto cada unidade fica mais barata em relação ao preço atual. */
  saveUnit: number;
  /** Total pago no degrau (qty × preço). */
  totalAtTier: number;
  /** Total pago hoje (com a quantidade atual). */
  totalNow: number;
  /** Levar o degrau custa MENOS no total do que levar só a quantidade atual (a unidade extra sai de graça). */
  cheaperTotal: boolean;
};

/** Próximo degrau ainda não atingido, se existir. */
export function nextTier(p: Pick<CatalogProduct, "unit" | "tier" | "tiers">, qty: number): TierGap | undefined {
  const now = priceAt(p, qty);
  const t = tiersOf(p).find((x) => x.qty > qty && x.price < now);
  if (!t) return undefined;
  const totalAtTier = t.qty * t.price;
  const totalNow = qty * now;
  return { need: t.qty - qty, qty: t.qty, price: t.price, saveUnit: now - t.price, totalAtTier, totalNow, cheaperTotal: totalAtTier <= totalNow };
}

/** "Falta pouco": o degrau está a até `max` unidades de distância (padrão: até 2 ou 25% da quantidade). */
export function isNear(gap: TierGap | undefined, qty: number, max = Math.max(2, Math.ceil(qty * 0.25))) {
  return !!gap && gap.need <= max;
}

export type Option = {
  product: CatalogProduct;
  /** Preço unitário na quantidade pedida. */
  unit: number;
  /** Total para a quantidade pedida. */
  total: number;
  size?: Size;
  /** R$ por kg/L na quantidade pedida. */
  perBase?: number;
  gap?: TierGap;
  /** O degrau já foi atingido na quantidade pedida. */
  atTier: boolean;
};

export function toOption(product: CatalogProduct, qty: number): Option {
  const unit = priceAt(product, qty);
  const size = parseSize(product.name);
  return {
    product,
    unit,
    total: unit * qty,
    size,
    perBase: perBase(unit, size),
    gap: nextTier(product, qty),
    atTier: unit < product.unit,
  };
}

export type OptionSort = "total" | "perBase" | "tier";

/** Ordena as opções: menor total, menor R$/kg-L (quem não tem tamanho vai para o fim) ou maior desconto de atacado. */
export function rankOptions(options: Option[], sort: OptionSort): Option[] {
  const by: Record<OptionSort, (a: Option, b: Option) => number> = {
    total: (a, b) => a.total - b.total,
    perBase: (a, b) => (a.perBase ?? Infinity) - (b.perBase ?? Infinity) || a.total - b.total,
    tier: (a, b) => b.product.unit - b.unit - (a.product.unit - a.unit) || a.total - b.total,
  };
  return [...options].sort(by[sort]);
}
