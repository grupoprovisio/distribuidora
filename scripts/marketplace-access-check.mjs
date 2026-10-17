import assert from "node:assert/strict";

const user = { id: "u1", status: "active" };
const buyer = { id: "b1", status: "approved", capabilities: ["BUYER"] };
const supplier = { id: "s1", status: "approved", capabilities: ["SUPPLIER"] };
const buyerMembership = { userId: "u1", organizationId: "b1", role: "BUYER", status: "active" };
const roles = { BUYER: ["BUYER"], SUPPLIER_ADMIN: ["SUPPLIER"] };
const can = (org, membership, capability) => user.status === "active" && org.status === "approved" && membership.userId === user.id && membership.organizationId === org.id && membership.status === "active" && roles[membership.role].includes(capability) && org.capabilities.includes(capability);

assert.equal(can(buyer, buyerMembership, "BUYER"), true);
assert.equal(can(supplier, buyerMembership, "SUPPLIER"), false);
assert.equal(can({ ...buyer, id: "other" }, buyerMembership, "BUYER"), false);
assert.equal(can(buyer, { ...buyerMembership, status: "revoked" }, "BUYER"), false);
console.log("marketplace-access-check: OK — tenant, papel, status e capacidade são obrigatórios");
