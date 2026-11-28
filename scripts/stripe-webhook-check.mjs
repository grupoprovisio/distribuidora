import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { POST } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const signingSecret = "whsec_local_pix_webhook_test";
const basketId = "fe8a34d5-c49c-4aef-97a3-b2f4d0c43f8a";
const sessionId = "cs_test_provisio_pix";
process.env.STRIPE_WEBHOOK_RUNTIME_SECRET = signingSecret;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
process.env.STRIPE_PAYMENT_WEBHOOK_TOKEN = "local-test-token";

function signedRequest(event, signatureOverride) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signatureOverride ?? createHmac("sha256", signingSecret)
    .update(timestamp + "." + payload).digest("hex");
  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=" + timestamp + ",v1=" + signature },
    body: payload,
  });
}
function checkoutEvent(type, paymentStatus = "paid") {
  return {
    id: "evt_pix_local_test",
    type,
    data: {
      object: {
        id: sessionId,
        amount_total: 2450,
        payment_status: paymentStatus,
        metadata: { basket_id: basketId },
      },
    },
  };
}
async function withMockedRpc(result, work, status = 200) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(result), { status, headers: { "content-type": "application/json" } });
  };
  try { await work(calls); } finally { globalThis.fetch = originalFetch; }
}

test("invalid Stripe signature never records a paid basket", async () => {
  await withMockedRpc(true, async (calls) => {
    const response = await POST(signedRequest(checkoutEvent("checkout.session.completed"), "invalid"));
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  });
});

test("Pix awaiting confirmation stays unpaid", async () => {
  await withMockedRpc(true, async (calls) => {
    const response = await POST(signedRequest(checkoutEvent("checkout.session.completed", "unpaid")));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 0);
  });
});

test("confirmed asynchronous Pix payment records the exact basket and amount", async () => {
  await withMockedRpc(true, async (calls) => {
    const response = await POST(signedRequest(checkoutEvent("checkout.session.async_payment_succeeded")));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.url, "https://example.supabase.co/rest/v1/rpc/marketplace_mark_basket_paid");
    const saved = JSON.parse(call.options.body);
    assert.equal(saved.p_basket, basketId);
    assert.equal(saved.p_session, sessionId);
    assert.equal(saved.p_amount, 2450);
  });
});

test("a rejected settlement asks Stripe to retry instead of losing payment", async () => {
  await withMockedRpc(false, async () => {
    const response = await POST(signedRequest(checkoutEvent("checkout.session.async_payment_succeeded")));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).reason, "settlement_not_confirmed");
  });
});

test("an unavailable settlement service asks Stripe to retry", async () => {
  await withMockedRpc({ code: "database_unavailable" }, async () => {
    const response = await POST(signedRequest(checkoutEvent("checkout.session.completed")));
    assert.equal(response.status, 503);
  }, 503);
});

test("failed Pix payments do not advance a basket to paid", async () => {
  await withMockedRpc(true, async (calls) => {
    const response = await POST(signedRequest(checkoutEvent("checkout.session.async_payment_failed", "unpaid")));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 0);
  });
});
