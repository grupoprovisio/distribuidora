import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Duas entradas privadas com portais explícitos",()=>{
 for(const role of ["comprador","fornecedor"]){
  const page=read("app/entrar/"+role+"/page.tsx");
  assert.match(page,new RegExp('MarketplaceLoginForm portal="'+role+'"'));
  assert.match(page,/supabaseAuthEnabled\(\)/);
 }
 const landing=read("app/entrar/page.tsx");
 assert.match(landing,/href="\/entrar\/comprador"/);
 assert.match(landing,/href="\/entrar\/fornecedor"/);
});
test("Login não concede permissões no cliente",()=>{
 const form=read("components/marketplace-login-form.tsx");
 assert.match(form,/signInWithPassword/);
 assert.match(form,/shouldCreateUser: false/);
 assert.doesNotMatch(form,/service_role|sb_secret_|updateUser\(.*role/);
 const gates=read("lib/marketplace/session.ts");
 assert.match(gates,/requireMarketplacePortal/);
 assert.match(gates,/organization_capabilities/);
});
