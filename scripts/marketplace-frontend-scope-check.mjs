import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const file = (name) => readFileSync(path.join(root,name), "utf8");
const protectedSources = [
  "app/(tabs)/page.tsx",
  "components/floating-nav.tsx",
  "components/site-footer.tsx",
  "lib/nav.ts",
  "lib/site.ts",
  "app/sitemap.ts",
  "app/como-funciona/page.tsx",
  "app/entrar/page.tsx",
  "app/app/page.tsx",
  "components/marketplace-role-landing.tsx",
  "components/marketplace-portal.tsx",
  "app/admin/marketplace/page.tsx",
  "lib/marketplace/session.ts",
];

test("Nenhuma interface ou rota de vendedor publico permanece ativa", () => {
  for (const f of protectedSources) {
    const source=file(f);
    assert.doesNotMatch(source,/\/vendedores\b|\/app\/vendedor\b|Sou vendedor|representantes comerciais|carteiras comerciais/i,`Referencia obsoleta: ${f}`);
  }
  for (const f of ["app/vendedores","app/app/vendedor"]) {
    assert.equal(existsSync(path.join(root,f)),false,`Rota nao pode existir: ${f}`);
  }
});

test("A homepage e a navegacao contêm apenas comprador e fornecedor", () => {
  const home=file("app/(tabs)/page.tsx"),nav=file("lib/nav.ts");
  assert.match(home,/href: "\/compradores"/);
  assert.match(home,/href: "\/fornecedores"/);
  assert.match(nav,/href: "\/compradores"/);
  assert.match(nav,/href: "\/fornecedores"/);
});

test("Nao ha confirmacao enganosa de formulario publico", () => {
  const lead=file("components/marketplace-lead-form.tsx");
  assert.match(lead,/mailto:/);
  assert.match(lead,/nenhum dado|nada foi enviado automaticamente/i);
  assert.doesNotMatch(lead,/fetch\s*\(|setSent\(/);
});

test("Portais mantêm autorizacao do servidor e isolamento em consultas", () => {
  const buyer=file("app/app/comprador/layout.tsx");
  const supplier=file("app/app/fornecedor/layout.tsx");
  assert.match(buyer,/requireMarketplacePortal\("comprador"\)/);
  assert.match(supplier,/requireMarketplacePortal\("fornecedor"\)/);
  const catalog=file("app/app/fornecedor/catalogo/page.tsx");
  assert.match(catalog,/createClient\(\)/);
  assert.doesNotMatch(catalog,/service_role|sb_secret_/);
  assert.match(file("lib/marketplace/my-organizations.ts"),/requireMarketplacePortal\(portal\)/);
});

test("Ofertas de terceiros nao sao convertidas em catalogo comercial", () => {
  const catalog=file("lib/marketplace/catalog.ts");
  assert.match(catalog,/AUTHORIZED_SOURCES/);
  assert.match(catalog,/ATACADAO_EXTERNAL/);
  const sources=catalog.match(/const AUTHORIZED_SOURCES = new Set<OfferSourceType>\(\[([^\]]+)\]/);
  assert.ok(sources);
  assert.doesNotMatch(sources[1],/ATACADAO_EXTERNAL|VTEX_SCRAPE|UNVERIFIED_EXTERNAL/);
});

test("O roadmap prioriza os dois perfis", () => {
  const plan=file("PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md");
  assert.match(plan,/ATUALIZAÇÃO DE ESCOPO/);
  assert.match(plan,/Sou comprador/);
  assert.match(plan,/Sou fornecedor/);
});
