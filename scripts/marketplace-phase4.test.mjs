import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createQuoteDraft} from '../lib/marketplace/quote-draft.mjs';
const expiry=new Date(Date.now()+86400000).toISOString();
const data={buyerOrgId:'buyer-org',requestId:'quote-123',expiresAt:expiry,items:[{productId:'rice-product',quantity:1.5}]};
test('cotações validam itens, duplicidade e prazo',()=>{
 const draft=createQuoteDraft(data);
 assert.equal(draft.status,'draft');
 assert.equal(draft.items[0].quantity,1.5);
 for(const change of [{items:[]},{items:[data.items[0],data.items[0]]},{items:[{productId:'rice-product',quantity:0}]},{expiresAt:'2020-01-01'}])assert.throws(()=>createQuoteDraft({...data,...change}));
});
test('migração de pedidos mantém RLS forced, tenant e idempotência',()=>{
 const sql=readFileSync('db/migrations/0016_marketplace_order_foundation.sql','utf8');
 for(const required of ['UNIQUE(buyer_org_id,idempotency_key)','request_fingerprint','marketplace_supplier_orders','marketplace_order_items','marketplace_order_events','FORCE ROW LEVEL SECURITY','REVOKE ALL ON TABLE'])assert.ok(sql.includes(required),required);
 assert.doesNotMatch(sql,/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)\s+ON\s+.*\s+TO\s+(?:anon|authenticated)/i);
});
