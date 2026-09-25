import "server-only";

import { nearestFiliais, request, simulate, sizedImage, type LegacyProduct, type SimLine } from "@/lib/atacadao";
import type { FilialInfo } from "@/lib/lookup-types";
import type { NfceRef } from "@/lib/nfce";
import type { Receipt, ReceiptItem, ReceiptMatch, ReceiptResult, ReceiptSummary } from "@/lib/receipt-types";

// Leitura da NFC-e (nota fiscal do consumidor) a partir do QR code e comparação com os preços de hoje.
// Só entram domínios da SEFAZ que já têm leitor aqui: o servidor nunca busca um endereço arbitrário vindo do QR.

const SEFAZ: Record<string, { hosts: string[]; url: (p: string) => string }> = {
  // MS: a página pública de consulta traz a nota inteira em HTML.
  "50": {
    hosts: ["dfe.ms.gov.br", "www.dfe.ms.gov.br"],
    url: (p) => `https://www.dfe.ms.gov.br/nfce/qrcode/?p=${encodeURIComponent(p)}`,
  },
};

export const supportedUf = (uf: string) => uf in SEFAZ;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// ------------------------------------------------------------------ leitura do HTML

const NAMED: Record<string, string> = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", agrave: "à", acirc: "â", ecirc: "ê", ocirc: "ô",
  atilde: "ã", otilde: "õ", ccedil: "ç", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Agrave: "À",
  Acirc: "Â", Ecirc: "Ê", Ocirc: "Ô", Atilde: "Ã", Otilde: "Õ", Ccedil: "Ç",
};

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, e: string) => NAMED[e] ?? m);

/** "1.234,56" -> 1234.56; "19,9" -> 19.9; "0,184" -> 0.184. */
const num = (s: string) => Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

type Parsed = Omit<Receipt, "seller" | "items" | "key"> & {
  items: Pick<ReceiptItem, "code" | "description" | "qty" | "unit" | "byWeight" | "oldUnit" | "oldTotal">[];
};

/** Extrai os dados da página de consulta da NFC-e (layout da SEFAZ-MS). Devolve null se não reconhecer. */
export function parseReceiptHtml(html: string): Parsed | null {
  const text = decode(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, "|")
      .replace(/\s+/g, " ")
      .replace(/(\|\s*)+/g, "|"),
  );

  const items: Parsed["items"] = [];
  const itemRe = /([^|]+)\|\(Código:\s*(\d+)\s*\)\s*\|Qtde\.:\|([\d.,]+)\|UN:\s*\|([A-Za-z]+)\d*\|Vl\. Unit\.:\|\s*([\d.,]+)\|Vl\. Total\s*\|([\d.,]+)/g;
  for (const m of text.matchAll(itemRe)) {
    const unit = m[4].toUpperCase();
    items.push({
      code: m[2],
      description: m[1].trim(),
      qty: num(m[3]),
      unit,
      byWeight: unit === "KG",
      oldUnit: num(m[5]),
      oldTotal: num(m[6]),
    });
  }
  if (items.length === 0) return null;

  const t = text.match(/Qtd\. total de itens:\|(\d+)\|Valor total R\$:\|([\d.,]+)(?:\|Descontos R\$:\|([\d.,]+))?\|Valor a pagar R\$:\|([\d.,]+)/);
  if (!t) return null;
  const totals = { items: Number(t[1]), gross: num(t[2]), discounts: t[3] ? num(t[3]) : 0, paid: num(t[4]) };

  // Confere a leitura: a soma dos itens precisa bater com o valor total impresso na nota.
  const sum = items.reduce((acc, i) => acc + i.oldTotal, 0);
  if (Math.abs(sum - totals.gross) > Math.max(0.1, totals.gross * 0.002) || items.length !== totals.items) return null;

  const issuedAt = text.match(/Emissão:\s*\|?(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})/);
  const issuer = text.match(/ELETRÔNICA\|([^|]+)\|CNPJ:\s*([\d./-]+)\|([^|]+)/);
  const number = text.match(/Número:\s*\|?(\d+)/);

  return {
    issuer: { name: issuer?.[1].trim() ?? "", cnpj: issuer?.[2].trim() ?? "", address: issuer?.[3].replace(/\s*,\s*/g, ", ").replace(/(, )+/g, ", ").trim() ?? "" },
    issuedAt: issuedAt ? `${issuedAt[1]}/${issuedAt[2]}/${issuedAt[3]} ${issuedAt[4]}` : "",
    issuedDate: issuedAt ? `${issuedAt[3]}-${issuedAt[2]}-${issuedAt[1]}` : "",
    number: number?.[1] ?? "",
    totals,
    items,
  };
}

async function fetchReceiptHtml(ref: NfceRef): Promise<string> {
  const sefaz = SEFAZ[ref.uf];
  if (!sefaz || !ref.p || !/^\d{44}(\|[A-Za-z0-9]{1,64}){0,4}$/.test(ref.p) || !sefaz.hosts.includes(ref.host)) {
    throw new Error("unsupported");
  }
  const res = await fetch(sefaz.url(ref.p), {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  // Redirecionamentos só podem ficar dentro do próprio domínio da SEFAZ.
  if (!res.ok || !sefaz.hosts.includes(new URL(res.url).hostname)) throw new Error(`fetch ${res.status}`);
  return res.text();
}

// ------------------------------------------------------------------ vínculo com o catálogo

type CatalogHit = ReceiptMatch & { multiplier: number; unitKg: boolean };

/** O código impresso na nota é o `RefId` do produto na Distribuidora. */
async function findByCode(code: string): Promise<CatalogHit | null> {
  try {
    const res = await request(`/api/catalog_system/pub/products/search?fq=alternateIds_RefId:${code}`, { revalidate: 3600 });
    if (!res.ok) return null;
    const p = ((await res.json()) as LegacyProduct[])[0];
    const it = p?.items?.[0];
    if (!p || !it) return null;
    const multiplier = it.unitMultiplier && it.unitMultiplier > 0 ? it.unitMultiplier : 1;
    const unitKg = (it.measurementUnit ?? "").toLowerCase() === "kg";
    return {
      skuId: String(it.itemId),
      ean: it.ean,
      name: p.productName,
      brand: p.brand,
      image: sizedImage(it.images?.[0]?.imageUrl, 200),
      dept: p.categories?.[0]?.split("/").filter(Boolean)[0],
      pack: unitKg && multiplier !== 1 ? (multiplier < 1 ? `${Math.round(multiplier * 1000)} g` : `${multiplier} kg`) : undefined,
      unitFactor: unitKg ? multiplier : 1,
      multiplier,
      unitKg,
    };
  } catch {
    return null;
  }
}

/** Executa `fn` sobre a lista com no máximo `limit` chamadas ao mesmo tempo. */
async function pool<T, R>(list: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i]);
      }
    }),
  );
  return out;
}

// ------------------------------------------------------------------ filial da compra

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/**
 * Acha a filial onde a compra foi feita a partir do endereço impresso na nota ("AV X, 1525, BAIRRO, CIDADE, UF"):
 * o ViaCEP (serviço público) resolve rua + cidade em CEPs, e o Distribuidora devolve as lojas perto deles.
 * A loja cujo bairro é o da nota vem primeiro; as demais ficam como próximas.
 */
export async function receiptStore(address: string): Promise<FilialInfo[]> {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 4) return [];
  const uf = parts[parts.length - 1].toUpperCase();
  const city = parts[parts.length - 2];
  const hood = parts[parts.length - 3];
  const street = parts[0].replace(/^(av\.?|avenida|r\.?|rua|rod\.?|rodovia|pc\.?|praca|praça|al\.?|alameda|est\.?|estrada)\s+/i, "");
  if (!/^[A-Z]{2}$/.test(uf) || street.length < 3) return [];

  const cepRes = await fetch(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`, {
    headers: { accept: "application/json" },
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!cepRes.ok) return [];
  const ceps = (await cepRes.json()) as { cep?: string; bairro?: string }[] | { erro?: boolean };
  if (!Array.isArray(ceps) || ceps.length === 0) return [];

  // Prefere o CEP do bairro da nota; senão, o primeiro.
  const pick = ceps.find((c) => c.bairro && norm(c.bairro) === norm(hood)) ?? ceps[0];
  const cep = (pick.cep ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return [];

  const near = await nearestFiliais({ cep });
  const store = near.find((f) => f.neighborhood && norm(f.neighborhood) === norm(hood));
  return store ? [store, ...near.filter((f) => f.seller !== store.seller)] : near;
}

// ------------------------------------------------------------------ comparação com hoje

export async function loadReceipt(ref: NfceRef, seller: string): Promise<ReceiptResult> {
  let parsed: Parsed | null;
  try {
    parsed = parseReceiptHtml(await fetchReceiptHtml(ref));
  } catch (e) {
    return { ok: false, reason: (e as Error).message === "unsupported" ? "unsupported" : "fetch", uf: ref.uf };
  }
  if (!parsed) return { ok: false, reason: "parse" };

  // 1) código da nota -> produto do catálogo (1 consulta por código, em cache)
  const codes = [...new Set(parsed.items.map((i) => i.code))];
  const hits = new Map<string, CatalogHit | null>();
  (await pool(codes, 16, findByCode)).forEach((h, i) => hits.set(codes[i], h));

  // 2) quantas unidades do catálogo cada linha representa (nos itens pesados, kg ÷ peso da unidade)
  const listQty = (i: Parsed["items"][number], h: CatalogHit) => Math.max(1, Math.round(i.byWeight && h.unitKg ? i.qty / h.multiplier : i.qty));

  // 3) preço de hoje: uma linha por SKU (a simulação funde linhas repetidas), com a soma das quantidades
  const totalUnits = new Map<string, number>();
  for (const i of parsed.items) {
    const h = hits.get(i.code);
    if (h) totalUnits.set(h.skuId, (totalUnits.get(h.skuId) ?? 0) + listQty(i, h));
  }
  const lines: SimLine[] = [...totalUnits].map(([id, qty]) => ({ id, qty, seller }));
  const prices = lines.length > 0 ? await simulate(lines) : [];
  const priceOf = new Map(lines.map((l, i) => [l.id, prices[i]]));

  const items: ReceiptItem[] = parsed.items.map((i) => {
    const h = hits.get(i.code);
    if (!h) return i;
    const { multiplier, unitKg, ...match } = h;
    const base: ReceiptItem = { ...i, match, listQty: listQty(i, h) };
    const p = priceOf.get(h.skuId);
    if (!p?.available || p.price === undefined) return { ...base, now: { available: false } };

    // Por kg quando a nota vende por peso e o catálogo também; senão, por unidade.
    const nowUnit = round(i.byWeight && unitKg ? p.price / multiplier : p.price);
    const deltaAbs = round(nowUnit - i.oldUnit);
    return {
      ...base,
      now: { available: true, unit: nowUnit, total: round(nowUnit * i.qty) },
      deltaAbs,
      deltaPct: i.oldUnit > 0 ? round((deltaAbs / i.oldUnit) * 100, 1) : undefined,
    };
  });

  const comparable = items.filter((i) => i.now?.available);
  const oldComparable = round(comparable.reduce((a, i) => a + i.oldTotal, 0));
  const nowTotal = round(comparable.reduce((a, i) => a + (i.now?.total ?? 0), 0));
  const summary: ReceiptSummary = {
    matched: items.filter((i) => i.match).length,
    unmatched: items.filter((i) => !i.match).length,
    unavailable: items.filter((i) => i.match && !i.now?.available).length,
    oldComparable,
    nowTotal,
    diff: round(nowTotal - oldComparable),
    diffPct: oldComparable > 0 ? round(((nowTotal - oldComparable) / oldComparable) * 100, 1) : 0,
    cheaper: comparable.filter((i) => (i.deltaAbs ?? 0) < -0.004).length,
    pricier: comparable.filter((i) => (i.deltaAbs ?? 0) > 0.004).length,
    same: comparable.filter((i) => Math.abs(i.deltaAbs ?? 0) <= 0.004).length,
  };

  return {
    ok: true,
    summary,
    receipt: {
      key: ref.key,
      issuer: parsed.issuer,
      issuedAt: parsed.issuedAt,
      issuedDate: parsed.issuedDate,
      number: parsed.number,
      totals: parsed.totals,
      items,
      seller,
    },
  };
}
