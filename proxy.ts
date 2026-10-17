import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { supabaseAuthEnabled } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  // Nunca misturar a sessão de conta VTEX legada com o novo Auth multiempresa.
  // Mantém o legado intacto enquanto MARKETPLACE_AUTH_ENABLED=false.
  if (supabaseAuthEnabled() &&
    (request.nextUrl.pathname === "/conta" ||
      request.nextUrl.pathname.startsWith("/conta/"))) {
    const response = NextResponse.redirect(new URL("/app",request.url));
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }
  return updateSession(request);
}
export const config = {
  matcher: [
    "/entrar",
    "/app/:path*",
    "/admin/:path*",
    "/auth/callback",
    "/auth/confirm",
    "/recuperar-acesso",
    "/redefinir-senha",
    "/seguranca/mfa",
    "/conta/:path*",
  ],
};
