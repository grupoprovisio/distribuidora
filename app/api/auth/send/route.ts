import { cookies } from "next/headers";
import { cookieOptions, isSameOrigin } from "@/lib/route-guard";
import { LOGIN_COOKIE, sendAccessKey } from "@/lib/vtex-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Passo 1: o Atacadão envia um código ao e-mail informado. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Requisição não permitida." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  try {
    const authenticationToken = await sendAccessKey(email);
    // O token do passo 1 precisa acompanhar o passo 2; fica só num cookie httpOnly de curta duração.
    (await cookies()).set(LOGIN_COOKIE, JSON.stringify({ t: authenticationToken, e: email, n: 0 }), cookieOptions(600));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Não foi possível enviar o código agora. Tente novamente." }, { status: 502 });
  }
}
