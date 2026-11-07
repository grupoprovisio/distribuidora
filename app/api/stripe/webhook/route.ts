const encoder = new TextEncoder();
const toleranceSeconds = 300;

async function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const parts = signature.split(",").reduce<Record<string, string[]>>((acc, item) => {
    const [key, value] = item.split("=", 2);
    if (key && value) (acc[key] ??= []).push(value);
    return acc;
  }, {});
  const timestamp = Number(parts.t?.[0]);
  const candidates = parts.v1 ?? [];
  if (!Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds || candidates.length === 0) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp + "." + payload));
  const expected = Array.from(new Uint8Array(signed)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  return candidates.some(candidate => candidate.length === expected.length && candidate.split("").every((char, index) => char === expected[index]));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_RUNTIME_SECRET ?? process.env.STRIPE_WEBHOOK_SIGNING_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return Response.json({ ok: false, reason: "webhook_not_configured" }, { status: 400 });
  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, signature, secret))) return Response.json({ ok: false, reason: "invalid_signature" }, { status: 400 });
  const event = JSON.parse(payload) as { type?: string; data?: { object?: { id?: string; payment_status?: string } } };
  const session = event.data?.object;
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (session?.payment_status === "paid") console.info("Stripe checkout paid", { sessionId: session.id, eventType: event.type });
  } else if (event.type === "checkout.session.async_payment_failed" || event.type === "payment_intent.payment_failed") {
    console.warn("Stripe payment failed", { sessionId: session?.id, eventType: event.type });
  }
  return Response.json({ received: true });
}
