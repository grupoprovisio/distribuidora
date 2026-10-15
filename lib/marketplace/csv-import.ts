import type { OfferSourceType } from "@/lib/marketplace/catalog";

export type CsvOfferRow = { line: number; supplierSku: string; productName: string; baseUnit: "un" | "kg" | "l"; packQuantity: number; packUnit: string; basePriceMinor: number; minQuantity: number; regions: string[]; sourceType: OfferSourceType };
export type CsvImportError = { line: number; field: string; message: string };
export type CsvImportPreview = { rows: CsvOfferRow[]; errors: CsvImportError[]; accepted: boolean; sourceType: OfferSourceType };

// An uploaded CSV cannot self-declare MANUAL_AUTHORIZED or PLATFORM_STOCK provenance.
const authorized = new Set<OfferSourceType>(["SUPPLIER_CSV_AUTHORIZED"]);
const units = new Set(["un", "kg", "l"]);

/** Single-record RFC 4180-style parsing: escaped quotes supported; malformed input rejected.
 * Multiline records are deliberately unsupported until a reviewed bulk importer exists.
 */
function splitLine(line: string): string[] | null {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else current += char;
    } else if (char === ",") {
      values.push(current.trim()); current = ""; closed = false;
    } else if (char === '"' && current.length === 0 && !closed) {
      quoted = true;
    } else if (closed && (char === " " || char === "\t")) {
      continue;
    } else if (char === '"' || closed) {
      return null;
    } else {
      current += char;
    }
  }
  if (quoted) return null;
  values.push(current.trim());
  return values;
}

export function previewAuthorizedCsv(csv: string, sourceType: OfferSourceType = "SUPPLIER_CSV_AUTHORIZED"): CsvImportPreview {
  const errors: CsvImportError[] = [];
  const rows: CsvOfferRow[] = [];
  if (!authorized.has(sourceType)) return { rows, errors: [{ line: 1, field: "sourceType", message: "A origem não é autorizada para catálogo comercial." }], accepted: false, sourceType };
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { rows, errors: [{ line: 1, field: "csv", message: "O arquivo está vazio." }], accepted: false, sourceType };
  const firstRow = splitLine(lines[0]);
  if (!firstRow) return { rows, errors: [{ line: 1, field: "csv", message: "Cabeçalho CSV malformado." }], accepted: false, sourceType };
  const headers = firstRow.map((header) => header.toLowerCase());
  const required = ["supplier_sku", "product_name", "base_unit", "pack_quantity", "pack_unit", "base_price_minor", "min_quantity", "regions"];
  for (const field of required) if (!headers.includes(field)) errors.push({ line: 1, field, message: "Coluna obrigatória ausente." });
  if (errors.length) return { rows, errors, accepted: false, sourceType };
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  lines.slice(1).forEach((line, offset) => {
    const lineNumber = offset + 2;
    const values = splitLine(line);
    if (!values || values.length !== headers.length) {
      errors.push({ line: lineNumber, field: "csv", message: "Linha CSV malformada ou com quantidade incorreta de colunas." });
      return;
    }
    const value = (field: string) => values[index[field]] ?? "";
    const row = { line: lineNumber, supplierSku: value("supplier_sku"), productName: value("product_name"), baseUnit: value("base_unit") as CsvOfferRow["baseUnit"], packQuantity: Number(value("pack_quantity")), packUnit: value("pack_unit"), basePriceMinor: Number(value("base_price_minor")), minQuantity: Number(value("min_quantity")), regions: value("regions").split("|").map((region) => region.trim()).filter(Boolean), sourceType };
    for (const [field, valid, message] of [
      ["supplier_sku", row.supplierSku.length > 0 && row.supplierSku.length <= 120, "SKU obrigatório, até 120 caracteres."],
      ["product_name", row.productName.length > 0 && row.productName.length <= 250, "Nome obrigatório, até 250 caracteres."],
      ["base_unit", units.has(row.baseUnit), "Unidade deve ser un, kg ou l."],
      ["pack_unit", row.packUnit.length > 0 && row.packUnit.length <= 32, "Unidade da embalagem obrigatória."],
      ["pack_quantity", Number.isFinite(row.packQuantity) && row.packQuantity > 0 && row.packQuantity <= Number.MAX_SAFE_INTEGER, "Quantidade da embalagem deve ser positiva e segura."],
      ["base_price_minor", Number.isSafeInteger(row.basePriceMinor) && row.basePriceMinor >= 0, "Preço deve ser inteiro e seguro em centavos."],
      ["min_quantity", Number.isSafeInteger(row.minQuantity) && row.minQuantity > 0, "Quantidade mínima deve ser positiva e segura."],
      ["regions", row.regions.length > 0 && row.regions.every((region) => /^[A-Z]{2}(?:-[A-Z0-9]{2,12})?$/.test(region)), "Região inválida. Use BR ou BR-SP."],
    ] as [string, boolean, string][]) if (!valid) errors.push({ line: lineNumber, field, message });
    if (row.supplierSku && rows.some((existing) => existing.supplierSku === row.supplierSku)) errors.push({ line: lineNumber, field: "supplier_sku", message: "SKU duplicado na prévia." });
    if (!errors.some((error) => error.line === lineNumber)) rows.push(row);
  });
  return { rows, errors, accepted: errors.length === 0 && rows.length > 0, sourceType };
}
