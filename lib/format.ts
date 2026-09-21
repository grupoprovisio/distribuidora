const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const brl = (value: number) => brlFormatter.format(value);

/** Divide em reais e centavos para exibição tipográfica ("22" + "69"). */
export function splitPrice(value: number) {
  const [int, cents] = value.toFixed(2).split(".");
  return { int: int.replace(/\B(?=(\d{3})+(?!\d))/g, "."), cents };
}

/** Desconto percentual do degrau de atacado em relação ao preço unitário (0 se não houver). */
export function tierDiscountPct(unitPrice: number, tierPrice?: number) {
  if (!tierPrice || tierPrice >= unitPrice) return 0;
  return (1 - tierPrice / unitPrice) * 100;
}

export const pct = (value: number) => value.toFixed(1).replace(".", ",") + "%";
