import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root,"lib/marketplace/session.ts"),"utf8");
const js = ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const UUID = "00000000-0000-4000-8000-000000000001";
const ORG = "10000000-0000-4000-8000-000000000001";
const context = { enabled:true, user:{id:UUID,email:"test@example.invalid",is_anonymous:false},
  profile:"active", role:"BUYER", member:"active", org:"approved",
  capability:"BUYER", capStatus:"approved", aal:"aal1", mfaError:false };
function mockResult(table) {
  const records = {
    profiles: context.profile ? {id:UUID,status:context.profile} : null,
    organization_members: context.member ? [{organization_id:ORG,user_id:UUID,role:context.role,status:context.member}] : [],
    organizations: context.org ? [{id:ORG,status:context.org}] : [],
    organization_capabilities: context.capability ? [{organization_id:ORG,capability:context.capability,status:context.capStatus}] : [],
  };
  return table==="profiles"?records.profiles:records[table];
}
function client() {
  return {
    auth: {
      getUser: async()=>({data:{user:context.user},error:null}),
      mfa:{getAuthenticatorAssuranceLevel:async()=>({
        data:{currentLevel:context.aal},error:context.mfaError?{message:"mfa error"}:null
      })},
    },
    from(table){
      const builder = {
        select(){return this;},
        eq(){return this;},
        in(){return this;},
        limit(){return this;},
        async maybeSingle(){return {data:mockResult(table),error:null};},
        then(resolve,reject){
          return Promise.resolve({data:mockResult(table),error:null}).then(resolve,reject);
        },
      };
      return builder;
    },
  };
}
const exports = {};
const loadedModule = {exports};
const fakeRequire = name => {
  if(name==="server-only")return {};
  if(name==="next/navigation")return {redirect(path){throw Error("REDIRECT:"+path)}};
  if(name==="@/lib/supabase/server")return {createClient:async()=>client()};
  if(name==="@/lib/supabase/config")return {supabaseAuthEnabled:()=>context.enabled};
  throw Error("Unexpected import: "+name);
};
new Function("module","exports","require",js)(loadedModule,exports,fakeRequire);
const {getMarketplaceAccess,requireMarketplaceLogin,requireMarketplacePortal} = loadedModule.exports;
function reset() {
  Object.assign(context,{
    enabled:true,user:{id:UUID,email:"test@example.invalid",is_anonymous:false},
    profile:"active",role:"BUYER",member:"active",org:"approved",
    capability:"BUYER",capStatus:"approved",aal:"aal1",mfaError:false,
  });
}
test("disabled authentication fails closed",async()=>{
  reset();context.enabled=false;
  await assert.rejects(requireMarketplaceLogin(),/REDIRECT:\/entrar/);
});
test("missing user redirects to login, never treats it as pending",async()=>{
  reset();context.user=null;
  await assert.rejects(requireMarketplaceLogin(),/REDIRECT:\/entrar/);
});
test("unapproved profile or revoked org stays inaccessible",async()=>{
  reset();context.profile="pending";
  await assert.rejects(requireMarketplaceLogin(),/REDIRECT:\/acesso-pendente/);
  reset();context.org="suspended";
  await assert.rejects(requireMarketplaceLogin(),/REDIRECT:\/acesso-pendente/);
  reset();context.member="revoked";
  await assert.rejects(requireMarketplaceLogin(),/REDIRECT:\/acesso-pendente/);
  reset();context.capStatus="revoked";
  const access=await getMarketplaceAccess();
  assert.deepEqual(access.allowed,[]);
});
test("buyer does not access supplier or admin",async()=>{
  reset();
  assert.deepEqual((await getMarketplaceAccess()).allowed,["comprador"]);
  await assert.rejects(requireMarketplacePortal("fornecedor"),/REDIRECT:\/acesso-restrito/);
  await assert.rejects(requireMarketplacePortal("admin"),/REDIRECT:\/acesso-restrito/);
});
test("supplier admin has supplier access and obsolete seller role has no portal",async()=>{
  reset();context.role="SUPPLIER_ADMIN";context.capability="SUPPLIER";
  assert.deepEqual((await getMarketplaceAccess()).allowed,["fornecedor"]);
  reset();context.role="SELLER";context.capability="SUPPLIER";
  assert.deepEqual((await getMarketplaceAccess()).allowed,[]);
});
test("verified PLATFORM_ADMIN needs active org and capability",async()=>{
  reset();context.role="PLATFORM_ADMIN";context.capability="PLATFORM_OPERATOR";
  assert.deepEqual((await getMarketplaceAccess()).allowed,["admin"]);
  await assert.rejects(requireMarketplacePortal("admin"),/REDIRECT:\/seguranca\/mfa/);
  context.aal="aal2";
  assert.ok((await requireMarketplacePortal("admin")).allowed.includes("admin"));
  context.mfaError=true;
  await assert.rejects(requireMarketplacePortal("admin"),/REDIRECT:\/seguranca\/mfa/);
  context.mfaError=false;context.capStatus="revoked";
  await assert.rejects(requireMarketplacePortal("admin"),/REDIRECT:\/acesso-pendente/);
});

test("portal organization scope comes from verified memberships, never request IDs",async()=>{
 reset();let access=await getMarketplaceAccess();
 assert.deepEqual(access.organizationIds,{comprador:[ORG],fornecedor:[],admin:[]});
 context.role="SUPPLIER_ADMIN";context.capability="SUPPLIER";
 access=await getMarketplaceAccess();
 assert.deepEqual(access.organizationIds,{comprador:[],fornecedor:[ORG],admin:[]});
 context.capStatus="revoked";
 access=await getMarketplaceAccess();
 assert.deepEqual(access.organizationIds,{comprador:[],fornecedor:[],admin:[]});
});
