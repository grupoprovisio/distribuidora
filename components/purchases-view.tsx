"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Check, ChevronRight, ExternalLink, Loader2, Pencil, Receipt as ReceiptIcon, ScanLine, ShoppingBasket, Trash2, Unlink } from "lucide-react";
import { EmptyState, primaryButton } from "@/components/section";
import { analyze, type Analysis, type Kind, type Line } from "@/lib/accuracy";
import { useAccountEmail } from "@/lib/account-store";
import { brl, pct } from "@/lib/format";
import { parseNfceUrl } from "@/lib/nfce";
import { toAttached, usePurchases, type Purchase } from "@/lib/purchase-store";
import type { ReceiptResult } from "@/lib/receipt-types";

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");
const plannedTotal = (p: Purchase) => p.items.reduce((a, i) => a + (i.unit ?? 0) * i.qty, 0);
const signed = (n: number) => `${n < 0 ? "−" : "+"}${brl(Math.abs(n))}`;

function SignedIn({ children }: { children: (email: string) => React.ReactNode }) {
  const email = useAccountEmail();
  if (!email) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="Entre na sua conta"
        text="As compras salvas ficam atreladas à sua conta da Distribuidora. Entre para ver as suas."
        action={
          <Link href="/conta" className={primaryButton}>
            Entrar na conta
          </Link>
        }
      />
    );
  }
  return <>{children(email)}</>;
}

// ------------------------------------------------------------------ lista

function Card({ p }: { p: Purchase }) {
  const a = analyze(p);
  return (
    <li>
      <Link href={`/conta/compras/${p.id}`} className="flex items-center gap-3 rounded-[1.75rem] bg-paper p-4 shadow-card ring-1 ring-line/70 transition-colors hover:bg-canvas">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${p.receipt ? "bg-lime-soft text-forest" : "bg-blush text-[#a02a4a]"}`}>{p.receipt ? <Check size={20} aria-hidden /> : <Bell size={20} className="animate-bell" aria-hidden />}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{p.name}</span>
          <span className="block text-xs font-semibold text-muted">
            {day(p.savedAt)} · {p.items.length} {p.items.length === 1 ? "item" : "itens"} · previsto {brl(plannedTotal(p))}
          </span>
          {a ? (
            <span className="mt-1 inline-block rounded-full bg-lime-soft px-2.5 py-0.5 text-[11px] font-extrabold text-forest">
              pago {brl(a.paid)} · acerto de {a.accuracy}%
            </span>
          ) : (
            <span className="mt-1 inline-block rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-extrabold text-[#a02a4a]">Aguardando a nota fiscal</span>
          )}
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

export function PurchaseList() {
  return (
    <SignedIn>
      {(email) => <Inner email={email} />}
    </SignedIn>
  );
}

function Inner({ email }: { email: string }) {
  const { purchases, open } = usePurchases(email);
  const done = purchases.filter((p) => p.receipt);

  if (purchases.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="Nenhuma compra salva"
        text="Monte a lista, toque em “Salvar compra” e, depois de ir ao mercado, anexe a nota fiscal para ver o quanto você acertou."
        action={
          <Link href="/lista" className={primaryButton}>
            Ir para a lista
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {open.length > 0 ? (
        <section aria-label="Aguardando a nota fiscal">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
            <Bell size={15} className="animate-bell text-[#d6334f]" aria-hidden /> Aguardando a nota fiscal ({open.length})
          </h2>
          <ul className="space-y-3">
            {open.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ) : null}
      {done.length > 0 ? (
        <section aria-label="Finalizadas">
          <h2 className="mb-2 text-sm font-extrabold">Finalizadas ({done.length})</h2>
          <ul className="space-y-3">
            {done.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ anexar a nota

/** Campo para colar o link do QR da nota (ou escanear) e finalizar a compra. */
function AttachForm({ purchase }: { purchase: Purchase }) {
  const { attach, purchases } = usePurchases(purchase.owner);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const url = text.trim();
    const ref = parseNfceUrl(url);
    if (!ref) return setError("Isso não parece o link do QR code de uma NFC-e. Cole o endereço completo da nota.");
    const other = purchases.find((p) => p.id !== purchase.id && p.receipt?.key === ref.key);
    if (other) return setError(`Esta nota já está na compra “${other.name}”.`);

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, seller: purchase.filial.seller }),
      });
      const data = (await res.json()) as ReceiptResult;
      if (!data.ok) {
        setError(
          data.reason === "unsupported"
            ? "Por enquanto só leio notas de Mato Grosso do Sul (SEFAZ-MS)."
            : data.reason === "invalid"
              ? "Não reconheci esta nota."
              : "Não consegui ler a nota agora. Tente de novo em instantes.",
        );
        return;
      }
      attach(purchase.id, toAttached(data.receipt, url));
    } catch {
      setError("Não consegui ler a nota agora. Verifique a conexão.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70" aria-label="Finalizar compra">
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <ReceiptIcon size={17} aria-hidden /> Finalizar compra
      </h2>
      <p className="mt-1 text-xs font-medium text-muted">Anexe a nota fiscal (NFC-e) da compra. Comparamos o que você previu com o que foi pago e mostramos o que mudou.</p>

      <Link href="/scan" className={`${primaryButton} mt-4 h-12 w-full`}>
        <ScanLine size={16} aria-hidden /> Escanear o QR da nota
      </Link>
      <p className="mt-1.5 text-center text-[11px] font-medium text-muted">Depois de ler, escolha esta compra em “Finalizar uma compra salva com esta nota”.</p>

      <div className="mt-4 border-t border-line pt-4">
        <label htmlFor="nfce-link" className="text-xs font-extrabold">
          Ou cole o link do QR da nota
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="nfce-link"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.dfe.ms.gov.br/nfce/qrcode/?p=…"
            className="h-11 min-w-0 flex-1 rounded-full bg-canvas px-4 text-sm font-bold outline-none ring-1 ring-line placeholder:font-medium placeholder:text-muted focus:ring-2 focus:ring-forest"
          />
          <button type="button" onClick={submit} disabled={busy || !text.trim()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null} Analisar
          </button>
        </div>
        {busy ? <p className="mt-2 text-xs font-medium text-muted">Lendo a nota na SEFAZ… pode levar até 20 segundos.</p> : null}
        {error ? (
          <p role="alert" className="mt-2 text-xs font-bold text-[#a02a4a]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ análise

const GROUPS: { kind: Kind; title: string; hint: string }[] = [
  { kind: "price", title: "Preço diferente do previsto", hint: "Mesma quantidade, valor por unidade diferente." },
  { kind: "qty", title: "Quantidade diferente", hint: "Você levou mais ou menos do que planejou (o preço também pode ter mudado)." },
  { kind: "missing", title: "Planejado e não comprado", hint: "Estava na compra salva e não veio na nota." },
  { kind: "extra", title: "Comprado fora do plano", hint: "Veio na nota mas não estava na compra salva." },
  { kind: "same", title: "Como planejado", hint: "Mesma quantidade e preço." },
];

const qtyText = (n: number | undefined) => (n === undefined ? "0" : String(Math.round(n * 100) / 100).replace(".", ","));

function LineRow({ l, kind }: { l: Line; kind: Kind }) {
  const plannedLine = l.plannedUnit != null && l.plannedQty !== undefined ? l.plannedUnit * l.plannedQty : undefined;
  const diff = (l.paidTotal ?? 0) - (plannedLine ?? 0);
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5">
      <span className="relative size-11 shrink-0 rounded-xl bg-paper">{l.image ? <Image src={l.image} alt="" fill unoptimized sizes="44px" className="object-contain p-1" /> : null}</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-bold leading-snug">{l.name}</p>
        <p className="text-[11px] font-semibold text-muted">
          {l.plannedQty !== undefined ? (
            <>
              previsto {qtyText(l.plannedQty)} un{l.plannedUnit != null ? ` × ${brl(l.plannedUnit)}` : " (sem preço na filial)"}
            </>
          ) : null}
          {l.plannedQty !== undefined && l.paidQty !== undefined ? " · " : ""}
          {l.paidQty !== undefined ? (
            <>
              pago {qtyText(l.paidQty)} un × {brl(l.paidUnit ?? 0)}
            </>
          ) : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {l.paidTotal !== undefined ? <p className="text-sm font-extrabold tabular-nums">{brl(l.paidTotal)}</p> : <p className="text-sm font-bold tabular-nums text-muted line-through">{plannedLine !== undefined ? brl(plannedLine) : ""}</p>}
        {kind !== "same" && plannedLine !== undefined && kind !== "extra" ? (
          <p className={`text-[11px] font-extrabold tabular-nums ${diff > 0.004 ? "text-[#a02a4a]" : "text-forest"}`}>{Math.abs(diff) < 0.005 ? "igual" : signed(diff)}</p>
        ) : null}
      </div>
    </li>
  );
}

function Result({ purchase, a }: { purchase: Purchase; a: Analysis }) {
  const [openKind, setOpenKind] = useState<Kind | null>(a.groups.price.length ? "price" : a.groups.qty.length ? "qty" : a.groups.missing.length ? "missing" : null);
  const r = purchase.receipt!;
  const parts: { label: string; value: number; hint: string }[] = [
    { label: "Itens que você não comprou", value: a.parts.missing, hint: `${a.groups.missing.length} do plano` },
    { label: "Itens fora do plano", value: a.parts.extra, hint: `${a.groups.extra.length} na nota` },
    { label: "Quantidades diferentes", value: a.parts.qty, hint: "levou mais ou menos que o planejado, ao preço previsto" },
    { label: "Preços diferentes", value: a.parts.price, hint: "valor por unidade diferente do previsto, no que foi comprado" },
    { label: "Descontos dados na nota", value: a.parts.discounts, hint: "" },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] bg-forest p-5 text-white shadow-card sm:p-6" aria-label="Previsto e pago">
        <p className="text-xs font-bold uppercase tracking-wide text-white/60">Quanto você acertou</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-5xl font-extrabold tabular-nums text-lime">{a.accuracy}%</p>
          <span className={`mb-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${Math.abs(a.diff) < 0.005 ? "bg-white/15" : a.diff > 0 ? "bg-blush text-[#a02a4a]" : "bg-lime text-forest-deep"}`}>
            {Math.abs(a.diff) < 0.005 ? "Na mosca" : `${brl(Math.abs(a.diff))} ${a.diff > 0 ? "a mais" : "a menos"} (${a.diffPct < 0 ? "−" : "+"}${pct(Math.abs(a.diffPct))})`}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <dt className="text-[11px] font-semibold text-white/65">Previsto na lista</dt>
            <dd className="text-lg font-extrabold tabular-nums">{brl(a.planned)}</dd>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <dt className="text-[11px] font-semibold text-white/65">Pago na nota</dt>
            <dd className="text-lg font-extrabold tabular-nums text-lime">{brl(a.paid)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs font-semibold text-white/75">
          {a.bought} de {a.plannedCount} itens planejados foram comprados
          {a.groups.extra.length > 0 ? ` · ${a.groups.extra.length} fora do plano` : ""}.
        </p>
      </section>

      <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70" aria-label="De onde veio a diferença">
        <h2 className="text-sm font-extrabold">De onde veio a diferença</h2>
        <p className="mt-0.5 text-xs font-medium text-muted">Previsto {brl(a.planned)} {signed(a.diff)} = pago {brl(a.paid)}.</p>
        <ul className="mt-3 divide-y divide-line">
          {parts
            .filter((x) => Math.abs(x.value) >= 0.005)
            .map((x) => (
              <li key={x.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-bold">{x.label}</span>
                  {x.hint ? <span className="block text-[11px] font-semibold text-muted">{x.hint}</span> : null}
                </span>
                <span className={`shrink-0 font-extrabold tabular-nums ${x.value > 0 ? "text-[#a02a4a]" : "text-forest"}`}>{signed(x.value)}</span>
              </li>
            ))}
          {parts.every((x) => Math.abs(x.value) < 0.005) ? <li className="py-2.5 text-sm font-bold text-forest">Tudo saiu exatamente como previsto.</li> : null}
        </ul>
      </section>

      <div className="space-y-2">
        {GROUPS.filter((g) => a.groups[g.kind].length > 0).map((g) => {
          const open = openKind === g.kind;
          return (
            <section key={g.kind} className="rounded-[1.75rem] bg-paper p-4 shadow-card ring-1 ring-line/70" aria-label={g.title}>
              <button type="button" onClick={() => setOpenKind(open ? null : g.kind)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold">
                    {g.title} <span className="text-muted">{a.groups[g.kind].length}</span>
                  </span>
                  <span className="block text-[11px] font-medium text-muted">{g.hint}</span>
                </span>
                <ChevronRight size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
              </button>
              {open ? (
                <ul className="mt-3 space-y-2">
                  {a.groups[g.kind].map((l) => (
                    <LineRow key={l.key} l={l} kind={g.kind} />
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="px-1 text-[11px] font-medium text-muted">
        Nota {r.number} · {r.issuer} · {r.issuedAt.slice(0, 16)}
        {r.url && /^https:/.test(r.url) ? (
          <>
            {" · "}
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-extrabold text-forest hover:underline">
              Ver na SEFAZ <ExternalLink size={11} aria-hidden />
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ detalhe

function Detail({ email, id }: { email: string; id: string }) {
  const router = useRouter();
  const { get, rename, detach, remove } = usePurchases(email);
  const purchase = get(id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!purchase) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="Compra não encontrada"
        text="Ela pode ter sido excluída, ou pertence a outra conta."
        action={
          <Link href="/conta/compras" className={primaryButton}>
            Minhas compras
          </Link>
        }
      />
    );
  }

  const a = analyze(purchase);
  const commit = () => {
    rename(purchase.id, name);
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70">
        <div className="flex items-start justify-between gap-3">
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              aria-label="Nome da compra"
              maxLength={80}
              className="h-10 min-w-0 flex-1 rounded-full bg-canvas px-4 text-base font-extrabold outline-none ring-1 ring-line focus:ring-2 focus:ring-forest"
            />
          ) : (
            <h2 className="min-w-0 flex-1 text-lg font-extrabold leading-snug">{purchase.name}</h2>
          )}
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setName(purchase.name);
                setEditing(true);
              }}
              aria-label="Renomear a compra"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-muted hover:text-ink"
            >
              <Pencil size={15} aria-hidden />
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-semibold text-muted">
          Salva em {day(purchase.savedAt)} · Distribuidora {purchase.filial.name} · {purchase.items.length} {purchase.items.length === 1 ? "item" : "itens"} · previsto {brl(plannedTotal(purchase))}
        </p>
        <p className="mt-2 text-[11px] font-medium text-muted">Atrelada à conta {email}.</p>
      </section>

      {a ? <Result purchase={purchase} a={a} /> : <AttachForm purchase={purchase} />}

      {!a ? (
        <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70" aria-label="Itens planejados">
          <h2 className="text-sm font-extrabold">O que você planejou</h2>
          <ul className="mt-3 space-y-2">
            {purchase.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5">
                <span className="relative size-11 shrink-0 rounded-xl bg-paper">{i.image ? <Image src={i.image} alt="" fill unoptimized sizes="44px" className="object-contain p-1" /> : null}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-bold leading-snug">{i.name}</p>
                  <p className="text-[11px] font-semibold text-muted">
                    {i.qty} un{i.unit != null ? ` × ${brl(i.unit)}` : " · sem preço na filial"}
                  </p>
                </div>
                {i.unit != null ? <p className="shrink-0 text-sm font-extrabold tabular-nums">{brl(i.unit * i.qty)}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {a ? (
          <button type="button" onClick={() => detach(purchase.id)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-paper text-sm font-extrabold ring-1 ring-line active:scale-[0.97]">
            <Unlink size={15} aria-hidden /> Trocar a nota
          </button>
        ) : null}
        {confirmDelete ? (
          <button
            type="button"
            onClick={() => {
              remove(purchase.id);
              router.replace("/conta/compras");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#a02a4a] text-sm font-extrabold text-white active:scale-[0.97]"
          >
            <Trash2 size={15} aria-hidden /> Confirmar exclusão
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-paper text-sm font-extrabold text-[#a02a4a] ring-1 ring-line active:scale-[0.97]">
            <Trash2 size={15} aria-hidden /> Excluir compra
          </button>
        )}
      </div>
    </div>
  );
}

export function PurchaseDetail({ id }: { id: string }) {
  return <SignedIn>{(email) => <Detail key={id} email={email} id={id} />}</SignedIn>;
}
