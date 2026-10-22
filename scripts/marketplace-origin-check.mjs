import test from 'node:test';
import assert from 'node:assert/strict';
import { isSameOriginRequest } from '../lib/marketplace/request-origin.ts';
function request(origin,host='grupoprovisio.com',url='https://internal.invalid/api',extra={}) {
 const headers={...extra};if(origin!==undefined)headers.origin=origin;if(host!==undefined)headers.host=host;
 return new Request(url,{method:'POST',headers});
}
test('uses actual browser request Host even if Next binds to an internal hostname',()=>{
 assert.equal(isSameOriginRequest(request('https://grupoprovisio.com')),true);
 assert.equal(isSameOriginRequest(request('http://127.0.0.1:3210','127.0.0.1:3210','http://localhost:3210/api')),true);
});
test('missing, opaque, malformed, cross-origin and scheme-mismatched origins fail closed',()=>{
 for(const value of [undefined,'null','https://attacker.invalid','http://grupoprovisio.com','https://grupoprovisio.com/path','https://grupoprovisio.com@attacker.invalid','not-a-url'])assert.equal(isSameOriginRequest(request(value)),false);
});
test('forwarded headers cannot authorize a foreign origin',()=>{
 assert.equal(isSameOriginRequest(request('https://attacker.invalid','grupoprovisio.com','https://internal.invalid/api',{'x-forwarded-host':'attacker.invalid','x-forwarded-proto':'https'})),false);
});
test('invalid Host is rejected and standard Request without Host uses its own URL',()=>{
 for(const host of ['user@grupoprovisio.com','grupoprovisio.com/path','grupoprovisio.com?x','grupoprovisio.com\\other'])assert.equal(isSameOriginRequest(request('https://grupoprovisio.com',host)),false);
 assert.equal(isSameOriginRequest(new Request('https://grupoprovisio.com/api',{headers:{origin:'https://grupoprovisio.com'}})),true);
});
