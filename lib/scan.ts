// Classificação do que o leitor decodificou. Sem dependência do ZXing: recebe só o nome do formato (ex.: "EAN_13").

import { parseNfceUrl } from "@/lib/nfce";

export type ScanKind = "qr" | "barcode" | "text" | "receipt";

export type Scan = {
  text: string;
  kind: ScanKind;
  /** Rótulo para exibir: "QR Code", "Código de barras · EAN-13", "Texto digitado"... */
  label: string;
  /** Preenchido só para http/https (nunca javascript:, data: etc.). */
  url?: string;
};

const TWO_D = new Set(["QR_CODE", "DATA_MATRIX", "AZTEC", "PDF_417", "MAXICODE"]);

const NAMES: Record<string, string> = {
  QR_CODE: "QR Code",
  DATA_MATRIX: "Data Matrix",
  AZTEC: "Aztec",
  PDF_417: "PDF417",
  EAN_13: "EAN-13",
  EAN_8: "EAN-8",
  UPC_A: "UPC-A",
  UPC_E: "UPC-E",
  CODE_128: "Code 128",
  CODE_39: "Code 39",
  CODE_93: "Code 93",
  ITF: "ITF",
  CODABAR: "Codabar",
};

/** Só aceita links web. Um QR pode conter qualquer coisa, então nada de abrir esquemas perigosos. */
export function safeUrl(text: string) {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

const RECEIPT_LABEL = "Nota fiscal (NFC-e)";

export function makeScan(text: string, format: string): Scan {
  const name = NAMES[format] ?? format;
  const kind: ScanKind = TWO_D.has(format) ? "qr" : "barcode";
  // QR de nota fiscal do consumidor: URL da SEFAZ com chave de acesso válida.
  if (kind === "qr" && parseNfceUrl(text)) return { text, kind: "receipt", label: RECEIPT_LABEL, url: safeUrl(text) };
  return {
    text,
    kind,
    label: kind === "qr" ? name : `Código de barras · ${name}`,
    url: safeUrl(text),
  };
}

/** Texto digitado à mão: número de 8 a 14 dígitos é tratado como código de barras. */
export function classifyManual(raw: string): Scan {
  const text = raw.trim();
  const url = safeUrl(text);
  if (parseNfceUrl(text)) return { text, kind: "receipt", label: `${RECEIPT_LABEL} · digitado`, url };
  if (/^\d{8,14}$/.test(text)) return { text, kind: "barcode", label: "Código de barras · digitado", url };
  if (url) return { text, kind: "qr", label: "Link · digitado", url };
  return { text, kind: "text", label: "Texto digitado" };
}
