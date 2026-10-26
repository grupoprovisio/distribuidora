import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { isSameOriginRequest } from "@/lib/marketplace/request-origin";
import { normalizeCep } from "@/lib/marketplace/buyer-contact";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UF=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
const reply=(data:unknown,status=200)=>NextResponse.json(data,{
 status,headers:{"Cache-Control":"private, no-store"}
});
type AdminClient=Awaited<ReturnType<typeof createClient>>;
async function secureAdmin():Promise<{db:AdminClient}|{status:number}>{
 const access=await getMarketplaceAccess();
 if(!access)return {status:401};
 if(!access.allowed.includes("admin"))return {status:403};
 const db=await createClient();
 const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 if(assurance.error||assurance.data.currentLevel!=="aal2")return {status:403};
 return {db};
}
const text=(value:unknown,max:number,min=0)=>typeof value==="string"&&value.trim().length>=min
 &&value.trim().length<=max?value.trim():null;
const positive=(v:unknown,max:number)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
export async function GET(){
 const a=await secureAdmin();
 if("status" in a)return reply({ok:false,reason:"forbidden"},a.status);
 const [origin,rates]=await Promise.all([
  a.db.from("provisio_shipping_origin").select("*").eq("id",1).maybeSingle(),
  a.db.from("provisio_shipping_rates").select("*").order("postal_start",{ascending:true}).limit(100),
 ]);
 if(origin.error||rates.error)return reply({ok:false,reason:"query_failed"},503);
 return reply({ok:true,origin:origin.data,rates:rates.data??[]});
}
export async function POST(request:Request){
 if(!isSameOriginRequest(request))return reply({ok:false,reason:"invalid_origin"},403);
 const a=await secureAdmin();
 if("status" in a)return reply({ok:false,reason:"forbidden"},a.status);
 if(!request.headers.get("content-type")?.startsWith("application/json"))
   return reply({ok:false,reason:"invalid_type"},415);
 const raw=await request.text();
 if(raw.length>10000)return reply({ok:false,reason:"too_large"},413);
 let body:Record<string,unknown>;
 try{const v:unknown=JSON.parse(raw);if(!v||typeof v!=="object"||Array.isArray(v))throw Error();body=v as Record<string,unknown>;}
 catch{return reply({ok:false,reason:"invalid_json"},400);}
 if(body.action==="origin"){
   const p=body.origin;
   if(!p||typeof p!=="object"||Array.isArray(p))return reply({ok:false,reason:"invalid_origin"},422);
   const x=p as Record<string,unknown>;
   const label=text(x.label,100,3),postalCode=text(x.postalCode,15,8);
   const street=text(x.street,160,3),number=text(x.number,30,1);
   const complement=text(x.complement,160),neighborhood=text(x.neighborhood,100,2);
   const city=text(x.city,100,2),state=text(x.state,2,2)?.toUpperCase();
   const instructions=text(x.pickupInstructions,350);
   if(!label||!postalCode||normalizeCep(postalCode).length!==8||
      !street||!number||complement===null||!neighborhood||!city||!state||
      !UF.has(state)||instructions===null||typeof x.pickupEnabled!=="boolean")
     return reply({ok:false,reason:"invalid_origin_fields"},422);
   const result=await a.db.from("provisio_shipping_origin").upsert({
     id:1,label,postal_code:normalizeCep(postalCode),street,street_number:number,
     complement,neighborhood,city,state_code:state,pickup_instructions:instructions,
     pickup_enabled:x.pickupEnabled,active:true,updated_at:new Date().toISOString(),
   },{onConflict:"id"}).select("id").single();
   return result.error?reply({ok:false,reason:"save_denied"},403):reply({ok:true});
 }
 if(body.action==="rate"){
   const p=body.rate;
   if(!p||typeof p!=="object"||Array.isArray(p))return reply({ok:false,reason:"invalid_rate"},422);
   const x=p as Record<string,unknown>;
   const label=text(x.label,100,3),start=text(x.postalStart,8,8),end=text(x.postalEnd,8,8);
   const state=text(x.state,2,2)?.toUpperCase();
   const min=x.minBusinessDays,max=x.maxBusinessDays;
   if(!label||!start||!end||!/^[0-9]{8}$/.test(start)||!/^[0-9]{8}$/.test(end)
     ||Number(start)>Number(end)||!state||!UF.has(state)
     ||!positive(x.priceMinor,100000000)||!positive(min,90)||!positive(max,120)
     ||(min as number)<1||(max as number)<(min as number))
     return reply({ok:false,reason:"invalid_rate_fields"},422);
   const record={
     origin_id:1,label,postal_start:Number(start),postal_end:Number(end),
     destination_state:state,price_minor:x.priceMinor as number,
     min_business_days:min as number,max_business_days:max as number,
     active:true,updated_at:new Date().toISOString(),
   };
   const id=x.id;
   let result;
   if(typeof id==="string"&&UUID.test(id)){
     result=await a.db.from("provisio_shipping_rates").update(record).eq("id",id).select("id").single();
   }else if(id===null||id===undefined){
     result=await a.db.from("provisio_shipping_rates").insert(record).select("id").single();
   }else return reply({ok:false,reason:"invalid_id"},422);
   return result.error?reply({ok:false,reason:result.error.code==="23514"?"overlapping_range":"save_denied"},422):
     reply({ok:true,id:result.data.id});
 }
 if(body.action==="disable"){
   if(typeof body.id!=="string"||!UUID.test(body.id))return reply({ok:false,reason:"invalid_id"},422);
   const result=await a.db.from("provisio_shipping_rates").update({active:false,
     updated_at:new Date().toISOString()}).eq("id",body.id).select("id").single();
   return result.error?reply({ok:false,reason:"disable_denied"},403):reply({ok:true});
 }
 return reply({ok:false,reason:"invalid_action"},400);
}
