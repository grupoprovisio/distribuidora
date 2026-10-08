import type { OfferSourceType } from "@/lib/marketplace/catalog";

export type CsvOfferRow = { line: number; supplierSku: string; productName: string; baseUnit: "un" | "kg" | "l"; packQuantity: number; packUnit: string; basePriceMinor: number; minQuantity: number; regions: string[]; sourceType: OfferSourceType };
export type CsvImportError = { line: number; field: string; message: string };
export type CsvImportPreview = { rows: CsvOfferRow[]; errors: CsvImportError[]; accepted: boolean; sourceType: OfferSourceType };

const authorized = new Set<OfferSourceType>(["SUPPLIER_CSV_AUTHORIZED", "MANUAL_AUTHORIZED", "PLATFORM_STOCK"]);
const units = new Set(["un", "kg", "l"]);

function splitLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(current.trim()); current = ""; }
    else current += char;
  }
  values.push(current.trim());
  return values;
}

export function previewAuthorizedCsv(csv: string, sourceType: OfferSourceType = "SUPPLIER_CSV_AUTHORIZED"): CsvImportPreview {
  const errors: CsvImportError[] = [];
  const rows: CsvOfferRow[] = [];
  if (!authorized.has(sourceType)) return { rows, errors: [{ line: 1, field: "sourceType", message: "A origem não é autorizada para catálogo comercial." }], accepted: false, sourceType };
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { rows, errors: [{ line: 1, field: "csv", message: "O arquivo está vazio." }], accepted: false, sourceType };
  const headers = splitLine(lines[0]).map((header) => header.toLowerCase());
  const required = ["supplier_sku", "product_name", "base_unit", "pack_quantity", "pack_unit", "base_price_minor", "min_quantity", "regions"];
  for (const field of required) if (!headers.includes(field)) errors.push({ line: 1, field, message: "Coluna obrigatória ausente." });
  if (errors.length) return { rows, errors, accepted: false, sourceType };
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  lines.slice(1).forEach((line, offset) => {
    const lineNumber = offset + 2;
    const values = splitLine(line);
    const value = (field: string) => values[index[field]] ?? "";
    const row = { line: lineNumber, supplierSku: value("supplier_sku"), productName: value("product_name"), baseUnit: value("base_unit") as CsvOfferRow["baseUnit"], packQuantity: Number(value("pack_quantity")), packUnit: value("pack_unit"), basePriceMinor: Number(value("base_price_minor")), minQuantity: Number(value("min_quantity")), regions: value("regions").split("|").map((region) => region.trim()).filter(Boolean), sourceType };
    for (const [field, valid, message] of [
      ["supplier_sku", row.supplierSku.length > 0, "SKU obrigatório."],
      ["product_name", row.productName.length > 0, "Nome obrigatório."],
      ["base_unit", units.has(row.baseUnit), "Unidade deve ser un, kg ou l."],
      ["pack_quantity", Number.isFinite(row.packQuantity) && row.packQuantity > 0, "Quantidade da embalagem deve ser positiva."],
      ["base_price_minor", Number.isInteger(row.basePriceMinor) && row.basePriceMinor >= 0, "Preço deve ser inteiro em centavos."],
      ["min_quantity", Number.isInteger(row.minQuantity) && row.minQuantity > 0, "Quantidade mínima deve ser positiva."],
      ["regions", row.regions.length > 0, "Informe ao menos uma região."],
    ] as [string, boolean, string][]) if (!valid) errors.push({ line: lineNumber, field, message });
    if (row.supplierSku && rows.some((existing) => existing.supplierSku === row.supplierSku)) errors.push({ line: lineNumber, field: "supplier_sku", message: "SKU duplicado na prévia." });
    if (!errors.some((error) => error.line === lineNumber)) rows.push(row);
  });
  return { rows, errors, accepted: errors.length === 0 && rows.length > 0, sourceType };
}
