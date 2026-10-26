import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { isSameOriginRequest } from "@/lib/marketplace/request-origin";
import { readQaTransactionScope, transactionAccessMode } from "@/lib/marketplace/qa-transaction-gate";
import { validateBasketInput, validateBuyerBasket } from "@/lib/marketplace/basket-validation";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGION=/^BR-(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
type Body={action?:unknown;buyerOrgId?:unknown;region?:unknown;lines?:unknown;
  method?:unknown;requestKey?:unknown};
async function readBody(request:Request):Promise<Body|null>{
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return null;
  const text=await request.text();
  if(!text||text.length>16384)return null;
  try{const value:unknown=JSON.parse(text);return value&&typeof value==="object"&&!Array.isArray(value)?value as Body:null;}
  catch{return null;}
}
export async function POST(request:Request){
  if(!isSameOriginRequest(request))return respond({ok:false,reason:"invalid_origin"},403);
  const access=await getMarketplaceAccess();
  if(!access)return respond({ok:false,reason:"unauthorized"},401);
  if(transactionAccessMode(access)!=="qa")return respond({ok:false,reason:"not_enabled"},503);
  const scope=readQaTransactionScope(process.env);
  const body=await readBody(request);
  if(!scope||!body||body.buyerOrgId!==scope.buyer
    ||typeof body.region!=="string"||!REGION.test(body.region)
    ||!validateBasketInput(body.lines))return respond({ok:false,reason:"invalid_basket"},400);
  if(body.action!=="validate"&&body.action!=="submit")return respond({ok:false,reason:"invalid_action"},400);
  const db=await createClient();
  const verified=await validateBuyerBasket(db,access,body.buyerOrgId,body.region,body.lines);
  if(!verified.ok)return respond(verified,422);
  if(body.action==="validate")return respond(verified);
  if(!verified.ready)return respond({...verified,reason:"basket_changed"},409);
  if(body.method!=="delivery"&&body.method!=="pickup")
    return respond({ok:false,reason:"invalid_method"},400);
  if(typeof body.requestKey!=="string"||!UUID.test(body.requestKey))
    return respond({ok:false,reason:"invalid_key"},400);
  // The RPC atomically creates the parent request and all per-offer RFQs.
  // No stock reservation, paid status, invoice or fiscal action takes place.
  const result=await db.rpc("marketplace_submit_quote_basket",{
    buyer_org_id:body.buyerOrgId,region_code:body.region,
    fulfillment_method:body.method,lines:body.lines,request_key:body.requestKey,
  });
  if(result.error)return respond({ok:false,reason:
    ["42501","22023","23505","23514"].includes(result.error.code||"")
      ?"operation_not_allowed_or_changed":"request_unavailable"},422);
  return respond({ok:true,id:result.data,status:"submitted",paymentStatus:"unpaid"},201);
}
export async function GET(request:Request){
  const access=await getMarketplaceAccess();
  if(!access)return respond({ok:false,reason:"unauthorized"},401);
  if(transactionAccessMode(access)!=="qa")return respond({ok:false,reason:"not_enabled"},503);
  const scope=readQaTransactionScope(process.env);
  if(!scope||!access.organizationIds.comprador.includes(scope.buyer))
    return respond({ok:false,reason:"forbidden"},403);
  const url=new URL(request.url),buyer=url.searchParams.get("buyer");
  if(buyer&&buyer!==scope.buyer)return respond({ok:false,reason:"forbidden"},403);
  const db=await createClient();
  const baskets=await db.from("quote_baskets")
    .select("id,buyer_org_id,region_code,fulfillment_method,payment_status,created_at,recipient_snapshot,origin_snapshot,freight_minor,min_business_days,max_business_days,delivery_postal_code")
    .eq("buyer_org_id",scope.buyer).order("created_at",{ascending:false}).limit(30);
  if(baskets.error)return respond({ok:false,reason:"query_failed"},503);
  const basketIds=(baskets.data??[]).map(b=>b.id);
  const quotes=basketIds.length?await db.from("quote_requests")
    .select("id,basket_id,offer_id,supplier_org_id,quantity,status,created_at")
    .in("basket_id",basketIds).limit(100):null;
  if(quotes?.error)return respond({ok:false,reason:"query_failed"},503);
  const quoteIds=(quotes?.data??[]).map(q=>q.id);
  const proposals=quoteIds.length?await db.from("quote_proposals")
    .select("id,quote_request_id,unit_price_minor,expires_at,status")
    .in("quote_request_id",quoteIds).limit(100):null;
  const orders=quoteIds.length?await db.from("purchase_orders")
    .select("id,quote_request_id,status,total_price_minor,supplier_org_id")
    .in("quote_request_id",quoteIds).limit(100):null;
  if(proposals?.error||orders?.error)return respond({ok:false,reason:"query_failed"},503);
  const orderIds=(orders?.data??[]).map(o=>o.id);
  const fulfillments=orderIds.length?await db.from("order_fulfillments")
    .select("order_id,status,updated_at")
    .in("order_id",orderIds):null;
  if(fulfillments?.error)return respond({ok:false,reason:"query_failed"},503);
  const offerIds=[...new Set((quotes?.data??[]).map(q=>q.offer_id))];
  const offers=offerIds.length?await db.from("offers")
    .select("id,supplier_product_id,supplier_org_id").in("id",offerIds):null;
  const skuIds=[...new Set((offers?.data??[]).map(o=>o.supplier_product_id))];
  const skus=skuIds.length?await db.from("supplier_products")
    .select("id,product_id").in("id",skuIds):null;
  const productIds=[...new Set((skus?.data??[]).map(s=>s.product_id))];
  const products=productIds.length?await db.from("products")
    .select("id,name").in("id",productIds):null;
  const suppliers=await db.from("organizations")
    .select("id,trade_name,legal_name").in("id",[...scope.suppliers]);
  if(offers?.error||skus?.error||products?.error||suppliers.error)
    return respond({ok:false,reason:"query_failed"},503);
  const skuById=new Map((skus?.data??[]).map(s=>[s.id,s.product_id]));
  const productById=new Map((products?.data??[]).map(p=>[p.id,p.name]));
  const supplierById=new Map((suppliers.data??[])
    .map(s=>[s.id,s.trade_name||s.legal_name]));
  const offerById=new Map((offers?.data??[]).map(o=>[o.id,o]));
  const lines=(quotes?.data??[]).map(q=>{
    const offer=offerById.get(q.offer_id);
    return {...q,
      productName:productById.get(skuById.get(offer?.supplier_product_id??"")??"")??"Produto",
      supplierName:supplierById.get(q.supplier_org_id)??"Fornecedor"};
  });
  return respond({ok:true,baskets:baskets.data??[],quotes:lines,
    proposals:proposals?.data??[],orders:orders?.data??[],fulfillments:fulfillments?.data??[]});
}
