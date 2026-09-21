import { cookies } from "next/headers";
import { ACCOUNT_COOKIE } from "@/lib/account";
import { cookieOptions, isSameOrigin } from "@/lib/route-guard";
import { LOGIN_COOKIE, SESSION_COOKIE, verifyAccessKey } from "@/lib/vtex-auth";

const MAX_ATTEMPTS = 5;

type Pending = { t: string; e: string; n: number };

function readPending(raw?: string): Pending | null {
  try {
    const p = JSON.parse(raw ?? "") as Partial<Pending>;
    return typeof p.t === "string" && typeof p.e === "string" && typeof p.n === "number" ? (p as Pending) : null;
  } catch {
    return null;
  }
}

/** Passo 2: troca e-mail + código pela sessão do Atacadão, guardada em cookie httpOnly. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Requisição não permitida." }, { status: 403 });

  const jar = await cookies();
  const pending = readPending(jar.get(LOGIN_COOKIE)?.value);
  if (!pending) {
    return Response.json({ error: "O código expirou. Peça um novo.", restart: true }, { status: 400 });
  }
  if (pending.n >= MAX_ATTEMPTS) {
    jar.delete(LOGIN_COOKIE);
    return Response.json({ error: "Muitas tentativas. Peça um novo código.", restart: true }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  if (!/^\d{4,8}$/.test(code)) {
    return Response.json({ error: "Digite o código de 6 dígitos recebido por e-mail." }, { status: 400 });
  }

  const result = await verifyAccessKey(pending.e, code, pending.t);
  if (!result.ok) {
    if (result.reason === "error") {
      return Response.json({ error: "Não foi possível validar agora. Tente novamente." }, { status: 502 });
    }
    jar.set(LOGIN_COOKIE, JSON.stringify({ ...pending, n: pending.n + 1 }), cookieOptions(600));
    return Response.json({ error: "Código inválido ou expirado." }, { status: 401 });
  }

  jar.set(SESSION_COOKIE, result.token, cookieOptions(result.maxAge));
  // Só o e-mail, legível pelo navegador: as compras salvas são dessa conta.
  jar.set(ACCOUNT_COOKIE, encodeURIComponent(pending.e), { ...cookieOptions(result.maxAge), httpOnly: false });
  jar.delete(LOGIN_COOKIE);
  return Response.json({ ok: true });
}
