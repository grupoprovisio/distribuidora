import {createHash} from 'node:crypto';
import {createOrderDraft} from './order-draft.mjs';

const safe=(value,label)=>{if(!Number.isSafeInteger(value)||value<0)throw new RangeError(label+' invalid cents or quantity');return value;};
/** Pure offer revalidation, used before any future atomic database checkout. */
export function validateCheckoutIntent(intent,catalog,now=new Date()) {
 if(!intent || !Array.isArray(intent.lines) || intent.lines.length<1 || intent.lines.length>100)throw new Error('invalid_cart');
 if(typeof intent.region!=='string'|| !/^BR-[A-Z]{2}$/.test(intent.region))throw new Error('invalid_region');
 if(typeof intent.buyerOrgId!=='string'||!intent.buyerOrgId)throw new Error('invalid_buyer');
 if(!(catalog instanceof Map))throw new TypeError('catalog must be server-sourced');
 const validated=[];const seen=new Set();
 for(const line of intent.lines){
  if(!line||typeof line.offerId!=='string'||seen.has(line.offerId))throw new Error('duplicate_or_invalid_offer');
  seen.add(line.offerId);
  const offer=catalog.get(line.offerId);
  if(!offer || offer.status!=='approved'||offer.supplierStatus!=='approved'||offer.skuStatus!=='approved'||offer.productStatus!=='active')throw new Error('offer_not_authorized');
  if(!Array.isArray(offer.regions)||!offer.regions.some(region=>region===intent.region||region==='BR'))throw new Error('region_not_served');
  if(!['MANUAL_AUTHORIZED','SUPPLIER_CSV_AUTHORIZED','SUPPLIER_API_AUTHORIZED','PLATFORM_STOCK'].includes(offer.source))throw new Error('external_source_rejected');
  const nowMs=now.getTime();
  if(!Number.isFinite(nowMs)||new Date(offer.validFrom).getTime()>nowMs||(offer.validTo&&new Date(offer.validTo).getTime()<=nowMs))throw new Error('offer_expired');
  if(!Number.isSafeInteger(line.quantity)||line.quantity<offer.minQuantity||line.quantity<1)throw new Error('invalid_quantity');
  if(offer.multiple && line.quantity%offer.multiple!==0)throw new Error('invalid_quantity_multiple');
  if(safe(offer.availableQuantity,'availableQuantity')-safe(offer.reservedQuantity,'reservedQuantity')<line.quantity)throw new Error('insufficient_stock');
  let unitPriceMinor=safe(offer.basePriceMinor,'price');
  for(const tier of [...(offer.tiers??[])].sort((a,b)=>a.minQuantity-b.minQuantity)){
   if(line.quantity>=tier.minQuantity)unitPriceMinor=safe(tier.unitPriceMinor,'tier_price');
  }
  validated.push({offerId:line.offerId,supplierOrgId:offer.supplierOrgId,productName:offer.productName,packLabel:offer.packLabel,quantity:line.quantity,unitPriceMinor});
 }
 const draft=createOrderDraft({buyerOrgId:intent.buyerOrgId,idempotencyKey:intent.idempotencyKey,items:validated});
 const fingerprint=createHash('sha256').update(JSON.stringify({buyerOrgId:draft.buyerOrgId,idempotencyKey:draft.idempotencyKey,supplierOrders:draft.supplierOrders,region:intent.region})).digest('hex');
 return Object.freeze({...draft,fingerprint,region:intent.region});
}
/** Synchronous in-process simulator ONLY. Never used as payment or real checkout. */
export class IsolatedCheckoutSimulator {
 #orders=new Map();
 submit(intent,catalog,now=new Date()) {
  const draft=validateCheckoutIntent(intent,catalog,now);
  const id=draft.buyerOrgId+':'+draft.idempotencyKey;
  const prior=this.#orders.get(id);
  if(prior){if(prior.fingerprint!==draft.fingerprint)throw new Error('idempotency_conflict');return prior;}
  const snapshot=Object.freeze({...draft,simulated:true});
  this.#orders.set(id,snapshot);
  return snapshot;
 }
 list(buyerOrgId){return [...this.#orders.values()].filter(o=>o.buyerOrgId===buyerOrgId);}
}
