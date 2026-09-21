// Contrato entre /api/receipt (servidor) e a tela da nota fiscal (navegador).

export type ReceiptMatch = {
  skuId: string;
  ean?: string;
  name: string;
  brand: string;
  image?: string;
  dept?: string;
  /** Quanto vale cada "unidade" do catálogo quando é vendido por peso (ex.: "150 g"). */
  pack?: string;
  /** kg por unidade do catálogo nos itens pesados (0,15 = 150 g); 1 nos demais. Converte preço por kg em preço por unidade. */
  unitFactor: number;
};

export type ReceiptNow = {
  available: boolean;
  /** Preço unitário hoje (por unidade, ou por kg nos itens pesados), na quantidade da compra. */
  unit?: number;
  /** Quanto essa linha custaria hoje. */
  total?: number;
};

export type ReceiptItem = {
  /** Código impresso na nota = `RefId` do produto no Atacadão. */
  code: string;
  /** Descrição abreviada, como impressa na nota. */
  description: string;
  qty: number;
  /** "UND", "PCT", "KG"... */
  unit: string;
  byWeight: boolean;
  /** Preço unitário pago (por unidade, ou por kg). */
  oldUnit: number;
  oldTotal: number;
  match?: ReceiptMatch;
  /** Unidades do catálogo a importar para a lista (nos itens pesados, kg ÷ peso da unidade). */
  listQty?: number;
  now?: ReceiptNow;
  /** Diferença do preço unitário: hoje − pago (positivo = ficou mais caro). */
  deltaAbs?: number;
  deltaPct?: number;
};

export type ReceiptSummary = {
  /** Itens encontrados no catálogo de hoje. */
  matched: number;
  /** Itens que não estão mais no catálogo. */
  unmatched: number;
  /** Encontrados, mas sem estoque na filial escolhida. */
  unavailable: number;
  /** Quanto foi pago (valor bruto da nota) só nos itens comparáveis. */
  oldComparable: number;
  /** Quanto esses mesmos itens custam hoje. */
  nowTotal: number;
  diff: number;
  diffPct: number;
  cheaper: number;
  pricier: number;
  same: number;
};

export type Receipt = {
  key: string;
  issuer: { name: string; cnpj: string; address: string };
  /** "05/06/2026 14:45:22" */
  issuedAt: string;
  /** yyyy-mm-dd */
  issuedDate: string;
  number: string;
  totals: { items: number; gross: number; discounts: number; paid: number };
  items: ReceiptItem[];
  /** Filial usada nos preços de hoje. */
  seller: string;
};

export type ReceiptResult =
  | { ok: true; receipt: Receipt; summary: ReceiptSummary }
  | { ok: false; reason: "invalid" | "unsupported" | "fetch" | "parse" | "error"; uf?: string };
