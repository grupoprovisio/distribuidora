import { transitionSupplierOrder, type SupplierOrderStatus } from "@/lib/marketplace/fulfillment";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { currentStatus?: unknown; nextStatus?: unknown; supplierOrgId?: unknown; note?: unknown } | null;
  if (typeof body?.currentStatus !== "string" || typeof body.nextStatus !== "string" || typeof body.supplierOrgId !== "string") return Response.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  try {
    const result = transitionSupplierOrder(body.currentStatus as SupplierOrderStatus, body.nextStatus as SupplierOrderStatus, { type: eventType(body.nextStatus), at: new Date().toISOString(), actorOrgId: body.supplierOrgId, note: typeof body.note === "string" ? body.note.slice(0, 300) : undefined }, body.supplierOrgId);
    return Response.json({ ok: true, simulated: true, supplierOrderId: id, ...result });
  } catch (error) { return Response.json({ ok: false, reason: error instanceof Error ? error.message : "invalid_transition" }, { status: 422 }); }
}

function eventType(status: string) {
  const events: Record<string, "accepted" | "rejected" | "picking_started" | "shipped" | "partial_delivery" | "delivered" | "cancelled"> = { accepted: "accepted", rejected: "rejected", picking: "picking_started", shipped: "shipped", partially_delivered: "partial_delivery", delivered: "delivered", cancelled: "cancelled" };
  return events[status] ?? "accepted";
}
