/** Pure commercial draft builder; no I/O, writes or payment activation. */
const VALID_CURRENCY = "BRL";
const MAX_MINOR = Number.MAX_SAFE_INTEGER;
function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(field + " must be a positive safe integer");
  return value;
}
function amount(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(field + " must be non-negative integer cents");
  return value;
}
function addSafe(a,b) {
  const sum=a+b;
  if (!Number.isSafeInteger(sum) || sum > MAX_MINOR) throw new RangeError("Total exceeds safe integer cents");
  return sum;
}
function key(value,field) {
  if (typeof value !== "string" || !value.trim() || value.length>128) throw new TypeError(field+" must be a non-empty identifier");
  return value.trim();
}
function deepFreeze(value) {
  if (value && typeof value==="object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
/**
 * @param {{buyerOrgId:string,idempotencyKey:string,items:Array<{offerId:string,supplierOrgId:string,
 * productName:string,packLabel:string,quantity:number,unitPriceMinor:number,currency?:string}>}} request
 * @returns {Readonly<object>} immutable, serialized-ready order preview.
 */
export function createOrderDraft(request) {
  if (!request || !Array.isArray(request.items) || request.items.length===0 || request.items.length>500) throw new TypeError("1-500 items required");
  const buyerOrgId=key(request.buyerOrgId,"buyerOrgId");
  const idempotencyKey=key(request.idempotencyKey,"idempotencyKey");
  const groups = new Map();
  let grandTotalMinor=0;
  const seen=new Set();
  for (const item of request.items) {
    const offerId=key(item.offerId,"offerId");
    const supplierOrgId=key(item.supplierOrgId,"supplierOrgId");
    const productName=key(item.productName,"productName");
    const packLabel=key(item.packLabel,"packLabel");
    if (item.currency && item.currency !== VALID_CURRENCY) throw new TypeError("Only BRL is supported");
    if (supplierOrgId===buyerOrgId) throw new TypeError("Buyer cannot buy from itself");
    if (seen.has(offerId)) throw new TypeError("Duplicate offerId; consolidate quantities before draft");
    seen.add(offerId);
    const quantity=positiveInteger(item.quantity,"quantity");
    const unitPriceMinor=amount(item.unitPriceMinor,"unitPriceMinor");
    const totalMinor=quantity*unitPriceMinor;
    if (!Number.isSafeInteger(totalMinor)) throw new RangeError("Item total overflow");
    const snapshot={offerId,supplierOrgId,productName,packLabel,quantity,unitPriceMinor,totalMinor,currency:VALID_CURRENCY};
    const group=groups.get(supplierOrgId) ?? {supplierOrgId,subtotalMinor:0,items:[]};
    group.subtotalMinor=addSafe(group.subtotalMinor,totalMinor);
    group.items.push(snapshot);
    groups.set(supplierOrgId,group);
    grandTotalMinor=addSafe(grandTotalMinor,totalMinor);
  }
  const supplierOrders=[...groups.values()].sort((a,b)=>a.supplierOrgId.localeCompare(b.supplierOrgId));
  return deepFreeze({buyerOrgId,idempotencyKey,currency:VALID_CURRENCY,grandTotalMinor,supplierOrders,
    status:"draft",paymentStatus:"not_started",fulfillmentStatus:"not_started",
    notice:"Draft only. Server must validate prices, stock, identity and entitlement before committing."});
}
/** Local in-memory dedupe is only useful in tests; never substitute for unique DB constraints. */
export function sameOrderRequest(a,b) {
  return JSON.stringify(a)===JSON.stringify(b);
}
