import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../lib/marketplace/project-progress.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const cjsModule={exports:{}};
vm.runInNewContext(code,{exports:cjsModule.exports,module:cjsModule},{timeout:2000});
const {PROJECT_AREAS,STAGE_WEIGHTS,MAX_CHECKPOINTS,
  PROGRESS_DIMENSIONS,TOTAL_PROGRESS,OVERALL_PROGRESS,areaPercent,totalPercent,
  DELIVERY_TRACKS,DELIVERY_PROGRESS,deliveryTrackPercent}=cjsModule.exports;

assert.equal(PROJECT_AREAS.length,11,"11 current business areas");
assert.equal(PROJECT_AREAS.reduce((sum,area)=>sum+area.weight,0),100,"weight sum exactly 100");
assert.equal(Object.values(STAGE_WEIGHTS).reduce((sum,weight)=>sum+weight,0),100,"stage weights exactly 100");
assert.deepEqual(Array.from(PROGRESS_DIMENSIONS),["code","tests","production"]);
assert.equal(new Set(PROJECT_AREAS.map(area=>area.id)).size,PROJECT_AREAS.length);
for(const area of PROJECT_AREAS){
  assert.ok(Number.isInteger(area.weight)&&area.weight>0,area.id+" positive weight");
  assert.ok(["P0","P1","P2","P3"].includes(area.priority),area.id+" priority");
  assert.ok(typeof area.evidence==="string"&&area.evidence.length>25,area.id+" evidence");
  assert.ok(typeof area.next==="string"&&area.next.length>25,area.id+" next step");
  assert.ok(area.href.startsWith("/"),area.id+" valid route");
  assert.ok(!/sou vendedor|representante|comiss[aã]o de vendedor/i.test(area.name+" "+area.next),
    area.id+" commercial scope limited to two personas");
  for(const stage of PROGRESS_DIMENSIONS){
    assert.ok(Number.isInteger(area[stage])&&area[stage]>=0&&area[stage]<=MAX_CHECKPOINTS,
      area.id+" "+stage+" within known milestones");
    assert.ok(areaPercent(area,stage)>=0&&areaPercent(area,stage)<=100);
    assert.ok(area.production<=area.tests,area.id+" cannot be more validated than tested");
  }
}
for(const stage of PROGRESS_DIMENSIONS){
  assert.equal(TOTAL_PROGRESS[stage],totalPercent(stage));
  assert.ok(TOTAL_PROGRESS[stage]>=0&&TOTAL_PROGRESS[stage]<=100);
}
const expected=Math.round(PROGRESS_DIMENSIONS.reduce((sum,stage)=>sum+
  TOTAL_PROGRESS[stage]*STAGE_WEIGHTS[stage],0)/100);
assert.equal(OVERALL_PROGRESS,expected);
assert.ok(PROJECT_AREAS.some(area=>area.id==="cotacoes"&&area.production===0));
assert.ok(PROJECT_AREAS.some(area=>area.id==="pedidos"&&area.production===0));
assert.ok(PROJECT_AREAS.some(area=>area.id==="financeiro"&&area.code===0));
for(const track of ["frontend","backend"]){
  const areaIds=DELIVERY_TRACKS[track].areaIds;
  assert.ok(areaIds.length>=8,track+" significant coverage");
  assert.equal(new Set(areaIds).size,areaIds.length,track+" unique areas");
  assert.ok(areaIds.every(id=>PROJECT_AREAS.some(area=>area.id===id)),track+" valid area ids");
  assert.equal(DELIVERY_PROGRESS[track],deliveryTrackPercent(track));
  assert.ok(DELIVERY_PROGRESS[track]>=0&&DELIVERY_PROGRESS[track]<=100);
}
assert.equal(DELIVERY_PROGRESS.frontend,83);
assert.equal(DELIVERY_PROGRESS.backend,81);
console.log("PASS: Provisio progress weighted gates, honest production scores, exactly 2 public personas");
console.log("Progress snapshot:",JSON.stringify({overall:OVERALL_PROGRESS,...TOTAL_PROGRESS,tracks:DELIVERY_PROGRESS}));
