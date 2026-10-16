import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAuthEnabled } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
const ALLOWED_TYPES = new Set<EmailOtpType>(["email","invite","recovery","magiclink"]);

export async function GET(request: NextRequest){
  const url=new URL(request.url);
  if(!supabaseAuthEnabled())return NextResponse.redirect(new URL("/entrar",url));
  const token_hash=url.searchParams.get("token_hash");
  const type=url.searchParams.get("type") as EmailOtpType|null;
  if(!token_hash||token_hash.length>2048||!type||!ALLOWED_TYPES.has(type)){
    return NextResponse.redirect(new URL("/entrar?erro=confirmacao",url));
  }
  const client=await createClient();
  const {error}=await client.auth.verifyOtp({token_hash,type});
  if(error)return NextResponse.redirect(new URL("/entrar?erro=confirmacao",url));
  // Destino interno fixo: nao usar URL informada pelo cliente.
  const target=type==="recovery"?"/redefinir-senha":"/app";
  const response=NextResponse.redirect(new URL(target,url));
  response.headers.set("Cache-Control","private, no-store");
  return response;
}
