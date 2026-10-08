"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ChevronRight, ExternalLink, Loader2, MapPin, RefreshCw, SearchX, ShoppingBasket, SlidersHorizontal, Trophy, TrendingDown, X } from "lucide-react";
import { Delta } from "@/components/delta";
import { HeartButton } from "@/components/heart-button";
import { Price } from "@/components/price";
import { QtyControl } from "@/components/qty-control";
import { brl, pct } from "@/lib/format";
import { useList, type ItemMeta } from "@/lib/list-store";
import type { FilialOffer, LookupOk, LookupProduct, LookupResult, SimilarItem } from "@/lib/lookup-types";
import { usePrefs } from "@/lib/prefs-store";
import { baseLabel } from "@/lib/size";

// ---------------------------------------------------------------- dados

/** Busca o produto pelo EAN com a filial, a quantidade e o modo de comparação das configurações. */
export function useLookup(ean: string | null) {
  const { filial, prefs, compareSellers } = usePrefs();
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<{ key: string; data?: LookupResult; failed?: boolean } | null>(null);

  const params = new URLSearchParams({ ean: ean ?? "", seller: filial.seller, qty: String(prefs.qty) });
  if (compareSellers.length > 1) params.set("sellers", compareSellers.join(","));
  const key = ean ? `${params.toString()}#${attempt}` : null;

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/lookup?${key.split("#")[0]}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<LookupResult>)
      .then((data) => setDone({ key, data }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ key, failed: true });
      });
    return () => ctrl.abort();
  }, [key]);

  const current = done && done.key === key ? done : null;
  const status = !key ? "idle" : !current ? "loading" : current.failed ? "error" : "ready";
  return { status, data: current?.data, retry: () => setAttempt((a) => a + 1) } as const;
}

// ---------------------------------------------------------------- peças

function Thumb({ src, size = 48 }: { src?: string; size?: number }) {
  return (
    <span className="relative shrink-0 rounded-2xl bg-canvas" style={{ width: size, height: size }}>
      {src ? <Image src={src} alt="" fill unoptimized sizes={`${size}px`} className="object-contain p-1" /> : null}
    </span>
  );
}

const section = "mt-5";
const h3 = "mb-2 text-sm font-extrabold";

function Banner({ tone, children }: { tone: "good" | "warn" | "info"; children: React.ReactNode }) {
  const cls = { good: "bg-lime-soft text-forest", warn: "bg-sand text-[#5c3a06]", info: "bg-canvas text-muted ring-1 ring-line" }[tone];
  return <p className={`rounded-3xl px-4 py-3 text-sm font-bold leading-snug ${cls}`}>{children}</p>;
}

/** Veredito na quantidade escolhida: existe outra marca de mesma embalagem mais barata? */
function Verdict({ data, filialName }: { data: LookupOk; filialName: string }) {
  const { offer, similar, similarTotal, qty } = data;
  const un = `${qty} un`;
  if (!offer.available) {
    return <Banner tone="warn">Indisponível em {filialName} para {un}. Veja as alternativas abaixo.</Banner>;
  }
  if (similar.length === 0) {
    return <Banner tone="info">Não achei outras marcas de mesma embalagem disponíveis em {filialName}.</Banner>;
  }
  const best = similar[0];
  if ((best.deltaAbs ?? 0) < 0) {
    return (
      <Banner tone="warn">
        Para {un}, a {best.brand} sai {brl(Math.abs(best.deltaAbs ?? 0))} ({pct(Math.abs(best.deltaPct ?? 0))}) mais barata por unidade —{" "}
        {brl(Math.abs((best.deltaAbs ?? 0) * qty))} a menos no total.
      </Banner>
    );
  }
  return (
    <Banner tone="good">
      Para {un}, este é o mais barato entre {similarTotal + 1} marcas com a mesma embalagem em {filialName}.
    </Banner>
  );
}

function SimilarList({ items, total, qty, onOpen }: { items: SimilarItem[]; total: number; qty: number; onOpen: (item: SimilarItem) => void }) {
  if (items.length === 0) return null;
  return (
    <section className={section} aria-label="Semelhantes de outras marcas">
      <h3 className={h3}>
        Semelhantes de outras marcas <span className="font-bold text-muted">· preço para {qty} un · toque para ver</span>
      </h3>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.ean}>
            <button
              type="button"
              onClick={() => onOpen(s)}
              aria-label={`Ver ${s.name}`}
              className="flex w-full items-center gap-3 rounded-3xl bg-paper p-2.5 text-left ring-1 ring-line transition-colors hover:bg-canvas active:scale-[0.99]"
            >
              <Thumb src={s.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">{s.brand}</p>
                <p className="line-clamp-2 text-[13px] font-bold leading-snug">{s.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Delta abs={s.deltaAbs} pctValue={s.deltaPct === undefined ? undefined : Math.abs(s.deltaPct)} />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Price value={s.atQty} className="text-base" />
                <p className="mt-1 text-[11px] font-semibold text-muted">total {brl(s.total)}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {total > items.length ? <p className="mt-2 text-[11px] font-medium text-muted">Mostrando os {items.length} mais baratos de {total}.</p> : null}
    </section>
  );
}

function FiliaisList({ filiais, selected, nameOf, kmOf, qty }: { filiais: FilialOffer[]; selected: string; nameOf: (s: string) => string; kmOf: (s: string) => number | undefined; qty: number }) {
  const sorted = [...filiais].sort((a, b) => Number(b.available) - Number(a.available) || (a.atQty ?? Infinity) - (b.atQty ?? Infinity));
  const bestSeller = sorted[0]?.available ? sorted[0].seller : undefined;
  return (
    <section className={section} aria-label="Comparar filiais">
      <h3 className={h3}>
        Nas filiais próximas <span className="font-bold text-muted">· preço para {qty} un</span>
      </h3>
      <ol className="space-y-1.5">
        {sorted.map((f) => {
          const km = kmOf(f.seller);
          return (
            <li key={f.seller} className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${f.seller === bestSeller ? "bg-lime-soft" : "bg-canvas"}`}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-extrabold">
                  {f.seller === bestSeller ? <Trophy size={14} className="shrink-0 text-forest" aria-hidden /> : null}
                  <span className="truncate">{nameOf(f.seller)}</span>
                  {f.seller === selected ? <span className="shrink-0 rounded-full bg-paper px-1.5 py-0.5 text-[10px] font-extrabold text-muted">sua filial</span> : null}
                </p>
                {km !== undefined ? <p className="text-[11px] font-medium text-muted">{String(km).replace(".", ",")} km</p> : null}
              </div>
              {f.available && f.atQty !== undefined ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Price value={f.atQty} className="text-base" />
                  {f.seller !== selected ? <Delta abs={f.deltaAbs} pctValue={f.deltaPct === undefined ? undefined : Math.abs(f.deltaPct)} compact /> : null}
                </div>
              ) : (
                <span className="shrink-0 text-xs font-bold text-muted">indisponível</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Popup "tem um mais barato": aparece ao adicionar um produto quando existe, na mesma quantidade,
 * um semelhante de outra marca mais barato. Pergunta se a pessoa quer ver o mais barato.
 */
function CheaperDialog({
  base,
  offerAtQty,
  cheaper,
  qty,
  onView,
  onKeep,
  onClose,
}: {
  base: LookupProduct;
  offerAtQty: number;
  cheaper: SimilarItem;
  qty: number;
  onView: () => void;
  onKeep: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const savePerUnit = Math.abs(cheaper.deltaAbs ?? 0);
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/55 p-4 sm:place-items-center" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cheaper-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-in w-full max-w-md rounded-[2rem] bg-paper p-5 text-ink shadow-float"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lime-soft text-forest">
            <TrendingDown size={22} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="cheaper-title" className="text-lg font-extrabold leading-tight">
              Tem um mais barato
            </h2>
            <p className="mt-0.5 text-sm font-medium text-muted">
              Para {qty} un, a <span className="font-extrabold text-ink">{cheaper.brand}</span> sai{" "}
              <span className="font-extrabold text-forest">
                {brl(savePerUnit)} ({pct(Math.abs(cheaper.deltaPct ?? 0))}) mais barata
              </span>{" "}
              por unidade. Você economiza {brl(savePerUnit * qty)} no total.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-8 shrink-0 place-items-center rounded-full bg-canvas text-muted">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5 ring-1 ring-line">
            <Thumb src={base.image} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Você está vendo</p>
              <p className="line-clamp-1 text-[13px] font-bold">{base.name}</p>
            </div>
            <Price value={offerAtQty} className="text-base" />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-lime-soft p-2.5 ring-1 ring-forest/30">
            <Thumb src={cheaper.image} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-forest">Mais barato</p>
              <p className="line-clamp-1 text-[13px] font-bold">{cheaper.name}</p>
            </div>
            <Price value={cheaper.atQty} className="text-base" />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            autoFocus
            onClick={onView}
            className="inline-flex h-12 items-center justify-center rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep transition-transform active:scale-[0.97]"
          >
            Ver o mais barato
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="inline-flex h-12 items-center justify-center rounded-full bg-canvas px-6 text-sm font-extrabold ring-1 ring-line transition-transform active:scale-[0.97]"
          >
            Adicionar este mesmo assim
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Adiciona o produto à lista (na quantidade da comparação) e, depois, vira um stepper.
 * Se houver um semelhante mais barato na mesma quantidade, pergunta antes se a pessoa quer vê-lo.
 */
function AddToList({ data, onOpen }: { data: LookupOk; onOpen: (item: SimilarItem) => void }) {
  const { getQty, setQty } = useList();
  const [ask, setAsk] = useState<SimilarItem | null>(null);
  const { product, qty, offer } = data;
  const inList = getQty(product.skuId);
  const meta: ItemMeta = { name: product.name, brand: product.brand, image: product.image, ean: product.ean, dept: product.categoryPath[0] };

  const add = () => setQty(product.skuId, qty, meta);

  // `similar` vem do mais barato ao mais caro: o primeiro com diferença negativa é o mais barato de todos.
  const cheaper = offer.available ? data.similar.find((s) => (s.deltaAbs ?? 0) < 0) : undefined;

  if (inList === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => (cheaper ? setAsk(cheaper) : add())}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep shadow-card transition-transform active:scale-[0.97]"
        >
          <ShoppingBasket size={17} aria-hidden /> Adicionar {qty} un à lista
        </button>
        {ask && offer.atQty !== undefined ? (
          <CheaperDialog
            base={product}
            offerAtQty={offer.atQty}
            cheaper={ask}
            qty={qty}
            onClose={() => setAsk(null)}
            onKeep={() => {
              add();
              setAsk(null);
            }}
            onView={() => {
              setAsk(null);
              onOpen(ask);
            }}
          />
        ) : null}
      </>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-full bg-lime-soft p-1.5 pl-5 shadow-card">
      <Link href="/lista" className="min-w-0 flex-1 truncate text-sm font-extrabold text-forest">
        Na sua lista · {inList} un
      </Link>
      <QtyControl productId={product.skuId} name={product.name} meta={meta} />
    </div>
  );
}

// ---------------------------------------------------------------- estados

function Loading() {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-canvas px-4 py-5" role="status" aria-live="polite">
      <Loader2 size={20} className="animate-spin text-forest" aria-hidden />
      <div>
        <p className="text-sm font-extrabold">Buscando o produto…</p>
        <p className="text-xs font-medium text-muted">Consultando preços na sua filial e nas marcas semelhantes.</p>
      </div>
    </div>
  );
}

function Failure({ kind, ean, onRetry }: { kind: "not_found" | "error" | "invalid"; ean: string; onRetry: () => void }) {
  const notFound = kind === "not_found";
  const Icon = notFound ? SearchX : AlertTriangle;
  return (
    <div className="rounded-3xl bg-canvas px-4 py-5 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-sand text-[#5c3a06]">
        <Icon size={22} aria-hidden />
      </span>
      <p className="mt-3 text-sm font-extrabold">{notFound ? "Produto não encontrado na Distribuidora" : "Não consegui buscar o produto"}</p>
      <p className="mt-1 text-xs font-medium text-muted">
        {notFound ? `O código ${ean} não está no catálogo.` : "Verifique a conexão e tente de novo."}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        {!notFound ? (
          <button type="button" onClick={onRetry} className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95">
            <RefreshCw size={14} aria-hidden /> Tentar de novo
          </button>
        ) : null}
        <Link href={`/buscar?q=${encodeURIComponent(ean)}`} className="inline-flex h-10 items-center rounded-full bg-paper px-4 text-xs font-extrabold ring-1 ring-line active:scale-95">
          Buscar pelo número
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- componentes públicos

/** Resumo das configurações em uso, com atalho para mudar. */
function ConfigStrip({ qty }: { qty: number }) {
  const { prefs, filial, filialIsDefault } = usePrefs();
  return (
    <Link
      href="/conta/configuracoes"
      className="flex items-center gap-2 rounded-full bg-canvas px-3.5 py-2 text-xs font-bold text-muted ring-1 ring-line transition-colors hover:bg-lime-soft"
    >
      <MapPin size={13} className="shrink-0 text-forest" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        {filialIsDefault ? "Filial padrão: " : ""}
        <span className="text-ink">{filial.name}</span> · {qty} un ({prefs.buy === "atacado" ? "atacado" : "unitário"}) ·{" "}
        {prefs.compare === "filiais" ? "entre filiais" : "na filial"}
      </span>
      <SlidersHorizontal size={13} className="shrink-0" aria-hidden />
    </Link>
  );
}

/** Card completo do produto lido: dados essenciais, preço na quantidade escolhida e comparações. */
export function ProductLookup({
  ean,
  layout = "sheet",
  onOpen,
}: {
  ean: string;
  layout?: "sheet" | "page";
  /** O que fazer ao escolher um semelhante (ver produto). Padrão: abrir a página dele. */
  onOpen?: (item: SimilarItem) => void;
}) {
  const { status, data, retry } = useLookup(ean);
  const { prefs, filial, nameOf, kmOf } = usePrefs();
  const [more, setMore] = useState(false);
  const router = useRouter();
  const open = onOpen ?? ((item: SimilarItem) => router.push(`/produto/${item.skuId}`));

  if (status === "loading" || status === "idle") return <Loading />;
  if (status === "error" || !data) return <Failure kind="error" ean={ean} onRetry={retry} />;
  if (!data.ok) return <Failure kind={data.reason} ean={ean} onRetry={retry} />;

  const { product: p, offer, qty } = data;
  const reached = offer.tiers.filter((t) => t.minQty <= qty).at(-1);

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{p.brand}</span>
      {p.badges.map((b) => (
        <span key={b} className="rounded-full bg-lime-soft px-2 py-0.5 text-[10px] font-extrabold text-forest">
          {b}
        </span>
      ))}
    </div>
  );

  // Cabeçalho compacto (painel do scanner): miniatura + nome.
  const sheetHeader = (
    <div className="mb-4 flex gap-3.5">
      <Thumb src={p.image} size={88} />
      <div className="min-w-0 flex-1">
        {badges}
        <h3 className="mt-0.5 text-base font-extrabold leading-snug">{p.name}</h3>
        <p className="mt-1 truncate text-[11px] font-medium text-muted">{p.categoryPath.join(" › ")}</p>
        <p className="font-mono text-[11px] font-semibold text-muted">SKU {p.skuId} · EAN {p.ean}</p>
      </div>
    </div>
  );

  // Cabeçalho da página do produto: a foto grande fica ao lado.
  const pageHeader = (
    <div className="mb-5">
      {badges}
      <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{p.name}</h1>
      <p className="mt-1 text-xs font-medium text-muted">{p.categoryPath.join(" › ")}</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] font-semibold text-muted">
        <span>SKU {p.skuId}</span>
        <span>EAN {p.ean}</span>
        {p.size ? <span>Embalagem {p.size.label}</span> : null}
      </div>
    </div>
  );

  const body = (
    <>
      <div className="rounded-3xl bg-canvas p-4 ring-1 ring-line">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Distribuidora {filial.name} · {qty} un
        </p>
        {offer.available && offer.atQty !== undefined ? (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div className="flex items-end gap-1.5">
                <Price value={offer.atQty} className="text-4xl" />
                <span className="pb-1 text-xs font-bold text-muted">/ un</span>
              </div>
              <p className="pb-1 text-sm font-bold">
                Total <span className="font-extrabold">{brl(offer.total ?? offer.atQty * qty)}</span>
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {offer.perBase !== undefined ? (
                <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-line">
                  {brl(offer.perBase)} / {baseLabel(p.size)}
                </span>
              ) : null}
              {p.size ? <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-line">{p.size.label}</span> : null}
              {reached && reached.minQty > 1 ? (
                <span className="rounded-full bg-lime-soft px-2.5 py-1 text-[11px] font-extrabold text-forest">preço de atacado aplicado</span>
              ) : null}
            </div>
            {offer.tiers.length > 1 ? (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs font-semibold">
                {offer.tiers.map((t) => (
                  <li key={t.minQty} className={`flex justify-between ${reached?.minQty === t.minQty ? "font-extrabold text-forest" : "text-muted"}`}>
                    <span>a partir de {t.minQty} un</span>
                    <span>{brl(t.price)} / un</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm font-bold text-[#5c3a06]">Indisponível nesta filial para {qty} un.</p>
        )}
      </div>

      {/* Fica colado no rodapé da área visível: o botão de adicionar nunca some ao rolar o card. */}
      <div
        className={
          layout === "page"
            ? "sticky bottom-3 z-10 mt-3"
            : "sticky bottom-0 z-10 -mx-5 mt-3 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur"
        }
      >
        <AddToList data={data} onOpen={open} />
      </div>

      <div className="mt-3">
        <ConfigStrip qty={qty} />
      </div>

      <div className="mt-4">
        <Verdict data={data} filialName={filial.name} />
      </div>

      <SimilarList items={data.similar} total={data.similarTotal} qty={qty} onOpen={open} />

      {prefs.compare === "filiais" ? (
        data.filiais && data.filiais.length > 1 ? (
          <FiliaisList filiais={data.filiais} selected={filial.seller} nameOf={nameOf} kmOf={kmOf} qty={qty} />
        ) : (
          <div className={section}>
            <Banner tone="info">
              Para comparar filiais, encontre as lojas perto de você em{" "}
              <Link href="/conta/configuracoes" className="underline">
                Configurações
              </Link>
              .
            </Banner>
          </div>
        )
      ) : null}

      {p.description ? (
        <section className={section} aria-label="Descrição">
          <h3 className={h3}>Sobre o produto</h3>
          <p className={`text-[13px] font-medium leading-relaxed text-ink/80 ${more ? "" : "line-clamp-3"}`}>{p.description}</p>
          {p.description.length > 150 ? (
            <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 text-xs font-extrabold text-forest">
              {more ? "Ver menos" : "Ver mais"}
            </button>
          ) : null}
        </section>
      ) : null}

      {p.url ? (
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-forest hover:underline">
          Ver no site da Distribuidora <ExternalLink size={13} aria-hidden />
        </a>
      ) : null}
    </>
  );

  if (layout === "page") {
    return (
      <article aria-label={p.name} className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:gap-12">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative mx-auto aspect-square w-full max-w-lg rounded-[2rem] bg-paper shadow-card ring-1 ring-line/70">
            {p.image ? (
              <Image src={p.image} alt={p.name} fill unoptimized priority sizes="(min-width:1024px) 40vw, 90vw" className="object-contain p-6 sm:p-10" />
            ) : null}
            <HeartButton product={{ id: p.skuId, name: p.name, brand: p.brand, image: p.image, ean: p.ean }} className="absolute right-4 top-4 !size-10" />
          </div>
        </div>
        <div>
          {pageHeader}
          {body}
        </div>
      </article>
    );
  }

  return (
    <article aria-label={p.name}>
      {sheetHeader}
      {body}
    </article>
  );
}
