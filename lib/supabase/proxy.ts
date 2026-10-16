import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicSupabaseConfig, supabaseAuthEnabled } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  if (!supabaseAuthEnabled()) return NextResponse.next({ request });
  const { url, key } = publicSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers || {})) {
          response.headers.set(header, value);
        }
      },
    },
  });
  // Claims sao verificados criptograficamente; nenhuma autorizacao baseada em getSession().
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
