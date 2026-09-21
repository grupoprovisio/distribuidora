import { compareList } from "@/lib/atacadao";
import type { ListCompareItem } from "@/lib/lookup-types";
import { isSameOrigin } from "@/lib/route-guard";

const SELLER = /^atacadaobr\d{1,4}$/;
const MAX_ITEMS = 100;

/**
 * POST /api/list/compare  { items: [{ id, qty }], seller, sellers?: [...] }
 * Total real da lista em cada filial (simulação de carrinho do Atacadão, com o degrau de atacado de cada quantidade).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ ok: false, reason: "invalid" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { items?: unknown; seller?: unknown; sellers?: unknown } | null;
  const seller = typeof body?.seller === "string" ? body.seller : "";
  const others = Array.isArray(body?.sellers) ? (body.sellers as unknown[]) : [];
  const rawItems = Array.isArray(body?.items) ? (body.items as unknown[]) : [];

  const items: ListCompareItem[] = rawItems.flatMap((it) => {
    const o = it as { id?: unknown; qty?: unknown };
    return typeof o.id === "string" && /^\d{1,9}$/.test(o.id) && Number.isInteger(o.qty) && (o.qty as number) >= 1 && (o.qty as number) <= 999
      ? [{ id: o.id, qty: o.qty as number }]
      : [];
  });

  const valid =
    SELLER.test(seller) &&
    items.length > 0 &&
    items.length <= MAX_ITEMS &&
    items.length === rawItems.length &&
    others.length <= 6 &&
    others.every((s) => typeof s === "string" && SELLER.test(s));
  if (!valid) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });

  try {
    const result = await compareList(items, seller, others as string[]);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
