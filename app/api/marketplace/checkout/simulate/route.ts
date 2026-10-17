import { demoRepository } from "@/lib/marketplace/catalog";
import { demoEndpointDisabled, isLocalMarketplaceDemoEnabled } from "@/lib/marketplace/demo-access";
import { marketplaceFlags } from "@/lib/marketplace/flags";
import { canAccessOrganization, demoIdentity } from "@/lib/marketplace/identity";
import { simulateCheckout, type CartLine } from "@/lib/marketplace/order-simulation";

/** Demonstration only: never accepts real customers, persists orders or charges money. */
export async function POST(request: Request) {
  if (!isLocalMarketplaceDemoEnabled() || !marketplaceFlags.checkoutSimulationEnabled) return demoEndpointDisabled();
  const raw = await request.text();
  if (raw.length > 32_768) return Response.json({ ok: false, reason: "payload_too_large" }, { status: 413 });
  let body: { buyerOrgId?: unknown; buyerRegion?: unknown; idempotencyKey?: unknown; items?: unknown } | null = null;
  try { body = JSON.parse(raw); } catch { /* Invalid JSON handled below. */ }
  if (typeof body?.buyerOrgId !== "string" || typeof body.buyerRegion !== "string" ||
      typeof body.idempotencyKey !== "string" || !Array.isArray(body.items) ||
      body.items.length === 0 || body.items.length > 100) {
    return Response.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }
  if (body.buyerOrgId !== demoIdentity.buyer.id ||
      !canAccessOrganization(demoIdentity.user, demoIdentity.buyer, demoIdentity.membership, "BUYER")) {
    return Response.json({ ok: false, reason: "not_authorized_fixture" }, { status: 403 });
  }
  const lines: CartLine[] = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object") return Response.json({ ok: false, reason: "invalid_item" }, { status: 400 });
    const input = item as { offerId?: unknown; quantity?: unknown };
    if (typeof input.offerId !== "string" || !Number.isSafeInteger(input.quantity) ||
        (input.quantity as number) < 1) return Response.json({ ok: false, reason: "invalid_item" }, { status: 400 });
    const record = await demoRepository.getSellableOffer(input.offerId, new Date(), body.buyerRegion);
    if (!record) return Response.json({ ok: false, reason: "offer_not_sellable" }, { status: 422 });
    lines.push({ offerId: input.offerId, quantity: input.quantity as number, record });
  }
  try {
    return Response.json({ ok: true, simulated: true,
      order: simulateCheckout(body.buyerOrgId, lines, body.idempotencyKey, body.buyerRegion) });
  } catch (error) {
    return Response.json({ ok: false, reason: error instanceof Error ? error.message : "invalid_checkout" }, { status: 422 });
  }
}
