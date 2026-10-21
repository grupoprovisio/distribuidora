import assert from "node:assert/strict";
import test from "node:test";
import {quoteOffer,compareEquivalentCost} from "../lib/marketplace/offer-pricing.ts";
const base={basePriceMinor:1200,minQuantity:2,quantityMultiple:2,
  packBaseUnits:12,tiers:[{minQuantity:10,unitPriceMinor:1000},{minQuantity:20,unitPriceMinor:900}]};
test("Aplica faixa pelo volume com total exato em centavos",()=>{
  const q=quoteOffer({...base,quantity:10,shippingMinor:150,taxesMinor:50});
  assert.equal(q.unitPriceMinor,1000);
  assert.equal(q.totalMinor,10200);
  assert.equal(q.equivalentUnitDenominator,120);
  assert.equal(quoteOffer({...base,quantity:20}).unitPriceMinor,900);
  assert.equal(quoteOffer({...base,quantity:4}).unitPriceMinor,1200);
});
test("Rejeita volumes, preços e regras malformadas",()=>{
  for(const patch of [{quantity:1},{quantity:3},{quantity:NaN},{basePriceMinor:0.2},
    {quantity:10,tiers:[{minQuantity:10,unitPriceMinor:-1}]},
    {quantity:10,tiers:[{minQuantity:10,unitPriceMinor:100},{minQuantity:10,unitPriceMinor:90}]},
    {quantity:10,shippingMinor:-1},{quantity:10,packBaseUnits:0},
    {quantity:Number.MAX_SAFE_INTEGER}]) {
    assert.throws(()=>quoteOffer({...base,quantity:4,...patch}),RangeError);
  }
});
test("Compara custo total por unidade equivalente, incluindo frete e tributos",()=>{
  const a=quoteOffer({...base,quantity:10,shippingMinor:300});
  const b=quoteOffer({...base,quantity:10,basePriceMinor:900,tiers:[],shippingMinor:2000});
  assert.equal(compareEquivalentCost(a,b),-1);
  assert.equal(compareEquivalentCost(b,a),1);
  assert.equal(compareEquivalentCost(a,a),0);
});
