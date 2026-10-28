/** Logistics transitions are domain validation only; authorization remains server/RLS. */
export const FULFILLMENT_STATUSES = ["separating","ready_to_dispatch","in_transit","delivered","cancelled"] as const;
export type FulfillmentStatus = typeof FULFILLMENT_STATUSES[number];
export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  separating: "Separação",
  ready_to_dispatch: "Faturamento",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
const next: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  separating:["ready_to_dispatch","cancelled"],
  ready_to_dispatch:["in_transit","cancelled"],
  in_transit:["delivered"],
  delivered:[],
  cancelled:[],
};
export function canAdvanceFulfillment(from: FulfillmentStatus,to: FulfillmentStatus): boolean {
  return next[from]?.includes(to) ?? false;
}
export function validateFulfillmentTransition(from: FulfillmentStatus,to: FulfillmentStatus): void {
  if (!canAdvanceFulfillment(from,to)) {
    throw new Error("Transicao logistica nao permitida: "+from+" -> "+to);
  }
}
export function validateFulfillmentDetails(input: {
  status: FulfillmentStatus;
  trackingReference?: string | null;
  freightEstimateMinor?: number | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
}): void {
  if (!FULFILLMENT_STATUSES.includes(input.status)) throw new Error("Status logisitico invalido");
  if (input.freightEstimateMinor != null &&
      (!Number.isSafeInteger(input.freightEstimateMinor) ||
       input.freightEstimateMinor < 0 || input.freightEstimateMinor > 100000000)) {
    throw new Error("Frete invalido");
  }
  if (input.trackingReference != null &&
      (input.trackingReference.trim().length < 1 || input.trackingReference.length > 80)) {
    throw new Error("Referencia de rastreio invalida");
  }
  if (input.status === "delivered" && !input.deliveredAt) {
    throw new Error("Entrega exige data de comprovacao");
  }
  if (input.deliveredAt && !input.dispatchedAt) {
    throw new Error("Entrega nao pode anteceder expedicao");
  }
  if (input.dispatchedAt && input.deliveredAt &&
      new Date(input.deliveredAt).getTime() < new Date(input.dispatchedAt).getTime()) {
    throw new Error("Entrega anterior a expedicao");
  }
}
