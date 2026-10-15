/**
 * The external VTEX/Atacadao comparison is deliberately retired from the
 * marketplace branch. Keep legacy routes and stores only for controlled data
 * migration, never as an active commercial data source.
 *
 * No environment variable can re-enable these external requests.
 */
export function blockLegacyCommerce(): void {
  throw new Error("Comparador externo desativado: use somente o catalogo autorizado da Provisio.");
}

/** Historic commercial endpoints must not silently return third-party prices. */
export function legacyEndpointGone(): Response {
  return Response.json(
    { ok: false, reason: "legacy_comparator_retired", replacement: "/produtos" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
