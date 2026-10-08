import { suggestList, suggestModes } from "@/lib/suggest";

const SELLER = /^atacadaobr\d{1,4}$/;

/**
 * GET /api/suggest?seller=atacadaobr60            -> modos de lista disponíveis hoje
 * GET /api/suggest?seller=atacadaobr60&mode=casa  -> itens (categorias) da lista sugerida
 * Modos e itens saem das coleções e dos mais vendidos da própria loja.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const seller = p.get("seller") ?? "atacadaobr60";
  const mode = p.get("mode");
  if (!SELLER.test(seller) || (mode !== null && !/^(casa|\d{1,6})$/.test(mode))) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  try {
    if (mode === null) return Response.json({ ok: true, modes: await suggestModes(seller) });
    const list = await suggestList(seller, mode);
    return list ? Response.json({ ok: true, ...list }) : Response.json({ ok: false, reason: "not_found" }, { status: 404 });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 502 });
  }
}
