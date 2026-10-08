import { catalogFacets, catalogSearch, type CatalogQuery } from "@/lib/atacadao";
import { CATALOG_SORTS, type CatalogResponse } from "@/lib/catalog-types";

const SELLER = /^atacadaobr\d{1,4}$/;
const SLUG = /^[a-z0-9-]{1,80}$/;

/**
 * GET /api/catalog?seller=atacadaobr60&term=arroz&cat=mercearia/graos&brand=camil&sort=price_asc&first=24&after=0&facets=1
 * Catálogo real da filial, com preços e degraus de atacado. As promoções ficam em /api/promos.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const invalid = () => Response.json({ ok: false, reason: "invalid" }, { status: 400 });

  const seller = p.get("seller") ?? "atacadaobr60";
  if (!SELLER.test(seller)) return invalid();

  try {
    const term = (p.get("term") ?? "").trim().slice(0, 80);
    const cat = (p.get("cat") ?? "").split("/").filter(Boolean);
    const brand = p.get("brand") ?? undefined;
    const sort = p.get("sort") ?? "score_desc";
    const first = Number.parseInt(p.get("first") ?? "24", 10);
    const after = Number.parseInt(p.get("after") ?? "0", 10);
    if (
      !Number.isInteger(after) ||
      after < 0 ||
      after > 9900 ||
      cat.length > 3 ||
      !cat.every((s) => SLUG.test(s)) ||
      (brand !== undefined && !SLUG.test(brand)) ||
      !(CATALOG_SORTS as readonly string[]).includes(sort) ||
      !Number.isInteger(first) ||
      first < 1 ||
      first > 100
    ) {
      return invalid();
    }

    const query: CatalogQuery = { seller, term, cat, brand, sort, first };
    const [{ products, total, scanned }, facets] = await Promise.all([
      catalogSearch(query, after),
      p.get("facets") === "1" ? catalogFacets(query) : Promise.resolve(undefined),
    ]);
    return Response.json({ ok: true, products, total, next: after + scanned, facets } satisfies CatalogResponse);
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
