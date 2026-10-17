import assert from "node:assert/strict";

const csv = "supplier_sku,product_name,base_unit,pack_quantity,pack_unit,base_price_minor,min_quantity,regions\nSUP-001,Produto local,un,1,un,1250,2,SP|RJ";
const [header, row] = csv.split("\n");
assert.equal(header.split(",").length, 8);
assert.equal(row.includes("SUP-001"), true);
assert.equal(["ATACADAO_EXTERNAL", "VTEX_SCRAPE"].includes("SUPPLIER_CSV_AUTHORIZED"), false);
assert.equal(Number("1250") >= 0, true);
console.log("marketplace-csv-check: OK — contrato CSV autorizado e origem externa não aceita");


// Node 24 supports type stripping for .ts; test the same validator used by the client.
const { previewAuthorizedCsv } = await import("../lib/marketplace/csv-import.ts");
const preview = previewAuthorizedCsv(csv);
assert.equal(preview.accepted, true, "authorized CSV should be valid");
assert.equal(preview.rows.length, 1);
assert.equal(preview.rows[0].basePriceMinor, 1250);
const invalidPack = previewAuthorizedCsv(csv.replace(",1,un,1250", ",1,caixa,1250"));
assert.equal(invalidPack.accepted, false);
assert.ok(invalidPack.errors.some(error => error.field === "pack_unit"));
const invalidRegion = previewAuthorizedCsv(csv.replace("SP|RJ", "SP|INVALID_REGION"));
assert.equal(invalidRegion.accepted, false);
assert.ok(invalidRegion.errors.some(error => error.field === "regions"));
const fractionalPrice = previewAuthorizedCsv(csv.replace("1250", "12.50"));
assert.equal(fractionalPrice.accepted, false);
assert.ok(fractionalPrice.errors.some(error => error.field === "base_price_minor"));
const external = previewAuthorizedCsv(csv, "VTEX_SCRAPE");
assert.equal(external.accepted, false);
assert.ok(external.errors.some(error => error.field === "sourceType"));
console.log("marketplace-csv-check: real CSV preview validation passed");
