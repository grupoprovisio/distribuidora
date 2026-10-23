import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAuthEnabled } from "@/lib/supabase/config";
import { authRedirect } from "@/lib/supabase/auth-redirect";
export const dynamic = "force-dynamic";
const ALLOWED_TYPES = new Set<EmailOtpType>(["email","invite","recovery","magiclink"]);

export async function GET(request: NextRequest){
  if(!supabaseAuthEnabled())return authRedirect("/entrar");
  const token_hash=request.nextUrl.searchParams.get("token_hash");
  const type=request.nextUrl.searchParams.get("type") as EmailOtpType|null;
  if(!token_hash||token_hash.length>2048||!type||!ALLOWED_TYPES.has(type)){
    return authRedirect("/entrar?erro=confirmacao");
  }
  const client=await createClient();
  const {error}=await client.auth.verifyOtp({token_hash,type});
  if(error)return authRedirect("/entrar?erro=confirmacao");
  // Destino interno fixo: nao usar URL informada pelo cliente.
  const target=type==="recovery"?"/redefinir-senha":"/app";
  return authRedirect(target);
}
