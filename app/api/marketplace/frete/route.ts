import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { normalizeCep } from "@/lib/marketplace/buyer-contact";
export const dynamic="force-dynamic";
const response=(body:unknown,status=200)=>NextResponse.json(body,{
 status,headers:{"Cache-Control":"private, no-store"}
});
export async function GET(request:Request){
 const access=await getMarketplaceAccess();
 if(!access)return response({ok:false,reason:"unauthorized"},401);
 const url=new URL(request.url),buyer=url.searchParams.get("buyer")??"";
 if(!access.organizationIds.comprador.includes(buyer))
   return response({ok:false,reason:"forbidden"},403);
 const raw=url.searchParams.get("cep")??"";
 const cep=normalizeCep(raw);
 if(cep.length!==8||raw.length>15)return response({ok:false,reason:"invalid_cep"},422);
 const db=await createClient();
 const origin=await db.from("provisio_shipping_origin")
   .select("label,postal_code,street,street_number,complement,neighborhood,city,state_code,pickup_instructions,pickup_enabled,active")
   .eq("id",1).eq("active",true).maybeSingle();
 if(origin.error)return response({ok:false,reason:"origin_unavailable"},503);
 if(!origin.data)return response({ok:true,available:false,reason:"origin_not_configured",
   pickupAvailable:false,cep});
 const rows=await db.from("provisio_shipping_rates")
   .select("id,label,postal_start,postal_end,destination_state,price_minor,min_business_days,max_business_days")
   .eq("origin_id",1).eq("active",true)
   .lte("postal_start",Number(cep)).gte("postal_end",Number(cep))
   .order("postal_start",{ascending:false}).limit(2);
 if(rows.error)return response({ok:false,reason:"rates_unavailable"},503);
 const originSummary={
   label:origin.data.label,postalCode:origin.data.postal_code,street:origin.data.street,
   number:origin.data.street_number,complement:origin.data.complement,
   neighborhood:origin.data.neighborhood,city:origin.data.city,state:origin.data.state_code,
   pickupInstructions:origin.data.pickup_instructions,
 };
 const picked=rows.data?.[0];
 return response({ok:true,available:!!picked,
   reason:picked?null:"area_not_covered",cep,pickupAvailable:origin.data.pickup_enabled,
   origin:originSummary,
   quote:picked?{label:picked.label,state:picked.destination_state,
     freightMinor:picked.price_minor,minBusinessDays:picked.min_business_days,
     maxBusinessDays:picked.max_business_days}:null});
}
