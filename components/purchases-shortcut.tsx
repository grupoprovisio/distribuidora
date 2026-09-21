"use client";

import Link from "next/link";
import { Bell, ChevronRight, ReceiptText } from "lucide-react";
import { useAccountEmail, useSyncAccount } from "@/lib/account-store";
import { usePurchases } from "@/lib/purchase-store";

/**
 * Na Conta: atalho para as compras salvas e, quando alguma espera a nota fiscal, um aviso com o sininho que balança.
 * Também mantém o cookie do e-mail da conta igual ao da sessão (para quem entrou antes deste recurso).
 */
export function PurchasesSync({ email }: { email: string | null }) {
  useSyncAccount(email);
  return null;
}

export function PendingBanner() {
  const email = useAccountEmail();
  const { open } = usePurchases(email);
  if (!email || open.length === 0) return null;
  return (
    <Link href="/conta/compras" className="mb-4 flex items-center gap-3 rounded-[1.75rem] bg-blush p-4 shadow-card transition-transform active:scale-[0.99]">
      <span className="animate-bell grid size-11 shrink-0 place-items-center rounded-full bg-[#d6334f] text-white">
        <Bell size={20} fill="currentColor" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[#7a1d33]">
          {open.length === 1 ? "1 compra aguarda a nota fiscal" : `${open.length} compras aguardam a nota fiscal`}
        </span>
        <span className="block text-xs font-medium text-[#7a1d33]/80">Anexe a NFC-e para ver o quanto você acertou.</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-[#7a1d33]" aria-hidden />
    </Link>
  );
}

export function PurchasesShortcut() {
  const email = useAccountEmail();
  const { purchases, open } = usePurchases(email);
  return (
    <li>
      <Link href="/conta/compras" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas active:bg-canvas">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest">
          <ReceiptText size={20} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">Minhas compras</span>
          <span className="block truncate text-xs font-medium text-muted">
            {email ? (purchases.length === 0 ? "Salve a lista e compare com a nota fiscal" : `${purchases.length} salvas${open.length ? ` · ${open.length} aguardando a nota` : ""}`) : "Entre para ver as suas"}
          </span>
        </span>
        {open.length > 0 ? (
          <span className="animate-dot relative size-3 rounded-full bg-[#d6334f]" role="status" aria-label={`${open.length} aguardando a nota fiscal`} />
        ) : null}
        <ChevronRight size={18} className="text-muted" aria-hidden />
      </Link>
    </li>
  );
}
