import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const file=readFileSync(new URL("../lib/marketplace/qa-transaction-gate.ts",import.meta.url),"utf8");
const code=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInNewContext(code,{module:mod,exports:mod.exports,process:{env:{}}},{timeout:2000});
const {readQaTransactionScope,qaPortalForAccess,transactionAccessMode,qaTransactionBodyAllowed}=mod.exports;
const buyer="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sa="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const sb="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const real="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const env={MARKETPLACE_QA_TRANSACTIONS_ENABLED:"true",MARKETPLACE_QA_BUYER_ORG_ID:buyer,MARKETPLACE_QA_SUPPLIER_ORG_IDS:sa+","+sb};
const scope=readQaTransactionScope(env);
assert.ok(scope);
assert.equal(readQaTransactionScope({...env,MARKETPLACE_QA_TRANSACTIONS_ENABLED:"false"}),null);
assert.equal(readQaTransactionScope({...env,MARKETPLACE_QA_BUYER_ORG_ID:""}),null);
assert.equal(readQaTransactionScope({...env,MARKETPLACE_QA_SUPPLIER_ORG_IDS:sa}),null);
assert.equal(readQaTransactionScope({...env,MARKETPLACE_QA_SUPPLIER_ORG_IDS:sa+","+sa}),null);
assert.equal(readQaTransactionScope({...env,MARKETPLACE_QA_SUPPLIER_ORG_IDS:sa+","+buyer}),null);
assert.equal(readQaTransactionScope({...env,MARKETPLACE_QA_SUPPLIER_ORG_IDS:sa+",not-a-uuid"}),null);
const access=(role,org,other={})=>({
 allowed:[role],organizationIds:{comprador:role==="comprador"?[org]:[],fornecedor:role==="fornecedor"?[org]:[],admin:[],...other}
});
const b=access("comprador",buyer),a=access("fornecedor",sa),c=access("fornecedor",sb),outside=access("fornecedor",real);
assert.equal(qaPortalForAccess(b,scope),"comprador");
assert.equal(qaPortalForAccess(a,scope),"fornecedor");
assert.equal(qaPortalForAccess(c,scope),"fornecedor");
assert.equal(qaPortalForAccess(outside,scope),null);
assert.equal(qaPortalForAccess(access("comprador",real),scope),null);
assert.equal(qaPortalForAccess({...b,allowed:["comprador","admin"]},scope),null);
assert.equal(qaPortalForAccess({...a,organizationIds:{...a.organizationIds,admin:[real]}},scope),null);
assert.equal(qaPortalForAccess({...a,organizationIds:{...a.organizationIds,comprador:[buyer]}},scope),null);
assert.equal(qaPortalForAccess({...b,organizationIds:{...b.organizationIds,comprador:[buyer,real]}},scope),null);
assert.equal(transactionAccessMode(b,env),"qa");
assert.equal(transactionAccessMode(a,env),"qa");
assert.equal(transactionAccessMode(outside,env),"disabled");
assert.equal(transactionAccessMode(b,{...env,MARKETPLACE_QA_TRANSACTIONS_ENABLED:"false"}),"disabled");
assert.equal(transactionAccessMode(null,env),"disabled");
assert.equal(transactionAccessMode(outside,{...env,MARKETPLACE_TRANSACTIONS_ENABLED:"true"}),"global");
const rows={
 offers:{qa:{supplier_org_id:sa},foreign:{supplier_org_id:real}},
 quote_requests:{qa:{buyer_org_id:buyer,supplier_org_id:sa},qb:{buyer_org_id:buyer,supplier_org_id:sb},
   foreign:{buyer_org_id:real,supplier_org_id:sa}},
 quote_proposals:{pq:{quote_request_id:"33333333-3333-4333-8333-333333333333"},other:{quote_request_id:"44444444-4444-4444-8444-444444444444"}},
 purchase_orders:{qa:{buyer_org_id:buyer,supplier_org_id:sa},qb:{buyer_org_id:buyer,supplier_org_id:sb},
   foreign:{buyer_org_id:real,supplier_org_id:sa}},
};
const ids={offerQA:"11111111-1111-4111-8111-111111111111",offerForeign:"22222222-2222-4222-8222-222222222222",
  quoteQA:"33333333-3333-4333-8333-333333333333",quoteQB:"44444444-4444-4444-8444-444444444444",
  quoteForeign:"55555555-5555-4555-8555-555555555555",
  proposalQA:"66666666-6666-4666-8666-666666666666",
  proposalOther:"77777777-7777-4777-8777-777777777777",
  orderQA:"88888888-8888-4888-8888-888888888888",
  orderQB:"99999999-9999-4999-8999-999999999999",
  orderForeign:"00000000-0000-4000-8000-000000000000",
};
const mock={
 from(table){return {select(){return {eq(_key,id){return {async maybeSingle(){
  if(table==="offers")return {data:rows.offers[id===ids.offerQA?"qa":"foreign"]??null,error:null};
  if(table==="quote_requests")return {data:rows.quote_requests[id===ids.quoteQA?"qa":id===ids.quoteQB?"qb":"foreign"]??null,error:null};
  if(table==="quote_proposals")return {data:rows.quote_proposals[id===ids.proposalQA?"pq":"other"]??null,error:null};
  if(table==="purchase_orders")return {data:rows.purchase_orders[id===ids.orderQA?"qa":id===ids.orderQB?"qb":"foreign"]??null,error:null};
  throw Error("unexpected DB table "+table);
}};}};}}},
};
const check=(acc,body)=>qaTransactionBodyAllowed(mock,acc,body,scope);
assert.equal(await check(b,{action:"quote",buyerOrgId:buyer,offerId:ids.offerQA}),true);
assert.equal(await check(b,{action:"quote",buyerOrgId:buyer,offerId:ids.offerForeign}),false);
assert.equal(await check(b,{action:"quote",buyerOrgId:real,offerId:ids.offerQA}),false);
assert.equal(await check(a,{action:"quote",buyerOrgId:buyer,offerId:ids.offerQA}),false);
assert.equal(await check(a,{action:"proposal",quoteRequestId:ids.quoteQA}),true);
assert.equal(await check(c,{action:"proposal",quoteRequestId:ids.quoteQA}),false);
assert.equal(await check(a,{action:"proposal",quoteRequestId:ids.quoteQB}),false);
assert.equal(await check(b,{action:"checkout",buyerOrgId:buyer,quoteRequestId:ids.quoteQA,proposalId:ids.proposalQA}),true);
assert.equal(await check(b,{action:"checkout",buyerOrgId:buyer,quoteRequestId:ids.quoteQA,proposalId:ids.proposalOther}),false);
assert.equal(await check(b,{action:"order_transition",transition:"buyer_cancel",orderId:ids.orderQA}),true);
assert.equal(await check(b,{action:"order_transition",transition:"supplier_confirm",orderId:ids.orderQA}),false);
assert.equal(await check(a,{action:"order_transition",transition:"supplier_confirm",orderId:ids.orderQA}),true);
assert.equal(await check(c,{action:"order_transition",transition:"supplier_confirm",orderId:ids.orderQA}),false);
assert.equal(await check(a,{action:"fulfillment",orderId:ids.orderQA}),true);
assert.equal(await check(b,{action:"fulfillment",orderId:ids.orderQA}),false);
assert.equal(await check(a,{action:"fulfillment",orderId:ids.orderForeign}),false);
assert.equal(await check(outside,{action:"fulfillment",orderId:ids.orderQA}),false);
assert.equal(await check(a,{action:"invent_operation",orderId:ids.orderQA}),false);
console.log("PASS QA transactions: strict scope, permissions, foreign offers, cross-tenant quotes/orders and deny by default");
