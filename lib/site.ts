// Dados do site usados nos metadados (SEO), no sitemap, no robots e no manifest.

/** Endereço público do site. Defina `NEXT_PUBLIC_SITE_URL` se o domínio de produção mudar. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://grupoprovisio.com").replace(/\/+$/, "");

export const SITE_NAME = "Distribuidora Provisio";

export const SITE_TITLE = "Distribuidora Provisio · Catálogo e pedidos para o seu negócio";

export const SITE_DESCRIPTION =
  "Encontre produtos para abastecer seu negócio, aproveite condições por volume e monte seus pedidos com a Distribuidora Provisio.";

export const SITE_KEYWORDS = [
  "distribuidora",
  "fornecedor para empresas",
  "abastecimento para negócios",
  "compras por volume",
  "catálogo para empresas",
  "pedidos de atacado",
  "Distribuidora",
  "preço por quantidade",
  "ofertas para empresas",
  "entrega regional",
];
