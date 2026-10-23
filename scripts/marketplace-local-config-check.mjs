import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('lib/supabase/config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const key='sb_publishable_local_test_fixture';
function config(nodeEnv,url,flag,hostname) {
  const sandbox={exports:{},process:{env:{NODE_ENV:nodeEnv,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,NEXT_PUBLIC_PROVISIO_LOCAL_E2E:flag}}};
  if(hostname)sandbox.window={location:{hostname}};
  vm.runInNewContext(source,sandbox);
  return ()=>sandbox.exports.publicSupabaseConfig();
}
test('hosted Provisio remains valid without a local flag',()=>{
  assert.equal(config('production','https://xprvdquocenfqvnokmmi.supabase.co','false')().url,'https://xprvdquocenfqvnokmmi.supabase.co');
});
test('production always rejects loopback even with E2E flag',()=>{
  assert.throws(config('production','http://127.0.0.1:54321','true'));
});
test('only explicit development enables the fixed loopback API',()=>{
  assert.equal(config('development','http://127.0.0.1:54321','true')().url,'http://127.0.0.1:54321');
  assert.throws(config('development','http://127.0.0.1:54321','false'));
  assert.throws(config('test','http://127.0.0.1:54321','true'));
});
test('the local flag never permits arbitrary hosts or Supabase projects',()=>{
  for(const url of ['https://other-project.supabase.co','http://127.0.0.2:54321','http://localhost:54321','https://example.com']){
    assert.throws(config('development',url,'true'));
  }
});
test('browser localhost testing rejects a non-loopback page origin',()=>{
  assert.throws(config('development','http://127.0.0.1:54321','true','example.com'));
  assert.equal(config('development','http://127.0.0.1:54321','true','127.0.0.1')().url,'http://127.0.0.1:54321');
});
