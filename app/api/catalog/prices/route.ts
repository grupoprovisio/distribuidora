import { skuPrices } from "@/lib/atacadao";

const SELLER = /^atacadaobr\d{1,4}$/;

/** GET /api/catalog/prices?seller=atacadaobr60&ids=13743,9925 -> preço a 1 un por SKU (null = indisponível na filial). */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const seller = p.get("seller") ?? "atacadaobr60";
  const ids = [...new Set((p.get("ids") ?? "").split(",").filter(Boolean))];

  if (!SELLER.test(seller) || ids.length === 0 || ids.length > 40 || !ids.every((id) => /^\d{1,9}$/.test(id))) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  try {
    return Response.json({ ok: true, prices: await skuPrices(seller, ids) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
