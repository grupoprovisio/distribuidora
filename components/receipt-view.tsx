"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Loader2, MapPin, RefreshCw, Receipt as ReceiptIcon, ShoppingBasket, Store } from "lucide-react";
import { Delta } from "@/components/delta";
import { LinkPurchase } from "@/components/link-purchase";
import { Price } from "@/components/price";
import { brl } from "@/lib/format";
import { useList, type ItemMeta } from "@/lib/list-store";
import { parseNfceUrl, UF_BY_CODE } from "@/lib/nfce";
import { usePrefs } from "@/lib/prefs-store";
import type { FilialInfo } from "@/lib/lookup-types";
import type { ReceiptItem, ReceiptResult } from "@/lib/receipt-types";

type Filter = "all" | "cheaper" | "pricier" | "unavailable" | "unmatched";

const qtyText = (i: ReceiptItem) => `${String(i.qty).replace(".", ",")} ${i.byWeight ? "kg" : i.unit === "UND" ? "un" : i.unit.toLowerCase()}`;
const kindOf = (i: ReceiptItem): Filter =>
  !i.match ? "unmatched" : !i.now?.available ? "unavailable" : (i.deltaAbs ?? 0) < -0.004 ? "cheaper" : (i.deltaAbs ?? 0) > 0.004 ? "pricier" : "all";

/** Busca a nota no servidor: itens, preços pagos e o preço de hoje na filial escolhida. */
function useReceipt(url: string) {
  const { filial } = usePrefs();
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<{ key: string; data?: ReceiptResult; failed?: boolean } | null>(null);
  const key = `${filial.seller}|${attempt}|${url}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, seller: filial.seller }),
      signal: ctrl.signal,
    })
      .then((r) => r.json() as Promise<ReceiptResult>)
      .then((data) => setDone({ key, data }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ key, failed: true });
      });
    return () => ctrl.abort();
  }, [key, url, filial.seller]);

  const current = done && done.key === key ? done : null;
  return { status: !current ? "loading" : current.failed ? "error" : "ready", data: current?.data, retry: () => setAttempt((a) => a + 1) } as const;
}

function Message({ icon: Icon, title, text, onRetry }: { icon: typeof AlertTriangle; title: string; text: string; onRetry?: () => void }) {
  return (
    <div className="rounded-3xl bg-canvas px-4 py-5 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-sand text-[#5c3a06]">
        <Icon size={22} aria-hidden />
      </span>
      <p className="mt-3 text-sm font-extrabold">{title}</p>
      <p className="mt-1 text-xs font-medium text-muted">{text}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95">
          <RefreshCw size={14} aria-hidden /> Tentar de novo
        </button>
      ) : null}
    </div>
  );
}

/** Nota fiscal lida do QR: itens, comparação com os preços de hoje e importação para a lista. */
export function ReceiptView({ url }: { url: string }) {
  const { filial, update } = usePrefs();
  const { setMany } = useList();
  const { status, data, retry } = useReceipt(url);
  const [filter, setFilter] = useState<Filter>("all");
  const [imported, setImported] = useState<number | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-canvas px-4 py-5" role="status" aria-live="polite">
        <Loader2 size={22} className="shrink-0 animate-spin text-forest" aria-hidden />
        <div>
          <p className="text-sm font-extrabold">Lendo a nota fiscal…</p>
          <p className="text-xs font-medium text-muted">Buscando os itens na SEFAZ e os preços de hoje. Pode levar até 20 segundos.</p>
        </div>
      </div>
    );
  }
  if (status === "error" || !data) return <Message icon={AlertTriangle} title="Não consegui ler a nota" text="Verifique a conexão e tente de novo." onRetry={retry} />;
  if (!data.ok) {
    const uf = data.uf ? (UF_BY_CODE[data.uf] ?? data.uf) : "";
    if (data.reason === "unsupported") {
      return <Message icon={ReceiptIcon} title="Nota de outro estado" text={`Por enquanto só leio notas fiscais de Mato Grosso do Sul (SEFAZ-MS).${uf ? ` Esta nota é de ${uf}.` : ""}`} />;
    }
    if (data.reason === "parse") return <Message icon={ReceiptIcon} title="Não consegui entender esta nota" text="A página da SEFAZ veio num formato inesperado." onRetry={retry} />;
    if (data.reason === "fetch") return <Message icon={AlertTriangle} title="A SEFAZ não respondeu" text="O site da nota pode estar fora do ar. Tente de novo em instantes." onRetry={retry} />;
    return <Message icon={AlertTriangle} title="Não consegui ler a nota" text="Tente escanear de novo." onRetry={retry} />;
  }

  const { receipt, summary } = data;
  const ref = parseNfceUrl(url);
  const issuerUf = receipt.issuer.address.split(",").pop()?.trim().toUpperCase() ?? "";
  const otherState = !!issuerUf && !!filial.uf && issuerUf !== filial.uf.toUpperCase();
  const city = receipt.issuer.address.split(",").slice(-2, -1)[0]?.trim() ?? "";

  const counts: Record<Filter, number> = {
    all: receipt.items.length,
    cheaper: summary.cheaper,
    pricier: summary.pricier,
    unavailable: summary.unavailable,
    unmatched: summary.unmatched,
  };
  const shown = filter === "all" ? receipt.items : receipt.items.filter((i) => kindOf(i) === filter);
  const importable = new Set(receipt.items.flatMap((i) => (i.match && i.listQty ? [i.match.skuId] : [])));

  const importAll = () => {
    // Uma linha por produto: se o mesmo código aparece mais de uma vez na nota, as quantidades se somam.
    const bySku = new Map<string, { id: string; qty: number; meta: ItemMeta }>();
    for (const i of receipt.items) {
      if (!i.match || !i.listQty) continue;
      const cur = bySku.get(i.match.skuId);
      if (cur) {
        cur.qty += i.listQty;
        continue;
      }
      bySku.set(i.match.skuId, {
        id: i.match.skuId,
        qty: i.listQty,
        meta: {
          name: i.match.name,
          brand: i.match.brand,
          image: i.match.image,
          ean: i.match.ean,
          dept: i.match.dept,
          pack: i.match.pack,
          // Preço pago por unidade do catálogo (nos itens pesados: R$/kg × kg por unidade).
          paid: { price: Math.round(i.oldUnit * (i.byWeight ? i.match.unitFactor : 1) * 100) / 100, date: receipt.issuedDate },
        },
      });
    }
    setMany([...bySku.values()]);
    setImported(bySku.size);
  };

  const useStoreFilial = async () => {
    setSwitching(true);
    setSwitchError(null);
    try {
      const res = await fetch(`/api/filiais/receipt-store?address=${encodeURIComponent(receipt.issuer.address)}`);
      const json = (await res.json()) as { filiais?: FilialInfo[]; error?: string };
      if (!res.ok || !json.filiais?.length) throw new Error(json.error);
      // A distância vinha do CEP da loja, não de você: não a mostramos.
      const list = json.filiais.map((f) => ({ ...f, km: undefined }));
      update({ filial: list[0], nearby: list });
    } catch (e) {
      setSwitchError(e instanceof Error && e.message ? e.message : "Não consegui achar essa filial.");
    } finally {
      setSwitching(false);
    }
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "cheaper", label: "Mais baratos hoje" },
    { key: "pricier", label: "Mais caros hoje" },
    { key: "unavailable", label: "Sem estoque" },
    { key: "unmatched", label: "Fora do catálogo" },
  ];

  return (
    <article aria-label="Nota fiscal">
      {/* Nota */}
      <div className="rounded-3xl bg-canvas p-4 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-soft text-forest">
            <ReceiptIcon size={18} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{receipt.issuer.name || "Nota fiscal"}</p>
            <p className="truncate text-xs font-medium text-muted">{receipt.issuer.address}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              Nota {receipt.number} · {receipt.issuedAt.slice(0, 16)}
            </p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["Itens", String(receipt.totals.items)],
            ["Total", brl(receipt.totals.gross)],
            ["Pago", brl(receipt.totals.paid)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-paper px-2 py-2 ring-1 ring-line">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{k}</dt>
              <dd className="text-sm font-extrabold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {receipt.totals.discounts > 0 ? <p className="mt-2 text-[11px] font-semibold text-muted">Desconto dado na nota: {brl(receipt.totals.discounts)}</p> : null}
      </div>

      {/* Compra em outro estado: a filial escolhida pode nem vender esses itens */}
      {otherState ? (
        <div className="mt-3 rounded-3xl bg-sand p-4">
          <p className="text-sm font-extrabold text-[#5c3a06]">
            Esta compra foi em {city || issuerUf}/{issuerUf}, mas sua filial é {filial.name}/{filial.uf}.
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#5c3a06]/80">Os preços e o estoque mudam por filial. Para comparar de verdade, use a filial da compra.</p>
          <button
            type="button"
            onClick={useStoreFilial}
            disabled={switching}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95 disabled:opacity-60"
          >
            {switching ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Store size={14} aria-hidden />} Comparar com a filial da compra
          </button>
          {switchError ? <p role="alert" className="mt-2 text-xs font-bold text-[#a02a4a]">{switchError}</p> : null}
        </div>
      ) : null}

      {/* Comparação com hoje */}
      <section className="mt-3 rounded-3xl bg-forest p-4 text-white" aria-label="Comparação com os preços de hoje">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/60">
          <MapPin size={12} aria-hidden /> Hoje na Distribuidora {filial.name}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold text-white/65">Pago na nota</p>
            <p className="text-lg font-extrabold tabular-nums text-white/80 line-through decoration-white/40">{brl(summary.oldComparable)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/65">Custaria hoje</p>
            <Price value={summary.nowTotal} className="text-2xl text-lime" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {Math.abs(summary.diff) < 0.005 ? (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold">Mesmo valor de antes</span>
          ) : (
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${summary.diff < 0 ? "bg-lime text-forest-deep" : "bg-blush text-[#a02a4a]"}`}>
              {brl(Math.abs(summary.diff))} {summary.diff < 0 ? "mais barato" : "mais caro"} ({summary.diffPct < 0 ? "−" : "+"}
              {Math.abs(summary.diffPct).toFixed(1).replace(".", ",")}%)
            </span>
          )}
          <span className="text-[11px] font-semibold text-white/70">
            {summary.cheaper} mais baratos · {summary.pricier} mais caros · {summary.same} iguais
          </span>
        </div>
        {summary.unavailable + summary.unmatched > 0 ? (
          <p className="mt-2 text-[11px] font-medium text-white/60">
            A comparação usa só os itens com preço hoje: {summary.unavailable > 0 ? `${summary.unavailable} sem estoque nesta filial` : ""}
            {summary.unavailable > 0 && summary.unmatched > 0 ? " e " : ""}
            {summary.unmatched > 0 ? `${summary.unmatched} fora do catálogo` : ""} ficaram de fora.
          </p>
        ) : null}
      </section>

      {/* Importar */}
      <div className="mt-3">
        {imported === null ? (
          <button
            type="button"
            onClick={importAll}
            disabled={importable.size === 0}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep shadow-card transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            <ShoppingBasket size={17} aria-hidden /> Importar {importable.size} itens para a lista
          </button>
        ) : (
          <div className="rounded-3xl bg-lime-soft p-3.5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-forest">
              <Check size={16} aria-hidden /> {imported} itens na sua lista
            </p>
            <p className="mt-0.5 text-xs font-medium text-forest/80">
              Com as quantidades da nota{receipt.items.some((i) => i.byWeight && i.match) ? "; itens por peso viram unidades do catálogo (ex.: 150 g)" : ""}. Na lista você vê o preço pago antes ao lado do de hoje.
            </p>
            <Link href="/lista" className="mt-2 inline-flex h-9 items-center rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95">
              Abrir a lista
            </Link>
          </div>
        )}
        {summary.unmatched > 0 && imported === null ? <p className="mt-1.5 px-2 text-[11px] font-medium text-muted">{summary.unmatched} item(ns) fora do catálogo não serão importados.</p> : null}
      </div>

      {/* Finalizar uma compra salva com esta nota */}
      <LinkPurchase receipt={receipt} url={url} />

      {/* Itens */}
      <section className="mt-5" aria-label="Itens da nota">
        <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
          {tabs
            .filter((t) => t.key === "all" || counts[t.key] > 0)
            .map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                aria-pressed={filter === t.key}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold ring-1 transition-colors ${filter === t.key ? "bg-forest text-white ring-forest" : "bg-paper ring-line hover:bg-lime-soft"}`}
              >
                {t.label} <span className="opacity-60">{counts[t.key]}</span>
              </button>
            ))}
        </div>

        <ul className="space-y-2">
          {shown.map((i, idx) => (
            <li key={`${i.code}-${idx}`} className="flex items-center gap-3 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
              <span className="relative size-12 shrink-0 rounded-xl bg-canvas">
                {i.match?.image ? <Image src={i.match.image} alt="" fill unoptimized sizes="48px" className="object-contain p-1" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-bold leading-snug">{i.match?.name ?? i.description}</p>
                <p className="text-[11px] font-semibold text-muted">
                  {qtyText(i)} · pago {brl(i.oldUnit)}
                  {i.byWeight ? "/kg" : ""}
                  {i.now?.available && i.now.unit !== undefined ? ` -> hoje ${brl(i.now.unit)}${i.byWeight ? "/kg" : ""}` : ""}
                </p>
                <div className="mt-1">
                  {i.now?.available ? (
                    <Delta abs={i.deltaAbs} pctValue={i.deltaPct === undefined ? undefined : Math.abs(i.deltaPct)} compact />
                  ) : i.match ? (
                    <span className="text-[11px] font-bold text-muted">Sem estoque em {filial.name}</span>
                  ) : (
                    <span className="text-[11px] font-bold text-muted">Não está mais no catálogo</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {i.now?.available && i.now.total !== undefined ? (
                  <>
                    <p className="text-sm font-extrabold tabular-nums">{brl(i.now.total)}</p>
                    <p className="text-[11px] font-semibold tabular-nums text-muted line-through">{brl(i.oldTotal)}</p>
                  </>
                ) : (
                  <p className="text-sm font-bold tabular-nums text-muted">{brl(i.oldTotal)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {ref?.url && /^https:/.test(ref.url) ? (
        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-forest hover:underline">
          Ver a nota na SEFAZ <ExternalLink size={13} aria-hidden />
        </a>
      ) : null}
    </article>
  );
}
