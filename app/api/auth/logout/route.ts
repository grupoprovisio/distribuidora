import { cookies } from "next/headers";
import { ACCOUNT_COOKIE } from "@/lib/account";
import { isSameOrigin } from "@/lib/route-guard";
import { LOGIN_COOKIE, SESSION_COOKIE } from "@/lib/vtex-auth";

/** Encerra a sessão neste app (apaga os cookies). Não desloga você do site da Distribuidora. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Requisição não permitida." }, { status: 403 });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(LOGIN_COOKIE);
  jar.delete(ACCOUNT_COOKIE);
  return Response.json({ ok: true });
}
