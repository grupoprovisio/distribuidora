import type { CatalogRecord } from "@/lib/marketplace/catalog";

export type CartLine = { offerId: string; quantity: number; record: CatalogRecord };
export type OrderItemSnapshot = { offerId: string; supplierOrgId: string; productId: string; productName: string; supplierSku: string; quantity: number; unitPriceMinor: number; totalMinor: number };
export type SimulatedSupplierOrder = { id: string; supplierOrgId: string; items: OrderItemSnapshot[]; subtotalMinor: number; status: "pending_simulation" };
export type SimulatedOrder = { id: string; buyerOrgId: string; idempotencyKey: string; createdAt: string; supplierOrders: SimulatedSupplierOrder[]; grandTotalMinor: number; status: "simulated" };

const results = new Map<string, SimulatedOrder>();

function priceFor(record: CatalogRecord, quantity: number) {
  return [...record.offer.tiers].sort((a, b) => b.minQuantity - a.minQuantity).find((tier) => quantity >= tier.minQuantity)?.unitPriceMinor ?? record.offer.basePriceMinor;
}

export function simulateCheckout(buyerOrgId: string, lines: CartLine[], idempotencyKey: string, now = new Date()): SimulatedOrder {
  const existing = results.get(`${buyerOrgId}:${idempotencyKey}`);
  if (existing) return existing;
  if (!buyerOrgId || !idempotencyKey || lines.length === 0) throw new Error("Carrinho ou idempotência inválidos");
  const grouped = new Map<string, OrderItemSnapshot[]>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < line.record.offer.minQuantity) throw new Error(`Quantidade inválida para ${line.record.supplierProduct.supplierSku}`);
    const unitPriceMinor = priceFor(line.record, line.quantity);
    const item: OrderItemSnapshot = { offerId: line.record.offer.id, supplierOrgId: line.record.offer.supplierOrgId, productId: line.record.product.id, productName: line.record.product.name, supplierSku: line.record.supplierProduct.supplierSku, quantity: line.quantity, unitPriceMinor, totalMinor: unitPriceMinor * line.quantity };
    grouped.set(line.record.offer.supplierOrgId, [...(grouped.get(line.record.offer.supplierOrgId) ?? []), item]);
  }
  const supplierOrders = [...grouped].map(([supplierOrgId, items], index) => ({ id: `sim-supplier-${index + 1}`, supplierOrgId, items, subtotalMinor: items.reduce((sum, item) => sum + item.totalMinor, 0), status: "pending_simulation" as const }));
  const order: SimulatedOrder = { id: `sim-order-${results.size + 1}`, buyerOrgId, idempotencyKey, createdAt: now.toISOString(), supplierOrders, grandTotalMinor: supplierOrders.reduce((sum, suborder) => sum + suborder.subtotalMinor, 0), status: "simulated" };
  results.set(`${buyerOrgId}:${idempotencyKey}`, order);
  return order;
}

export function clearSimulationStore() { results.clear(); }
