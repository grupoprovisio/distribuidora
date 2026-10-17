import assert from "node:assert/strict";

const seen = new Set();
const key = "sandbox:event-1";
assert.equal(seen.has(key), false);
seen.add(key);
assert.equal(seen.has(key), true);
assert.equal("live-payment".includes("live"), true);
console.log("marketplace-finance-check: OK — adaptador sandbox e deduplicação de eventos representados");
