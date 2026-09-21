// Detecção do QR code de NFC-e (nota fiscal do consumidor). Puro: roda no navegador e no servidor.
// O QR contém uma URL da SEFAZ do estado com a chave de acesso de 44 dígitos: `?p=<chave>|2|1|1|<hash>` ou `?chNFe=<chave>&...`.

export type NfceRef = {
  /** URL exatamente como veio no QR. */
  url: string;
  /** Chave de acesso (44 dígitos). */
  key: string;
  /** Valor completo do parâmetro `p` (chave|versão|ambiente|...|hash), quando existe. */
  p?: string;
  host: string;
  /** Código IBGE da UF (50 = MS). */
  uf: string;
  cnpj: string;
  number: string;
};

export const UF_BY_CODE: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
  "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

/** Dígito verificador da chave (módulo 11, pesos 2 a 9 da direita para a esquerda). */
export function validNfceKey(key: string) {
  if (!/^\d{44}$/.test(key)) return false;
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv === Number(key[43]);
}

/** Reconhece o texto de um QR como NFC-e: URL `.gov.br` com chave válida, modelo 65 (NFC-e). Senão, null. */
export function parseNfceUrl(text: string): NfceRef | null {
  let u: URL;
  try {
    u = new URL(text.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!/\.gov\.br$/i.test(u.hostname)) return null;

  const p = u.searchParams.get("p") ?? undefined;
  const raw = p ?? u.searchParams.get("chNFe") ?? "";
  const key = raw.match(/^\d{44}/)?.[0];
  if (!key || !validNfceKey(key) || key.slice(20, 22) !== "65") return null;

  return {
    url: u.toString(),
    key,
    p,
    host: u.hostname.toLowerCase(),
    uf: key.slice(0, 2),
    cnpj: key.slice(6, 20),
    number: String(Number(key.slice(25, 34))),
  };
}
