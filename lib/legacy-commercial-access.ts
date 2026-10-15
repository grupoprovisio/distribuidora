/**
 * The external VTEX/Atacadao comparison is deliberately retired from the
 * marketplace branch. Keep legacy routes and stores only for controlled data
 * migration, never as an active commercial data source.
 *
 * No environment variable can re-enable these external requests.
 */
export function blockLegacyCommerce(): never {
  throw new Error("Comparador externo desativado: use somente o catalogo autorizado da Provisio.");
}
