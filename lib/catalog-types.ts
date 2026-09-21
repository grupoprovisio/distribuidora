// Contrato entre /api/catalog (servidor) e as telas de catálogo (navegador).

/** Produto do catálogo real, já com o preço da filial escolhida. */
export type CatalogProduct = {
  /** SKU do Atacadão: chave da lista, dos favoritos e da página do produto. */
  id: string;
  name: string;
  brand: string;
  image?: string;
  /** Preço unitário a 1 unidade na filial. */
  unit: number;
  /** Melhor degrau de atacado (menor preço unitário), quando existe. */
  tier?: { qty: number; price: number };
  /** Departamento ("Mercearia", "Limpeza"...), usado para agrupar a lista de compras. */
  dept?: string;
  /** Todos os degraus de atacado (quantidade mínima -> preço unitário), do menor para o maior. */
  tiers?: { qty: number; price: number }[];
  /** Coleções da loja a que o produto pertence (ex.: "Ofertas Arrasadoras"), como a API informa. */
  clusters?: { id: string; name: string }[];
  /** Caminho de categorias do departamento até a categoria do produto. */
  path?: { slug: string; name: string }[];
};

export type FacetValue = { label: string; slug: string; count: number; selected: boolean };

export type CatalogFacets = {
  /** Subcategorias do recorte atual (ou irmãs, quando já está no nível mais fundo). */
  categories: FacetValue[];
  brands: FacetValue[];
};

export type CatalogResponse = {
  ok: true;
  products: CatalogProduct[];
  /** Total de resultados na filial (para "carregar mais"). */
  total: number;
  /** Cursor da próxima página (`after`): conta os itens varridos, inclusive os descartados por falta de preço. */
  next: number;
  facets?: CatalogFacets;
};

export type CatalogFail = { ok: false; reason: "invalid" | "error" };

export const CATALOG_SORTS = ["score_desc", "orders_desc", "price_asc", "price_desc", "name_asc"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
