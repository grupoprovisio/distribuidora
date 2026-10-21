import assert from "node:assert/strict";
import test from "node:test";
import {createOrderDraft,sameOrderRequest} from "../lib/marketplace/order-draft.mjs";
const input={buyerOrgId:"buyer-a",idempotencyKey:"req-123",items:[
 {offerId:"offer-a",supplierOrgId:"supplier-a",productName:"Arroz",packLabel:"Saco 5 kg",quantity:2,unitPriceMinor:1900},
 {offerId:"offer-b",supplierOrgId:"supplier-b",productName:"Feijão",packLabel:"Pacote 1 kg",quantity:3,unitPriceMinor:700}
]};
test("deterministic supplier split and item snapshots",()=>{
 const draft=createOrderDraft(input);
 assert.equal(draft.grandTotalMinor,5900);
 assert.equal(draft.supplierOrders.length,2);
 assert.equal(draft.supplierOrders[0].subtotalMinor,3800);
 assert.equal(draft.supplierOrders[1].subtotalMinor,2100);
 assert.equal(draft.paymentStatus,"not_started");
 assert.throws(()=>{draft.supplierOrders[0].items[0].quantity=999},TypeError);
 assert.equal(sameOrderRequest(draft,createOrderDraft(input)),true);
});
test("rejects unsafe amounts, duplicate offers, buyer self-sale and invalid currencies",()=>{
 for(const change of [
  {items:[{...input.items[0],unitPriceMinor:1.5}]},
  {items:[{...input.items[0],unitPriceMinor:2**53}]},
  {items:[input.items[0],input.items[0]]},
  {items:[{...input.items[0],supplierOrgId:"buyer-a"}]},
  {items:[{...input.items[0],currency:"USD"}]},
  {items:[{...input.items[0],quantity:0}]},
 ]) assert.throws(()=>createOrderDraft({...input,...change}));
});
