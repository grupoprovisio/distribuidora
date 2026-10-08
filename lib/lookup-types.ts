// Contrato entre a rota /api/lookup (servidor) e a interface (navegador).

export type Tier = { minQty: number; price: number };

export type LookupProduct = {
  ean: string;
  skuId: string;
  name: string;
  brand: string;
  /** Ex.: ["Mercearia", "Grãos", "Arroz branco"] */
  categoryPath: string[];
  image?: string;
  /** Primeiro parágrafo da descrição, em texto puro. */
  description?: string;
  /** Página do produto no site da Distribuidora. */
  url?: string;
  size?: { unit: "kg" | "l"; base: number; label: string };
  badges: string[];
};

/** Preço do produto na filial escolhida, para a quantidade escolhida. */
export type Offer = {
  available: boolean;
  /** Preço unitário na quantidade pedida (já com degrau de atacado, se atingido). */
  atQty?: number;
  total?: number;
  /** Preço unitário a 1 unidade e degraus de atacado (quando a filial os informa). */
  unit?: number;
  tiers: Tier[];
  /** R$ por kg/L na quantidade pedida. */
  perBase?: number;
};

export type SimilarItem = {
  /** SKU da Distribuidora (abre a página do produto). */
  skuId: string;
  ean: string;
  name: string;
  brand: string;
  image?: string;
  sizeLabel?: string;
  atQty: number;
  total: number;
  perBase?: number;
  /** Diferença por unidade em relação ao produto lido, na mesma quantidade (positivo = mais caro). */
  deltaAbs?: number;
  deltaPct?: number;
};

export type FilialOffer = {
  seller: string;
  available: boolean;
  atQty?: number;
  total?: number;
  /** Diferença por unidade em relação à filial escolhida (positivo = mais caro). */
  deltaAbs?: number;
  deltaPct?: number;
};

export type LookupOk = {
  ok: true;
  seller: string;
  qty: number;
  product: LookupProduct;
  offer: Offer;
  /** Marcas diferentes, mesma categoria e mesma embalagem, do mais barato ao mais caro. */
  similar: SimilarItem[];
  /** Quantos concorrentes de mesma embalagem estão disponíveis na filial. */
  similarTotal: number;
  filiais?: FilialOffer[];
};

export type LookupFail = { ok: false; reason: "not_found" | "invalid" | "error" };

export type LookupResult = LookupOk | LookupFail;

/** Item da lista enviado para comparação: SKU da Distribuidora e a quantidade que a pessoa vai levar. */
export type ListCompareItem = { id: string; qty: number };

export type ListSellerResult = {
  seller: string;
  /** Soma (preço unitário na quantidade × quantidade) só dos itens disponíveis na filial. */
  total: number;
  /** Quantos itens da lista a filial não vende ou está sem estoque. */
  missing: number;
  /** Preço unitário na quantidade da lista, por SKU (null = indisponível nessa filial). */
  prices: Record<string, number | null>;
};

export type ListCompareResult =
  | {
      ok: true;
      /** Filial escolhida primeiro, depois as demais na ordem pedida. */
      sellers: ListSellerResult[];
      /**
       * Preço "sem desconto" de cada item na filial escolhida: o maior entre o preço a 1 unidade e o preço de tabela.
       * Quando é maior que o preço na quantidade da lista, o item tem desconto (null = indisponível).
       */
      old: Record<string, number | null>;
      /** Departamento de cada SKU ("Limpeza", "Mercearia"...), para agrupar a lista em seções. */
      categories: Record<string, string>;
    }
  | { ok: false; reason: "invalid" | "error" };

/** Filial (loja) como aparece nas configurações. */
export type FilialInfo = {
  /** Código do seller na VTEX, ex.: atacadaobr60. */
  seller: string;
  name: string;
  neighborhood?: string;
  city: string;
  uf: string;
  /** Distância até o usuário, em km. */
  km?: number;
};
