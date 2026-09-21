"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, Minus, Plus, Search, Trash2 } from "lucide-react";
import { ItemResolver } from "@/components/item-resolver";
import { EmptyState } from "@/components/section";
import { useBuilder, type DraftItem } from "@/lib/builder-store";
import { brl } from "@/lib/format";
import { useList } from "@/lib/list-store";
import type { Unit } from "@/lib/resolve";

const UNITS: { value: Unit; label: string }[] = [
  { value: "un", label: "un" },
  { value: "kg", label: "kg" },
  { value: "l", label: "L" },
];

/** Sugestões de busca do Atacadão para o texto digitado (ou as mais populares, com o campo vazio). */
function useTerms(q: string) {
  const [done, setDone] = useState<{ q: string; terms: string[] } | null>(null);
  const query = q.trim();

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/terms?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<{ terms: string[] }>)
        .then((d) => setDone({ q: query, terms: d.terms }))
        .catch(() => {});
    }, query ? 220 : 0);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return done && done.q === query ? done.terms : [];
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex h-10 items-center rounded-full bg-canvas ring-1 ring-line" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Diminuir" className="grid size-10 place-items-center rounded-full active:scale-90">
        <Minus size={14} strokeWidth={2.6} aria-hidden />
      </button>
      <span className="min-w-6 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(999, value + 1))} aria-label="Aumentar" className="grid size-10 place-items-center rounded-full active:scale-90">
        <Plus size={14} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

function UnitToggle({ value, onChange }: { value: Unit; onChange: (u: Unit) => void }) {
  return (
    <div role="radiogroup" aria-label="Unidade" className="flex h-10 rounded-full bg-canvas p-0.5 ring-1 ring-line">
      {UNITS.map((u) => (
        <button
          key={u.value}
          type="button"
          role="radio"
          aria-checked={value === u.value}
          onClick={() => onChange(u.value)}
          className={`min-w-10 rounded-full px-3 text-xs font-extrabold transition-colors ${value === u.value ? "bg-forest text-white" : "text-muted"}`}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
}

function DraftCard({
  item,
  open,
  onToggle,
  onChange,
  onRemove,
  onAdd,
}: {
  item: DraftItem;
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<DraftItem>) => void;
  onRemove: () => void;
  onAdd: () => void;
}) {
  const panel = useId();
  const qtyText = `${item.qty} ${item.unit === "l" ? "L" : item.unit}`;

  return (
    <li className="rounded-[2rem] bg-paper p-4 shadow-card ring-1 ring-line/70 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        {/* O cabeçalho inteiro recolhe/expande; o resumo do que foi escolhido aparece mesmo recolhido. */}
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panel} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full bg-canvas ring-1 ring-line/70 transition-transform duration-300 motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}>
            <ChevronDown size={16} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold capitalize">{item.label}</span>
            <span className="block truncate text-xs font-semibold text-muted">
              {qtyText}
              {!open && item.pick ? (
                <>
                  {" · "}
                  <span className="text-ink">{item.pick.name}</span> · <span className="font-extrabold text-ink">{brl(item.pick.total)}</span>
                  {item.added ? <span className="font-extrabold text-forest"> · na lista</span> : null}
                </>
              ) : null}
            </span>
          </span>
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remover ${item.label}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-muted hover:text-[#a02a4a]">
          <Trash2 size={15} aria-hidden />
        </button>
      </div>

      {/* Continua montado quando recolhido: a escolha automática de opção segue funcionando. */}
      <div id={panel} className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className={open ? "overflow-visible" : "overflow-hidden"} inert={!open}>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Stepper value={item.qty} onChange={(qty) => onChange({ qty, added: false })} label={`Quantidade de ${item.label}`} />
            <UnitToggle value={item.unit} onChange={(unit) => onChange({ unit, manual: false, added: false })} />
          </div>

          <div className="mt-4">
            <ItemResolver item={item} onChange={onChange} />
          </div>

          {item.pick ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="min-w-0 text-xs font-semibold text-muted">
                {item.manual ? "Sua escolha" : "Sugerida"}: <span className="font-extrabold text-ink">{brl(item.pick.total)}</span> · {item.pick.units} un
              </p>
              {item.added ? (
                <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-lime-soft px-4 text-xs font-extrabold text-forest">
                  <Check size={14} aria-hidden /> Na lista
                </span>
              ) : (
                <button type="button" onClick={onAdd} className="inline-flex h-10 items-center rounded-full bg-lime px-4 text-xs font-extrabold text-forest-deep active:scale-95">
                  Adicionar à lista
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Montar a lista do zero: digite o que precisa e a quantidade. O sistema pergunta o que falta (só quando faz diferença),
 * mostra as melhores opções para aquela quantidade e avisa quando falta pouco para o preço de atacado.
 */
export function BuilderView() {
  const { items, add, update, remove, clear } = useBuilder();
  const { setMany } = useList();
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<Unit>("un");
  const terms = useTerms(text);
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = (value = text) => {
    const label = value.trim();
    if (!label) return;
    add({ text: label, label, qty, unit, chosen: [] });
    setText("");
  };

  const addPicks = (drafts: DraftItem[]) => {
    const withPick = drafts.filter((d) => d.pick && !d.added);
    setMany(withPick.map((d) => ({ id: d.pick!.id, qty: d.pick!.units, meta: { name: d.pick!.name, brand: d.pick!.brand, image: d.pick!.image, dept: d.pick!.dept } })));
    withPick.forEach((d) => update(d.id, { added: true }));
  };

  const allClosed = items.length > 0 && items.every((d) => closed.has(d.id));
  const pending = items.filter((d) => d.pick && !d.added);
  const pendingTotal = pending.reduce((a, d) => a + (d.pick?.total ?? 0), 0);

  return (
    <div className="pb-28">
      {/* O que você precisa? */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-[2rem] bg-paper p-4 shadow-card ring-1 ring-line/70 sm:p-5"
      >
        <label htmlFor="builder-text" className="text-sm font-extrabold">
          O que você precisa?
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-canvas pl-4 pr-1 ring-1 ring-line focus-within:ring-2 focus-within:ring-forest">
          <Search size={17} className="shrink-0 text-muted" aria-hidden />
          <input
            id="builder-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
            placeholder="Ex.: frango, arroz, detergente…"
            className="h-12 min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-muted"
          />
          <button type="submit" disabled={!text.trim()} className="h-10 shrink-0 rounded-full bg-lime px-4 text-sm font-extrabold text-forest-deep transition-transform active:scale-95 disabled:opacity-40">
            Adicionar
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Stepper value={qty} onChange={setQty} label="Quantidade" />
          <UnitToggle value={unit} onChange={setUnit} />
          <span className="text-xs font-medium text-muted">{unit === "un" ? "unidades de cada" : unit === "kg" ? "kg no total" : "litros no total"}</span>
        </div>

        {terms.length > 0 ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{text.trim() ? "Sugestões" : "Mais buscados agora"}</p>
            <div className="flex flex-wrap gap-1.5">
              {terms.map((t) => (
                <button key={t} type="button" onClick={() => submit(t)} className="rounded-full bg-paper px-3 py-1.5 text-xs font-extrabold capitalize ring-1 ring-line transition-colors hover:bg-lime-soft active:scale-95">
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>

      {/* Rascunho */}
      <div className="mt-5">
        {items.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Comece pelo que você precisa"
            text="Digite um item e a quantidade. Se houver dúvida (como o corte do frango), perguntamos. Depois mostramos as melhores opções e promoções para a sua quantidade."
            action={
              <Link href="/lista/sugestoes" className="inline-flex h-12 items-center rounded-full bg-forest px-6 text-sm font-extrabold text-white active:scale-95">
                Ver listas prontas
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight">
                {items.length} {items.length === 1 ? "item" : "itens"} em montagem
              </h2>
              <div className="flex items-center gap-4">
                {items.length > 1 ? (
                  <button type="button" onClick={() => setClosed(allClosed ? new Set() : new Set(items.map((d) => d.id)))} className="text-sm font-bold text-forest hover:underline">
                    {allClosed ? "Expandir tudo" : "Recolher tudo"}
                  </button>
                ) : null}
                <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
                  <Trash2 size={15} aria-hidden /> Limpar
                </button>
              </div>
            </div>
            <ul className="space-y-4">
              {[...items].reverse().map((d) => (
                <DraftCard
                  key={d.id}
                  item={d}
                  open={!closed.has(d.id)}
                  onToggle={() => toggle(d.id)}
                  onChange={(p) => update(d.id, p)}
                  onRemove={() => remove(d.id)}
                  onAdd={() => addPicks([d])}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Barra de ação (acima da navegação) */}
      {pending.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-40 flex justify-center px-4">
          <button
            type="button"
            onClick={() => addPicks(items)}
            className="pointer-events-auto inline-flex h-14 w-full max-w-md items-center justify-between gap-3 rounded-full bg-forest px-6 text-sm font-extrabold text-white shadow-float transition-transform active:scale-[0.98]"
          >
            <span>Adicionar {pending.length} {pending.length === 1 ? "item" : "itens"} à lista</span>
            <span className="rounded-full bg-lime px-3 py-1 text-forest-deep tabular-nums">{brl(pendingTotal)}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
