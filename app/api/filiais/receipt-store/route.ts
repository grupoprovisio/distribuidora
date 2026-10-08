import { receiptStore } from "@/lib/receipt";

/**
 * GET /api/filiais/receipt-store?address=AV COSTA E SILVA, 1525, VILA OLINDA, CAMPO GRANDE, MS
 * Filial onde a compra da nota foi feita (primeiro item) e as próximas dela.
 */
export async function GET(request: Request) {
  const address = (new URL(request.url).searchParams.get("address") ?? "").trim();
  if (address.length < 8 || address.length > 200) return Response.json({ error: "Endereço inválido." }, { status: 400 });

  try {
    const filiais = await receiptStore(address);
    if (filiais.length === 0) return Response.json({ error: "Não achei a filial desse endereço." }, { status: 404 });
    return Response.json({ filiais }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível buscar a filial agora." }, { status: 502 });
  }
}
