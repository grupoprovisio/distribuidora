import { parseNfceUrl } from "@/lib/nfce";
import { loadReceipt, supportedUf } from "@/lib/receipt";
import { isSameOrigin } from "@/lib/route-guard";

const SELLER = /^atacadaobr\d{1,4}$/;

/**
 * POST /api/receipt  { url, seller }
 * Lê a NFC-e do QR code, vincula cada item ao catálogo e compara o que foi pago com o preço de hoje na filial.
 * POST (e não GET) para que a URL da nota, que identifica a compra, não caia em logs de acesso.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ ok: false, reason: "invalid" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { url?: unknown; seller?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url : "";
  const seller = typeof body?.seller === "string" ? body.seller : "atacadaobr60";
  const ref = url.length <= 600 ? parseNfceUrl(url) : null;

  if (!ref || !SELLER.test(seller)) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  if (!supportedUf(ref.uf)) return Response.json({ ok: false, reason: "unsupported", uf: ref.uf }, { status: 422 });

  try {
    const result = await loadReceipt(ref, seller);
    const status = result.ok ? 200 : result.reason === "parse" ? 422 : 502;
    return Response.json(result, { status, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
