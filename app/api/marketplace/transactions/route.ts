import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGION = /^BR-(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;
const allowed = () => process.env.MARKETPLACE_TRANSACTIONS_ENABLED === "true";
const json = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const invalid = () => json({ok:false,reason:"invalid_request"},400);

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
function bodyObject(value: unknown): value is Record<string,unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  const raw=await request.text();
  if (!raw || raw.length>8192) return null;
  try { const parsed:unknown=JSON.parse(raw); return bodyObject(parsed)?parsed:null; }
  catch { return null; }
}

/** Only validated Supabase sessions/RLS can read commercial transactions. */
export async function GET(request: Request) {
  if (!allowed()) return json({ok:false,reason:"not_enabled"},503);
  const access=await getMarketplaceAccess();
  if (!access) return json({ok:false,reason:"unauthorized"},401);
  const mode=new URL(request.url).searchParams.get("mode");
  if (!["quotes","supplier_quotes","orders","supplier_orders"].includes(mode??"")) return invalid();
  const supplier=mode==="supplier_quotes"||mode==="supplier_orders";
  if (!access.allowed.includes(supplier?"fornecedor":"comprador")) return json({ok:false,reason:"forbidden"},403);
  const client=await createClient();
  if (mode==="orders"||mode==="supplier_orders") {
    const orders=await client.from("purchase_orders")
      .select("id,buyer_org_id,supplier_org_id,quote_request_id,proposal_id,offer_id,quantity,region_code,unit_price_minor,total_price_minor,status,created_at")
      .order("created_at",{ascending:false}).limit(60);
    if (orders.error) return json({ok:false,reason:"query_failed"},503);
    const ids=(orders.data??[]).map(order=>order.id);
    const shipments=ids.length?await client.from("order_fulfillments")
      .select("id,order_id,status,freight_estimate_minor,estimated_delivery_date,tracking_reference,dispatched_at,delivered_at,updated_at")
      .in("order_id",ids).limit(60):null;
    if (shipments?.error) return json({ok:false,reason:"query_failed"},503);
    return json({ok:true,items:orders.data??[],shipments:shipments?.data??[]});
  }
  const quotes=await client.from("quote_requests")
    .select("id,buyer_org_id,supplier_org_id,offer_id,quantity,region_code,status,created_at")
    .order("created_at",{ascending:false}).limit(60);
  if (quotes.error) return json({ok:false,reason:"query_failed"},503);
  const ids=(quotes.data??[]).map(item=>item.id);
  const proposals=ids.length?await client.from("quote_proposals")
    .select("id,quote_request_id,supplier_org_id,unit_price_minor,expires_at,status,created_at")
    .in("quote_request_id",ids).limit(60):null;
  if (proposals?.error) return json({ok:false,reason:"query_failed"},503);
  return json({ok:true,items:quotes.data??[],proposals:proposals?.data??[]});
}

/** Transactional RPC only: no manual inserts and no provider or payment credentials. */
export async function POST(request: Request) {
  if (!allowed()) return json({ok:false,reason:"not_enabled"},503);
  const origin=request.headers.get("origin");
  if (!origin || origin!==new URL(request.url).origin) return json({ok:false,reason:"invalid_origin"},403);
  const access=await getMarketplaceAccess();
  if (!access) return json({ok:false,reason:"unauthorized"},401);
  const body=await readJson(request);
  if (!body || typeof body.action!=="string") return invalid();
  const client=await createClient();
  let result: {data:string|null;error:{code?:string}|null};
  switch(body.action) {
    case "quote": {
      if (!access.allowed.includes("comprador")) return json({ok:false,reason:"forbidden"},403);
      const quantity=body.quantity;
      const notes=body.notes??"";
      if (!isUuid(body.buyerOrgId)||!isUuid(body.offerId)||!isUuid(body.idempotencyKey) ||
        !Number.isSafeInteger(quantity)||typeof quantity!=="number"||quantity<1||quantity>100000 ||
        typeof body.region!=="string"||!REGION.test(body.region)||
        typeof notes!=="string"||notes.length>1000) return invalid();
      const response=await client.rpc("marketplace_create_quote",{
        buyer_org_id:body.buyerOrgId,offer_id:body.offerId,quantity,region_code:body.region,
        notes,request_key:body.idempotencyKey
      });
      result=response;
      break;
    }
    case "proposal": {
      if (!access.allowed.includes("fornecedor")) return json({ok:false,reason:"forbidden"},403);
      const price=body.priceMinor;
      const expires=body.expiresAt;
      if (!isUuid(body.quoteRequestId)||
        typeof price!=="number"||!Number.isSafeInteger(price)||price<1||price>1000000000||
        typeof expires!=="string"||isNaN(Date.parse(expires)) ||
        new Date(expires).getTime()<=Date.now() ||
        new Date(expires).getTime()>Date.now()+60*24*60*60*1000) return invalid();
      const response=await client.rpc("marketplace_propose_quote",{
        quote_request_id:body.quoteRequestId,unit_price_minor:price,expires_at:expires
      });
      result=response;
      break;
    }
    case "order_transition": {
      const action=body.transition;
      const supplierAction=action==="supplier_confirm"||action==="supplier_reject"||action==="supplier_cancel";
      if (!supplierAction && action!=="buyer_cancel") return invalid();
      if (!access.allowed.includes(supplierAction?"fornecedor":"comprador"))
        return json({ok:false,reason:"forbidden"},403);
      if (!isUuid(body.orderId)) return invalid();
      const response=await client.rpc("marketplace_transition_order",{
        order_id:body.orderId,action,
      });
      result=response;
      break;
    }
    case "fulfillment": {
      if (!access.allowed.includes("fornecedor")) return json({ok:false,reason:"forbidden"},403);
      const transition=body.transition;
      const allowedTransitions=["start_separation","mark_ready","dispatch","deliver"];
      if (!isUuid(body.orderId) || typeof transition!=="string" ||
          !allowedTransitions.includes(transition)) return invalid();
      const freight=body.freightMinor??null;
      const eta=body.etaDate??null;
      const tracking=body.trackingReference??null;
      if (freight!==null && (typeof freight!=="number" || !Number.isSafeInteger(freight) ||
           freight<0 || freight>100000000)) return invalid();
      if (eta!==null && (typeof eta!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(eta) ||
           isNaN(Date.parse(eta)))) return invalid();
      if (tracking!==null && (typeof tracking!=="string" ||
           tracking.trim().length<1 || tracking.trim().length>80 ||
           /[\x00-\x1f\x7f]/.test(tracking))) return invalid();
      if (transition!=="start_separation" && (freight!==null || eta!==null)) return invalid();
      if (transition!=="dispatch" && tracking!==null) return invalid();
      const response=await client.rpc("marketplace_advance_fulfillment",{
        order_id:body.orderId,action:transition,freight_estimate_minor:freight,
        estimated_delivery_date:eta,tracking_reference:tracking
      });
      result=response;
      break;
    }
    case "checkout": {
      if (!access.allowed.includes("comprador")) return json({ok:false,reason:"forbidden"},403);
      if (!isUuid(body.buyerOrgId)||!isUuid(body.quoteRequestId)||!isUuid(body.proposalId)||
        !isUuid(body.idempotencyKey)) return invalid();
      const response=await client.rpc("marketplace_submit_checkout",{
        buyer_org_id:body.buyerOrgId,quote_request_id:body.quoteRequestId,
        proposal_id:body.proposalId,checkout_key:body.idempotencyKey
      });
      result=response;
      break;
    }
    default: return invalid();
  }
  if (result.error) {
    const expected=["42501","22023","23505","23503","23514"];
    return json({ok:false,reason:expected.includes(result.error.code??"")
      ? "operation_not_allowed_or_changed" : "operation_unavailable"},422);
  }
  return json({ok:true,id:result.data},201);
}
