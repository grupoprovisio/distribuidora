import type { createClient } from "@/lib/supabase/server";
import type { getMarketplaceAccess } from "@/lib/marketplace/session";

type Access = NonNullable<Awaited<ReturnType<typeof getMarketplaceAccess>>>;
type Client = Awaited<ReturnType<typeof createClient>>;
type Portal = "comprador" | "fornecedor";
type Env = Record<string, string | undefined>;
export type QaTransactionScope = { buyer: string; suppliers: ReadonlySet<string> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fail-closed and server-only: QA checkout never admits customers in the real commercial organizations. */
export function readQaTransactionScope(env: Env): QaTransactionScope | null {
  if (env.MARKETPLACE_QA_TRANSACTIONS_ENABLED !== "true") return null;
  const buyer = env.MARKETPLACE_QA_BUYER_ORG_ID?.trim() ?? "";
  const list = (env.MARKETPLACE_QA_SUPPLIER_ORG_IDS ?? "").split(",").map(v => v.trim()).filter(Boolean);
  if (!UUID.test(buyer) || list.length !== 2 ||
      list.some(v => !UUID.test(v)) || new Set(list).size !== 2 ||
      list.includes(buyer)) return null;
  return { buyer, suppliers: new Set(list) };
}

export function qaPortalForAccess(
  access: Access | null,
  scope: QaTransactionScope,
): Portal | null {
  if (!access || access.allowed.length !== 1 || access.organizationIds.admin.length) return null;
  const buyerOrgs = access.organizationIds.comprador;
  const supplierOrgs = access.organizationIds.fornecedor;
  if (access.allowed[0] === "comprador" && buyerOrgs.length === 1 &&
      buyerOrgs[0] === scope.buyer && supplierOrgs.length === 0) return "comprador";
  if (access.allowed[0] === "fornecedor" && supplierOrgs.length === 1 &&
      scope.suppliers.has(supplierOrgs[0]) && buyerOrgs.length === 0) return "fornecedor";
  return null;
}

export function transactionAccessMode(
  access: Access | null,
  env: Env = process.env,
): "global" | "qa" | "disabled" {
  if (env.MARKETPLACE_TRANSACTIONS_ENABLED === "true") return "global";
  const scope = readQaTransactionScope(env);
  return scope && qaPortalForAccess(access, scope) ? "qa" : "disabled";
}

export function transactionEnabledForAccess(access: Access | null, env: Env = process.env): boolean {
  return transactionAccessMode(access, env) !== "disabled";
}
function isId(id: unknown): id is string { return typeof id === "string" && UUID.test(id); }
type Body = Record<string, unknown>;

/** Defense in depth for QA mode. The SQL RPC and RLS remain authoritative. */
export async function qaTransactionBodyAllowed(
  db: Client, access: Access, body: Body, scope: QaTransactionScope,
): Promise<boolean> {
  const action = body.action;
  const portal = qaPortalForAccess(access, scope);
  if (!portal) return false;
  if (action === "quote") {
    if (portal !== "comprador" || body.buyerOrgId !== scope.buyer || !isId(body.offerId)) return false;
    const res = await db.from("offers").select("supplier_org_id").eq("id", body.offerId).maybeSingle();
    return !res.error && !!res.data && scope.suppliers.has(res.data.supplier_org_id);
  }
  if (action === "proposal" || action === "checkout") {
    if (action === "proposal" && portal !== "fornecedor") return false;
    if (action === "checkout" && (portal !== "comprador" || body.buyerOrgId !== scope.buyer)) return false;
    if (!isId(body.quoteRequestId)) return false;
    const res = await db.from("quote_requests")
      .select("buyer_org_id,supplier_org_id").eq("id", body.quoteRequestId).maybeSingle();
    if (res.error || res.data?.buyer_org_id !== scope.buyer ||
        !res.data || !scope.suppliers.has(res.data.supplier_org_id)) return false;
    if (action === "proposal") return access.organizationIds.fornecedor.includes(res.data.supplier_org_id);
    if (!isId(body.proposalId)) return false;
    const proposal = await db.from("quote_proposals").select("quote_request_id")
      .eq("id", body.proposalId).maybeSingle();
    return !proposal.error && proposal.data?.quote_request_id === body.quoteRequestId;
  }
  if (action === "order_transition" || action === "fulfillment") {
    if (!isId(body.orderId)) return false;
    const res = await db.from("purchase_orders").select("buyer_org_id,supplier_org_id")
      .eq("id", body.orderId).maybeSingle();
    if (res.error || res.data?.buyer_org_id !== scope.buyer ||
        !res.data || !scope.suppliers.has(res.data.supplier_org_id)) return false;
    if (action === "fulfillment") return portal === "fornecedor" &&
      access.organizationIds.fornecedor.includes(res.data.supplier_org_id);
    const isBuyerCancel = body.transition === "buyer_cancel";
    return isBuyerCancel ? portal === "comprador" :
      portal === "fornecedor" && access.organizationIds.fornecedor.includes(res.data.supplier_org_id);
  }
  return false;
}
