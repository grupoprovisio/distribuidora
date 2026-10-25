import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Verify the actual SQL contract, not self-contained mock objects.
// End-to-end authorization and concurrency still require PostgreSQL/HTTP tests.
const sql = readFileSync(new URL("../db/migrations/0023_marketplace_supplier_order_confirmation.sql", import.meta.url), "utf8");
const has = (pattern, description) =>
  assert.match(sql, pattern, description);

has(/create function marketplace_private\.transition_purchase_order\s*\(/i, "order transition must be server-side");
has(/marketplace_private\.has_live_auth_session\s*\(/i, "transition must require a live session");
has(/auth\.uid\s*\(\s*\)/i, "transition must bind authorization to authenticated user");
has(/v_order\.buyer_org_id/i, "buyer organization scope required");
has(/v_order\.supplier_org_id/i, "supplier organization scope required");
has(/m\.status\s*=\s*'active'/i, "organization membership must be active");
has(/raise exception 'order_permission_denied'/i, "unauthorized actor must be rejected");
has(/from public\.purchase_orders where id\s*=\s*order_ref for update/i, "lock order to serialize transitions");
has(/from public\.inventory_positions[\s\S]*?for update/i, "lock stock for atomic reservation");
has(/v_order\.status\s*=\s*v_target then return v_order\.id/i, "same transition must be idempotent");
has(/v_offer\.status\s*<>\s*'approved'/i, "cannot confirm inactive offer");
has(/v_stock\.available_quantity\s*-\s*v_stock\.reserved_quantity\s*<\s*v_order\.quantity/i, "prevent overselling");
has(/marketplace_private\.order_transition_audit/i, "audit transition table required");
has(/revoke all on marketplace_private\.order_transition_audit from public,anon,authenticated/i, "audit not exposed to public users");
for (const command of ["supplier_confirm", "supplier_reject", "supplier_cancel", "buyer_cancel"]) {
  assert.ok(sql.includes("'" + command + "'"), "missing transition: " + command);
}
assert.doesNotMatch(sql, /grant\s+all\s+on\s+marketplace_private\.order_transition_audit\s+to\s+(anon|authenticated)/i,
  "must not expose private audit");
console.log("marketplace-operations-check: OK — actual SQL authorization, locking, idempotency and audit contract");
