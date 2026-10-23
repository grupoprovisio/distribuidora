import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { getMarketplaceAccess } from "@/lib/marketplace/session";

type Db = Awaited<ReturnType<typeof createClient>>;
type Access = NonNullable<Awaited<ReturnType<typeof getMarketplaceAccess>>>;
type Scope = { buyer: ReadonlySet<string>; supplier: ReadonlySet<string> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Only used in protected previews. In production this code is inert unless
// MARKETPLACE_QA_ONLY=true is explicitly configured with both allowlists.
export function isMarketplaceQaOnly() {
  return process.env.MARKETPLACE_QA_ONLY === "true";
}
function qaScope(): Scope | null {
  function read(name: string) {
    const ids = (process.env[name] ?? "").split(",").map(id => id.trim()).filter(Boolean);
    return ids.length && ids.length <= 8 && ids.every(id => UUID.test(id))
      ? new Set(ids) : null;
  }
  const buyer = read("MARKETPLACE_QA_BUYER_ORG_IDS");
  const supplier = read("MARKETPLACE_QA_SUPPLIER_ORG_IDS");
  if (!buyer || !supplier || [...buyer].some(id => supplier.has(id))) return null;
  return { buyer, supplier };
}
function ownsQaOnlyOrganizations(access: Access, scope: Scope, actor: "comprador" | "fornecedor") {
  if (access.organizationIds.admin.length) return false;
  const own = access.organizationIds[actor];
  const other = access.organizationIds[actor === "comprador" ? "fornecedor" : "comprador"];
  const allow = actor === "comprador" ? scope.buyer : scope.supplier;
  return own.length > 0 && other.length === 0 && own.every(id => allow.has(id));
}
const validId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
function pairAllowed(scope: Scope, buyer: unknown, supplier: unknown): boolean {
  return validId(buyer) && validId(supplier) && scope.buyer.has(buyer) && scope.supplier.has(supplier);
}

/** Fail-closed restriction for hosted QA against the shared Supabase production DB.
 * Never replaces user Auth, org permissions, PostgreSQL RLS, CSRF or RPC validation.
 */
export function qaMayRead(access: Access, mode: string | null) {
  if (!isMarketplaceQaOnly()) return true;
  const scope = qaScope();
  if (!scope) return false;
  const actor = mode === "supplier_quotes" || mode === "supplier_orders" ? "fornecedor" : "comprador";
  return ownsQaOnlyOrganizations(access,scope,actor);
}

export async function qaMayWrite(db: Db, access: Access, body: Record<string,unknown>): Promise<boolean> {
  if (!isMarketplaceQaOnly()) return true;
  const scope = qaScope();
  if (!scope) return false;
  const actor = ["quote","checkout"].includes(String(body.action)) ? "comprador" : "fornecedor";
  if (body.action === "order_transition" && body.transition === "buyer_cancel") {
    if (!ownsQaOnlyOrganizations(access,scope,"comprador")) return false;
  } else if (!ownsQaOnlyOrganizations(access,scope,actor)) return false;

  if (body.action === "quote") {
    if (!validId(body.buyerOrgId) || !validId(body.offerId)
      || !scope.buyer.has(body.buyerOrgId) ||
      !access.organizationIds.comprador.includes(body.buyerOrgId)) return false;
    const {data,error} = await db.from("offers")
      .select("supplier_org_id").eq("id",body.offerId).maybeSingle();
    return !error && !!data && scope.supplier.has(data.supplier_org_id);
  }
  if (body.action === "proposal" || body.action === "checkout") {
    const quoteId=body.action==="proposal" ? body.quoteRequestId : body.quoteRequestId;
    if (!validId(quoteId)) return false;
    const {data:quote,error}=await db.from("quote_requests")
      .select("buyer_org_id,supplier_org_id").eq("id",quoteId).maybeSingle();
    if (error || !quote || !pairAllowed(scope,quote.buyer_org_id,quote.supplier_org_id)) return false;
    if (body.action === "proposal") {
      return access.organizationIds.fornecedor.includes(quote.supplier_org_id);
    }
    if (!validId(body.buyerOrgId) || !validId(body.proposalId)
      || body.buyerOrgId !== quote.buyer_org_id ||
      !access.organizationIds.comprador.includes(quote.buyer_org_id)) return false;
    const {data:proposal,error:proposalError}=await db.from("quote_proposals")
      .select("quote_request_id").eq("id",body.proposalId).maybeSingle();
    return !proposalError && proposal?.quote_request_id===quoteId;
  }
  if (body.action === "order_transition" || body.action === "fulfillment") {
    if (!validId(body.orderId)) return false;
    const {data:order,error}=await db.from("purchase_orders")
      .select("buyer_org_id,supplier_org_id").eq("id",body.orderId).maybeSingle();
    return !error && !!order && pairAllowed(scope,order.buyer_org_id,order.supplier_org_id)
      && (body.transition==="buyer_cancel"
        ? access.organizationIds.comprador.includes(order.buyer_org_id)
        : access.organizationIds.fornecedor.includes(order.supplier_org_id));
  }
  return false;
}
