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
function load(path) {
  const file = resolve(root, path + ".ts");
  if (cache.has(file)) return cache.get(file).exports;
  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const localRequire = (specifier) =>
    specifier.startsWith("@/") ? load(specifier.slice(2)) : require(specifier);
  new Function("module", "exports", "require", js)(loadedModule, loadedModule.exports, localRequire);
  return loadedModule.exports;
}

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const UUID = "123e4567-e89b-42d3-a456-426614174000";
const OWN_ORG = "123e4567-e89b-42d3-a456-426614174001";
const FOREIGN_ORG = "123e4567-e89b-42d3-a456-426614174002";
const base = "http://localhost/api/marketplace/supabase";
const key = "sb_publishable_test_only";
const setEnabled = () => {
  process.env.MARKETPLACE_SUPABASE_API_ENABLED = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xprvdquocenfqvnokmmi.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
};
const gateway = load("lib/marketplace/supabase-gateway");
const me = load("app/api/marketplace/supabase/me/route");
const offers = load("app/api/marketplace/supabase/supplier-offers/route");

const authorized = (pathname) => new Request(`${base}${pathname}`, {
  headers: { Authorization: "Bearer example.jwt.token" },
});
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json" },
});

test.after(() => {
  process.env = originalEnv;
  globalThis.fetch = originalFetch;
});

test("gateway stays unavailable by default and never trusts other Supabase projects", async () => {
  process.env.MARKETPLACE_SUPABASE_API_ENABLED = "false";
  assert.equal((await me.GET(authorized("/me"))).status, 404);
  setEnabled();
  assert.equal((await me.GET(new Request(`${base}/me`))).status, 401);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ubwbnpckbwtllitonpjj.supabase.co";
  assert.equal((await me.GET(authorized("/me"))).status, 503);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://localhost";
  assert.equal(gateway.getMarketplaceSupabaseConfig(), null);
  assert.equal(gateway.validMarketplaceUuid("not-an-id"), false);
  assert.equal(gateway.validMarketplaceUuid(UUID), true);
});

test("invalid Supabase Auth JWT is rejected before any Data API read", async () => {
  setEnabled();
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    assert.match(String(input), /\/auth\/v1\/user$/);
    return json({ message: "invalid" }, 401);
  };
  const response = await me.GET(authorized("/me"));
  assert.equal(response.status, 401);
  assert.equal(calls, 1);
});

test("own profile and membership use verified bearer token, never service_role", async () => {
  setEnabled();
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    assert.equal(url.hostname, "xprvdquocenfqvnokmmi.supabase.co");
    assert.equal(init.headers.apikey, key);
    assert.equal(init.headers.Authorization, "Bearer example.jwt.token");
    assert.equal(init.cache, "no-store");
    if (url.pathname === "/auth/v1/user") return json({ id: UUID, email: "teste@provisio.invalid" });
    if (url.pathname === "/rest/v1/profiles") {
      assert.equal(url.searchParams.get("id"), `eq.${UUID}`);
      return json([{ id: UUID, display_name: "Teste", status: "active" }]);
    }
    if (url.pathname === "/rest/v1/organization_members") {
      assert.equal(url.searchParams.get("user_id"), `eq.${UUID}`);
      return json([{ organization_id: OWN_ORG, role: "SUPPLIER_ADMIN", status: "active" }]);
    }
    throw Error("Unsolicited network call: " + url.pathname);
  };
  const response = await me.GET(authorized("/me"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.user.id, UUID);
  assert.equal(data.memberships.length, 1);
  assert.equal(calls.length, 3);
});

test("supplier offers enforce uuid, scoped query, and empty cross-tenant result", async () => {
  setEnabled();
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls++;
    assert.equal(init.headers.apikey, key);
    if (url.pathname === "/auth/v1/user") return json({ id: UUID });
    assert.equal(url.pathname, "/rest/v1/offers");
    assert.equal(url.searchParams.get("supplier_org_id"), `eq.${FOREIGN_ORG}`);
    assert.equal(url.searchParams.get("limit"), "50");
    // Resultado vazio fornecido pela policy RLS: API nao deve inventar acesso.
    return json([]);
  };
  assert.equal((await offers.GET(authorized("/supplier-offers?organization_id=bad"))).status, 400);
  const response = await offers.GET(authorized(`/supplier-offers?organization_id=${FOREIGN_ORG}`));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).offers, []);
  assert.equal(calls, 2);
});

test("migrations keep RLS, no anonymous grants, and no external catalog provenance", () => {
  const one = readFileSync(resolve(root, "db/migrations/0001_marketplace_foundation.sql"), "utf8");
  const two = readFileSync(resolve(root, "db/migrations/0002_marketplace_catalog.sql"), "utf8");
  const three = readFileSync(resolve(root, "db/migrations/0003_marketplace_rls_readonly.sql"), "utf8");
  const four = readFileSync(resolve(root, "db/migrations/0004_marketplace_supplier_integrity.sql"), "utf8");
  assert.match(one, /references auth\.users\(id\)/);
  assert.match(one, /status text not null default 'pending'/);
  assert.match(one, /set search_path = ''/);
  assert.match(three, /m\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(three, /grant select on public\.profiles/);
  assert.doesNotMatch(three, /grant (insert|update|delete|all) on/i);
  assert.doesNotMatch(three, /grant select on[^;]*to anon/i);
  assert.doesNotMatch(two, /'ATACADAO_EXTERNAL'|'VTEX_SCRAPE'|'UNVERIFIED_EXTERNAL'/);
  for (const table of ["profiles","organizations","organization_members","products","supplier_products","offers","offer_price_tiers","offer_regions","inventory_positions"]) {
    assert.match(one + two, new RegExp(`alter table public\\.${table} force row level security;`));
  }
});
