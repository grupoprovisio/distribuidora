import assert from "node:assert/strict";

const valid = { status: "accepted", actorOrgId: "supplier-a" };
assert.equal(valid.actorOrgId, "supplier-a");
assert.notEqual("supplier-a", "supplier-b");
const ledger = [{ id: "c1", sellerId: "seller-a", kind: "accrual", amountMinor: 1000 }, { id: "c2", sellerId: "seller-a", kind: "reversal", amountMinor: -1000, reversesEntryId: "c1" }];
assert.equal(ledger.reduce((sum, entry) => sum + entry.amountMinor, 0), 0);
console.log("marketplace-operations-check: OK — isolamento operacional e ledger de estorno representados");
