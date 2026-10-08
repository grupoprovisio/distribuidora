"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Loader2, Minus, Plus, Sparkles, Users, X } from "lucide-react";
import { ItemResolver } from "@/components/item-resolver";
import { GridMessage } from "@/components/product-grid";
import type { DraftItem } from "@/lib/builder-store";
import { brl } from "@/lib/format";
import { useList } from "@/lib/list-store";
import { usePrefs } from "@/lib/prefs-store";

type Mode = { id: string; name: string; items: number; images: string[] };
type Item = { key: string; path: string[]; label: string; dept: string; deptSlug: string; image?: string };

/** Busca de sugestões (modos ou a lista de um modo) na filial escolhida. */
function useSuggest<T>(mode: string | null, pick: (json: Record<string, unknown>) => T | undefined) {
  const { filial } = usePrefs();
  const [done, setDone] = useState<{ key: string; data?: T; failed?: boolean } | null>(null);
  const key = `${filial.seller}|${mode ?? ""}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/suggest?seller=${filial.seller}${mode ? `&mode=${mode}` : ""}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<Record<string, unknown>>)
      .then((j) => setDone({ key, data: j.ok ? pick(j) : undefined, failed: !j.ok }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ key, failed: true });
      });
    return () => ctrl.abort();
    // `pick` só extrai o campo da resposta: não deve refazer a busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = done && done.key === key ? done : null;
  return { status: !current ? "loading" : current.failed || !current.data ? "error" : "ready", data: current?.data } as const;
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex h-9 items-center rounded-full bg-canvas ring-1 ring-line" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Diminuir" className="grid size-9 place-items-center rounded-full active:scale-90">
        <Minus size={13} strokeWidth={2.6} aria-hidden />
      </button>
      <span className="min-w-5 text-center text-sm font-extrabold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(999, value + 1))} aria-label="Aumentar" className="grid size-9 place-items-center rounded-full active:scale-90">
        <Plus size={13} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- modos

function ModePicker() {
  const { status, data } = useSuggest<Mode[]>(null, (j) => j.modes as Mode[]);

  if (status === "loading") {
    return (
      <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Carregando sugestões">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-paper shadow-card ring-1 ring-line/70" />
        ))}
      </div>
    );
  }
  if (status === "error" || !data) return <GridMessage kind="error" />;

  return (
    <>
      <p className="mb-3 text-sm font-medium text-muted">
        Escolha um tipo de lista. Ela vem completa e você tira o que não quer. Os temas são as coleções da própria loja.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.map((m, i) => (
          <li key={m.id}>
            <Link
              href={`/lista/sugestoes?modo=${m.id}`}
              replace
              className={`flex h-full items-center gap-3 rounded-3xl p-4 shadow-card ring-1 transition-transform active:scale-[0.98] ${i === 0 ? "bg-forest text-white ring-forest" : "bg-paper ring-line/70 hover:bg-lime-soft"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-base font-extrabold leading-snug">
                  {i === 0 ? <Sparkles size={16} className="text-lime" aria-hidden /> : null}
                  {m.name}
                </span>
                <span className={`mt-0.5 block text-xs font-semibold ${i === 0 ? "text-white/70" : "text-muted"}`}>{m.items} itens sugeridos</span>
              </span>
              <span className="flex -space-x-2">
                {m.images.map((src) => (
                  <span key={src} className="relative size-10 overflow-hidden rounded-full bg-canvas ring-2 ring-paper">
                    <Image src={src} alt="" fill unoptimized sizes="40px" className="object-contain p-1" />
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- lista sugerida

function Row({
  item,
  draft,
  qty,
  included,
  onToggle,
  onQty,
  onChange,
}: {
  item: Item;
  draft: DraftItem;
  qty: number;
  included: boolean;
  onToggle: () => void;
  onQty: (n: number) => void;
  onChange: (patch: Partial<DraftItem>) => void;
}) {
  return (
    <li className={`rounded-3xl bg-paper p-3 shadow-card ring-1 transition-opacity ${included ? "ring-line/70" : "opacity-55 ring-line/40"}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={included}
          aria-label={`${included ? "Tirar" : "Incluir"} ${item.label}`}
          onClick={onToggle}
          className={`grid size-8 shrink-0 place-items-center rounded-full ring-2 transition-colors ${included ? "bg-forest text-lime ring-forest" : "bg-paper text-transparent ring-line"}`}
        >
          <Check size={16} strokeWidth={3} aria-hidden />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{item.label}</span>
        {included ? <Stepper value={qty} onChange={onQty} label={`Quantidade de ${item.label}`} /> : null}
        <button type="button" onClick={onToggle} aria-label={included ? `Remover ${item.label} da lista` : `Voltar com ${item.label}`} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:text-[#a02a4a]">
          {included ? <X size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
        </button>
      </div>
      {included ? (
        <div className="mt-2.5 pl-11">
          <ItemResolver item={draft} onChange={onChange} lazy compact />
        </div>
      ) : null}
    </li>
  );
}

function SuggestedList({ mode }: { mode: string }) {
  const { status, data } = useSuggest<{ name: string; items: Item[] }>(mode, (j) => ({ name: j.name as string, items: j.items as Item[] }));
  const { setMany } = useList();
  const [people, setPeople] = useState(4);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, Partial<DraftItem>>>({});
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<number | null>(null);

  const baseQty = Math.max(1, Math.ceil(people / 3));

  const groups = useMemo(() => {
    const map = new Map<string, { dept: string; items: Item[] }>();
    for (const it of data?.items ?? []) {
      const g = map.get(it.deptSlug) ?? { dept: it.dept, items: [] };
      g.items.push(it);
      map.set(it.deptSlug, g);
    }
    return [...map.entries()];
  }, [data]);

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2 rounded-3xl bg-paper px-5 py-6 text-sm font-bold shadow-card ring-1 ring-line/70" role="status">
        <Loader2 size={18} className="animate-spin text-forest" aria-hidden /> Montando a lista com o que mais sai na sua filial…
      </p>
    );
  }
  if (status === "error" || !data) return <GridMessage kind="error" />;

  const itemOf = (it: Item): DraftItem => ({
    id: it.key,
    text: "",
    label: it.label,
    qty: qtys[it.key] ?? baseQty,
    unit: "un",
    chosen: drafts[it.key]?.chosen ?? it.path,
    attrs: [],
    pick: drafts[it.key]?.pick,
    manual: drafts[it.key]?.manual,
  });

  const included = data.items.filter((it) => !excluded.has(it.key));
  const wanted = included.length;
  const picked = included.filter((it) => drafts[it.key]?.pick);
  const total = picked.reduce((a, it) => a + (drafts[it.key]?.pick?.total ?? 0), 0);

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const addAll = () => {
    setMany(
      picked.map((it) => {
        const p = drafts[it.key]!.pick!;
        return { id: p.id, qty: p.units, meta: { name: p.name, brand: p.brand, image: p.image, dept: p.dept } };
      }),
    );
    setAdded(picked.length);
  };

  return (
    <div className="pb-28">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl bg-paper p-4 shadow-card ring-1 ring-line/70">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight">{data.name}</h2>
          <p className="text-xs font-semibold text-muted">
            {included.length} de {data.items.length} itens · tire o que não quer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted" aria-hidden />
          <Stepper value={people} onChange={setPeople} label="Pessoas em casa" />
          <span className="text-xs font-bold text-muted">pessoas</span>
        </div>
        <div className="flex w-full items-center justify-between text-xs font-bold">
          <button type="button" onClick={() => setExcluded(new Set())} className="text-forest hover:underline">
            Incluir todos
          </button>
          <button type="button" onClick={() => setExcluded(new Set(data.items.map((i) => i.key)))} className="text-muted hover:text-ink">
            Tirar todos
          </button>
        </div>
      </div>

      {/* Os itens só buscam opções quando aparecem na tela: role para carregar os demais. */}
      {wanted > picked.length && picked.length > 0 ? (
        <p className="mb-3 px-1 text-xs font-semibold text-muted">Faltam as opções de {wanted - picked.length} itens: role a página para carregá-las, senão eles não entram na lista.</p>
      ) : null}

      <div className="space-y-5">
        {groups.map(([slug, g]) => {
          const open = !closed.has(slug);
          const inGroup = g.items.filter((it) => !excluded.has(it.key)).length;          return (
            <section key={slug} aria-label={g.dept}>
              <button
                type="button"
                onClick={() =>
                  setClosed((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(slug)) next.add(slug);
                    return next;
                  })
                }
                aria-expanded={open}
                className="mb-2 flex w-full items-center gap-2 text-left"
              >
                <span className={`grid size-7 place-items-center rounded-full bg-paper shadow-card ring-1 ring-line/70 transition-transform ${open ? "" : "-rotate-90"}`}>
                  <ChevronDown size={14} aria-hidden />
                </span>
                <span className="flex-1 text-base font-extrabold">{g.dept}</span>
                <span className="text-xs font-bold text-muted">
                  {inGroup}/{g.items.length}
                </span>
              </button>
              {open ? (
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <Row
                      key={it.key}
                      item={it}
                      draft={itemOf(it)}
                      qty={qtys[it.key] ?? baseQty}
                      included={!excluded.has(it.key)}
                      onToggle={() => toggle(it.key)}
                      onQty={(n) => setQtys((p) => ({ ...p, [it.key]: n }))}
                      onChange={(patch) => setDrafts((p) => ({ ...p, [it.key]: { ...p[it.key], ...patch } }))}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-40 flex justify-center px-4">
        {added !== null ? (
          <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-forest-deep shadow-float">
            <span className="inline-flex items-center gap-2">
              <Check size={16} aria-hidden /> {added} itens na sua lista
            </span>
            <Link href="/lista" className="rounded-full bg-forest px-4 py-1.5 text-xs text-white">
              Abrir lista
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={addAll}
            disabled={picked.length === 0}
            className="pointer-events-auto inline-flex h-14 w-full max-w-md items-center justify-between gap-3 rounded-full bg-forest px-6 text-sm font-extrabold text-white shadow-float transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <span>{picked.length === 0 ? "Carregando opções…" : `Adicionar ${picked.length}${picked.length < wanted ? ` de ${wanted}` : ""} itens à lista`}</span>
            {picked.length > 0 ? <span className="rounded-full bg-lime px-3 py-1 text-forest-deep tabular-nums">{brl(total)}</span> : null}
          </button>
        )}
      </div>
    </div>
  );
}

/** Sugestões de lista: escolha um tema, tire o que não quer e veja as melhores opções e promoções para cada item. */
export function SuggestView({ modo }: { modo?: string }) {
  const { filial } = usePrefs();
  if (!modo) return <ModePicker key={filial.seller} />;
  return (
    <>
      <Link href="/lista/sugestoes" replace className="mb-3 inline-flex items-center gap-1 rounded-full bg-paper py-1.5 pl-2 pr-3.5 text-xs font-extrabold shadow-card ring-1 ring-line/70 active:scale-95">
        <ChevronLeft size={15} aria-hidden /> Outros temas
      </Link>
      <SuggestedList key={`${filial.seller}|${modo}`} mode={modo} />
    </>
  );
}
