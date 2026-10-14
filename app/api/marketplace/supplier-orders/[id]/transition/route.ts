import { demoAuthorizedCatalog } from "@/lib/marketplace/catalog";
import { demoEndpointDisabled, isLocalMarketplaceDemoEnabled } from "@/lib/marketplace/demo-access";
import { transitionSupplierOrder, type SupplierOrderStatus } from "@/lib/marketplace/fulfillment";

const events: Record<string, "accepted" | "rejected" | "picking_started" | "shipped" | "partial_delivery" | "delivered" | "cancelled"> = {
  accepted: "accepted", rejected: "rejected", picking: "picking_started", shipped: "shipped",
  partially_delivered: "partial_delivery", delivered: "delivered", cancelled: "cancelled",
};
const statuses = new Set(["pending_simulation", "accepted", "rejected", "picking", "shipped", "partially_delivered", "delivered", "cancelled"]);

/** Local simulation with no persisted order. Never infer supplier authority from a client-provided ID in production. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isLocalMarketplaceDemoEnabled()) return demoEndpointDisabled();
  const { id } = await context.params;
  if (!/^sim-supplier-[1-9][0-9]{0,2}$/.test(id)) return Response.json({ ok: false, reason: "invalid_demo_id" }, { status: 400 });
  const raw = await request.text();
  if (raw.length > 4_096) return Response.json({ ok: false, reason: "payload_too_large" }, { status: 413 });
  let body: { currentStatus?: unknown; nextStatus?: unknown; supplierOrgId?: unknown; note?: unknown } | null = null;
  try { body = JSON.parse(raw); } catch { /* Invalid JSON handled below. */ }
  if (typeof body?.currentStatus !== "string" || typeof body.nextStatus !== "string" ||
      typeof body.supplierOrgId !== "string" || !statuses.has(body.currentStatus) || !events[body.nextStatus]) {
    return Response.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }
  if (!demoAuthorizedCatalog.some(({ organization }) => organization.id === body.supplierOrgId)) {
    return Response.json({ ok: false, reason: "unknown_demo_supplier" }, { status: 403 });
  }
  try {
    const result = transitionSupplierOrder(
      body.currentStatus as SupplierOrderStatus, body.nextStatus as SupplierOrderStatus,
      { type: events[body.nextStatus], at: new Date().toISOString(), actorOrgId: body.supplierOrgId,
        note: typeof body.note === "string" ? body.note.slice(0, 300) : undefined },
      body.supplierOrgId,
    );
    return Response.json({ ok: true, simulated: true, supplierOrderId: id, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, reason: error instanceof Error ? error.message : "invalid_transition" }, { status: 422 });
  }
}
