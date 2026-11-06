import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAuthEnabled } from "@/lib/supabase/config";
import { authRedirect } from "@/lib/supabase/auth-redirect";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  // Destinos enumerados: nao aceitar next arbitrario de querystring.
  const flow = request.nextUrl.searchParams.get("flow");
  const productSlug = request.nextUrl.searchParams.get("produto") ?? "";
  const validProduct = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug) && productSlug.length <= 160;
  const destination = flow === "recovery" ? "/redefinir-senha"
    : flow === "buyer-product" && validProduct
    ? "/app/comprador/catalogo?produto=" + encodeURIComponent(productSlug)
    : "/app";
  if (!supabaseAuthEnabled()) return authRedirect("/entrar");
  const params=request.nextUrl.searchParams;
  const code=params.get("code");
  if (!code || code.length>2048) {
    return authRedirect("/entrar?erro=confirmacao");
  }
  const supabase=await createClient();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if (error) return authRedirect("/entrar?erro=confirmacao");
  // O destino e fixo. Nunca confiar em next/redirect_to do cliente.
  return authRedirect(destination);
}
