"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { setAccountEmail } from "@/lib/account-store";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAccountEmail(null);
    } finally {
      router.refresh();
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-extrabold text-[#a02a4a] ring-1 ring-line transition-transform active:scale-[0.97] disabled:opacity-60"
    >
      {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <LogOut size={16} aria-hidden />}
      Sair da conta
    </button>
  );
}
