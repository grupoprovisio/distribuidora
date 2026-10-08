export type CommissionEntry = { id: string; sellerId: string; orderId: string; kind: "accrual" | "reversal" | "payout"; amountMinor: number; status: "projected" | "due" | "paid"; createdAt: string; reversesEntryId?: string };

export function appendReversal(ledger: CommissionEntry[], original: CommissionEntry, now = new Date()) {
  if (original.kind === "reversal") throw new Error("Não é permitido reverter uma reversão");
  return [...ledger, { id: `commission-reversal-${ledger.length + 1}`, sellerId: original.sellerId, orderId: original.orderId, kind: "reversal" as const, amountMinor: -Math.abs(original.amountMinor), status: "due" as const, createdAt: now.toISOString(), reversesEntryId: original.id }];
}

export function ledgerBalance(ledger: CommissionEntry[], sellerId: string) {
  return ledger.filter((entry) => entry.sellerId === sellerId && entry.kind !== "payout").reduce((sum, entry) => sum + entry.amountMinor, 0);
}
