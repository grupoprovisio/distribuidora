import { nearestFiliais } from "@/lib/atacadao";

/**
 * GET /api/filiais/nearest?lat=-23.5&lng=-46.6   ou   ?cep=02120000
 * Atacadões mais próximos (até 6), do mais perto ao mais longe.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const cep = (params.get("cep") ?? "").replace(/\D/g, "");
  const hasCoords = params.has("lat") && params.has("lng");
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  let query: Parameters<typeof nearestFiliais>[0];
  if (hasCoords && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    query = { lat, lng };
  } else if (/^\d{8}$/.test(cep)) {
    query = { cep };
  } else {
    return Response.json({ error: "Informe lat/lng ou um CEP de 8 dígitos." }, { status: 400 });
  }

  try {
    const filiais = await nearestFiliais(query);
    return Response.json({ filiais }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível buscar as filiais agora." }, { status: 502 });
  }
}
