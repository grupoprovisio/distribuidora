import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const pathExists = (path) => existsSync(join(root, path));

test("public approved pages stay protected by repository scope test", () => {
  const spec = read("scripts/marketplace-frontend-scope-check.mjs");
  for (const file of ["app/(tabs)/page.tsx", "app/compradores/page.tsx", "app/fornecedores/page.tsx", "public/images/fornecedores/chef-hero.png"]) {
    assert.ok(spec.includes(file), `Public approved asset is not protected: ${file}`);
    assert.ok(pathExists(file), `Missing public approved asset: ${file}`);
  }
  assert.match(spec, /createHash\("sha1"\)/);
});

test("exactly buyer and supplier are exposed in primary navigation", () => {
  const nav = read("lib/nav.ts");
  const sitemap = read("app/sitemap.ts");
  for (const role of ["/compradores", "/fornecedores"]) {
    assert.ok(nav.includes(role), `Navigation missing ${role}`);
    assert.ok(sitemap.includes(role), `Sitemap missing ${role}`);
  }
  for (const code of [nav,sitemap]) assert.doesNotMatch(code,/\/vendedores|\/app\/vendedor|\/cadastro\/vendedor/i);
  assert.equal(pathExists("app/vendedores"), false);
  assert.equal(pathExists("app/app/vendedor"), false);
});

test("commercial transactional modules disclose disabled state until enabled", () => {
  const portal = read("components/marketplace-portal.tsx");
  assert.match(portal, /Pedidos e transações ainda não estão habilitados/);
  assert.match(portal, /portal === "fornecedor"/);
});

test("commercial catalog uses authorized sources and regional entitlement", () => {
  const catalog = read("lib/marketplace/buyer-catalog.ts");
  assert.match(catalog, /buyer_delivery_regions/);
  assert.match(catalog, /MANUAL_AUTHORIZED/);
  assert.match(catalog, /SUPPLIER_CSV_AUTHORIZED/);
  assert.match(catalog, /PLATFORM_STOCK/);
  assert.doesNotMatch(catalog, /service_role|SUPABASE_SECRET_KEY/);
});

test("administration relies on authenticated RLS queries rather than privileged browser key", () => {
  const admin = read("app/admin/marketplace/page.tsx");
  const session = read("lib/marketplace/session.ts");
  assert.match(admin, /createClient\(\)/);
  assert.match(session, /currentLevel !== "aal2"/);
  assert.doesNotMatch(admin, /service_role|SUPABASE_SECRET_KEY/);
});
