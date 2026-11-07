import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { isSameOriginRequest } from "@/lib/marketplace/request-origin";
import { transactionAccessMode } from "@/lib/marketplace/qa-transaction-gate";
import { validateBasketInput, type BasketSelection } from "@/lib/marketplace/basket-validation";

export const dynamic="force-dynamic";
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL??"https://grupoprovisio.com").replace(/\/+$/,"");
type Body={buyerOrgId?:unknown;region?:unknown;method?:unknown;requestKey?:unknown;lines?:unknown};

export async function POST(request:Request){
  if(!isSameOriginRequest(request))return NextResponse.json({ok:false,reason:"invalid_origin"},{status:403});
  const access=await getMarketplaceAccess();
  if(!access||!access.allowed.includes("comprador"))
    return NextResponse.json({ok:false,reason:"buyer_not_authorized"},{status:403});
  const body=await request.json().catch(()=>null) as Body|null;
  if(!body||typeof body.buyerOrgId!=="string"||typeof body.region!=="string"
    ||!/^BR-[A-Z]{2}$/.test(body.region)||!validateBasketInput(body.lines)
    ||(body.method!=="delivery"&&body.method!=="pickup")
    ||typeof body.requestKey!=="string"
    ||!/^[0-9a-f-]{36}$/i.test(body.requestKey)
    ||!access.organizationIds.comprador.includes(body.buyerOrgId))
    return NextResponse.json({ok:false,reason:"invalid_payment_basket"},{status:400});
  if(transactionAccessMode(access)==="disabled")
    return NextResponse.json({ok:false,reason:"checkout_not_enabled"},{status:503});
  const secret=process.env.STRIPE_SECRET_KEY;
  const price=process.env.STRIPE_PRICE_ID;
  if(!secret||!price||process.env.STRIPE_CHECKOUT_ENABLED!=="true")
    return NextResponse.json({ok:false,reason:"checkout_not_configured"},{status:503});
  const db=await createClient();
  const rpc=(db as any).rpc.bind(db) as (name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:{message?:string}|null}>;
  const basket=await rpc("marketplace_create_payment_basket",{
    p_buyer:body.buyerOrgId,p_region:body.region,p_method:body.method,
    p_lines:body.lines,p_key:body.requestKey,
  });
  if(basket.error||typeof basket.data!=="string")
    return NextResponse.json({ok:false,reason:"basket_unavailable"},{status:422});
  const quantity=(body.lines as BasketSelection[]).reduce((sum,line)=>sum+line.quantity,0);
  const params=new URLSearchParams();
  params.set("mode","payment");
  params.set("line_items[0][price]",price);
  params.set("line_items[0][quantity]",String(quantity));
  params.set("success_url",siteUrl+"/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url",siteUrl+"/checkout/cancelado");
  params.set("metadata[basket_id]",basket.data);
  params.set("metadata[buyer_org_id]",body.buyerOrgId);
  params.set("metadata[created_by]",access.userId);
  params.set("allow_promotion_codes","true");
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{
    method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/x-www-form-urlencoded"},
    body:params,cache:"no-store",
  });
  const session=await response.json() as {url?:string;error?:{message?:string}};
  if(!response.ok||!session.url){
    console.error("Stripe marketplace checkout failed",session.error?.message);
    return NextResponse.json({ok:false,reason:"stripe_error"},{status:502});
  }
  return NextResponse.json({ok:true,url:session.url,basketId:basket.data});
}
