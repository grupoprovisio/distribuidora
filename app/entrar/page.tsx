import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { MarketplaceLoginForm } from "@/components/marketplace-login-form";
import { supabaseAuthEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Entrar · Grupo Provisio",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function EntrarPage() {
  const enabled = supabaseAuthEnabled();
  return (
    <main className="min-h-dvh bg-canvas px-5 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="text-sm font-black text-forest hover:underline">← Voltar à Provisio</Link>
        <section className="mt-7 rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-9">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-lime-soft text-forest">
            <LockKeyhole size={23} aria-hidden />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-terra">Acesso empresarial</p>
          <h1 className="mt-2 text-3xl font-black text-forest-deep">Entre na sua conta</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Acesso para compradores e fornecedores homologados.
            A criação e aprovação de usuários são controladas pela administração.
          </p>
          <nav aria-label="Escolha seu ambiente" className="mt-6 grid grid-cols-2 gap-3"><Link href="/entrar/comprador" className="rounded-xl bg-lime-soft p-4 text-center text-sm font-extrabold text-forest">Sou comprador</Link><Link href="/entrar/fornecedor" className="rounded-xl bg-lime-soft p-4 text-center text-sm font-extrabold text-forest">Sou fornecedor</Link></nav>
          {enabled ? <MarketplaceLoginForm /> :
            <p role="status" className="mt-7 rounded-2xl bg-sand px-4 py-4 text-sm font-semibold text-forest">
              O acesso empresarial está em preparação. Nenhuma conta ou pedido foi ativado.
            </p>}
        </section>
        <p className="mt-6 text-center text-xs font-medium text-muted">
          Sua conta só recebe permissões após aprovação da empresa pela Provisio.
        </p>
      </div>
    </main>
  );
}
