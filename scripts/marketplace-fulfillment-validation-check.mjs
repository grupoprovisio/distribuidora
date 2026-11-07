import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("../lib/marketplace/fulfillment-validation.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInNewContext(code,{exports:mod.exports,module:mod},{timeout:2000});
const {canAdvanceFulfillment,validateFulfillmentTransition,validateFulfillmentDetails,FULFILLMENT_LABELS}=mod.exports;
assert.equal(FULFILLMENT_LABELS.ready_to_dispatch,"Faturamento");
for(const [from,to] of [["separating","ready_to_dispatch"],["ready_to_dispatch","in_transit"],["in_transit","delivered"],["separating","cancelled"],["ready_to_dispatch","cancelled"]]){
  assert.equal(canAdvanceFulfillment(from,to),true);
  assert.doesNotThrow(()=>validateFulfillmentTransition(from,to));
}
for(const [from,to] of [["delivered","separating"],["cancelled","in_transit"],["separating","delivered"],["in_transit","cancelled"],["ready_to_dispatch","delivered"]]){
  assert.equal(canAdvanceFulfillment(from,to),false);
  assert.throws(()=>validateFulfillmentTransition(from,to));
}
assert.doesNotThrow(()=>validateFulfillmentDetails({status:"delivered",dispatchedAt:"2026-10-25T10:00:00Z",deliveredAt:"2026-10-25T12:00:00Z",freightEstimateMinor:500,trackingReference:"QA-1"}));
assert.throws(()=>validateFulfillmentDetails({status:"delivered"}));
assert.throws(()=>validateFulfillmentDetails({status:"in_transit",freightEstimateMinor:-1}));
assert.throws(()=>validateFulfillmentDetails({status:"delivered",dispatchedAt:"2026-10-25T12:00:00Z",deliveredAt:"2026-10-25T10:00:00Z"}));
assert.throws(()=>validateFulfillmentDetails({status:"separating",trackingReference:""}));
console.log("PASS: delivery progression, terminal states and details validation");
