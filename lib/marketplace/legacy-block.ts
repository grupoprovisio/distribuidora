/** Historical comparador is retired: external VTEX/Atacadao data is not available
 * as a search, comparison or commercial source for the Provisio B2B marketplace.
 * All endpoint guards fail closed independent of environment flags. */
export function legacyComparatorIsDisabled(): boolean {
  return true;
}

export function legacyComparatorBlockedResponse(): Response {
  return Response.json(
    { ok: false, code: "legacy_comparator_retired", message: "Consulta externa desativada. Utilize apenas o catalogo autorizado da Provisio." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
