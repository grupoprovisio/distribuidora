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
  const loadedModule = { exports: {} };
  cache.set(absolute, loadedModule);
  const localRequire = (specifier) => specifier.startsWith("@/") ? load(specifier.slice(2)) : require(specifier);
  new Function("module", "exports", "require", js)(loadedModule, loadedModule.exports, localRequire);
  return loadedModule.exports;
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

test("CSV import rejects source spoofing, malformed quotes, unsafe amounts and outside regions", () => {
  const csv = load("lib/marketplace/csv-import");
  const header = "supplier_sku,product_name,base_unit,pack_quantity,pack_unit,base_price_minor,min_quantity,regions";
  const row = 'SKU-01,"Arroz, ""Premium""",kg,5,kg,2500,1,BR-SP';
  const valid = csv.previewAuthorizedCsv(header + "\n" + row);
  assert.equal(valid.accepted, true);
  assert.equal(valid.rows[0].productName, 'Arroz, "Premium"');
  assert.equal(valid.rows[0].sourceType, "SUPPLIER_CSV_AUTHORIZED");
  for (const unauthorized of ["MANUAL_AUTHORIZED", "PLATFORM_STOCK", "ATACADAO_EXTERNAL", "VTEX_SCRAPE"]) {
    assert.equal(csv.previewAuthorizedCsv(header + "\n" + row, unauthorized).accepted, false, unauthorized);
  }
  for (const invalidRow of [
    "SKU-01,Arroz,kg,5,kg,9007199254740992,1,BR-SP",
    "SKU-01,Arroz,kg,5,kg,2500,1,INVALID_REGION",
    'SKU-01,"Unclosed,kg,5,kg,2500,1,BR-SP',
    "SKU-01,Arroz,kg,5,kg,2500,1",
  ]) assert.equal(csv.previewAuthorizedCsv(header + "\n" + invalidRow).accepted, false, invalidRow);
  assert.equal(csv.previewAuthorizedCsv(header + "\n" + row + "\n" + row).accepted, false);
});

test("checkout idempotency includes region and enforces safe supplier subtotals", () => {
  order.clearSimulationStore();
  const firstRecord = record();
  firstRecord.offer.regions = ["BR-SP", "BR-RJ"];
  const one = { offerId: firstRecord.offer.id, quantity: 1, record: firstRecord };
  order.simulateCheckout("buyer-demo", [one], "test-region-001", "BR-SP", date);
  assert.throws(() => order.simulateCheckout("buyer-demo", [one], "test-region-001", "BR-RJ", date), /idempotente/);
  order.clearSimulationStore();
});

test("sandbox webhooks fail closed without actual signature verification", () => {
  const finance = load("lib/marketplace/financial-sandbox");
  const seen = new Set();
  const event = { provider: "sandbox", eventId: "event_1", type: "test", payload: {}, signature: "unverified-value" };
  assert.throws(() => finance.acceptWebhookEvent(event, seen), /não verificada/);
  assert.throws(() => finance.acceptWebhookEvent(event, seen, () => false), /não verificada/);
  assert.equal(seen.size, 0);
  const verify = (incoming) => incoming.provider === "sandbox" && incoming.signature === "unverified-value";
  assert.equal(finance.acceptWebhookEvent(event, seen, verify).accepted, true);
  assert.equal(finance.acceptWebhookEvent(event, seen, verify).duplicate, true);
  assert.equal(seen.size, 1);
  assert.throws(() => finance.acceptWebhookEvent({ ...event, eventId: "bad:id" }, seen, verify), /identificação/);
});

test("retired VTEX/Atacadao data sources cannot execute outbound commercial requests", () => {
  const legacy = load("lib/legacy-commercial-access");
  assert.throws(() => legacy.blockLegacyCommerce(), /desativado/);
  for (const path of ["lib/atacadao.ts", "lib/promos.ts", "lib/vtex-auth.ts"]) {
    const source = readFileSync(resolve(root, path), "utf8");
    assert.match(source, /blockLegacyCommerce\(\)/, `Missing legacy network gate in ${path}`);
  }
});

test("legacy commerce APIs return HTTP 410 without any external catalog access", async () => {
  const routes = [
    ["app/api/catalog/route", "GET"],
    ["app/api/catalog/prices/route", "GET"],
    ["app/api/lookup/route", "GET"],
    ["app/api/list/compare/route", "POST"],
    ["app/api/promos/route", "GET"],
    ["app/api/suggest/route", "GET"],
    ["app/api/terms/route", "GET"],
    ["app/api/filiais/nearest/route", "GET"],
    ["app/api/filiais/receipt-store/route", "GET"],
    ["app/api/auth/send/route", "POST"],
    ["app/api/auth/verify/route", "POST"],
    ["app/api/receipt/route", "POST"],
  ];
  for (const [path, method] of routes) {
    const route = load(path);
    const response = route[method]();
    assert.equal(response.status, 410, path);
    assert.equal(response.headers.get("cache-control"), "no-store", path);
    assert.equal((await response.json()).replacement, "/produtos", path);
  }
});

test("legacy screens redirect safely and browser history export remains local", () => {
  const screenRoutes = [
    ["app/(tabs)/buscar/page.tsx", "/produtos"],
    ["app/(tabs)/categorias/page.tsx", "/produtos"],
    ["app/(tabs)/promocoes/page.tsx", "/produtos"],
    ["app/(tabs)/ofertas/page.tsx", "/produtos"],
    ["app/scan/page.tsx", "/produtos"],
    ["app/produto/[id]/page.tsx", "/produtos"],
    ["app/checkout/page.tsx", "/produtos"],
    ["app/orcamento/page.tsx", "/app/comprador/cotacoes"],
    ["app/(tabs)/lista/montar/page.tsx", "/produtos"],
    ["app/(tabs)/lista/sugestoes/page.tsx", "/produtos"],
    ["app/(tabs)/conta/page.tsx", "/legado"],
    ["app/(tabs)/conta/configuracoes/page.tsx", "/legado"],
    ["app/(tabs)/conta/compras/page.tsx", "/legado"],
    ["app/(tabs)/conta/compras/[id]/page.tsx", "/legado"],
    ["app/(tabs)/lista/page.tsx", "/legado"],
    ["app/(tabs)/favoritos/page.tsx", "/legado"],
    ["app/admin/page.tsx", "/admin/marketplace"],
  ];
  for (const [path, destination] of screenRoutes) {
    const source = readFileSync(resolve(root, path), "utf8");
    assert.ok(source.includes(`redirect("${destination}")`), path);
    assert.doesNotMatch(source, /@\\/lib\\/atacadao|@\\/lib\\/vtex-auth/, path);
  }
  const legacyExport = readFileSync(resolve(root, "app/legado/page.tsx"), "utf8");
  assert.match(legacyExport, /window\\.localStorage\\.getItem/);
  assert.match(legacyExport, /URL\\.createObjectURL/);
  assert.doesNotMatch(legacyExport, /fetch\\s*\\(|navigator\\.sendBeacon|XMLHttpRequest/);
});
