import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  assert.match(home,/href(?::\s*|=)"\/compradores"/);
  assert.match(home,/href(?::\s*|=)"\/fornecedores"/);
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

test("Rotas de comparacao externa nao executam as integracoes legadas", () => {
  for (const pathname of [
    "app/(tabs)/buscar/page.tsx", "app/(tabs)/categorias/page.tsx",
    "app/(tabs)/ofertas/page.tsx", "app/(tabs)/promocoes/page.tsx",
    "app/(tabs)/lista/page.tsx", "app/produto/[id]/page.tsx",
    "app/scan/page.tsx", "app/checkout/page.tsx"
  ]) {
    assert.ok(file(pathname).includes('redirect("/produtos")'), pathname);
  }
  const handlers = [
    "app/api/catalog/route.ts", "app/api/catalog/prices/route.ts",
    "app/api/promos/route.ts", "app/api/lookup/route.ts",
    "app/api/list/compare/route.ts", "app/api/suggest/route.ts",
    "app/api/filiais/nearest/route.ts", "app/api/receipt/route.ts",
    "app/api/auth/send/route.ts", "app/api/auth/verify/route.ts"
  ];
  for (const pathname of handlers) {
    assert.ok(file(pathname).includes("legacyComparatorIsDisabled()"),pathname);
    assert.ok(file(pathname).includes("legacyComparatorBlockedResponse()"),pathname);
  }
  assert.ok(file("lib/marketplace/legacy-block.ts").includes("status: 410"));
});

test("Páginas premium preservam textos, imagens e cards principais sem consulta a preços de terceiros", () => {
  const home = file("app/(tabs)/page.tsx");
  const buyer = file("app/compradores/page.tsx");
  const supplier = file("app/fornecedores/page.tsx");
  const showcase = file("components/home-marketplace-showcase.tsx");
  assert.match(home, /Tudo para o seu negócio continuar vendendo/);
  assert.match(showcase, /Uma rotina de compras mais simples para o seu negócio/);
  assert.match(buyer, /Sua cozinha merece uma compra/);
  assert.match(supplier, /Seu produto merece chegar a/);
  assert.match(home, /<HomeMarketplaceShowcase\s*\/>/);
  assert.match(buyer, /<MarketplaceLeadForm role="comprador"/);
  assert.match(supplier, /<MarketplaceLeadForm role="fornecedor"/);
  assert.doesNotMatch(home + showcase, /useCatalog\(|getDepartments\(|CatalogSection|PromoStrip/);
  for (const asset of ["public/images/fornecedores/chef-hero.png", "public/images/fornecedores/parceria-cozinha.png", "public/images/provisio/chef-retrato.png"]) {
    assert.ok(existsSync(path.join(root,asset)), `Imagem ausente: ${asset}`);
  }
});


/**
 * Contrato visual da Provisio aceito em 17/10/2026.
 * Atualizar estas impressões digitais SOMENTE quando o proprietário aprovar
 * uma alteração visual explícita nas landings públicas ou suas fotografias.
 * O hash é o SHA1 de blob Git, calculado sobre os bytes exatos do arquivo.
 */
test("Home, Sou comprador, Sou fornecedor, cards e fotos mantêm a identidade visual aprovada", () => {
  const approved = {
    "app/(tabs)/page.tsx": "7eb4cfbedff14c823789902f8dd86e4cd1a5fb43",
    "app/compradores/page.tsx": "edbb5b6e225d8fbb3d47c6506cb8f9e2321a36b7",
    "app/fornecedores/page.tsx": "345cf55361d222d3a8842f769665373c00dde019",
    "components/home-benefits.tsx": "b48c2e151075af25abea17fd570333bc6f826824",
    "components/home-marketplace-showcase.tsx": "fbdd63872fe17991822ebe927d0130582683f343",
    "components/marketplace-lead-form.tsx": "31699aad3b6b693c16342599a9a3e642f29aa0ea",
    "public/images/fornecedores/chef-hero.png": "b62de160e5692338b4ad3b860cb373daf41e2c8f",
    "public/images/fornecedores/operacao-abastecimento.png": "295704f2704cd1cbf85dea349db92cee84497ade",
    "public/images/fornecedores/parceria-cozinha.png": "66bdcaf522eedd5737b1ec15120faea0b9011006",
    "public/images/provisio/chef-retrato.png": "d31bdad0dc6dcd0f59ece340f6e52342f1867ef7",
  };
  for (const [filename,expectedSha] of Object.entries(approved)) {
    const bytes = readFileSync(path.join(root,filename));
    const actual = createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
    assert.equal(actual,expectedSha,"A identidade aprovada mudou sem autorização: "+filename);
  }
});


test("Catálogo privado filtra a UF antes da paginação e detecta a próxima página", () => {
  const source=file("lib/marketplace/buyer-catalog.ts");
  assert.match(source,/offer_regions!inner\(region_code\)/);
  assert.match(source,/\.in\("offer_regions\.region_code",regionCodes\)/);
  assert.match(source,/\.range\(offset,offset\+PAGE_SIZE\)/);
  assert.match(source,/const hasMore=\(query\.data\?\.length\?\?0\)>PAGE_SIZE/);
  assert.doesNotMatch(source,/hasMore:offers\.length>PAGE_SIZE/);
  assert.match(source,/page<1000/);
  assert.match(source,/buyer_delivery_regions/);
  assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|sb_secret_[A-Za-z0-9]/);
});

test("Menu lateral exibe Login e ADM sem aviso demonstrativo no rodape", () => {
  const nav = file("components/floating-nav.tsx");
  assert.match(nav, /\["\/entrar", "Login"\]/);
  assert.match(nav, /\["\/admin\/marketplace", "ADM"\]/);
  assert.doesNotMatch(nav, /Plataforma comercial em desenvolvimento\. Nenhuma transa[cç][aã]o real est[aá] habilitada\./);
});

test("Formularios de interesse preservados sem CTA duplicado de login e sem aviso adicional", () => {
  for (const [pathname, role] of [["app/compradores/page.tsx", "comprador"], ["app/fornecedores/page.tsx", "fornecedor"]]) {
    const page = file(pathname);
    assert.match(page, new RegExp('<MarketplaceLeadForm role="' + role + '"'));
    assert.doesNotMatch(page, /Ja possui uma conta Provisio\?|Já possui uma conta Provisio\?|Entrar na minha conta/);
    assert.doesNotMatch(page, /Esta etapa é uma demonstração local\. O formulário não envia dados nem habilita cadastros ou vendas reais\.|Esta é uma demonstração\. O formulário não envia dados; pedidos e cobranças reais ainda não estão habilitados\./);
  }
});
