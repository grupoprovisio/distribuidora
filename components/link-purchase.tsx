"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Check, Link2 } from "lucide-react";
import { useAccountEmail } from "@/lib/account-store";
import { brl } from "@/lib/format";
import { toAttached, usePurchases } from "@/lib/purchase-store";
import type { Receipt } from "@/lib/receipt-types";

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");

/**
 * Na tela da nota fiscal: vincula esta NFC-e a uma compra salva da conta (a que ainda espera a nota) para comparar
 * o que foi previsto com o que foi pago.
 */
export function LinkPurchase({ receipt, url }: { receipt: Receipt; url: string }) {
  const email = useAccountEmail();
  const { purchases, open, attach } = usePurchases(email);
  const [chosen, setChosen] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(null);

  if (!email) return null;

  const already = purchases.find((p) => p.receipt?.key === receipt.key);
  const doneId = linked ?? already?.id;
  if (doneId) {
    const p = purchases.find((x) => x.id === doneId);
    return (
      <div className="mt-3 rounded-3xl bg-lime-soft p-3.5">
        <p className="flex items-center gap-2 text-sm font-extrabold text-forest">
          <Check size={16} aria-hidden /> Nota vinculada à compra “{p?.name}”
        </p>
        <Link href={`/conta/compras/${doneId}`} className="mt-2 inline-flex h-9 items-center rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95">
          Ver previsto × pago
        </Link>
      </div>
    );
  }

  if (open.length === 0) {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-canvas px-3 py-2.5 text-xs font-medium text-muted">
        <Bell size={14} className="mt-0.5 shrink-0" aria-hidden /> Quer comparar esta nota com o que você planejou? Salve a compra na sua lista antes de ir ao mercado e vincule a nota depois.
      </p>
    );
  }

  const pick = chosen ?? open[0].id;
  return (
    <section className="mt-3 rounded-3xl bg-paper p-4 ring-1 ring-line" aria-label="Vincular a uma compra salva">
      <p className="flex items-center gap-2 text-sm font-extrabold">
        <Link2 size={15} aria-hidden /> Finalizar uma compra salva com esta nota
      </p>
      <p className="mt-0.5 text-xs font-medium text-muted">Comparamos o que você previu com o que foi pago.</p>
      <div role="radiogroup" aria-label="Compra salva" className="mt-3 space-y-1.5">
        {open.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pick === p.id}
            onClick={() => setChosen(p.id)}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-xs ring-1 transition-colors ${pick === p.id ? "bg-lime-soft ring-forest" : "bg-canvas ring-line"}`}
          >
            <span className="min-w-0">
              <span className="block truncate font-extrabold">{p.name}</span>
              <span className="block font-semibold text-muted">
                {day(p.savedAt)} · {p.items.length} {p.items.length === 1 ? "item" : "itens"}
              </span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums">{brl(p.items.reduce((a, i) => a + (i.unit ?? 0) * i.qty, 0))}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          attach(pick, toAttached(receipt, url));
          setLinked(pick);
        }}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white active:scale-[0.97]"
      >
        <Link2 size={15} aria-hidden /> Vincular e comparar
      </button>
    </section>
  );
}
