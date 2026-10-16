import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
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
  ],
};
