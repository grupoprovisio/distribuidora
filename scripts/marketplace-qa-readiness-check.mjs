import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../lib/marketplace/qa-readiness.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const mod={exports:{}};
vm.runInNewContext(code,{exports:mod.exports,module:mod},{timeout:2000});
const {summarizeQaIdentityReadiness}=mod.exports;

const sample=()=>({
  organizations:[
    {id:"platform",kind:"PLATFORM_OPERATOR",status:"approved",trade_name:"Grupo Provisio QA"},
    {id:"sa",kind:"SUPPLIER",status:"approved",trade_name:"PROVISIO QA Fornecedor A - NAO COMERCIAL"},
    {id:"sb",kind:"SUPPLIER",status:"approved",trade_name:"PROVISIO QA Fornecedor B - NAO COMERCIAL"},
    {id:"buyer",kind:"BUYER",status:"approved",trade_name:"Provisio Comprador Teste NAO COMERCIAL"},
    {id:"real",kind:"SUPPLIER",status:"approved",trade_name:"Fornecedor real"},
  ],
  members:[
    {user_id:"admin",organization_id:"platform",role:"PLATFORM_ADMIN",status:"active"},
    {user_id:"sa",organization_id:"sa",role:"SUPPLIER_ADMIN",status:"active"},
    {user_id:"sb",organization_id:"sb",role:"SUPPLIER_ADMIN",status:"active"},
    {user_id:"buyer",organization_id:"buyer",role:"BUYER",status:"active"},
    {user_id:"real",organization_id:"real",role:"SUPPLIER_ADMIN",status:"active"},
  ],
  capabilities:[
    {organization_id:"platform",capability:"PLATFORM_OPERATOR",status:"approved"},
    {organization_id:"sa",capability:"SUPPLIER",status:"approved"},
    {organization_id:"sb",capability:"SUPPLIER",status:"approved"},
    {organization_id:"buyer",capability:"BUYER",status:"approved"},
    {organization_id:"real",capability:"SUPPLIER",status:"approved"},
  ],
  profiles:["admin","sa","sb","buyer","real"].map(id=>({id,status:"active"})),
  adminAal2:true,
});

let data=sample(),s=summarizeQaIdentityReadiness(data);
assert.equal(s.completed,4);
assert.equal(s.supplierOrganizations,2);
assert.equal(s.buyerIdentities,1);
assert.equal(s.total,4);
assert.equal(s.milestones.length,4);

data=sample();data.members[2].status="invited";
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,1,"invited supplier cannot count as independent");
assert.equal(s.completed,3);

data=sample();data.members.push({user_id:"buyer",organization_id:"platform",role:"PLATFORM_ADMIN",status:"active"});
s=summarizeQaIdentityReadiness(data);
assert.equal(s.buyerIdentities,0,"buyer with platform admin power cannot count");
assert.equal(s.completed,3);

data=sample();data.members[2].organization_id="sa";
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,1,"two suppliers in same org are not distinct");

data=sample();data.profiles.find(p=>p.id==="sa").status="pending";
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,1,"pending profile not accepted");

data=sample();data.capabilities.find(c=>c.organization_id==="sa").status="pending";
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,1,"pending capability not accepted");

data=sample();data.adminAal2=false;
s=summarizeQaIdentityReadiness(data);
assert.equal(s.completed,3,"AAL1 not enough to mark ADM with MFA");

data=sample();data.members.push({user_id:"sb",organization_id:"buyer",role:"BUYER",status:"active"});
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,1,"supplier with buyer powers must not count");

data=sample();data.members.push({user_id:"buyer",organization_id:"real",role:"SUPPLIER_ADMIN",status:"active"});
s=summarizeQaIdentityReadiness(data);
assert.equal(s.buyerIdentities,0,"buyer with supplier role anywhere is not an independent QA buyer");

// Duas empresas vinculadas ao MESMO usuario nao constituem duas identidades independentes.
data=sample();
data.members[2].user_id="sa";
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,1,"one account across supplier A/B is not two independent identities");
assert.equal(s.completed,3);

// Uma segunda conta genuinamente distinta restaura o criterio.
data=sample();
s=summarizeQaIdentityReadiness(data);
assert.equal(s.supplierOrganizations,2);

console.log("PASS: hosted QA readiness fail-closed identities, roles, MFA and distinct companies");
