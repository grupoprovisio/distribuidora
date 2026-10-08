import { previewAuthorizedCsv } from "@/lib/marketplace/csv-import";

/** Prévia local de CSV: não persiste nem publica ofertas. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { csv?: unknown; sourceType?: unknown } | null;
  if (typeof body?.csv !== "string" || body.csv.length > 2_000_000) return Response.json({ ok: false, reason: "invalid_csv" }, { status: 400 });
  const sourceType = typeof body.sourceType === "string" ? body.sourceType : "SUPPLIER_CSV_AUTHORIZED";
  const preview = previewAuthorizedCsv(body.csv, sourceType as Parameters<typeof previewAuthorizedCsv>[1]);
  return Response.json({ ok: true, preview }, { status: preview.accepted ? 200 : 422 });
}
