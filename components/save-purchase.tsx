"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Check, LogIn, Save } from "lucide-react";
import { useAccountEmail } from "@/lib/account-store";
import { brl } from "@/lib/format";
import { usePurchases, type PlannedItem } from "@/lib/purchase-store";

const stamp = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/**
 * "Salvar pedido": guarda a lista como está (itens, quantidades e os preços de hoje da filial) na conta da Distribuidora.
 * Depois da ida ao mercado, a compra recebe a NFC-e e o app mostra o que foi previsto × o que foi pago.
 */
export function SavePurchase({ items, total, filial }: { items: PlannedItem[]; total: number; filial: { seller: string; name: string } }) {
  const email = useAccountEmail();
  const { save, purchases } = usePurchases(email);
  // Depois de salvar, o botão vira um atalho; se a lista mudar, volta a oferecer salvar.
  const signature = `${filial.seller}|${items.map((i) => `${i.id}:${i.qty}:${i.unit ?? ""}`).join(",")}`;
  const [saved, setSaved] = useState<{ id: string; signature: string } | null>(null);
  const current = saved && saved.signature === signature && purchases.some((p) => p.id === saved.id) ? saved : null;

  if (!email) {
    return (
      <div className="rounded-3xl bg-paper p-4 shadow-card ring-1 ring-line/70">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <Save size={16} aria-hidden /> Salvar este pedido
        </p>
        <p className="mt-1 text-xs font-medium text-muted">Entre na sua conta da Distribuidora para salvar a compra. Depois, com a nota fiscal (NFC-e), comparamos o que você previu com o que pagou.</p>
        <Link href="/conta" className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95">
          <LogIn size={14} aria-hidden /> Entrar na conta
        </Link>
      </div>
    );
  }

  if (current) {
    return (
      <div className="rounded-3xl bg-lime-soft p-4">
        <p className="flex items-center gap-2 text-sm font-extrabold text-forest">
          <Check size={16} aria-hidden /> Pedido salvo na sua conta
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-forest/80">
          <Bell size={13} className="mt-0.5 shrink-0" aria-hidden /> Ela fica em Conta &gt; Minhas compras aguardando a nota fiscal. Ao terminar as compras, anexe a NFC-e.
        </p>
        <Link href={`/conta/compras/${current.id}`} className="mt-3 inline-flex h-10 items-center rounded-full bg-forest px-4 text-xs font-extrabold text-white active:scale-95">
          Ver a compra
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={items.length === 0}
      onClick={() => {
        const id = save({ owner: email, name: `Compra de ${stamp()} · ${filial.name}`, filial, items });
        setSaved({ id, signature });
      }}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-5 text-sm font-extrabold text-forest-deep shadow-card transition-transform active:scale-[0.97] disabled:opacity-50"
    >
      <Save size={16} aria-hidden /> Salvar pedido · {brl(total)}
    </button>
  );
}
