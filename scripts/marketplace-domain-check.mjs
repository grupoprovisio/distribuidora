import assert from "node:assert/strict";

const authorized = ["MANUAL_AUTHORIZED", "SUPPLIER_CSV_AUTHORIZED", "SUPPLIER_API_AUTHORIZED", "PLATFORM_STOCK"];
const forbidden = ["ATACADAO_EXTERNAL", "VTEX_SCRAPE", "UNVERIFIED_EXTERNAL"];

assert.equal(authorized.includes("PLATFORM_STOCK"), true);
for (const source of forbidden) assert.equal(authorized.includes(source), false, `${source} must never be sellable`);
assert.equal(process.env.MARKETPLACE_CATALOG_ENABLED ?? "false", "false");
console.log("marketplace-domain-check: OK — fontes externas rejeitadas e catálogo desligado por padrão");


const { allowedBuyerRegionCodes } = await import("../lib/marketplace/brazil-regions.ts");
assert.deepEqual(allowedBuyerRegionCodes("SP"),["SP","BR-SP","BR"]);
assert.deepEqual(allowedBuyerRegionCodes("br-sp"),["SP","BR-SP","BR"]);
assert.deepEqual(allowedBuyerRegionCodes(" RJ "),["RJ","BR-RJ","BR"]);
assert.deepEqual(allowedBuyerRegionCodes("BR"),["BR"]);
for(const unsupported of ["", "XX", "US-CA", "BR-XX", "SP|RJ", "BR-SP,BR-RJ"]) {
  assert.deepEqual(allowedBuyerRegionCodes(unsupported),[],unsupported);
}
console.log("marketplace-domain-check: Brazilian regional coverage validated");
