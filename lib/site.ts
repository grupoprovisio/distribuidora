// Dados do site usados nos metadados (SEO), no sitemap, no robots e no manifest.

/** Endereço público do site. Defina `NEXT_PUBLIC_SITE_URL` ao publicar (ex.: https://meu-site.com.br). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "Distribuidora";

export const SITE_TITLE = "Distribuidora · Catálogo e pedidos para o seu negócio";

export const SITE_DESCRIPTION =
  "Encontre produtos para abastecer seu negócio, aproveite condições por volume e monte seus pedidos com a Distribuidora.";

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

export const AUTHOR = { name: "Distribuidora", url: "https://github.com/bvdistribuidoradesuprimentos-byte/distribuidora" } as const;
