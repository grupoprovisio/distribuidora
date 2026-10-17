export type SupplierOrderStatus = "pending_simulation" | "accepted" | "rejected" | "picking" | "shipped" | "partially_delivered" | "delivered" | "cancelled";
export type SupplierOrderEvent = { type: "accepted" | "rejected" | "picking_started" | "shipped" | "partial_delivery" | "delivered" | "cancelled"; at: string; actorOrgId: string; note?: string };

const transitions: Record<SupplierOrderStatus, SupplierOrderStatus[]> = {
  pending_simulation: ["accepted", "rejected", "cancelled"], accepted: ["picking", "cancelled"], rejected: [], picking: ["shipped", "cancelled"], shipped: ["partially_delivered", "delivered"], partially_delivered: ["delivered"], delivered: [], cancelled: [],
};

export function transitionSupplierOrder(status: SupplierOrderStatus, next: SupplierOrderStatus, event: SupplierOrderEvent, supplierOrgId: string) {
  if (event.actorOrgId !== supplierOrgId) throw new Error("Fornecedor não pode operar o subpedido de outra organização");
  if (!transitions[status].includes(next)) throw new Error(`Transição inválida: ${status} -> ${next}`);
  return { status: next, event };
}
