import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { normalizeCep } from "@/lib/marketplace/buyer-contact";
export const dynamic="force-dynamic";

const response=(body:unknown,status=200)=>NextResponse.json(body,{
 status,headers:{"Cache-Control":"private, no-store"}
});

type CepLocation={uf:string;localidade:string;erro?:boolean};
async function checkCep(cep:string):Promise<CepLocation|null>{
  // ViaCEP validates an address; it does NOT quote transportation prices.
  // A short timeout keeps the existing ADM tariff workflow available if offline.
  try{
    const res=await fetch("https://viacep.com.br/ws/"+cep+"/json/",{
      signal:AbortSignal.timeout(2200),
      next:{revalidate:86400}
    });
    if(!res.ok)return null;
    const place=await res.json() as CepLocation;
    if(place.erro||typeof place.uf!=="string"||typeof place.localidade!=="string")
      return {uf:"",localidade:"",erro:true};
    return place;
  }catch{return null;}
}
export async function GET(request:Request){
 const access=await getMarketplaceAccess();
 if(!access)return response({ok:false,reason:"unauthorized"},401);
 const url=new URL(request.url);
 const buyer=url.searchParams.get("buyer")??"";
 if(!access.organizationIds.comprador.includes(buyer))
   return response({ok:false,reason:"forbidden"},403);
 const raw=url.searchParams.get("cep")??"";
 if(raw.length>15)return response({ok:false,reason:"invalid_cep"},422);
 const cep=normalizeCep(raw);
 if(raw!=="" && (!/^[0-9]{8}$/.test(cep)))
   return response({ok:false,reason:"invalid_cep"},422);
 const db=await createClient();
 const origin=await db.from("provisio_shipping_origin")
   .select("label,postal_code,street,street_number,complement,neighborhood,city,state_code,pickup_instructions,pickup_enabled,active")
   .eq("id",1).eq("active",true).maybeSingle();
 if(origin.error)return response({ok:false,reason:"origin_unavailable"},503);
 if(!origin.data)return response({
   ok:true,available:false,reason:"origin_not_configured",pickupAvailable:false,cep
 });
 const originSummary={
   label:origin.data.label,postalCode:origin.data.postal_code,
   street:origin.data.street,number:origin.data.street_number,
   complement:origin.data.complement,neighborhood:origin.data.neighborhood,
   city:origin.data.city,state:origin.data.state_code,
   pickupInstructions:origin.data.pickup_instructions
 };
 const base={ok:true,available:false,cep,pickupAvailable:origin.data.pickup_enabled,
   origin:originSummary,quote:null};
 if(!cep)return response({...base,reason:"enter_cep"});
 // SP postcodes span 01000-000 through 19999-999.
 const spPostalRange=Number(cep)>=1000000&&Number(cep)<=19999999;
 const place=await checkCep(cep);
 if(place?.erro)return response({...base,reason:"invalid_cep"});
 if(place?.uf && (place.uf!=="SP"||!spPostalRange))
   return response({...base,reason:"area_not_covered",destination:{
     city:place.localidade,state:place.uf
   }});
 const state=spPostalRange?"SP":place?.uf??null;
 if(!state)return response({...base,reason:"area_not_covered"});
 const [ranges,stateRate]=await Promise.all([
   db.from("provisio_shipping_rates")
     .select("id,label,postal_start,postal_end,destination_state,price_minor,min_business_days,max_business_days")
     .eq("origin_id",1).eq("active",true).eq("destination_state",state)
     .lte("postal_start",Number(cep)).gte("postal_end",Number(cep))
     .order("postal_start",{ascending:false}).limit(5),
   state==="SP"?db.from("provisio_shipping_state_rates")
     .select("label,state_code,price_minor,min_business_days,max_business_days")
     .eq("origin_id",1).eq("state_code",state).eq("active",true).maybeSingle():null
 ]);
 if(ranges.error||stateRate?.error)return response({...base,reason:"rates_unavailable"},503);
 const match=ranges.data?.[0],standard=stateRate?.data;
 const chosen=match??standard??null;
 if(!chosen)return response({...base,reason:"area_not_covered",
   destination:place?.uf?{city:place.localidade,state:place.uf}:null
 });
 return response({...base,available:true,reason:null,
   destination:place?.uf?{city:place.localidade,state:place.uf}:null,
   quote:{label:chosen.label,state,freightMinor:chosen.price_minor,
     minBusinessDays:chosen.min_business_days,maxBusinessDays:chosen.max_business_days,
     source:match?"cep_range":"state_default"}
 });
}
