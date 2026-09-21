import { promoList, promoOverview, type PromoSort } from "@/lib/promos";

const SELLER = /^atacadaobr\d{1,4}$/;
const SLUG = /^[a-z0-9-]{1,80}$/;
const SORTS: PromoSort[] = ["pct", "save", "price", "near"];

/**
 * GET /api/promos?seller=atacadaobr60&view=overview
 * GET /api/promos?seller=...&view=list&collection=372&dept=mercearia&qty=6&sort=pct&after=0&first=24
 * Promoções reais da filial (coleções, departamentos e quantidades vêm das APIs do Atacadão).
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const invalid = () => Response.json({ ok: false, reason: "invalid" }, { status: 400 });

  const seller = p.get("seller") ?? "atacadaobr60";
  if (!SELLER.test(seller)) return invalid();

  try {
    if ((p.get("view") ?? "overview") === "overview") {
      return Response.json({ ok: true, ...(await promoOverview(seller)) });
    }

    const collection = p.get("collection") ?? undefined;
    const dept = p.get("dept") ?? undefined;
    const sort = (p.get("sort") ?? "pct") as PromoSort;
    const qty = Number.parseInt(p.get("qty") ?? "0", 10);
    const after = Number.parseInt(p.get("after") ?? "0", 10);
    const first = Number.parseInt(p.get("first") ?? "24", 10);
    if (
      (collection !== undefined && !/^\d{1,6}$/.test(collection)) ||
      (dept !== undefined && !SLUG.test(dept)) ||
      !SORTS.includes(sort) ||
      !Number.isInteger(qty) || qty < 0 || qty > 999 ||
      !Number.isInteger(after) || after < 0 || after > 5000 ||
      !Number.isInteger(first) || first < 1 || first > 60
    ) {
      return invalid();
    }
    return Response.json({ ok: true, ...(await promoList(seller, { collection, dept, qty, sort, after, first })) });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
