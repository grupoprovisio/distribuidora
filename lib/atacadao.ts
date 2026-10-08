import "server-only";

import type { CatalogFacets, CatalogProduct, FacetValue } from "@/lib/catalog-types";
import type { FilialInfo, FilialOffer, ListCompareItem, ListCompareResult, ListSellerResult, LookupResult, Offer, SimilarItem, Tier } from "@/lib/lookup-types";
import { parseSize, perBase, sameSize } from "@/lib/size";

// Cliente das APIs públicas da Distribuidora (VTEX). Mapa completo em ATACADAO_API.md.
// Tudo roda no servidor: sem CORS, e o navegador só conhece as rotas do próprio app.

const STORE = "https://www.atacadao.com.br";
const IMG = "https://atacadaobr.vteximg.com.br";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type Cache = { revalidate: number } | "no-store";

export async function request(path: string, cache: Cache, init?: RequestInit) {
  return fetch(STORE + path, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json", ...init?.headers },
    signal: AbortSignal.timeout(12_000),
    ...(cache === "no-store" ? { cache: "no-store" as const } : { next: { revalidate: cache.revalidate } }),
  });
}

// ------------------------------------------------------------------ produto por EAN

type SkuByEan = {
  Id: number;
  ProductId: number;
  NameComplete: string;
  ComplementName?: string;
  BrandName: string;
  ImageUrl?: string;
  DetailUrl?: string;
  ProductDescription?: string;
  CategoriesFullPath?: string[];
  ProductCategories?: Record<string, string>;
  ProductClusterNames?: Record<string, string>;
};

async function fetchSkuByEan(ean: string): Promise<SkuByEan | null> {
  const res = await request(`/api/catalog_system/pub/sku/stockkeepingunitbyean/${ean}`, { revalidate: 3600 });
  if (res.status === 404) return null; // "Dados inconsistentes no cadastro de EAN": EAN desconhecido
  if (!res.ok) throw new Error(`sku ${res.status}`);
  return (await res.json()) as SkuByEan;
}

/** O leitor pode devolver UPC-A (12 dígitos) ou EAN-13 com zero à frente: tenta as variações. */
export function eanVariants(raw: string) {
  const v = new Set<string>([raw]);
  if (raw.length === 12) v.add("0" + raw);
  if (raw.length === 13 && raw.startsWith("0")) v.add(raw.slice(1));
  return [...v];
}

// ------------------------------------------------------------------ candidatos da categoria

type Candidate = { productId: string; skuId: string; name: string; complement: string; brand: string; ean: string; image?: string };

export type LegacyProduct = {
  productId: string;
  productName: string;
  brand: string;
  /** Caminhos de categoria do mais fundo ao departamento: ["/Mercearia/Grãos/Arroz branco/", "/Mercearia/Grãos/", "/Mercearia/"]. */
  categories?: string[];
  items?: {
    itemId: string;
    ean?: string;
    complementName?: string;
    measurementUnit?: string;
    unitMultiplier?: number;
    images?: { imageUrl?: string }[];
  }[];
};

/** Mais vendidos da categoria (2 páginas). Não depende da filial: a disponibilidade vem da simulação. */
async function fetchCandidates(categoryPath: string): Promise<Candidate[]> {
  const pages = await Promise.all(
    [0, 50].map(async (from) => {
      const res = await request(
        `/api/catalog_system/pub/products/search?fq=C:${categoryPath}&O=OrderByTopSaleDESC&_from=${from}&_to=${from + 49}`,
        { revalidate: 900 },
      );
      return res.ok ? ((await res.json()) as LegacyProduct[]) : [];
    }),
  );
  return pages.flat().flatMap((p) => {
    const item = p.items?.[0];
    return item?.ean
      ? [
          {
            productId: String(p.productId),
            skuId: String(item.itemId),
            name: p.productName,
            complement: item.complementName ?? "",
            brand: p.brand,
            ean: item.ean,
            image: sizedImage(item.images?.[0]?.imageUrl, 160),
          },
        ]
      : [];
  });
}

export function sizedImage(url: string | undefined, width: number) {
  const m = url?.match(/\/arquivos\/ids\/(\d+)(?:-\d+-\w+)?\/([^?]+)/);
  return m ? `${IMG}/arquivos/ids/${m[1]}-${width}-auto/${m[2]}` : undefined;
}

// ------------------------------------------------------------------ preços

export type SimLine = { id: string; qty: number; seller: string };
export type SimPrice = { available: boolean; price?: number; /** Preço de tabela (antes de promoção), quando informado. */ listPrice?: number };

/** Simulação de carrinho: preço unitário real por seller e quantidade (aplica o degrau de atacado). */
export async function simulate(lines: SimLine[]): Promise<SimPrice[]> {
  const CHUNK = 45;
  const chunks: SimLine[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK) chunks.push(lines.slice(i, i + CHUNK));

  const parts = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await request("/api/checkout/pub/orderForms/simulation?sc=1", "no-store", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country: "BRA", items: chunk.map((l) => ({ id: l.id, quantity: l.qty, seller: l.seller })) }),
      });
      if (!res.ok) throw new Error(`simulation ${res.status}`);
      const json = (await res.json()) as {
        items?: { requestIndex?: number; availability?: string; sellingPrice?: number | null; listPrice?: number | null }[];
      };
      const items = json.items ?? [];
      return chunk.map((_, i): SimPrice => {
        const it = items.find((x) => x.requestIndex === i) ?? items[i];
        const ok = it?.availability === "available" && typeof it.sellingPrice === "number" && it.sellingPrice > 0;
        if (!ok) return { available: false };
        return {
          available: true,
          price: it!.sellingPrice! / 100,
          listPrice: typeof it!.listPrice === "number" && it!.listPrice > 0 ? it!.listPrice / 100 : undefined,
        };
      });
    }),
  );
  return parts.flat();
}

/** Degraus de atacado do produto na filial (GraphQL da vitrine). Melhor esforço: falhou = sem degraus. */
async function fetchTiers(ean: string, seller: string, skuId: string): Promise<Tier[]> {
  try {
    const channel = JSON.stringify({ salesChannel: "1", seller, regionId: Buffer.from(`SW#${seller}`).toString("base64") });
    const variables = {
      first: 1,
      after: "0",
      sort: "score_desc",
      term: ean,
      selectedFacets: [
        { key: "channel", value: channel },
        { key: "locale", value: "pt-BR" },
      ],
    };
    const res = await request(
      `/api/graphql?operationName=ProductsQuery&variables=${encodeURIComponent(JSON.stringify(variables))}`,
      "no-store",
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { search?: { products?: { edges?: { node?: { id?: string; offers?: { offers?: { price: number; minQuantity?: number; seller?: { identifier?: string } }[] } } }[] } } };
    };
    const node = json.data?.search?.products?.edges?.[0]?.node;
    if (!node || String(node.id) !== skuId) return [];
    return (node.offers?.offers ?? [])
      .filter((o) => !o.seller?.identifier || o.seller.identifier === seller)
      .map((o) => ({ minQty: o.minQuantity ?? 1, price: o.price }))
      .sort((a, b) => a.minQty - b.minQty);
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ texto

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };

/** Primeiro parágrafo da descrição (sem o título repetido e sem HTML), com limite de tamanho. */
function shortDescription(html?: string) {
  if (!html) return undefined;
  const body = html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " ");
  const first = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? body;
  const text = first
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|\w+);/g, (m, e: string) => (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e] ?? m)))
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 20) return undefined;
  if (text.length <= 340) return text;
  const cut = text.slice(0, 340);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return stop > 160 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// Palavras que não distinguem um produto do outro (embalagem, "tipo", conectivos...).
const GENERIC = new Set(["tipo", "pacote", "pct", "caixa", "com", "sem", "de", "da", "do", "das", "dos", "em", "para", "und", "unidade", "unidades", "pack", "kg", "ml", "lt", "litro", "litros"]);

const tokens = (text: string) =>
  norm(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !/\d/.test(t) && !GENERIC.has(t));

/**
 * Palavras que caracterizam a variedade do produto (ex.: "carioca", "agulhinha", "integral"), tirando marca e
 * nomes de categoria. Sem isso, "Feijão Carioca" seria comparado com "Feijão Preto", que é outro produto.
 */
function distinctive(name: string, complement: string, drop: Set<string>) {
  return [...new Set(tokens(`${name} ${complement}`).filter((t) => !drop.has(t)))];
}

/** O concorrente precisa ter pelo menos 60% das palavras distintivas do produto lido (com 2 palavras, as duas). */
function sameVariety(wanted: string[], name: string, complement: string) {
  if (wanted.length === 0) return true;
  const have = new Set(tokens(`${name} ${complement}`));
  return wanted.filter((t) => have.has(t)).length >= Math.ceil(wanted.length * 0.6);
}

const BADGES: Record<string, string> = { "Mais Vendidos": "Mais vendido", "Ofertas Arrasadoras": "Oferta" };

// ------------------------------------------------------------------ lookup

export async function lookupProduct(rawEan: string, seller: string, qty: number, compareSellers: string[]): Promise<LookupResult> {
  let sku: SkuByEan | null = null;
  let ean = rawEan;
  for (const candidate of eanVariants(rawEan)) {
    sku = await fetchSkuByEan(candidate);
    if (sku) {
      ean = candidate;
      break;
    }
  }
  if (!sku) return { ok: false, reason: "not_found" };

  const skuId = String(sku.Id);
  const size = parseSize(sku.NameComplete);
  const categoryPath = sku.CategoriesFullPath?.[0];
  const categoryNames = (categoryPath ?? "")
    .split("/")
    .filter(Boolean)
    .map((id) => sku.ProductCategories?.[id])
    .filter((n): n is string => !!n);

  const [candidates, tiers] = await Promise.all([
    categoryPath ? fetchCandidates(categoryPath) : Promise.resolve<Candidate[]>([]),
    fetchTiers(ean, seller, skuId),
  ]);

  // Semelhantes = outras marcas, mesma categoria, mesma variedade e, quando dá para ler, mesma embalagem.
  const drop = new Set([...tokens(sku.BrandName), ...categoryNames.flatMap(tokens)]);
  // Palavras do nome mandam; o nome complementar só entra quando o nome não distingue nada (ex.: arroz "agulhinha").
  const byName = distinctive(sku.NameComplete, "", drop);
  const wanted = byName.length > 0 ? byName : distinctive("", sku.ComplementName ?? "", drop);
  const seen = new Set<string>();
  const rivals = candidates
    .filter((c) => c.productId !== String(sku.ProductId) && norm(c.brand) !== norm(sku.BrandName))
    .filter((c) => (size ? sameSize(parseSize(c.name), size) : true))
    .filter((c) => sameVariety(wanted, c.name, c.complement))
    .filter((c) => (seen.has(c.ean) ? false : (seen.add(c.ean), true)))
    .slice(0, 40);

  const others = compareSellers.filter((s) => s !== seller);
  const lines: SimLine[] = [
    { id: skuId, qty, seller },
    ...rivals.map((c) => ({ id: c.skuId, qty, seller })),
    ...others.map((s) => ({ id: skuId, qty, seller: s })),
  ];
  const prices = await simulate(lines);

  const base = prices[0];
  const basePrice = base.available ? base.price : undefined;

  const offer: Offer = {
    available: !!base.available,
    atQty: basePrice,
    total: basePrice === undefined ? undefined : round(basePrice * qty),
    unit: tiers.find((t) => t.minQty <= 1)?.price ?? (qty === 1 ? basePrice : undefined),
    tiers,
    perBase: basePrice === undefined ? undefined : perBase(basePrice, size),
  };

  const rivalPrices = prices.slice(1, 1 + rivals.length);
  const similarAll: SimilarItem[] = rivals.flatMap((c, i) => {
    const p = rivalPrices[i];
    if (!p.available || p.price === undefined) return [];
    const deltaAbs = basePrice === undefined ? undefined : round(p.price - basePrice);
    return [
      {
        skuId: c.skuId,
        ean: c.ean,
        name: c.name,
        brand: c.brand,
        image: c.image,
        sizeLabel: parseSize(c.name)?.label,
        atQty: p.price,
        total: round(p.price * qty),
        perBase: perBase(p.price, parseSize(c.name)),
        deltaAbs,
        deltaPct: deltaAbs === undefined || !basePrice ? undefined : round((deltaAbs / basePrice) * 100, 1),
      },
    ];
  });
  similarAll.sort((a, b) => a.atQty - b.atQty);

  let filiais: FilialOffer[] | undefined;
  if (others.length > 0) {
    const otherPrices = prices.slice(1 + rivals.length);
    filiais = [
      { seller, available: !!base.available, atQty: basePrice, total: offer.total, deltaAbs: basePrice === undefined ? undefined : 0, deltaPct: basePrice === undefined ? undefined : 0 },
      ...others.map((s, i): FilialOffer => {
        const p = otherPrices[i];
        if (!p.available || p.price === undefined) return { seller: s, available: false };
        const deltaAbs = basePrice === undefined ? undefined : round(p.price - basePrice);
        return {
          seller: s,
          available: true,
          atQty: p.price,
          total: round(p.price * qty),
          deltaAbs,
          deltaPct: deltaAbs === undefined || !basePrice ? undefined : round((deltaAbs / basePrice) * 100, 1),
        };
      }),
    ];
  }

  return {
    ok: true,
    seller,
    qty,
    product: {
      ean,
      skuId,
      name: sku.NameComplete,
      brand: sku.BrandName,
      categoryPath: categoryNames,
      image: sizedImage(sku.ImageUrl, 500),
      description: shortDescription(sku.ProductDescription),
      url: sku.DetailUrl ? `${STORE}${sku.DetailUrl}` : undefined,
      size,
      badges: Object.values(sku.ProductClusterNames ?? {}).flatMap((n) => (BADGES[n] ? [BADGES[n]] : [])),
    },
    offer,
    similar: similarAll.slice(0, 8),
    similarTotal: similarAll.length,
    filiais,
  };
}

// ------------------------------------------------------------------ lista de compras

/**
 * Preço real da lista em cada filial: simula o carrinho (cada item na sua quantidade) por seller.
 * A filial escolhida também é simulada a 1 unidade, para saber onde o preço de atacado foi aplicado.
 */
export async function compareList(items: ListCompareItem[], selected: string, others: string[]): Promise<ListCompareResult> {
  // Listas grandes (ex.: nota importada) comparam menos filiais: no máximo ~300 linhas de simulação por consulta.
  const maxSellers = Math.max(1, Math.min(6, Math.floor(300 / items.length)));
  const sellers = [...new Set([selected, ...others])].slice(0, maxSellers);

  const lines: SimLine[] = sellers.flatMap((seller) => items.map((it) => ({ id: it.id, qty: it.qty, seller })));
  const singles = items.filter((it) => it.qty > 1);
  const singleLines: SimLine[] = singles.map((it) => ({ id: it.id, qty: 1, seller: selected }));

  // Chamadas separadas: a simulação funde linhas com o mesmo SKU e a mesma filial (qtd 1 × qtd N), o que trocaria os preços.
  const [prices, singlePrices, categories] = await Promise.all([
    simulate(lines),
    singleLines.length > 0 ? simulate(singleLines) : Promise.resolve([]),
    departments(items.map((it) => it.id)),
  ]);

  const results = sellers.map((seller, s): ListSellerResult => {
    const row: Record<string, number | null> = {};
    let total = 0;
    let missing = 0;
    items.forEach((it, i) => {
      const p = prices[s * items.length + i];
      if (p.available && p.price !== undefined) {
        row[it.id] = p.price;
        total += p.price * it.qty;
      } else {
        row[it.id] = null;
        missing++;
      }
    });
    return { seller, total: round(total), missing, prices: row };
  });

  // "Sem desconto" = o maior entre o preço a 1 unidade e o preço de tabela; só a filial escolhida (a 1ª simulada) importa aqui.
  const single: Record<string, number> = {};
  singles.forEach((it, i) => {
    const p = singlePrices[i];
    if (p.available && p.price !== undefined) single[it.id] = p.price;
  });
  const old: Record<string, number | null> = {};
  items.forEach((it, i) => {
    const p = prices[i]; // sellers[0] === selected
    old[it.id] = p.available && p.price !== undefined ? round(Math.max(p.price, p.listPrice ?? 0, single[it.id] ?? 0)) : null;
  });

  return { ok: true, sellers: results, old, categories };
}

/** Departamento de cada SKU (o 1º nível do caminho de categorias do catálogo legado). Melhor esforço, em cache por 1 h. */
async function departments(ids: string[]): Promise<Record<string, string>> {
  const one = async (id: string): Promise<[string, string] | null> => {
    try {
      const res = await request(`/api/catalog_system/pub/products/search?fq=skuId:${id}`, { revalidate: 3600 });
      if (!res.ok) return null;
      const list = (await res.json()) as LegacyProduct[];
      const dept = list[0]?.categories?.[0]?.split("/").filter(Boolean)[0];
      return dept ? [id, dept] : null;
    } catch {
      return null;
    }
  };
  // Em lotes: uma lista grande não dispara dezenas de consultas ao mesmo tempo.
  const entries: ([string, string] | null)[] = [];
  for (let i = 0; i < ids.length; i += 15) entries.push(...(await Promise.all(ids.slice(i, i + 15).map(one))));
  return Object.fromEntries(entries.flatMap((e) => (e ? [e] : [])));
}

// ------------------------------------------------------------------ catálogo (vitrine)

type GqlNode = {
  id: string;
  name: string;
  breadcrumbList?: { itemListElement?: { item?: string; name?: string }[] };
  productClusters?: { id: string; name: string }[];
  brand?: { name?: string; brandName?: string };
  image?: { url?: string }[];
  offers?: { offers?: { price: number; minQuantity?: number; seller?: { identifier?: string } }[] };
};

type GqlFacet = { key: string; values?: { label: string; value: string; selected: boolean; quantity: number }[] };

const regionId = (seller: string) => Buffer.from(`SW#${seller}`).toString("base64");

/** Consulta o GraphQL da vitrine. Dados públicos por filial: ficam em cache por 2 minutos. */
async function gql<T>(operationName: string, variables: object): Promise<T> {
  const res = await request(
    `/api/graphql?operationName=${operationName}&variables=${encodeURIComponent(JSON.stringify(variables))}`,
    { revalidate: 120 },
  );
  if (!res.ok) throw new Error(`graphql ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown[] };
  if (!json.data) throw new Error("graphql sem dados");
  return json.data;
}

export type CatalogQuery = {
  seller: string;
  term?: string;
  /** Slugs de categoria, do departamento para baixo: ["mercearia", "graos", "arroz-branco"]. */
  cat?: string[];
  brand?: string;
  /** Id de coleção (ex.: 148 = Ofertas Arrasadoras). */
  cluster?: string;
  sort?: string;
  first?: number;
};

function selectedFacets(q: CatalogQuery) {
  return [
    ...(q.cat ?? []).slice(0, 3).map((value, i) => ({ key: `category-${i + 1}`, value })),
    ...(q.brand ? [{ key: "brand", value: q.brand }] : []),
    ...(q.cluster ? [{ key: "productClusterIds", value: q.cluster }] : []),
    { key: "channel", value: JSON.stringify({ salesChannel: "1", seller: q.seller, regionId: regionId(q.seller) }) },
    { key: "locale", value: "pt-BR" },
  ];
}

function toProduct(n: GqlNode, seller: string): CatalogProduct | null {
  const offers = (n.offers?.offers ?? [])
    .filter((o) => !o.seller?.identifier || o.seller.identifier === seller)
    .sort((a, b) => (a.minQuantity ?? 1) - (b.minQuantity ?? 1));
  if (offers.length === 0) return null;

  const unit = offers[0].price;
  // Degrau de atacado que dá o menor preço unitário.
  const better = offers.filter((o) => (o.minQuantity ?? 1) > 1 && o.price < unit);
  const best = better.length > 0 ? better.reduce((a, b) => (b.price < a.price ? b : a)) : undefined;

  // Caminho de categorias: os itens do breadcrumb, sem o último (que é o próprio produto: ".../p").
  const path = (n.breadcrumbList?.itemListElement ?? []).flatMap((e) => {
    const slug = e.item?.split("/").filter(Boolean).pop();
    return e.item && !e.item.endsWith("/p") && slug && e.name ? [{ slug, name: e.name }] : [];
  });

  return {
    id: String(n.id),
    name: n.name,
    brand: n.brand?.name ?? n.brand?.brandName ?? "",
    image: sizedImage(n.image?.[0]?.url, 360),
    unit,
    tier: best ? { qty: best.minQuantity ?? 1, price: best.price } : undefined,
    tiers: offers.filter((o) => (o.minQuantity ?? 1) > 1 && o.price < unit).map((o) => ({ qty: o.minQuantity ?? 1, price: o.price })),
    clusters: (n.productClusters ?? []).map((c) => ({ id: String(c.id), name: c.name })),
    path,
    dept: path[0]?.name,
  };
}

/** Produtos disponíveis na filial (busca por texto/EAN, categoria, marca ou coleção), com o preço dela. */
export async function catalogSearch(q: CatalogQuery, after = 0): Promise<{ products: CatalogProduct[]; total: number; scanned: number }> {
  const data = await gql<{ search: { products: { pageInfo: { totalCount: number }; edges: { node: GqlNode }[] } } }>("ProductsQuery", {
    first: Math.min(q.first ?? 24, 100),
    after: String(after),
    sort: q.sort ?? "score_desc",
    term: q.term ?? "",
    selectedFacets: selectedFacets(q),
  });
  const { edges, pageInfo } = data.search.products;
  // `scanned` = quantos itens a API devolveu (inclusive os sem preço nesta filial, que são descartados): é ele que move o cursor.
  return { products: edges.flatMap((e) => toProduct(e.node, q.seller) ?? []), total: pageInfo.totalCount, scanned: edges.length };
}

/** Subcategorias e marcas do recorte atual (para os filtros da busca). */
export async function catalogFacets(q: CatalogQuery): Promise<CatalogFacets> {
  const data = await gql<{ search: { facets?: GqlFacet[] } }>("ProductGalleryQuery", {
    first: 1,
    after: "0",
    sort: "score_desc",
    term: q.term ?? "",
    selectedFacets: selectedFacets(q),
  });
  const facets = data.search.facets ?? [];
  const depth = (q.cat ?? []).length;
  // No nível do departamento os filhos vêm em `category-2`; mais fundo, o facet do nível atual traz o recorte + irmãos.
  const level = depth === 0 ? 1 : Math.min(depth + 1, 3);
  const cats = facets.find((f) => f.key === `category-${level}`) ?? facets.find((f) => f.key === `category-${depth}`);
  const brands = facets.find((f) => f.key === "brand");
  const map = (f?: GqlFacet) =>
    (f?.values ?? []).map((v): FacetValue => ({ label: v.label, slug: v.value, count: v.quantity, selected: v.selected }));
  return {
    // Com um termo digitado, os departamentos também viram opção (útil para "Qual tipo de X?").
    categories: map(cats).sort((a, b) => b.count - a.count),
    brands: map(brands)
      .sort((a, b) => b.count - a.count)
      .slice(0, 14),
  };
}

/** Preço a 1 unidade e disponibilidade de vários SKUs na filial (usado nos favoritos). */
export async function skuPrices(seller: string, ids: string[]): Promise<Record<string, number | null>> {
  const prices = await simulate(ids.map((id) => ({ id, qty: 1, seller })));
  return Object.fromEntries(ids.map((id, i) => [id, prices[i].available && prices[i].price !== undefined ? prices[i].price! : null]));
}

/** EAN e nome de um SKU (a vitrine só traz o código interno; o EAN vem do catálogo legado). */
export async function skuInfo(skuId: string): Promise<{ ean: string; name: string } | null> {
  const res = await request(`/api/catalog_system/pub/products/search?fq=skuId:${skuId}`, { revalidate: 3600 });
  if (!res.ok) return null;
  const list = (await res.json()) as LegacyProduct[];
  for (const p of list) {
    const item = p.items?.find((i) => String(i.itemId) === skuId);
    if (item?.ean) return { ean: item.ean, name: p.productName };
  }
  return null;
}

// ------------------------------------------------------------------ filiais próximas

type PickupPoint = {
  distance?: number;
  pickupPoint: {
    id: string;
    friendlyName: string;
    isActive?: boolean;
    address: { city?: string; state?: string; neighborhood?: string };
  };
};

const SMALL = new Set(["de", "da", "do", "das", "dos", "e"]);
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/** Atacadões mais próximos (por coordenadas ou CEP), do mais perto ao mais longe. O seller sai do id do ponto de retirada. */
export async function nearestFiliais(query: { lat: number; lng: number } | { cep: string }): Promise<FilialInfo[]> {
  const where = "lat" in query ? `geoCoordinates=${query.lng};${query.lat}` : `postalCode=${query.cep}&countryCode=BRA`;
  const res = await request(`/api/checkout/pub/pickup-points?${where}&page=1&pageSize=15`, "no-store");
  if (!res.ok) throw new Error(`pickup ${res.status}`);
  const json = (await res.json()) as { items?: PickupPoint[] };

  const seen = new Set<string>();
  return (json.items ?? [])
    .filter(({ pickupPoint: p }) => p.isActive !== false && /^atacadaobr\d+_/i.test(p.id) && /^atacad/i.test(p.friendlyName))
    .flatMap(({ distance, pickupPoint: p }): FilialInfo[] => {
      const seller = p.id.split("_")[0].toLowerCase();
      if (seen.has(seller)) return [];
      seen.add(seller);
      return [
        {
          seller,
          name: titleCase(p.friendlyName.replace(/^atacad[aã]o\s*-\s*/i, "").trim()),
          neighborhood: p.address.neighborhood ? titleCase(p.address.neighborhood) : undefined,
          city: titleCase(p.address.city ?? ""),
          uf: (p.address.state ?? "").toUpperCase(),
          km: distance === undefined ? undefined : round(distance, 1),
        },
      ];
    })
    .slice(0, 6);
}

