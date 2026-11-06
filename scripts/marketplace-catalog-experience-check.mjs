import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,mocks={}){const loadedModule={exports:{}};const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',js)(loadedModule,loadedModule.exports,name=>name in mocks?mocks[name]:require(name));return loadedModule.exports;}
const {parseIntent,matchesCatalog}=load('lib/marketplace/catalog-intent.ts');
test('public list rejects malformed, excessive, fractional and duplicate selections',()=>{
 const rows=[{slug:'papel',name:'Papel',quantity:3},{slug:'papel',quantity:5},{slug:'//evil',quantity:1},{slug:'fraction',quantity:1.5},{slug:'large',quantity:100001},{slug:'negative',quantity:-1},{slug:'zero',quantity:0}];
 assert.deepEqual(parseIntent(JSON.stringify(rows)),[{slug:'papel',name:'Papel',quantity:3}]);
 for(const raw of ['broken','{}','null'])assert.deepEqual(parseIntent(raw),[]);
 assert.equal(parseIntent(JSON.stringify(Array.from({length:120},(_,i)=>({slug:'p-'+i,quantity:1})))).length,100);
});
test('public list never retains submitted prices, private company IDs or HTML metadata',()=>{
 const [row]=parseIntent(JSON.stringify([{slug:'papel',quantity:2,name:'Papel',price:0,buyerOrgId:'foreign',image:'private'}]));assert.deepEqual(Object.keys(row).sort(),['name','quantity','slug']);
});
test('search ignores case and diacritics',()=>{assert.equal(matchesCatalog('Papel Higiênico','HIGIENICO'),true);assert.equal(matchesCatalog('Papel','arroz'),false);});
let access={organizationIds:{comprador:['buyer-a']}},sameOrigin=true,called=0;
const route=load('app/api/marketplace/catalog-list/route.ts',{
 '@/lib/marketplace/session':{getMarketplaceAccess:async()=>access},
 '@/lib/supabase/server':{createClient:async()=>({})},
 '@/lib/marketplace/buyer-catalog':{buyerCatalog:async(_db,region,page,buyer,selection)=>{called++;assert.equal(buyer,'buyer-a');assert.equal(region,'BR-SP');assert.deepEqual(selection.slugs,['papel']);return {items:[],hasMore:false,error:false};}},
 '@/lib/marketplace/request-origin':{isSameOriginRequest:()=>sameOrigin},
 '@/lib/marketplace/catalog-intent':{parseIntent},
});
const req=(buyer='buyer-a',items=[{slug:'papel',quantity:1}])=>new Request('https://grupoprovisio.com/api/marketplace/catalog-list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({buyerOrgId:buyer,region:'BR-SP',items})});
test('list resolution rejects another company before reading offers',async()=>{called=0;assert.equal((await route.POST(req('buyer-b'))).status,403);assert.equal(called,0);});
test('list resolution rejects unauthenticated users',async()=>{const saved=access;access=null;assert.equal((await route.POST(req())).status,401);access=saved;});
test('list resolution rejects cross-origin writes',async()=>{sameOrigin=false;assert.equal((await route.POST(req())).status,403);sameOrigin=true;});
test('list resolution uses authenticated catalog for the selected slugs',async()=>{called=0;const response=await route.POST(req());assert.equal(response.status,200);assert.equal(called,1);assert.equal(response.headers.get('cache-control'),'private, no-store');});
test('list resolution rejects malformed JSON',async()=>{const response=await route.POST(new Request('https://grupoprovisio.com',{method:'POST',body:'{'}));assert.equal(response.status,400);});
let signed='';const showcase=load('lib/marketplace/public-catalog.ts',{
 'server-only':{},react:{cache:f=>f},'@/lib/supabase/server':{createClient:async()=>({storage:{from:bucket=>{assert.equal(bucket,'provisio-produtos');return {createSignedUrl:async(path,ttl)=>{signed=path;assert.equal(ttl,300);return {data:{signedUrl:'https://example.invalid/public-photo'}};}};}}})},
});
test('public DTO exposes no private storage path or extra database fields',async()=>{
 const row={slug:'papel',product_name:'Papel',category_name:'Higiene',regions:['SP'],image_storage_path:'published/image.webp',price:100};
 const dto=await showcase.publicProduct(row);assert.equal(signed,row.image_storage_path);assert.deepEqual(Object.keys(dto).sort(),['category','imageUrl','name','regions','slug']);
});
test('products without a published photo never sign an arbitrary path',async()=>{signed='';const dto=await showcase.publicProduct({slug:'papel',product_name:'Papel',category_name:'Higiene',regions:[],image_storage_path:null});assert.equal(dto.imageUrl,null);assert.equal(signed,'');});
