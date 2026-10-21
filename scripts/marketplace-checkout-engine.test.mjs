import test from 'node:test';
import assert from 'node:assert/strict';
import {IsolatedCheckoutSimulator,validateCheckoutIntent} from '../lib/marketplace/checkout-engine.mjs';
const offer={supplierOrgId:'supplier-one',status:'approved',supplierStatus:'approved',skuStatus:'approved',productStatus:'active',regions:['BR-SP'],source:'MANUAL_AUTHORIZED',validFrom:'2020-01-01',validTo:null,minQuantity:1,multiple:1,availableQuantity:20,reservedQuantity:3,basePriceMinor:1800,tiers:[{minQuantity:5,unitPriceMinor:1500}],productName:'Feijao',packLabel:'1kg'};
const catalog=new Map([['offer-1',offer],['offer-2',{...offer,supplierOrgId:'supplier-two',productName:'Arroz',basePriceMinor:2100}]]);
const base={buyerOrgId:'buyer-one',idempotencyKey:'checkout-1234',region:'BR-SP',lines:[{offerId:'offer-1',quantity:5},{offerId:'offer-2',quantity:2}]};
test('multi supplier draft has immutable money snapshots and volume prices',()=>{
 const result=validateCheckoutIntent(base,catalog);
 assert.equal(result.supplierOrders.length,2);
 assert.equal(result.grandTotalMinor,11700);
 assert.equal(result.fingerprint.length,64);
 assert.throws(()=>result.supplierOrders[0].items[0].quantity=99);
});
test('same idempotency key replay is stable, divergent request is rejected',()=>{
 const store=new IsolatedCheckoutSimulator();
 const first=store.submit(base,catalog);
 assert.equal(store.submit(base,catalog),first);
 assert.throws(()=>store.submit({...base,lines:[{offerId:'offer-1',quantity:1}]},catalog),/idempotency_conflict/);
 assert.equal(store.list('another-buyer').length,0);
 assert.equal(store.list('buyer-one').length,1);
});
test('deny expired, external, unavailable and wrong-region offers',()=>{
 for(const patch of [{source:'VTEX_SCRAPE'},{availableQuantity:1},{status:'pending'},{regions:['BR-RJ']},{validTo:'2020-01-02'},{supplierStatus:'suspended'},{skuStatus:'pending'}]){
  assert.throws(()=>validateCheckoutIntent(base,new Map([['offer-1',{...offer,...patch}],['offer-2',catalog.get('offer-2')]])));
 }
});
test('reject duplicates, insufficient minimum and quantity multiples',()=>{
 assert.throws(()=>validateCheckoutIntent({...base,lines:[base.lines[0],base.lines[0]]},catalog));
 assert.throws(()=>validateCheckoutIntent({...base,lines:[{offerId:'offer-1',quantity:0}]},catalog));
 assert.throws(()=>validateCheckoutIntent({...base,lines:[{offerId:'offer-1',quantity:5}]},new Map([['offer-1',{...offer,multiple:3}]])));
});
