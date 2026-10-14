import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
function load(sourcePath) {
  const absolute = resolve(root, sourcePath.endsWith(".ts") ? sourcePath : sourcePath + ".ts");
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = readFileSync(absolute, "utf8");
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (specifier) => specifier.startsWith("@/") ? load(specifier.slice(2)) : require(specifier);
  new Function("module", "exports", "require", js)(module, module.exports, localRequire);
  return module.exports;
}

const catalog = load("lib/marketplace/catalog");
const order = load("lib/marketplace/order-simulation");
const clone = (value) => structuredClone(value);
const record = () => clone(catalog.demoAuthorizedCatalog[0]);
const date = new Date("2026-10-14T12:00:00.000Z");

test("provenance and linked supplier/product/offer relationships fail closed", () => {
  const good = record();
  assert.equal(catalog.isCatalogRecordSellable(good, date), true);
  for (const sourceType of ["ATACADAO_EXTERNAL", "VTEX_SCRAPE", "UNVERIFIED_EXTERNAL", "unknown"]) {
    const bad = record(); bad.offer.sourceType = sourceType;
    assert.equal(catalog.isCatalogRecordSellable(bad, date), false, sourceType);
  }
  for (const field of ["supplierOrgId", "supplierProductId"]) {
    const bad = record(); bad.offer[field] = "another-organization";
    assert.equal(catalog.isCatalogRecordSellable(bad, date), false, field);
  }
  const badProduct = record(); badProduct.supplierProduct.productId = "different";
  assert.equal(catalog.isCatalogRecordSellable(badProduct, date), false);
  const badStatus = record(); badStatus.supplierProduct.status = "pending";
  assert.equal(catalog.isCatalogRecordSellable(badStatus, date), false);
  const badSeller = record(); badSeller.organization.approved = false;
  assert.equal(catalog.isCatalogRecordSellable(badSeller, date), false);
  const badDate = record(); badDate.offer.validFrom = "not-a-date";
  assert.equal(catalog.isCatalogRecordSellable(badDate, date), false);
  const badMoney = record(); badMoney.offer.basePriceMinor = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(catalog.isCatalogRecordSellable(badMoney, date), false);
  const badTiers = record(); badTiers.offer.tiers = [{ minQuantity: 0, unitPriceMinor: -1 }];
  assert.equal(catalog.isCatalogRecordSellable(badTiers, date), false);
});

test("regions are required, exact or explicit country-level authorization", async () => {
  assert.equal(catalog.isOfferEligibleForRegion(record().offer, "BR-SP"), true);
  assert.equal(catalog.isOfferEligibleForRegion(record().offer, "US-CA"), false);
  assert.equal((await catalog.demoRepository.search("arroz", "BR-SP")).length, 1);
  assert.equal((await catalog.demoRepository.search("arroz", "US-CA")).length, 0);
  assert.equal((await catalog.demoRepository.search("arroz")).length, 0);
  assert.equal(await catalog.demoRepository.getSellableOffer("offer-arroz-demo", date, "US-CA"), null);
  assert.equal((await catalog.demoRepository.getSellableOffer("offer-arroz-demo", date, "BR-SP")).offer.id, "offer-arroz-demo");
});

test("simulation validates foreign keys, price, quantity and conflicting idempotency keys", () => {
  order.clearSimulationStore();
  const line = { offerId: "offer-arroz-demo", quantity: 10, record: record() };
  const first = order.simulateCheckout("buyer-demo", [line], "test-key-0001", "BR-SP", date);
  assert.equal(first.grandTotalMinor, 22900);
  assert.equal(first.supplierOrders.length, 1);
  assert.strictEqual(order.simulateCheckout("buyer-demo", [line], "test-key-0001", "BR-SP", date), first);
  assert.throws(() => order.simulateCheckout("buyer-demo", [{ ...line, quantity: 9 }], "test-key-0001", "BR-SP", date), /idempotente/);
  assert.throws(() => order.simulateCheckout("buyer-demo", [line, line], "test-key-0002", "BR-SP", date), /duplicada/);
  assert.throws(() => order.simulateCheckout("buyer-demo", [{ ...line, quantity: 0 }], "test-key-0003", "BR-SP", date), /inválida/);
  assert.throws(() => order.simulateCheckout("buyer-demo", [line], "test-key-0004", "US-CA", date), /inválida/);
  const forged = record(); forged.supplierProduct.supplierOrgId = "other";
  assert.throws(() => order.simulateCheckout("buyer-demo", [{ ...line, record: forged }], "test-key-0005", "BR-SP", date), /inválida/);
  order.clearSimulationStore();
});

test("demo endpoints never accept production traffic even with accidental flags enabled", async () => {
  const old = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.MARKETPLACE_DEMO_API_ENABLED = "true";
    process.env.MARKETPLACE_CATALOG_ENABLED = "true";
    process.env.MARKETPLACE_CHECKOUT_SIMULATION = "true";
    cache.clear();
    const access = load("app/api/marketplace/access/route");
    const importer = load("app/api/marketplace/catalog/import/route");
    const checkout = load("app/api/marketplace/checkout/simulate/route");
    const transitions = load("app/api/marketplace/supplier-orders/[id]/transition/route");
    const catalogRoute = load("app/api/marketplace/catalog/route");
    assert.equal((await access.GET()).status, 404);
    assert.equal((await importer.POST(new Request("http://localhost/api/marketplace/catalog/import", {method:"POST", body:"{}"}))).status, 404);
    assert.equal((await checkout.POST(new Request("http://localhost/api/marketplace/checkout/simulate", {method:"POST", body:"{}"}))).status, 404);
    assert.equal((await transitions.POST(new Request("http://localhost/api/marketplace/supplier-orders/sim-supplier-1/transition", {method:"POST", body:"{}"}), { params: Promise.resolve({id:"sim-supplier-1"}) })).status, 404);
    const catalogResponse = await catalogRoute.GET(new Request("http://localhost/api/marketplace/catalog?region=BR-SP"));
    assert.deepEqual((await catalogResponse.json()).products, []);
  } finally {
    process.env = old;
    cache.clear();
  }
});

test("local demo checkout rejects buyer impersonation and external regions", async () => {
  const old = { ...process.env };
  try {
    process.env.NODE_ENV = "development";
    process.env.MARKETPLACE_DEMO_API_ENABLED = "true";
    process.env.MARKETPLACE_CHECKOUT_SIMULATION = "true";
    cache.clear();
    const checkout = load("app/api/marketplace/checkout/simulate/route");
    const request = (body) => new Request("http://localhost/api/marketplace/checkout/simulate", { method: "POST", body: JSON.stringify(body) });
    const base = { buyerOrgId: "org-buyer-demo", buyerRegion: "BR-SP", idempotencyKey: "unique-test-123", items: [{offerId:"offer-arroz-demo",quantity:1}] };
    assert.equal((await checkout.POST(request({ ...base, buyerOrgId:"other-org" }))).status, 403);
    assert.equal((await checkout.POST(request({ ...base, buyerRegion:"US-CA" }))).status, 422);
    const success = await checkout.POST(request(base));
    assert.equal(success.status, 200);
    const json = await success.json();
    assert.equal(json.simulated, true);
    assert.equal(json.order.grandTotalMinor, 2490);
  } finally {
    process.env = old;
    cache.clear();
  }
});
