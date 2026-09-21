import type { PaidItem, PlannedItem, Purchase } from "@/lib/purchase-store";

// Compara a compra planejada com a nota fiscal (o que foi pago de verdade). Puro: só usa os dados da própria compra.
//
// A diferença total (pago − previsto) é explicada por partes que somam exatamente o total:
//   não comprou + fora do plano + quantidade diferente + preço diferente + descontos da nota.

const r2 = (n: number) => Math.round(n * 100) / 100;

export type Line = {
  key: string;
  name: string;
  image?: string;
  /** Quantidade e preço por unidade previstos (undefined = não estava no plano). */
  plannedQty?: number;
  plannedUnit?: number | null;
  /** Quantidade e preço por unidade pagos (undefined = não veio na nota). */
  paidQty?: number;
  paidUnit?: number;
  paidTotal?: number;
};

export type Kind = "same" | "qty" | "price" | "missing" | "extra";

export type Analysis = {
  planned: number;
  paid: number;
  /** pago − previsto (positivo = gastou mais). */
  diff: number;
  diffPct: number;
  /** 0–100: quão perto o total previsto ficou do pago. */
  accuracy: number;
  /** Itens planejados que apareceram na nota. */
  bought: number;
  plannedCount: number;
  /** Partes que explicam `diff` (somam exatamente). */
  parts: { missing: number; extra: number; qty: number; price: number; discounts: number };
  groups: Record<Kind, Line[]>;
};

function kindOf(l: Line): Kind {
  if (l.plannedQty === undefined) return "extra";
  if (l.paidQty === undefined) return "missing";
  if (Math.abs(l.paidQty - l.plannedQty) > 1e-9) return "qty";
  if (l.plannedUnit != null && l.paidUnit !== undefined && Math.abs(l.paidUnit - l.plannedUnit) > 0.004) return "price";
  return "same";
}

export function analyze(purchase: Purchase): Analysis | null {
  const receipt = purchase.receipt;
  if (!receipt) return null;

  const lines = new Map<string, Line>();
  const plan = (i: PlannedItem) => lines.set(i.id, { key: i.id, name: i.name, image: i.image, plannedQty: i.qty, plannedUnit: i.unit });
  purchase.items.forEach(plan);

  let extraSeq = 0;
  for (const p of receipt.items as PaidItem[]) {
    const line = p.skuId ? lines.get(p.skuId) : undefined;
    if (line) {
      line.paidQty = p.qty;
      line.paidUnit = p.unit;
      line.paidTotal = p.total;
    } else {
      const key = `extra-${extraSeq++}`;
      lines.set(key, { key, name: p.name, paidQty: p.qty, paidUnit: p.unit, paidTotal: p.total });
    }
  }

  const groups: Analysis["groups"] = { same: [], qty: [], price: [], missing: [], extra: [] };
  const parts = { missing: 0, extra: 0, qty: 0, price: 0, discounts: r2(receipt.paid - receipt.gross) };
  let planned = 0;

  for (const l of lines.values()) {
    const kind = kindOf(l);
    groups[kind].push(l);
    const known = l.plannedUnit != null;
    const plannedLine = known ? (l.plannedQty ?? 0) * (l.plannedUnit as number) : 0;
    planned += plannedLine;

    if (l.plannedQty === undefined || (l.paidQty !== undefined && !known)) {
      // Não estava no plano, ou estava mas a filial não tinha preço para prever: tudo o que foi pago é imprevisto.
      parts.extra += l.paidTotal ?? 0;
    } else if (l.paidQty === undefined) {
      parts.missing -= plannedLine;
    } else {
      // Mesma linha nos dois lados: quantidade a preço previsto + preço a quantidade paga (somam pago − previsto).
      const unit = l.plannedUnit as number;
      parts.qty += (l.paidQty - (l.plannedQty ?? 0)) * unit;
      parts.price += (l.paidTotal ?? 0) - l.paidQty * unit;
    }
  }

  planned = r2(planned);
  const paid = receipt.paid;
  const diff = r2(paid - planned);
  const bought = groups.same.length + groups.qty.length + groups.price.length;
  const byName = (a: Line, b: Line) => a.name.localeCompare(b.name, "pt-BR");
  for (const k of Object.keys(groups) as Kind[]) groups[k].sort(byName);

  return {
    planned,
    paid,
    diff,
    diffPct: planned > 0 ? (diff / planned) * 100 : 0,
    accuracy: planned > 0 ? Math.max(0, Math.round((1 - Math.abs(diff) / planned) * 100)) : 0,
    bought,
    plannedCount: purchase.items.length,
    parts: { missing: r2(parts.missing), extra: r2(parts.extra), qty: r2(parts.qty), price: r2(parts.price), discounts: parts.discounts },
    groups,
  };
}
