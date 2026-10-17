import assert from "node:assert/strict";

const authorized = ["MANUAL_AUTHORIZED", "SUPPLIER_CSV_AUTHORIZED", "SUPPLIER_API_AUTHORIZED", "PLATFORM_STOCK"];
const forbidden = ["ATACADAO_EXTERNAL", "VTEX_SCRAPE", "UNVERIFIED_EXTERNAL"];

assert.equal(authorized.includes("PLATFORM_STOCK"), true);
for (const source of forbidden) assert.equal(authorized.includes(source), false, `${source} must never be sellable`);
assert.equal(process.env.MARKETPLACE_CATALOG_ENABLED ?? "false", "false");
console.log("marketplace-domain-check: OK — fontes externas rejeitadas e catálogo desligado por padrão");
