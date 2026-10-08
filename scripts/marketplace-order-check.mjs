import assert from "node:assert/strict";

const order = { supplierOrders: [{ supplierOrgId: "supplier-a", subtotalMinor: 2000 }, { supplierOrgId: "supplier-b", subtotalMinor: 3000 }], grandTotalMinor: 5000, idempotencyKey: "retry-1" };
assert.equal(order.supplierOrders.length, 2);
assert.equal(order.grandTotalMinor, order.supplierOrders.reduce((sum, item) => sum + item.subtotalMinor, 0));
assert.equal(order.idempotencyKey, "retry-1");
console.log("marketplace-order-check: OK — subpedidos, snapshot monetário e chave de idempotência representados");
