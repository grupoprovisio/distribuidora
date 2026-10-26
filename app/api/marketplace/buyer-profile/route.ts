import { NextResponse } from "next/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/marketplace/request-origin";
import { contactFromDatabase,contactToDatabase,parseBuyerContact } from "@/lib/marketplace/buyer-contact";
export const dynamic="force-dynamic";
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const uuid=/^[0-9a-f-]{36}$/i;
const authorized=(org:string,access:NonNullable<Awaited<ReturnType<typeof getMarketplaceAccess>>>)=>
  uuid.test(org)&&access.organizationIds.comprador.includes(org);
export async function GET(request:Request){
 const access=await getMarketplaceAccess();
 if(!access)return respond({ok:false,reason:"unauthorized"},401);
 const buyerOrgId=new URL(request.url).searchParams.get("buyer")??"";
 if(!authorized(buyerOrgId,access))return respond({ok:false,reason:"forbidden"},403);
 const db=await createClient();
 const row=await db.from("buyer_contact_profiles").select(
   "full_name,contact_email,phone,postal_code,street,street_number,complement,neighborhood,city,state_code,reference")
   .eq("buyer_org_id",buyerOrgId).eq("user_id",access.userId).maybeSingle();
 if(row.error)return respond({ok:false,reason:"profile_unavailable"},503);
 return respond({ok:true,profile:row.data?contactFromDatabase(row.data):null,loginEmail:access.email});
}
export async function POST(request:Request){
 if(!isSameOriginRequest(request))return respond({ok:false,reason:"invalid_origin"},403);
 const access=await getMarketplaceAccess();
 if(!access)return respond({ok:false,reason:"unauthorized"},401);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return respond({ok:false,reason:"invalid_content_type"},415);
 const raw=await request.text();
 if(raw.length>5000)return respond({ok:false,reason:"too_large"},413);
 let value:unknown;
 try{value=JSON.parse(raw);}catch{return respond({ok:false,reason:"invalid_json"},400);}
 if(!value||typeof value!=="object"||Array.isArray(value))return respond({ok:false,reason:"invalid_input"},400);
 const {buyerOrgId,profile}=value as Record<string,unknown>;
 if(typeof buyerOrgId!=="string"||!authorized(buyerOrgId,access))return respond({ok:false,reason:"forbidden"},403);
 const normalized=parseBuyerContact(profile);
 if(!normalized)return respond({ok:false,reason:"invalid_profile"},422);
 const db=await createClient();
 const result=await db.from("buyer_contact_profiles").upsert({
   ...contactToDatabase(normalized),user_id:access.userId,buyer_org_id:buyerOrgId,
   updated_at:new Date().toISOString(),
 },{onConflict:"user_id,buyer_org_id"}).select("user_id").single();
 if(result.error)return respond({ok:false,reason:"save_not_authorized"},403);
 return respond({ok:true,profile:normalized});
}
