import { lookupProduct } from "@/lib/atacadao";

const SELLER = /^atacadaobr\d{1,4}$/;

/**
 * GET /api/lookup?ean=7896006711155&seller=atacadaobr60&qty=6&sellers=atacadaobr340,atacadaobr133
 * Produto pelo código de barras + preço na filial/quantidade escolhidas + semelhantes de outras marcas
 * (+ mesmo produto nas outras filiais, se `sellers` vier preenchido).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const ean = (params.get("ean") ?? "").trim();
  const seller = params.get("seller") ?? "atacadaobr60";
  const qty = Number.parseInt(params.get("qty") ?? "1", 10);
  const sellers = [...new Set((params.get("sellers") ?? "").split(",").filter(Boolean))];

  if (!/^\d{6,14}$/.test(ean) || !SELLER.test(seller) || !Number.isInteger(qty) || qty < 1 || qty > 999 || sellers.length > 8 || !sellers.every((s) => SELLER.test(s))) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  try {
    const result = await lookupProduct(ean, seller, qty, sellers);
    return Response.json(result, { status: result.ok ? 200 : 404, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
