"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function LogoutButton() {
  const router = useRouter();
  const [busy,setBusy]=useState(false);
  return <button type="button" disabled={busy}
    onClick={async()=>{setBusy(true);try{await createClient().auth.signOut();router.replace("/entrar");router.refresh();}finally{setBusy(false);}}}
    className="rounded-full border border-line px-4 py-2 font-bold text-forest hover:bg-lime-soft disabled:opacity-50">
    {busy?"Saindo...":"Sair da conta"}
  </button>;
}
