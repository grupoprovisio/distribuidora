/** Cálculos comerciais independentes do frontend e sem efeitos no banco.
 * Quantidades de pedido são pacotes inteiros; preços são centavos BRL.
 * Produtos por peso fracionário devem ser convertidos para unidade-base inteira
 * antes da entrada neste módulo, evitando arredondamento flutuante de dinheiro.
 */
export type PriceTier = { minQuantity: number; unitPriceMinor: number };
export type PriceQuoteInput = {
  basePriceMinor: number;
  minQuantity: number;
  quantityMultiple: number;
  quantity: number;
  packBaseUnits: number;
  tiers: readonly PriceTier[];
  shippingMinor?: number;
  taxesMinor?: number;
};
export type PriceQuote = {
  quantity: number;
  appliedMinQuantity: number;
  unitPriceMinor: number;
  merchandiseMinor: number;
  shippingMinor: number;
  taxesMinor: number;
  totalMinor: number;
  equivalentUnitMinorNumerator: number;
  equivalentUnitDenominator: number;
};
const money = (n: number) => Number.isSafeInteger(n) && n >= 0;
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
function safeSum(...values: number[]) {
  const value = values.reduce((a,b) => a+b, 0);
  if (!Number.isSafeInteger(value)) throw new RangeError("Total excede a precisão de centavos.");
  return value;
}
export function quoteOffer(input: PriceQuoteInput): PriceQuote {
  const {basePriceMinor,minQuantity,quantityMultiple,quantity,packBaseUnits,tiers}=input;
  const shippingMinor=input.shippingMinor??0, taxesMinor=input.taxesMinor??0;
  if (![basePriceMinor,shippingMinor,taxesMinor].every(money)
    || ![minQuantity,quantityMultiple,quantity,packBaseUnits].every(positive)
    || !Array.isArray(tiers)) throw new RangeError("Preço ou quantidade inválida.");
  if (quantity < minQuantity || quantity % quantityMultiple !== 0)
    throw new RangeError("Quantidade abaixo do mínimo ou fora do múltiplo da oferta.");
  const seen = new Set<number>();
  for (const tier of tiers) {
    if (!positive(tier.minQuantity) || tier.minQuantity < minQuantity
      || !money(tier.unitPriceMinor) || seen.has(tier.minQuantity))
      throw new RangeError("Faixa de preço inválida ou duplicada.");
    seen.add(tier.minQuantity);
  }
  const applicable = tiers.filter(t => t.minQuantity <= quantity)
    .sort((a,b) => b.minQuantity-a.minQuantity)[0];
  const unitPriceMinor = applicable?.unitPriceMinor ?? basePriceMinor;
  const merchandiseMinor=unitPriceMinor*quantity;
  const equivalentUnitDenominator=quantity*packBaseUnits;
  if (!Number.isSafeInteger(merchandiseMinor) || !Number.isSafeInteger(equivalentUnitDenominator))
    throw new RangeError("Quantidade ou subtotal excede a precisão segura.");
  const totalMinor=safeSum(merchandiseMinor,shippingMinor,taxesMinor);
  return {quantity,appliedMinQuantity:applicable?.minQuantity??minQuantity,
    unitPriceMinor,merchandiseMinor,shippingMinor,taxesMinor,totalMinor,
    equivalentUnitMinorNumerator:totalMinor,equivalentUnitDenominator};
}
/** Compara o custo efetivo por unidade base SEM divisão de ponto flutuante.
 * Para unidades base diferentes, a comparação é proibida pelo chamador.
 */
export function compareEquivalentCost(a: PriceQuote,b: PriceQuote): number {
  const left=BigInt(a.equivalentUnitMinorNumerator)*BigInt(b.equivalentUnitDenominator);
  const right=BigInt(b.equivalentUnitMinorNumerator)*BigInt(a.equivalentUnitDenominator);
  return left < right ? -1 : left > right ? 1 : 0;
}
