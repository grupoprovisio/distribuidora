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

export function acceptWebhookEvent(event: SignedEvent, seen: Set<string>) {
  const key = `${event.provider}:${event.eventId}`;
  if (seen.has(key)) return { accepted: false, duplicate: true, key };
  if (!event.provider || !event.eventId || !event.signature) throw new Error("Evento sem identificação ou assinatura");
  seen.add(key);
  return { accepted: true, duplicate: false, key };
}
