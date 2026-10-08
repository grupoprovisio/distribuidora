// Lê a embalagem do nome do produto ("5kg", "500 g", "2,5L", "8x90g", "Pack com 4 de 90g")
// para comparar só produtos de mesmo tamanho e calcular preço por kg/L. Puro: roda no servidor e no navegador.

export type Size = {
  /** kg (massa) ou l (volume): a unidade-base usada na comparação. */
  unit: "kg" | "l";
  /** Quantidade total na embalagem, em kg ou L (500 g = 0.5). */
  base: number;
  /** Texto para exibir: "5 kg", "330 ml", "4 × 90 g". */
  label: string;
};

const TOKEN = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|lt|l)\b/gi;

const num = (s: string) => parseFloat(s.replace(",", "."));

const fmt = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",");

function single(amount: number, unit: string): { unit: Size["unit"]; base: number; label: string } {
  switch (unit.toLowerCase()) {
    case "kg":
      return { unit: "kg", base: amount, label: `${fmt(amount)} kg` };
    case "g":
      return { unit: "kg", base: amount / 1000, label: `${fmt(amount)} g` };
    case "ml":
      return { unit: "l", base: amount / 1000, label: `${fmt(amount)} ml` };
    default: // l, lt
      return { unit: "l", base: amount, label: `${fmt(amount)} L` };
  }
}

export function parseSize(name: string): Size | undefined {
  const matches = [...name.replace(/ /g, " ").matchAll(TOKEN)];
  if (matches.length === 0) return undefined;

  // O tamanho costuma vir no fim do nome; usa a última ocorrência.
  const m = matches[matches.length - 1];
  const before = name.slice(0, m.index);
  const multi = before.match(/(\d+)\s*x\s*$/i) ?? before.match(/\b(?:com|c\/|pack(?:\s+com)?)\s+(\d+)\s*(?:de|x)?\s*$/i);
  const count = multi ? parseInt(multi[1], 10) : 1;

  const one = single(num(m[1]), m[2]);
  if (!Number.isFinite(one.base) || one.base <= 0) return undefined;

  return {
    unit: one.unit,
    base: Math.round(one.base * count * 10000) / 10000,
    label: count > 1 ? `${count} × ${one.label}` : one.label,
  };
}

export const sameSize = (a?: Size, b?: Size) => !!a && !!b && a.unit === b.unit && Math.abs(a.base - b.base) < 1e-6;

/** Preço por kg ou L (para comparar embalagens diferentes). */
export const perBase = (price: number, size?: Size) => (size ? price / size.base : undefined);

export const baseLabel = (size?: Size) => (size?.unit === "l" ? "L" : "kg");
