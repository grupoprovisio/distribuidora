"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ExternalLink, ListChecks, Loader2, MapPin, RefreshCw, RotateCcw, ShoppingBasket, SlidersHorizontal, Tag, Trash2, TrendingDown } from "lucide-react";
import { Delta } from "@/components/delta";
import { Price } from "@/components/price";
import { QtyControl } from "@/components/qty-control";
import { SavePurchase } from "@/components/save-purchase";
import { EmptyState, primaryButton } from "@/components/section";
import { brl, pct } from "@/lib/format";
import { useList } from "@/lib/list-store";
import type { ListCompareResult, ListSellerResult } from "@/lib/lookup-types";
import { usePrefs } from "@/lib/prefs-store";
import type { PlannedItem } from "@/lib/purchase-store";

const MAX_ITEMS = 100;
const OTHER = "Outros";

type Line = {
  id: string;
  qty: number;
  name: string;
  brand?: string;
  image?: string;
  dept?: string;
  /** Unidade dos itens por peso ("150 g"). */
  pack?: string;
  /** Preço pago na última nota importada. */
  paid?: { price: number; date: string };
  /** Preço por unidade informado pela pessoa. */
  manual?: number;
  /** Marcado como comprado (modo checklist). */
  done: boolean;
};

/** Uma linha da lista já com o preço real e o desconto (quando o preço "antigo" é maior que o atual). */
type Row = {
  line: Line;
  /** Preço unitário atual na quantidade da lista (null = indisponível na filial, undefined = ainda carregando). */
  price?: number | null;
  /** Preço unitário sem desconto; só existe quando há desconto. */
  old?: number;
  /** Desconto por unidade. */
  discount: number;
  dept: string;
};

/** Preços reais da lista: o servidor simula o carrinho (cada item na sua quantidade) na filial e nas próximas. */
function useListCompare(lines: Line[]) {
  const { filial, compareSellers } = usePrefs();
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<{ key: string; data?: ListCompareResult; failed?: boolean } | null>(null);

  const items = lines.slice(0, MAX_ITEMS).map((l) => ({ id: l.id, qty: l.qty }));
  const body = JSON.stringify({ items, seller: filial.seller, sellers: compareSellers.filter((s) => s !== filial.seller) });
  const key = items.length > 0 ? `${attempt}|${body}` : null;

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    // Pequena espera: some enquanto a pessoa ainda está mexendo nas quantidades.
    const timer = window.setTimeout(() => {
      fetch("/api/list/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: key.slice(key.indexOf("|") + 1),
        signal: ctrl.signal,
      })
        .then((r) => r.json() as Promise<ListCompareResult>)
        .then((data) => setDone({ key, data }))
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setDone({ key, failed: true });
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [key]);

  const current = done && done.key === key ? done : null;
  const status = !key ? "idle" : !current ? "loading" : current.failed || !current.data?.ok ? "error" : "ready";
  return { status, data: current?.data?.ok ? current.data : undefined, retry: () => setAttempt((a) => a + 1) } as const;
}

/** Filiais com todos os itens primeiro (do menor total ao maior); as incompletas depois, pelas que têm menos faltas. */
function rank(sellers: ListSellerResult[]) {
  return [...sellers].sort((a, b) => Number(a.missing > 0) - Number(b.missing > 0) || a.missing - b.missing || a.total - b.total);
}

const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
const available = (r: Row): r is Row & { price: number } => typeof r.price === "number";

/**
 * Valor de uma linha marcada como comprada: o preço de hoje; sem ele (o item existe na loja mas não no catálogo online),
 * o que a pessoa informou ou, se veio de uma nota, o preço pago nela. `source` diz de onde saiu.
 */
function boughtValue(r: Row): { unit: number; source: "catalog" | "manual" | "receipt" } | null {
  if (typeof r.price === "number") return { unit: r.price, source: "catalog" };
  if (r.line.manual !== undefined) return { unit: r.line.manual, source: "manual" };
  if (r.line.paid) return { unit: r.line.paid.price, source: "receipt" };
  return null;
}

/** Valor antigo tachado + valor novo em destaque. */
function PriceTag({ row, size = "md" }: { row: Row & { price: number }; size?: "md" | "sm" }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {row.old !== undefined ? (
        <s className="text-xs font-bold text-muted decoration-[#a02a4a]/70 decoration-2" aria-label={`preço antigo ${brl(row.old)}`}>
          {brl(row.old)}
        </s>
      ) : null}
      <Price value={row.price} className={`${size === "md" ? "text-lg sm:text-xl" : "text-base"} ${row.old !== undefined ? "text-forest" : ""}`} />
    </span>
  );
}

/** Caixa de marcar do modo checklist ("já comprei"). */
function Check_({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`grid size-9 shrink-0 place-items-center rounded-full ring-2 transition-colors ${checked ? "bg-forest text-lime ring-forest" : "bg-paper text-transparent ring-line hover:ring-forest/50"}`}
    >
      <Check size={18} strokeWidth={3} aria-hidden />
    </button>
  );
}

const dayMonth = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

/** Campo para informar quanto pagou por unidade num item sem preço no catálogo. */
function ManualPrice({ line, onSave }: { line: Line; onSave: (v: number | undefined) => void }) {
  const initial = line.manual ?? line.paid?.price;
  const [text, setText] = useState(initial === undefined ? "" : String(initial).replace(".", ","));

  const commit = () => {
    const n = parseFloat(text.replace(/\./g, "").replace(",", "."));
    onSave(text.trim() === "" || !Number.isFinite(n) || n < 0 ? undefined : Math.round(n * 100) / 100);
  };

  return (
    <label className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-sand px-3 py-2 text-[11px] font-bold text-[#5c3a06]">
      <span>Sem preço no catálogo online. Quanto pagou (por un)?</span>
      <span className="flex items-center gap-1 rounded-full bg-paper px-3 py-1 ring-1 ring-line focus-within:ring-2 focus-within:ring-forest">
        R$
        <input
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), undefined)}
          inputMode="decimal"
          placeholder={line.paid ? String(line.paid.price).replace(".", ",") : "0,00"}
          aria-label={`Preço pago por unidade de ${line.name}`}
          className="w-16 bg-transparent text-sm font-extrabold text-ink outline-none placeholder:font-medium placeholder:text-muted"
        />
      </span>
    </label>
  );
}

function ItemRow({
  row,
  status,
  checklist,
  onToggleDone,
  onManual,
}: {
  row: Row;
  status: string;
  checklist: boolean;
  onToggleDone: () => void;
  onManual: (v: number | undefined) => void;
}) {
  const { line, price, old, discount } = row;
  const done = checklist && line.done;
  return (
    <li className={`flex items-center gap-3 rounded-3xl bg-paper p-3 shadow-card ring-1 ring-line/70 transition-opacity sm:gap-4 sm:p-4 ${done ? "opacity-60" : ""}`}>
      {checklist ? <Check_ checked={line.done} onToggle={onToggleDone} label={`${line.done ? "Desmarcar" : "Marcar como comprado"}: ${line.name}`} /> : null}
      <span className="relative size-20 shrink-0 rounded-2xl bg-canvas sm:size-24">
        {line.image ? <Image src={line.image} alt="" fill unoptimized sizes="96px" className="object-contain p-1.5" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        {line.brand ? <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">{line.brand}</p> : null}
        <p className={`line-clamp-2 text-sm font-bold leading-snug sm:text-base ${done ? "line-through decoration-2" : ""}`}>{line.name}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {available(row) ? (
            <>
              <PriceTag row={row} />
              <span className="text-xs font-medium text-muted">/ {line.pack ?? "un"}</span>
              {old !== undefined ? (
                <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[10px] font-extrabold text-forest">
                  −{brl(discount)} ({pct((discount / old) * 100)})
                </span>
              ) : null}
            </>
          ) : price === null ? (
            <span className="rounded-full bg-blush px-2.5 py-1 text-[11px] font-extrabold text-[#a02a4a]">{checklist ? "Sem preço no catálogo" : "Indisponível nesta filial"}</span>
          ) : status === "error" ? (
            <span className="text-xs font-bold text-muted">preço indisponível agora</span>
          ) : (
            <span className="h-5 w-24 animate-pulse rounded-full bg-canvas" aria-label="Carregando preço" />
          )}
        </div>

        {available(row) ? (
          <p className="mt-1 text-xs font-semibold text-muted">
            Subtotal{" "}
            {old !== undefined ? <s className="decoration-[#a02a4a]/70">{brl(old * line.qty)}</s> : null}{" "}
            <span className={old !== undefined ? "font-extrabold text-forest" : ""}>{brl(row.price * line.qty)}</span>
            {old !== undefined ? <span className="text-forest"> · economia {brl(discount * line.qty)}</span> : null}
          </p>
        ) : null}

        {/* Checklist: o item existe na loja, mas não tem preço no catálogo online. Informar o valor faz ele contar no total. */}
        {checklist && price === null ? <ManualPrice line={line} onSave={onManual} /> : null}
        {checklist && price === null && line.done && boughtValue(row) ? (
          <p className="mt-1 text-[11px] font-semibold text-muted">
            Contando {brl(boughtValue(row)!.unit * line.qty)} no total ({boughtValue(row)!.source === "manual" ? "valor informado" : "preço da nota"}).
          </p>
        ) : null}

        {/* Item importado de uma nota: quanto foi pago na última compra × hoje. */}
        {line.paid && available(row) ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-muted">
            <span>
              Na nota{dayMonth(line.paid.date) ? ` de ${dayMonth(line.paid.date)}` : ""}: {brl(line.paid.price)}
            </span>
            <Delta abs={row.price - line.paid.price} pctValue={line.paid.price > 0 ? Math.abs(((row.price - line.paid.price) / line.paid.price) * 100) : undefined} compact />
          </p>
        ) : null}
      </div>
      <QtyControl productId={line.id} name={line.name} />
    </li>
  );
}

/** Seção retrátil de um departamento (ex.: Limpeza). */
function Section({
  dept,
  rows,
  open,
  onToggle,
  status,
  checklist,
  onToggleDone,
  onManual,
}: {
  dept: string;
  rows: Row[];
  open: boolean;
  onToggle: () => void;
  status: string;
  checklist: boolean;
  onToggleDone: (id: string) => void;
  onManual: (id: string, v: number | undefined) => void;
}) {
  const panel = useId();
  const priced = rows.filter(available);
  const subtotal = sum(priced, (r) => r.price * r.line.qty);
  const saving = sum(priced, (r) => r.discount * r.line.qty);
  const doneCount = rows.filter((r) => r.line.done).length;
  // No checklist, o que já foi comprado desce para o fim da seção.
  const ordered = checklist ? [...rows].sort((a, b) => Number(a.line.done) - Number(b.line.done)) : rows;

  return (
    <section aria-label={dept}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panel}
        className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-full bg-paper shadow-card ring-1 ring-line/70 transition-transform duration-300 motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}>
          <ChevronDown size={16} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold tracking-tight">{dept}</span>
          <span className="block text-xs font-semibold text-muted">
            {checklist ? (
              <span className={doneCount === rows.length ? "font-extrabold text-forest" : ""}>
                {doneCount}/{rows.length} comprados
              </span>
            ) : (
              <>
                {rows.length} {rows.length === 1 ? "item" : "itens"}
              </>
            )}
            {saving > 0.004 ? <span className="text-forest"> · economia {brl(saving)}</span> : null}
          </span>
        </span>
        {priced.length > 0 ? <span className="shrink-0 text-base font-extrabold tabular-nums">{brl(subtotal)}</span> : null}
      </button>

      {/* Recolhe suavemente: a altura anima entre 0fr e 1fr. */}
      <div
        id={panel}
        className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className={open ? "overflow-visible" : "overflow-hidden"} inert={!open}>
          <ul className="space-y-3 pb-1 pt-1">
            {ordered.map((row) => (
              <ItemRow key={row.line.id} row={row} status={status} checklist={checklist} onToggleDone={() => onToggleDone(row.line.id)} onManual={(v) => onManual(row.line.id, v)} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ListView() {
  const { qty, meta, count, clear, checklist, done, toggleDone, setManualPrice, setChecklist, clearDone } = useList();
  const { prefs, filial, nameOf, kmOf } = usePrefs();
  const [closed, setClosed] = useState<Set<string>>(new Set());

  // Itens guardados por versões antigas do app podem não ter nome/foto: mostra o código, e o preço continua real.
  const lines: Line[] = Object.entries(qty).map(([id, n]) => ({
    id,
    qty: n,
    name: meta[id]?.name ?? `Produto ${id}`,
    brand: meta[id]?.brand,
    image: meta[id]?.image,
    dept: meta[id]?.dept,
    pack: meta[id]?.pack,
    paid: meta[id]?.paid,
    manual: meta[id]?.manual,
    done: !!done[id],
  }));

  const { status, data, retry } = useListCompare(lines);

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="Sua lista está vazia"
        text="Adicione produtos pela busca ou escaneando o código de barras para ver o total real em cada filial."
        action={
          <Link href="/scan" className={primaryButton}>
            Escanear um produto
          </Link>
        }
      />
    );
  }

  const selected = data?.sellers.find((s) => s.seller === filial.seller);
  const ranking = data ? rank(data.sellers) : [];
  const best = ranking[0];
  const comparing = prefs.compare === "filiais" && (data?.sellers.length ?? 0) > 1;

  // Preço atual, preço antigo (só quando há desconto) e departamento de cada linha.
  const rows: Row[] = lines.map((line) => {
    const price = selected?.prices[line.id];
    const oldPrice = data?.old[line.id];
    const has = typeof price === "number" && typeof oldPrice === "number" && oldPrice - price > 0.004;
    return {
      line,
      price,
      old: has ? oldPrice : undefined,
      discount: has ? oldPrice - price : 0,
      dept: data?.categories[line.id] ?? line.dept ?? OTHER,
    };
  });

  const priced = rows.filter(available);
  const totalNew = sum(priced, (r) => r.price * r.line.qty);
  const totalOld = sum(priced, (r) => (r.old ?? r.price) * r.line.qty);
  const savings = totalOld - totalNew;
  const discounted = priced.filter((r) => r.old !== undefined).sort((a, b) => b.discount * b.line.qty - a.discount * a.line.qty);
  const missing = rows.filter((r) => r.price === null).length;
  const saving = selected && best && selected.missing === 0 && best.missing === 0 ? selected.total - best.total : 0;

  // Checklist: quanto já foi comprado e quanto falta (preços de hoje, com desconto).
  const doneCount = lines.filter((l) => l.done).length;
  // Comprado conta mesmo sem preço no catálogo (valor informado ou da nota); o que falta só considera o que tem preço.
  const boughtRows = rows.filter((r) => r.line.done);
  const boughtTotal = sum(boughtRows, (r) => (boughtValue(r)?.unit ?? 0) * r.line.qty);
  const estimated = boughtRows.filter((r) => r.price === null && boughtValue(r) !== null).length;
  const unpriced = boughtRows.filter((r) => r.price === null && boughtValue(r) === null).length;
  const remainingTotal = sum(priced.filter((r) => !r.line.done), (r) => r.price * r.line.qty);

  // O que a compra salva guarda: cada item com o preço previsto (o de hoje; sem ele, o informado ou o da última nota).
  const plannedItems: PlannedItem[] = rows.map((r) => ({
    id: r.line.id,
    name: r.line.name,
    brand: r.line.brand,
    image: r.line.image,
    dept: r.dept === OTHER ? undefined : r.dept,
    qty: r.line.qty,
    unit: typeof r.price === "number" ? r.price : (r.line.manual ?? r.line.paid?.price ?? null),
  }));

  // Seções por departamento, em ordem alfabética ("Outros" por último).
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(r.dept, [...(groups.get(r.dept) ?? []), r]);
  const depts = [...groups.keys()].sort((a, b) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b, "pt-BR")));

  const toggle = (dept: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (!next.delete(dept)) next.add(dept);
      return next;
    });
  const allClosed = depts.every((d) => closed.has(d));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10">
      <section aria-label="Itens da lista">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight">
            {count} {count === 1 ? "item" : "itens"}
          </h2>
          <div className="flex items-center gap-4">
            {depts.length > 1 ? (
              <button type="button" onClick={() => setClosed(allClosed ? new Set() : new Set(depts))} className="text-sm font-bold text-forest hover:underline">
                {allClosed ? "Expandir tudo" : "Recolher tudo"}
              </button>
            ) : null}
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
              <Trash2 size={15} aria-hidden /> Limpar
            </button>
          </div>
        </div>

        {/* Modo checklist: marcar o que já foi colocado no carrinho / comprado. */}
        <div className="mb-3 rounded-3xl bg-paper p-3 shadow-card ring-1 ring-line/70">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={checklist}
              onClick={() => setChecklist(!checklist)}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checklist ? "bg-forest" : "bg-line"}`}>
                <span className={`absolute top-0.5 size-6 rounded-full bg-paper shadow-card transition-transform motion-reduce:transition-none ${checklist ? "translate-x-[1.35rem]" : "translate-x-0.5"}`} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-extrabold">
                  <ListChecks size={15} aria-hidden /> Modo checklist
                </span>
                <span className="block truncate text-xs font-medium text-muted">Marque o que já foi comprado</span>
              </span>
            </button>
            {checklist && doneCount > 0 ? (
              <button type="button" onClick={clearDone} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
                <RotateCcw size={13} aria-hidden /> Desmarcar tudo
              </button>
            ) : null}
          </div>
          {checklist ? (
            <div className="mt-3" role="status">
              <div className="flex items-baseline justify-between text-xs font-bold">
                <span>
                  {doneCount} de {lines.length} comprados
                </span>
                <span className="text-muted">{Math.round((doneCount / lines.length) * 100)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-forest transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(doneCount / lines.length) * 100}%` }} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          {depts.map((dept) => (
            <Section
              key={dept}
              dept={dept}
              rows={groups.get(dept)!}
              open={!closed.has(dept)}
              onToggle={() => toggle(dept)}
              status={status}
              checklist={checklist}
              onToggleDone={toggleDone}
              onManual={setManualPrice}
            />
          ))}
        </div>
        {lines.length > MAX_ITEMS ? (
          <p className="mt-3 text-xs font-medium text-muted">A comparação considera os {MAX_ITEMS} primeiros itens da lista.</p>
        ) : null}
      </section>

      <aside aria-label="Total da lista" className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-[2rem] bg-forest p-5 text-white shadow-card sm:p-6" aria-live="polite">
          {status === "loading" || status === "idle" ? (
            <div className="flex items-center gap-3 py-6">
              <Loader2 size={22} className="animate-spin text-lime" aria-hidden />
              <div>
                <p className="text-sm font-extrabold">Consultando preços reais…</p>
                <p className="text-xs font-medium text-white/70">Cada item, na sua quantidade{prefs.compare === "filiais" ? ", em cada filial" : ""}.</p>
              </div>
            </div>
          ) : status === "error" || !selected ? (
            <div className="py-3">
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <AlertTriangle size={18} className="text-lime" aria-hidden /> Não consegui consultar os preços
              </p>
              <button type="button" onClick={retry} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-lime px-4 text-xs font-extrabold text-forest-deep active:scale-95">
                <RefreshCw size={14} aria-hidden /> Tentar de novo
              </button>
            </div>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/60">
                <MapPin size={13} aria-hidden /> Atacadão {filial.name}
              </p>

              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-semibold text-white/75">Total sem desconto</dt>
                  <dd className={`font-bold tabular-nums ${savings > 0.004 ? "text-white/60 line-through decoration-white/50" : ""}`}>{brl(totalOld)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-semibold text-white/75">Descontos</dt>
                  <dd className="font-extrabold tabular-nums text-lime">{savings > 0.004 ? `−${brl(savings)}` : brl(0)}</dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-white/15 pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-white/60">Total com desconto</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <Price value={totalNew} className="text-4xl text-lime" />
                  {savings > 0.004 && totalOld > 0 ? (
                    <span className="mb-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-extrabold text-forest-deep">
                      você economiza {pct((savings / totalOld) * 100)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Checklist: quanto já foi comprado e quanto ainda falta. */}
              {checklist ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-center" aria-label="Andamento da compra">
                  <div className="rounded-2xl bg-white/10 px-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-white/60">Já comprado</dt>
                    <dd className="text-sm font-extrabold tabular-nums">{brl(boughtTotal)}</dd>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-2 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-white/60">Falta comprar</dt>
                    <dd className="text-sm font-extrabold tabular-nums text-lime">{brl(Math.max(remainingTotal, 0))}</dd>
                  </div>
                </dl>
              ) : null}
              {checklist && (estimated > 0 || unpriced > 0) ? (
                <p className="mt-2 text-[11px] font-semibold text-white/70">
                  {estimated > 0 ? `${estimated === 1 ? "1 item comprado sem preço no catálogo entrou" : `${estimated} itens comprados sem preço no catálogo entraram`} com o valor informado ou o da nota.` : ""}
                  {unpriced > 0 ? ` ${unpriced === 1 ? "1 comprado ainda está sem valor" : `${unpriced} comprados ainda estão sem valor`}: informe o preço no item.` : ""}
                </p>
              ) : null}

              {missing > 0 ? (
                <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold">
                  {missing === 1 ? "1 item não está disponível" : `${missing} itens não estão disponíveis`} no catálogo desta filial e {missing === 1 ? "ficou" : "ficaram"} fora do total
                  {checklist ? " (a menos que estejam marcados como comprados)" : ""}.
                </p>
              ) : null}

              {discounted.length > 0 ? (
                <div className="mt-4 border-t border-white/15 pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/60">
                    <Tag size={13} aria-hidden /> Onde você economiza
                  </p>
                  <ul className="space-y-1.5">
                    {discounted.map((r) => (
                      <li key={r.line.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/10 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{r.line.name}</span>
                          <span className="block text-[11px] font-semibold text-white/65">
                            {r.line.qty > 1 ? "Preço de atacado" : "Promoção"} · {r.line.qty} un × −{brl(r.discount)} ({pct((r.discount / r.old!) * 100)})
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-extrabold tabular-nums text-lime">−{brl(r.discount * r.line.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-xs font-medium text-white/65">Nenhum item da lista tem desconto por quantidade nesta filial.</p>
              )}
            </>
          )}

          <a href="https://www.atacadao.com.br" target="_blank" rel="noopener noreferrer" className={`${primaryButton} mt-5 w-full`}>
            Finalizar no site do Atacadão <ExternalLink size={15} aria-hidden />
          </a>
        </div>

        {/* Salvar a compra na conta: depois da ida ao mercado, a NFC-e mostra o que foi previsto × pago. */}
        {status === "ready" && selected ? <SavePurchase items={plannedItems} total={sum(plannedItems, (i) => (i.unit ?? 0) * i.qty)} filial={{ seller: filial.seller, name: filial.name }} /> : null}

        {/* Comparação entre filiais: só no modo "Entre filiais". */}
        {status === "ready" && selected ? (
          comparing && best ? (
            <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6" aria-label="Comparar filiais">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Menor total entre filiais</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <Price value={best.total} className="text-3xl text-forest" />
                <p className="pb-1 text-sm font-extrabold">{nameOf(best.seller)}</p>
              </div>
              {best.missing > 0 ? (
                <p className="mt-2 rounded-2xl bg-sand px-3 py-2 text-xs font-bold text-[#5c3a06]">Nenhuma filial tem todos os itens. A melhor tem {lines.length - best.missing} de {lines.length}.</p>
              ) : saving > 0.004 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1.5 text-xs font-extrabold text-forest">
                  <TrendingDown size={14} aria-hidden /> Economia de {brl(saving)} vs. {filial.name}
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-muted">Sua filial já é a mais barata para esta lista.</p>
              )}

              <ol className="mt-4 space-y-1.5">
                {ranking.map((s, i) => {
                  const km = kmOf(s.seller);
                  return (
                    <li key={s.seller} className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm ${i === 0 ? "bg-lime-soft" : "bg-canvas"}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {nameOf(s.seller)}
                          {s.seller === filial.seller ? <span className="ml-1.5 text-[10px] font-extrabold text-muted">SUA FILIAL</span> : null}
                        </span>
                        <span className="block text-[11px] font-semibold text-muted">
                          {km !== undefined ? `${String(km).replace(".", ",")} km` : ""}
                          {km !== undefined && s.missing > 0 ? " · " : ""}
                          {s.missing > 0 ? `faltam ${s.missing} ${s.missing === 1 ? "item" : "itens"}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-extrabold tabular-nums">{s.missing >= Math.min(lines.length, MAX_ITEMS) ? "—" : brl(s.total)}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <Link href="/conta/configuracoes" className="flex items-center gap-2 rounded-3xl bg-paper px-4 py-3 text-xs font-bold text-muted shadow-card ring-1 ring-line/70 hover:bg-lime-soft">
              <SlidersHorizontal size={14} className="shrink-0 text-forest" aria-hidden />
              <span>Quer comparar com as filiais próximas? Mude o tipo de comparação nas Configurações.</span>
            </Link>
          )
        ) : null}

        <p className="px-2 text-[11px] font-medium text-muted">Preços do Atacadão consultados agora, na quantidade de cada item. Podem mudar até a compra.</p>
      </aside>
    </div>
  );
}
