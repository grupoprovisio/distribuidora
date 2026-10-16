import type { Metadata } from "next";
import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/marketplace-password-recovery";
import { supabaseAuthEnabled } from "@/lib/supabase/config";
export const metadata: Metadata = { title:"Recuperar acesso · Provisio", robots:{index:false,follow:false} };
export const dynamic = "force-dynamic";
export default function RecoveryPage() {
  return <main className="min-h-dvh bg-canvas px-5 py-12">
    <section className="mx-auto max-w-lg rounded-[2rem] bg-paper p-7 shadow-card ring-1 ring-line/70">
      <h1 className="text-2xl font-black text-forest">Recuperar senha</h1>
      <p className="mt-3 text-sm text-muted">Informe o e-mail cadastrado para receber as instruções. Não é possível criar contas nesta tela.</p>
      {supabaseAuthEnabled()?<PasswordRecoveryForm/>:<p role="status" className="mt-5 text-sm text-muted">O login empresarial ainda não foi habilitado.</p>}
      <Link href="/entrar" className="mt-6 block font-semibold text-forest underline">Voltar ao login</Link>
    </section>
  </main>;
}
