import Link from "next/link";
import { LogoutButton } from "@/components/marketplace-logout-button";
import { supabaseAuthEnabled } from "@/lib/supabase/config";
export const metadata = { title: "Acesso restrito · Provisio", robots: {index:false,follow:false} };
export default function RestrictedAccessPage() {
  return <main className="mx-auto max-w-xl px-5 py-16">
    <h1 className="text-3xl font-black text-forest">Acesso restrito</h1>
    <p className="mt-4 text-sm leading-relaxed text-muted">
      Sua conta não possui permissão para esta área. O acesso é liberado somente após aprovação da organização, do vínculo e do papel específico.
    </p>{supabaseAuthEnabled() ? <div className="mt-5"><LogoutButton /></div> : null}<Link className="mt-6 inline-block font-bold text-forest underline" href="/app">Voltar ao meu painel</Link>
  </main>;
}
