import { NextResponse } from "next/server";

// Retired legacy single-price checkout: only the authenticated buyer basket
// can create payable sessions with verified products, tenant and fulfillment.
export async function POST() {
  return NextResponse.json(
    {ok:false,reason:"legacy_checkout_disabled",message:"Acesse Minha cesta na Área do comprador para finalizar o pedido."},
    {status:410,headers:{"Cache-Control":"no-store"}},
  );
}
