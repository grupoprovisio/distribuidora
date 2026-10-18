/**
 * Normalização estrita dos códigos brasileiros permitidos no catálogo B2B.
 * Tabelas históricas usam "SP", enquanto ofertas novas também usam "BR-SP".
 * Uma oferta marcada como "BR" indica cobertura nacional e pode atender BR-SP.
 * Não adivinhar cobertura de outros países/regiões.
 */
export const UF_CODES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
] as const;
const STATES = new Set<string>(UF_CODES);

export function allowedBuyerRegionCodes(raw: string): string[] {
  const code=raw.trim().toUpperCase();
  if(code==="BR") return ["BR"];
  const state=code.startsWith("BR-") ? code.slice(3) : code;
  if(STATES.has(state)) return [state,"BR-"+state,"BR"];
  return [];
}
