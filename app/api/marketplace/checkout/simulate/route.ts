import { demoRepository } from "@/lib/marketplace/catalog";
import { simulateCheckout, type CartLine } from "@/lib/marketplace/order-simulation";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { buyerOrgId?: unknown; idempotencyKey?: unknown; items?: unknown } | null;
  if (typeof body?.buyerOrgId !== "string" || typeof body.idempotencyKey !== "string" || !Array.isArray(body.items)) return Response.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  const lines: CartLine[] = [];
  for (const item of body.items) {
    const input = item as { offerId?: unknown; quantity?: unknown };
    if (typeof input.offerId !== "string" || !Number.isInteger(input.quantity)) return Response.json({ ok: false, reason: "invalid_item" }, { status: 400 });
    const record = await demoRepository.getSellableOffer(input.offerId);
    if (!record) return Response.json({ ok: false, reason: "offer_not_sellable" }, { status: 422 });
    lines.push({ offerId: input.offerId, quantity: input.quantity as number, record });
  }
  try {
    return Response.json({ ok: true, simulated: true, order: simulateCheckout(body.buyerOrgId, lines, body.idempotencyKey) });
  } catch (error) {
    return Response.json({ ok: false, reason: error instanceof Error ? error.message : "invalid_checkout" }, { status: 422 });
  }
}
