import { NextResponse } from "next/server";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://grupoprovisio.com").replace(/\/+$/, "");

function isEnabled() {
  return process.env.MARKETPLACE_TRANSACTIONS_ENABLED === "true" &&
    process.env.STRIPE_CHECKOUT_ENABLED === "true";
}

export async function POST() {
  if (!isEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "checkout_not_enabled", message: "O checkout está em homologação." },
      { status: 503 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) {
    return NextResponse.json({ ok: false, reason: "checkout_not_configured" }, { status: 503 });
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", siteUrl + "/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url", siteUrl + "/checkout/cancelado");
  params.set("allow_promotion_codes", "true");

  const integrationIdentifier = process.env.STRIPE_INTEGRATION_IDENTIFIER;
  if (integrationIdentifier) params.set("integration_identifier", integrationIdentifier);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secretKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });

  const session = await response.json() as { url?: string; error?: { message?: string } };
  if (!response.ok || !session.url) {
    console.error("Stripe Checkout session creation failed", session.error?.message);
    return NextResponse.json({ ok: false, reason: "stripe_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url: session.url });
}
