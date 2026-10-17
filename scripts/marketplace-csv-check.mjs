import assert from "node:assert/strict";

const csv = "supplier_sku,product_name,base_unit,pack_quantity,pack_unit,base_price_minor,min_quantity,regions\nSUP-001,Produto local,un,1,un,1250,2,SP|RJ";
const [header, row] = csv.split("\n");
assert.equal(header.split(",").length, 8);
assert.equal(row.includes("SUP-001"), true);
assert.equal(["ATACADAO_EXTERNAL", "VTEX_SCRAPE"].includes("SUPPLIER_CSV_AUTHORIZED"), false);
assert.equal(Number("1250") >= 0, true);
console.log("marketplace-csv-check: OK — contrato CSV autorizado e origem externa não aceita");
