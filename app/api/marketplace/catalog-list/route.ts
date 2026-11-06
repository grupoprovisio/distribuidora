import {NextResponse} from 'next/server';
import {getMarketplaceAccess} from '@/lib/marketplace/session';
import {createClient} from '@/lib/supabase/server';
import {buyerCatalog} from '@/lib/marketplace/buyer-catalog';
import {isSameOriginRequest} from '@/lib/marketplace/request-origin';
import {parseIntent} from '@/lib/marketplace/catalog-intent';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!isSameOriginRequest(request))return reply({ok:false},403);
 const access=await getMarketplaceAccess();if(!access)return reply({ok:false},401);
 if(Number(request.headers.get('content-length')??0)>32768)return reply({ok:false},413);
 let body;try{const text=await request.text();if(text.length>32768)return reply({ok:false},413);body=JSON.parse(text);}catch{return reply({ok:false},400);}
 if(!body||typeof body!=='object'||!access.organizationIds.comprador.includes(body.buyerOrgId)||typeof body.region!=='string')return reply({ok:false},403);
 const items=parseIntent(JSON.stringify(body.items));if(!items.length)return reply({ok:true,items:[]});
 const db=await createClient();const offers=[];
 // A bounded page is returned with explicit continuation; never silently omit choices.
 const page=Number.isSafeInteger(body.page)&&body.page>=1&&body.page<=1000?body.page:1;
 const result=await buyerCatalog(db,body.region,page,body.buyerOrgId,{slugs:items.map(v=>v.slug)});
 if(result.error||result.regionNotAuthorized)return reply({ok:false},422);
 offers.push(...result.items);return reply({ok:true,items:offers,hasMore:result.hasMore,page});
}
