import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";

export const dynamic="force-dynamic";

export async function GET(){
  const access=await getMarketplaceAccess();
  if(!access||!access.allowed.includes("comprador"))
    return NextResponse.json({ok:false,reason:"buyer_not_authorized"},{status:403});
  const db=await createClient();
  const {data:orders,error}=await (db as any).from("marketplace_payment_orders")
    .select("id,basket_id,buyer_org_id,status,fulfillment_status,created_at")
    .in("buyer_org_id",access.organizationIds.comprador)
    .order("created_at",{ascending:false}).limit(50);
  if(error)return NextResponse.json({ok:false,reason:"query_failed"},{status:503});
  const ids=(orders??[]).map((row:any)=>row.basket_id);
  const baskets=ids.length?await db.from("quote_baskets")
    .select("id,region_code,fulfillment_method")
    .in("id",ids):{data:[],error:null};
  if(baskets.error)return NextResponse.json({ok:false,reason:"query_failed"},{status:503});
  const byId=new Map((baskets.data??[]).map((row:any)=>[row.id,row]));
  return NextResponse.json({ok:true,items:(orders??[]).map((row:any)=>({...row,basket:byId.get(row.basket_id)??null}))},{headers:{"Cache-Control":"no-store"}});
}
