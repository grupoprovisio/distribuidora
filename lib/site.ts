// Dados do site usados nos metadados (SEO), no sitemap, no robots e no manifest.

/** Endereço público do site. Defina `NEXT_PUBLIC_SITE_URL` ao publicar (ex.: https://meu-site.com.br). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "Atacadão Best Price";

export const SITE_TITLE = "Atacadão Best Price · Comparador de preços de mercado e supermercado";

export const SITE_DESCRIPTION =
  "Compare os preços do mercado no Atacadão: preço de atacado por filial, promoções, lista de compras inteligente, scanner de código de barras e análise da nota fiscal (NFC-e).";

export const SITE_KEYWORDS = [
  "comparador de preços",
  "comparador de preços de mercado",
  "preços de supermercado",
  "lista de compras de mercado",
  "lista de compras inteligente",
  "compra do mês",
  "Atacadão",
  "preço de atacado",
  "promoções Atacadão",
  "ofertas de mercado",
  "scanner de código de barras",
  "nota fiscal NFC-e",
  "economizar no supermercado",
];

export const AUTHOR = { name: "Distribuidora", url: "https://github.com/bvdistribuidoradesuprimentos-byte/distribuidora" } as const;
