import { request } from "@/lib/atacadao";

/**
 * GET /api/terms?q=arr  -> sugestões de busca do Atacadão para o que está sendo digitado.
 * GET /api/terms        -> buscas mais populares do momento.
 * Vem da busca inteligente da loja: nada de lista fixa no app.
 */
export async function GET(request_: Request) {
  const q = (new URL(request_.url).searchParams.get("q") ?? "").trim().slice(0, 40);
  const path = q
    ? `/api/io/_v/api/intelligent-search/search_suggestions?query=${encodeURIComponent(q)}`
    : "/api/io/_v/api/intelligent-search/top_searches";

  try {
    const res = await request(path, { revalidate: 600 });
    if (!res.ok) return Response.json({ terms: [] });
    const json = (await res.json()) as { searches?: { term?: string; count?: number }[] };
    const terms = (json.searches ?? [])
      .flatMap((s) => (s.term && s.term.length >= 3 && s.term.length <= 40 ? [s.term] : []))
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 8);
    return Response.json({ terms });
  } catch {
    return Response.json({ terms: [] });
  }
}
