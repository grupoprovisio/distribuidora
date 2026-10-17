import { previewAuthorizedCsv } from "@/lib/marketplace/csv-import";
import { demoEndpointDisabled, isLocalMarketplaceDemoEnabled } from "@/lib/marketplace/demo-access";

/** Local-only CSV preview. No persistence, no authentication, no supplier enrollment. */
export async function POST(request: Request) {
  if (!isLocalMarketplaceDemoEnabled()) return demoEndpointDisabled();
  const raw = await request.text();
  if (raw.length > 2_000_000) return Response.json({ ok: false, reason: "payload_too_large" }, { status: 413 });
  let body: { csv?: unknown; sourceType?: unknown } | null = null;
  try { body = JSON.parse(raw); } catch { /* Invalid JSON handled below. */ }
  if (typeof body?.csv !== "string" || body.csv.length > 1_000_000) {
    return Response.json({ ok: false, reason: "invalid_csv" }, { status: 400 });
  }
  const sourceType = typeof body.sourceType === "string" ? body.sourceType : "SUPPLIER_CSV_AUTHORIZED";
  const preview = previewAuthorizedCsv(body.csv, sourceType as Parameters<typeof previewAuthorizedCsv>[1]);
  return Response.json({ ok: true, simulated: true, preview }, { status: preview.accepted ? 200 : 422 });
}
