import { isCatalogRecordSellable, isOfferEligibleForRegion, type CatalogRecord } from "@/lib/marketplace/catalog";

export type CartLine = { offerId: string; quantity: number; record: CatalogRecord };
export type OrderItemSnapshot = { offerId: string; supplierOrgId: string; productId: string; productName: string; supplierSku: string; quantity: number; unitPriceMinor: number; totalMinor: number };
export type SimulatedSupplierOrder = { id: string; supplierOrgId: string; items: OrderItemSnapshot[]; subtotalMinor: number; status: "pending_simulation" };
export type SimulatedOrder = { id: string; buyerOrgId: string; idempotencyKey: string; createdAt: string; supplierOrders: SimulatedSupplierOrder[]; grandTotalMinor: number; status: "simulated" };
type CachedSimulation = { fingerprint: string; order: SimulatedOrder };
const results = new Map<string, CachedSimulation>();
const validAmount = (n: number) => Number.isSafeInteger(n) && n >= 0;
const positiveQuantity = (n: number) => Number.isSafeInteger(n) && n > 0;
function priceFor(record: CatalogRecord, quantity: number) {
  return [...record.offer.tiers].sort((a, b) => b.minQuantity - a.minQuantity)
    .find((tier) => quantity >= tier.minQuantity)?.unitPriceMinor ?? record.offer.basePriceMinor;
}

/** Nonpersistent local simulation; not an authorization or payment system. */
export function simulateCheckout(buyerOrgId: string, lines: CartLine[], idempotencyKey: string, buyerRegion: string, now = new Date()): SimulatedOrder {
  if (!buyerOrgId || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey) || !Array.isArray(lines) || lines.length === 0 || lines.length > 100) {
    throw new Error("Carrinho ou idempotência inválidos");
  }
  const seen = new Set<string>();
  const fingerprintLines: string[] = [];
  for (const line of lines) {
    if (!line.record || line.offerId !== line.record.offer.id || seen.has(line.offerId)) throw new Error("Oferta duplicada ou inconsistente");
    seen.add(line.offerId);
    if (!positiveQuantity(line.quantity) || line.quantity < line.record.offer.minQuantity ||
        !isCatalogRecordSellable(line.record, now) || !isOfferEligibleForRegion(line.record.offer, buyerRegion)) {
      throw new Error("Oferta, região ou quantidade inválida");
    }
    fingerprintLines.push(`${line.offerId}:${line.quantity}`);
  }
  const fingerprint = JSON.stringify(fingerprintLines.sort());
  const key = `${buyerOrgId}:${idempotencyKey}`;
  const previous = results.get(key);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error("Chave idempotente reutilizada para outro carrinho");
    return previous.order;
  }
  const grouped = new Map<string, OrderItemSnapshot[]>();
  for (const line of lines) {
    const unitPriceMinor = priceFor(line.record, line.quantity);
    const totalMinor = unitPriceMinor * line.quantity;
    if (!validAmount(unitPriceMinor) || !validAmount(totalMinor)) throw new Error("Valor monetário fora do limite seguro");
    const item: OrderItemSnapshot = {
      offerId: line.offerId, supplierOrgId: line.record.offer.supplierOrgId, productId: line.record.product.id,
      productName: line.record.product.name, supplierSku: line.record.supplierProduct.supplierSku,
      quantity: line.quantity, unitPriceMinor, totalMinor,
    };
    grouped.set(item.supplierOrgId, [...(grouped.get(item.supplierOrgId) ?? []), item]);
  }
  const supplierOrders = [...grouped].map(([supplierOrgId, items], index) => ({
    id: `sim-supplier-${index + 1}`, supplierOrgId, items,
    subtotalMinor: items.reduce((sum, item) => sum + item.totalMinor, 0),
    status: "pending_simulation" as const,
  }));
  const grandTotalMinor = supplierOrders.reduce((sum, suborder) => sum + suborder.subtotalMinor, 0);
  if (!validAmount(grandTotalMinor)) throw new Error("Total fora do limite seguro");
  const order: SimulatedOrder = {
    id: `sim-order-${results.size + 1}`, buyerOrgId, idempotencyKey, createdAt: now.toISOString(),
    supplierOrders, grandTotalMinor, status: "simulated",
  };
  results.set(key, { fingerprint, order });
  return order;
}
export function clearSimulationStore() { results.clear(); }
