export type PaymentIntent = { id: string; orderId: string; amountMinor: number; currency: "BRL"; status: "created" | "authorized" | "refunded" };
export type SignedEvent = { provider: string; eventId: string; type: string; payload: unknown; signature: string };

export interface PaymentProviderSandbox {
  createIntent(orderId: string, amountMinor: number): Promise<PaymentIntent>;
  refund(intentId: string, amountMinor: number): Promise<{ intentId: string; amountMinor: number; status: "simulated" }>;
}

export class NoopPaymentProviderSandbox implements PaymentProviderSandbox {
  async createIntent(orderId: string, amountMinor: number) { return { id: `sandbox-intent-${orderId}`, orderId, amountMinor, currency: "BRL" as const, status: "created" as const }; }
  async refund(intentId: string, amountMinor: number) { return { intentId, amountMinor, status: "simulated" as const }; }
}

/** A supplied verifier must check the provider's cryptographic signature against the raw payload.
 * There is intentionally no default verifier: a non-empty signature is NOT evidence of authenticity.
 * This sandbox never receives real provider events or handles money.
 */
export type SandboxSignatureVerifier = (event: SignedEvent) => boolean;

export function acceptWebhookEvent(event: SignedEvent, seen: Set<string>, verifySignature?: SandboxSignatureVerifier) {
  if (!event || typeof event.provider !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(event.provider) ||
      typeof event.eventId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(event.eventId) ||
      typeof event.signature !== "string" || event.signature.trim().length === 0) {
    throw new Error("Evento sem identificação ou assinatura válida");
  }
  if (typeof verifySignature !== "function" || verifySignature(event) !== true) {
    throw new Error("Assinatura do evento não verificada");
  }
  const key = JSON.stringify([event.provider, event.eventId]);
  if (seen.has(key)) return { accepted: false, duplicate: true, key };
  seen.add(key);
  return { accepted: true, duplicate: false, key };
}
