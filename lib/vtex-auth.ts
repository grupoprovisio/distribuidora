import "server-only";

// Login da Distribuidora (VTEX ID) por código enviado ao e-mail, feito pelo SERVIDOR do app:
//   start  -> authenticationToken
//   send   -> o Distribuidora envia o código ao e-mail
//   verify -> troca e-mail + código pelo cookie de sessão da Distribuidora
// O token da sessão fica num cookie httpOnly do app (nunca exposto ao JS do navegador). Senha não é usada.
// Formato das respostas de send/verify segue a documentação do VTEX ID; o `start` foi confirmado ao vivo.

const ID_HOST = "https://secure.atacadao.com.br";
const STORE_HOST = "https://www.atacadao.com.br";
const SCOPE = "atacadaobr";
const AUTH_COOKIE_NAME = `VtexIdclientAutCookie_${SCOPE}`;

export const SESSION_COOKIE = "abp_session";
export const LOGIN_COOKIE = "abp_login";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const baseHeaders = { "user-agent": UA, accept: "application/json" };

async function idFetch(path: string, init?: RequestInit) {
  return fetch(`${ID_HOST}/api/vtexid/pub/authentication/${path}`, {
    ...init,
    headers: { ...baseHeaders, ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

const form = (data: Record<string, string>) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(data).toString(),
});

async function startLogin() {
  const res = await idFetch(`start?scope=${SCOPE}&accountName=${SCOPE}&locale=pt-BR`);
  if (!res.ok) throw new Error(`start ${res.status}`);
  const json = (await res.json()) as { authenticationToken?: string };
  if (!json.authenticationToken) throw new Error("start sem token");
  return json.authenticationToken;
}

/** Pede à Distribuidora que envie o código ao e-mail. Devolve o token a ser guardado até a verificação. */
export async function sendAccessKey(email: string) {
  const authenticationToken = await startLogin();
  const res = await idFetch("accesskey/send", form({ email, authenticationToken, locale: "pt-BR" }));
  if (!res.ok) throw new Error(`send ${res.status}`);
  return authenticationToken;
}

export type VerifyResult = { ok: true; token: string; maxAge: number } | { ok: false; reason: "invalid" | "error" };

export async function verifyAccessKey(email: string, code: string, authenticationToken: string): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await idFetch("accesskey/validate", form({ login: email, accesskey: code, authenticationToken }));
  } catch {
    return { ok: false, reason: "error" };
  }
  const json = (await res.json().catch(() => null)) as {
    authStatus?: string;
    authCookie?: { Name?: string; Value?: string };
  } | null;

  const value = json?.authCookie?.Value;
  if (json?.authStatus === "Success" && value) return { ok: true, token: value, maxAge: cookieMaxAge(value) };
  // Sem sucesso: código errado/expirado (o VTEX responde 200 ou 4xx com authStatus) ou falha do serviço.
  return { ok: false, reason: res.status >= 500 ? "error" : "invalid" };
}

/** Vida do cookie = `exp` do JWT da Distribuidora (limitada a 30 dias); 24 h se não der para ler. */
function cookieMaxAge(jwt: string) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    if (payload.exp) return Math.max(60, Math.min(payload.exp - Math.floor(Date.now() / 1000), 60 * 60 * 24 * 30));
  } catch {
    // JWT opaco: usa o padrão
  }
  return 60 * 60 * 24;
}

// ---------------------------------------------------------------- perfil

export type Address = {
  label: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
};

export type Order = { id: string; date: string; total: number; status: string };

export type Profile = {
  email: string;
  name: string;
  /** Já mascarados no servidor: o CPF completo e o telefone inteiro nunca chegam ao navegador. */
  documentMasked?: string;
  phoneMasked?: string;
  addresses: Address[];
  orders: Order[];
};

export type ProfileResult = { status: "ok"; profile: Profile } | { status: "anonymous" } | { status: "error" };

const maskDocument = (doc?: string | null) => {
  const d = (doc ?? "").replace(/\D/g, "");
  return d.length === 11 ? `•••.•••.${d.slice(6, 9)}-••` : d ? "•••••" : undefined;
};

const maskPhone = (phone?: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) •••••-${d.slice(-4)}` : d ? "••••" : undefined;
};

type OrderForm = {
  loggedIn?: boolean;
  clientProfileData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    document?: string;
    phone?: string;
  } | null;
  shippingData?: {
    availableAddresses?: {
      addressType?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    }[];
  } | null;
};

type OmsOrders = {
  list?: { orderId?: string; creationDate?: string; totalValue?: number; statusDescription?: string; status?: string }[];
};

/** Lê o perfil da Distribuidora com a sessão do cliente. Mostra só o que o site já mostra ao próprio dono da conta. */
export async function getProfile(token: string): Promise<ProfileResult> {
  const headers = { ...baseHeaders, cookie: `${AUTH_COOKIE_NAME}=${token}` };
  try {
    const formRes = await fetch(`${STORE_HOST}/api/checkout/pub/orderForm`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ expectedOrderFormSections: ["clientProfileData", "shippingData"] }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!formRes.ok) return { status: "error" };
    const orderForm = (await formRes.json()) as OrderForm;
    const p = orderForm.clientProfileData;
    if (!orderForm.loggedIn || !p?.email) return { status: "anonymous" };

    // Pedidos são "melhor esforço": se falhar, a conta continua aparecendo.
    let orders: Order[] = [];
    try {
      const ordersRes = await fetch(`${STORE_HOST}/api/oms/user/orders?page=1&per_page=5`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (ordersRes.ok) {
        const json = (await ordersRes.json()) as OmsOrders;
        orders = (json.list ?? []).map((o) => ({
          id: o.orderId ?? "",
          date: o.creationDate ?? "",
          total: (o.totalValue ?? 0) / 100,
          status: o.statusDescription ?? o.status ?? "",
        }));
      }
    } catch {
      // segue sem pedidos
    }

    return {
      status: "ok",
      profile: {
        email: p.email,
        name: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email.split("@")[0],
        documentMasked: maskDocument(p.document),
        phoneMasked: maskPhone(p.phone),
        addresses: (orderForm.shippingData?.availableAddresses ?? []).slice(0, 5).map((a) => ({
          label: a.addressType === "commercial" ? "Comercial" : "Residencial",
          street: [a.street, a.number].filter(Boolean).join(", "),
          district: a.neighborhood ?? "",
          city: [a.city, a.state].filter(Boolean).join(" - "),
          postalCode: a.postalCode ?? "",
        })),
        orders,
      },
    };
  } catch {
    return { status: "error" };
  }
}
