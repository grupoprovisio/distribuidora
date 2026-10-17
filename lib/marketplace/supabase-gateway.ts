/**
 * Adaptador exclusivamente server-side: JWT do proprio usuario + RLS do Supabase.
 * Nao usa service_role, secret keys ou cookies de autenticacao VTEX.
 * Nenhum endpoint chama o Supabase enquanto a flag de ativacao estiver OFF.
 */
const EXPECTED_REF = "xprvdquocenfqvnokmmi";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MarketplaceSupabaseConfig = { origin: string; publishableKey: string };
export type VerifiedMarketplaceUser = { id: string; email: string | null };
export type VerifiedMarketplaceSession = { token: string; user: VerifiedMarketplaceUser };
export type GatewayFailure = { kind: "disabled" | "not_configured" | "unauthorized" | "upstream_error" };

export function isMarketplaceSupabaseEnabled() {
  return process.env.MARKETPLACE_SUPABASE_API_ENABLED === "true";
}

export function getMarketplaceSupabaseConfig(): MarketplaceSupabaseConfig | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) return null;
  try {
    const url = new URL(rawUrl);
    // Impede usar acidentalmente o banco do Gestify ou Kratelis.
    if (url.protocol !== "https:" || url.hostname !== `${EXPECTED_REF}.supabase.co`
      || url.pathname !== "/" || url.search || url.hash || url.port) return null;
    return { origin: url.origin, publishableKey };
  } catch {
    return null;
  }
}

export function marketplaceGatewayFailure(request: Request): GatewayFailure | null {
  if (!isMarketplaceSupabaseEnabled()) return { kind: "disabled" };
  if (!getMarketplaceSupabaseConfig()) return { kind: "not_configured" };
  if (!/^Bearer\s+[^\s]+$/i.test(request.headers.get("authorization") ?? "")) {
    return { kind: "unauthorized" };
  }
  return null;
}

export function gatewayErrorResponse(failure: GatewayFailure): Response {
  const status = {
    disabled: 404,
    not_configured: 503,
    unauthorized: 401,
    upstream_error: 502,
  }[failure.kind];
  return Response.json(
    { ok: false, error: failure.kind },
    { status, headers: { "Cache-Control": "no-store", Vary: "Authorization" } }
  );
}

export async function verifyMarketplaceSession(
  request: Request, config: MarketplaceSupabaseConfig
): Promise<VerifiedMarketplaceSession | GatewayFailure> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token || token.length > 8192 || /\s/.test(token)) return { kind: "unauthorized" };
  let response: Response;
  try {
    response = await fetch(`${config.origin}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { kind: "upstream_error" };
  }
  if (response.status === 401 || response.status === 403) return { kind: "unauthorized" };
  if (!response.ok) return { kind: "upstream_error" };
  try {
    const result = (await response.json()) as { id?: unknown; email?: unknown };
    if (typeof result.id !== "string" || !UUID.test(result.id)) return { kind: "upstream_error" };
    return {
      token,
      user: { id: result.id, email: typeof result.email === "string" ? result.email : null },
    };
  } catch {
    return { kind: "upstream_error" };
  }
}

/** Consulta PostgREST sempre com JWT de usuario previamente validado, NUNCA service_role. */
export async function selectMarketplaceRows<T>(
  config: MarketplaceSupabaseConfig,
  session: VerifiedMarketplaceSession,
  table: string,
  query: Record<string, string>
): Promise<T[] | GatewayFailure> {
  const allowed = new Set(["profiles", "organization_members", "offers"]);
  if (!allowed.has(table)) return { kind: "upstream_error" };
  const url = new URL(`/rest/v1/${table}`, config.origin);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${session.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { kind: "upstream_error" };
  }
  if (response.status === 401 || response.status === 403) return { kind: "unauthorized" };
  if (!response.ok) return { kind: "upstream_error" };
  try {
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return { kind: "upstream_error" };
    return data as T[];
  } catch {
    return { kind: "upstream_error" };
  }
}

export function validMarketplaceUuid(value: string): boolean {
  return UUID.test(value);
}

export function noStoreResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Authorization" },
  });
}
