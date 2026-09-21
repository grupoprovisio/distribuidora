"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, X, Zap } from "lucide-react";
import { useCatalog } from "@/components/product-grid";
import type { Pick, DraftItem } from "@/lib/builder-store";
import { brl } from "@/lib/format";
import type { Option, OptionSort } from "@/lib/deals";
import { analyze, attributeQuestion, badgesFor, buildOptions, facetsOf, filterByWords, unitsOf, type Badge } from "@/lib/resolve";

const SORTS: { value: OptionSort; label: string }[] = [
  { value: "total", label: "Menor preço" },
  { value: "perBase", label: "Menor R$/kg-L" },
  { value: "tier", label: "Maior desconto" },
];

const TONE: Record<Badge["tone"], string> = {
  good: "bg-lime-soft text-forest",
  warn: "bg-sand text-[#5c3a06]",
  info: "bg-canvas text-muted ring-1 ring-line",
};

const chip = "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold ring-1 transition-colors";
const on = "bg-forest text-white ring-forest";
const off = "bg-paper ring-line hover:bg-lime-soft";

const toPick = (o: Option, units: number): Pick => ({
  id: o.product.id,
  name: o.product.name,
  brand: o.product.brand,
  image: o.product.image,
  dept: o.product.dept,
  units,
  unit: o.unit,
  total: o.total,
});

/** true depois que o elemento aparece na tela (busca só o que a pessoa vai ver). */
function useSeen(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [seen, setSeen] = useState(!enabled);
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setSeen(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

/**
 * Do item ("frango", 2 kg) às melhores opções: pergunta o que falta (só se os resultados se dividem), filtra por marca/tamanho
 * e ordena pelo preço para a quantidade pedida, avisando quando falta pouco para o preço de atacado.
 */
export function ItemResolver({
  item,
  onChange,
  lazy = false,
  compact = false,
}: {
  item: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  lazy?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useSeen(ref, lazy);
  const [open, setOpen] = useState(!compact);
  const [sort, setSort] = useState<OptionSort>("total");
  const [brand, setBrand] = useState<string | undefined>();
  const [size, setSize] = useState<string | undefined>();
  const [skipped, setSkipped] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Sem texto (item de sugestão): a busca é pela categoria, ordenada pelos mais vendidos.
  const { status, data } = useCatalog(
    seen ? { term: item.text, cat: item.chosen.join("/"), sort: item.text ? "score_desc" : "orders_desc", first: 40 } : null,
  );

  const attrs = useMemo(() => item.attrs ?? [], [item.attrs]);
  const analysis = useMemo(() => (data ? analyze(data.products, item.chosen) : null), [data, item.chosen]);
  // Depois da categoria, as palavras escolhidas (ex.: "peito") afunilam os produtos.
  const pool = useMemo(() => (analysis ? filterByWords(analysis.products, attrs) : []), [analysis, attrs]);
  const askingCategory = !!analysis?.question && !skipped;
  // Segunda pergunta: um atributo que divide os produtos (só para itens digitados, e no máximo 2 vezes).
  const [skippedAttr, setSkippedAttr] = useState(false);
  const attrQuestion = useMemo(
    () => (!askingCategory && item.text && attrs.length < 2 && !skippedAttr ? attributeQuestion(pool, item.text, attrs) : null),
    [askingCategory, item.text, attrs, skippedAttr, pool],
  );
  const asking = askingCategory || !!attrQuestion;

  const all = useMemo(() => buildOptions(pool, item.qty, item.unit, {}, sort), [pool, item.qty, item.unit, sort]);
  const options = useMemo(() => buildOptions(pool, item.qty, item.unit, { brand, size }, sort), [pool, item.qty, item.unit, brand, size, sort]);
  const facets = useMemo(() => facetsOf(all), [all]);
  const best = options[0];
  const shownOptions = showAll ? options : options.slice(0, compact && !open ? 1 : 4);

  // Sugestão automática: enquanto a pessoa não escolheu, a pick acompanha a melhor opção (e a quantidade).
  const bestId = best?.product.id;
  const bestUnits = best ? unitsOf(best, item.qty, item.unit) : 0;
  const pickId = item.pick?.id;
  const pickUnits = item.pick?.units;
  useEffect(() => {
    if (item.manual || asking || !best) return;
    if (pickId === bestId && pickUnits === bestUnits) return;
    onChange({ pick: toPick(best, bestUnits) });
    // `best` muda junto com bestId/bestUnits; onChange é estável por item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestId, bestUnits, item.manual, asking]);

  // Escolha manual precisa acompanhar a quantidade: recalcula preço/unidades da opção escolhida.
  useEffect(() => {
    if (!item.manual || !pickId) return;
    const o = all.find((x) => x.product.id === pickId);
    if (!o) return;
    const units = unitsOf(o, item.qty, item.unit);
    if (units !== pickUnits || Math.abs((item.pick?.total ?? 0) - o.total) > 0.005) onChange({ pick: toPick(o, units) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.qty, item.unit, all]);

  return (
    <div ref={ref} className="space-y-3">
      {/* Caminho escolhido */}
      {analysis && analysis.names.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted">
          {analysis.names.map((n, i) => (
            <span key={`${n}-${i}`} className="rounded-full bg-canvas px-2 py-0.5 ring-1 ring-line">
              {n}
            </span>
          ))}
          {attrs.map((a) => (
            <span key={a} className="rounded-full bg-lime-soft px-2 py-0.5 text-forest ring-1 ring-forest/30">
              {a}
            </span>
          ))}
          {item.chosen.length > 0 || attrs.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                // Desfaz a última resposta: primeiro os atributos, depois a categoria.
                if (attrs.length > 0) onChange({ attrs: attrs.slice(0, -1), manual: false });
                else onChange({ chosen: item.chosen.slice(0, -1), manual: false });
                setSkipped(false);
                setSkippedAttr(false);
              }}
              className="inline-flex items-center gap-0.5 text-forest hover:underline"
            >
              <X size={11} aria-hidden /> mudar
            </button>
          ) : null}
        </div>
      ) : null}

      {status === "loading" || status === "idle" ? (
        <p className="flex items-center gap-2 text-xs font-semibold text-muted" role="status">
          <Loader2 size={14} className="animate-spin text-forest" aria-hidden /> {seen ? "Buscando as melhores opções…" : "Aguardando…"}
        </p>
      ) : status === "error" || !analysis ? (
        <p className="text-xs font-bold text-[#a02a4a]">Não consegui buscar opções agora.</p>
      ) : pool.length === 0 ? (
        <p className="text-xs font-semibold text-muted">Nada encontrado para “{item.label}” nesta filial. Tente outro nome.</p>
      ) : attrQuestion ? (
        /* Pergunta por atributo: palavras dos nomes que dividem os resultados (ex.: o corte do frango) */
        <div className="rounded-2xl bg-sand p-3">
          <p className="text-sm font-extrabold text-[#5c3a06]">Qual tipo de “{item.label}”?</p>
          <p className="mb-2 text-[11px] font-medium text-[#5c3a06]/80">Estas são as variações que existem hoje na sua filial:</p>
          <div className="flex flex-wrap gap-1.5">
            {attrQuestion.choices.map((c) => (
              <button
                key={c.token}
                type="button"
                onClick={() => onChange({ attrs: [...attrs, c.token], manual: false })}
                className="rounded-full bg-paper px-3 py-1.5 text-xs font-extrabold ring-1 ring-line transition-colors hover:bg-lime-soft active:scale-95"
              >
                {c.label} <span className="opacity-50">{c.count}</span>
              </button>
            ))}
            <button type="button" onClick={() => setSkippedAttr(true)} className="rounded-full px-3 py-1.5 text-xs font-bold text-[#5c3a06] underline">
              Qualquer uma
            </button>
          </div>
        </div>
      ) : askingCategory && analysis.question ? (
        /* Pergunta de refinamento (só quando os resultados se dividem) */
        <div className="rounded-2xl bg-sand p-3">
          <p className="text-sm font-extrabold text-[#5c3a06]">Qual opção de “{item.label}”?</p>
          <p className="mb-2 text-[11px] font-medium text-[#5c3a06]/80">Os resultados se dividem entre estas categorias da loja:</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.question.choices.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => onChange({ chosen: [...analysis.path, c.slug], manual: false })}
                className="rounded-full bg-paper px-3 py-1.5 text-xs font-extrabold ring-1 ring-line transition-colors hover:bg-lime-soft active:scale-95"
              >
                {c.name} <span className="opacity-50">{c.count}</span>
              </button>
            ))}
            <button type="button" onClick={() => setSkipped(true)} className="rounded-full px-3 py-1.5 text-xs font-bold text-[#5c3a06] underline">
              Qualquer uma
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Melhor escolha em uma linha (modo compacto fechado) */}
          {compact && !open && best ? (
            <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 text-left" aria-label="Ver opções">
              <OptionRow option={best} units={bestUnits} badges={badgesFor(best, all, bestUnits)} selected={false} dense />
              <ChevronDown size={16} className="shrink-0 text-muted" aria-hidden />
            </button>
          ) : (
            <>
              {(facets.brands.length > 1 || facets.sizes.length > 1) && (
                <div className="space-y-1.5">
                  {facets.sizes.length > 1 ? (
                    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Tamanho">
                      {facets.sizes.slice(0, 8).map((s) => (
                        <button key={s.label} type="button" onClick={() => setSize(size === s.label ? undefined : s.label)} aria-pressed={size === s.label} className={`${chip} ${size === s.label ? on : off}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {facets.brands.length > 1 ? (
                    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Marca">
                      {facets.brands.slice(0, 10).map((b) => (
                        <button key={b.label} type="button" onClick={() => setBrand(brand === b.label ? undefined : b.label)} aria-pressed={brand === b.label} className={`${chip} ${brand === b.label ? on : off}`}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Ordenar opções">
                {SORTS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSort(s.value)} aria-pressed={sort === s.value} className={`${chip} ${sort === s.value ? on : off}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {options.length === 0 ? (
                <p className="text-xs font-semibold text-muted">Nenhuma opção com esses filtros{item.unit !== "un" ? " (só entram produtos com tamanho em " + (item.unit === "kg" ? "kg" : "L") + ")" : ""}.</p>
              ) : (
                <ul className="space-y-2">
                  {shownOptions.map((o) => {
                    const units = unitsOf(o, item.qty, item.unit);
                    const selected = item.pick?.id === o.product.id;
                    return (
                      <li key={o.product.id}>
                        <button
                          type="button"
                          onClick={() => onChange({ pick: toPick(o, units), manual: true })}
                          aria-pressed={selected}
                          className={`w-full rounded-2xl p-2 text-left ring-1 transition-colors ${selected ? "bg-lime-soft ring-forest" : "bg-paper ring-line hover:bg-canvas"}`}
                        >
                          <OptionRow option={o} units={units} badges={badgesFor(o, all, units)} selected={selected} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {options.length > shownOptions.length || showAll ? (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-extrabold text-forest hover:underline">
                  {showAll ? "Ver menos" : `Ver mais ${options.length - shownOptions.length} opções`}
                </button>
              ) : null}
              {compact && open ? (
                <button type="button" onClick={() => setOpen(false)} className="block text-xs font-extrabold text-muted hover:underline">
                  Recolher
                </button>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

function OptionRow({ option, units, badges, selected, dense = false }: { option: Option; units: number; badges: Badge[]; selected: boolean; dense?: boolean }) {
  const { product: p } = option;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className={`relative shrink-0 rounded-xl bg-canvas ${dense ? "size-11" : "size-14"}`}>
        {p.image ? <Image src={p.image} alt="" fill unoptimized sizes="56px" className="object-contain p-1" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-muted">
          {p.brand}
          {option.size ? ` · ${option.size.label}` : ""}
        </span>
        <span className="line-clamp-2 text-[13px] font-bold leading-snug">{p.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          {badges.map((b) => (
            <span key={b.key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${TONE[b.tone]}`}>
              {b.key === "gap" ? <Zap size={10} aria-hidden /> : null}
              {b.label}
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-extrabold tabular-nums">{brl(option.unit)}</span>
        {option.atTier ? <s className="block text-[10px] font-semibold tabular-nums text-muted">{brl(p.unit)}</s> : null}
        <span className="block text-[11px] font-semibold text-muted">
          {units} un · {brl(option.total)}
        </span>
        {option.perBase !== undefined ? <span className="block text-[10px] font-semibold text-muted">{brl(option.perBase)}/{option.size?.unit === "l" ? "L" : "kg"}</span> : null}
      </span>
      {selected ? <Check size={16} className="shrink-0 text-forest" aria-hidden /> : null}
    </span>
  );
}
