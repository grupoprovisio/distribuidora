import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { isSameOriginRequest } from "@/lib/marketplace/request-origin";
import { transactionAccessMode } from "@/lib/marketplace/qa-transaction-gate";
import { validateBasketInput, validateBuyerBasket } from "@/lib/marketplace/basket-validation";

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
  if(!secret||process.env.STRIPE_CHECKOUT_ENABLED!=="true")
    return NextResponse.json({ok:false,reason:"checkout_not_configured"},{status:503});
  const db=await createClient();
  const verified=await validateBuyerBasket(db,access,body.buyerOrgId,body.region,body.lines);
  if(!verified.ok||!verified.ready||verified.totalMinor<=0)
    return NextResponse.json({ok:false,reason:"basket_changed"},{status:409});
  // Delivery pricing must be independently verified and included in the amount
  // charged. Until that server-side price is integrated, fail closed.
  if(body.method==="delivery")
    return NextResponse.json({ok:false,reason:"delivery_checkout_pending_freight_verification"},{status:503});
  const pickup=await db.from("provisio_shipping_origin")
    .select("pickup_enabled,active").eq("id",1).eq("active",true).maybeSingle();
  if(pickup.error||!pickup.data?.pickup_enabled)
    return NextResponse.json({ok:false,reason:"pickup_unavailable"},{status:503});
  const rpc=db.rpc.bind(db) as (name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:{message?:string}|null}>;
  const basket=await rpc("marketplace_create_payment_basket",{
    p_buyer:body.buyerOrgId,p_region:body.region,p_method:body.method,
    p_lines:body.lines,p_key:body.requestKey,
  });
  if(basket.error||typeof basket.data!=="string")
    return NextResponse.json({ok:false,reason:"basket_unavailable"},{status:422});
  const params=new URLSearchParams();
  params.set("mode","payment");
  verified.lines.forEach((line,index)=>{
    params.set(`line_items[${index}][price_data][currency]`,"brl");
    params.set(`line_items[${index}][price_data][product_data][name]`,line.productName.slice(0,120));
    params.set(`line_items[${index}][price_data][unit_amount]`,String(line.unitPriceMinor));
    params.set(`line_items[${index}][quantity]`,String(line.quantity));
  });
  params.set("success_url",siteUrl+"/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url",siteUrl+"/checkout/cancelado");
  params.set("metadata[basket_id]",basket.data);
  params.set("metadata[buyer_org_id]",body.buyerOrgId);
  params.set("metadata[created_by]",access.userId);
  params.set("metadata[region]",body.region);
  // Stripe chooses eligible methods from Dashboard settings; do not force
  // payment_method_types (unsupported by newer Stripe API versions).
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
