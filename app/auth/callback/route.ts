import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAuthEnabled } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  // Destinos enumerados: nao aceitar next arbitrario de querystring.
  const flow = request.nextUrl.searchParams.get("flow");
  const destination = new URL(flow === "recovery" ? "/redefinir-senha" : "/app",request.url);
  if (!supabaseAuthEnabled()) return NextResponse.redirect(new URL("/entrar", request.url));
  const params=request.nextUrl.searchParams;
  const code=params.get("code");
  if (!code || code.length>2048) {
    return NextResponse.redirect(new URL("/entrar?erro=confirmacao",request.url));
  }
  const supabase=await createClient();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/entrar?erro=confirmacao",request.url));
  // O destino e fixo. Nunca confiar em next/redirect_to do cliente.
  const response=NextResponse.redirect(destination);
  response.headers.set("Cache-Control","private, no-store");
  return response;
}
