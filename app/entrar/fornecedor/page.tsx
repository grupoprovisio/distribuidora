import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { MarketplaceLoginForm } from "@/components/marketplace-login-form";
import { supabaseAuthEnabled } from "@/lib/supabase/config";

export const metadata:Metadata={title:"Login Fornecedor · Grupo Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default function LoginPage() {
 return <main className="min-h-dvh bg-canvas px-5 py-10">
 <div className="mx-auto w-full max-w-lg">
 <Link href="/fornecedores" className="text-sm font-bold text-forest underline">← Voltar para Sou fornecedor</Link>
 <section className="mt-7 rounded-[2rem] border border-line bg-paper p-6 shadow-card sm:p-9">
 <div className="grid size-12 place-items-center rounded-2xl bg-lime-soft text-forest"><LockKeyhole size={22} aria-hidden/></div>
 <p className="mt-5 text-xs font-black uppercase tracking-wide text-terra">Ambiente privado · Fornecedor</p>
 <h1 className="mt-2 text-3xl font-black text-forest-deep">Entrar como fornecedor</h1>
 <p className="mt-3 text-sm text-muted">Entre com uma conta empresarial existente e homologada. O formulário de interesse da página pública não cria usuário nem senha.</p>
 {supabaseAuthEnabled()?<MarketplaceLoginForm portal="fornecedor"/>:<p role="status" className="mt-6 rounded-xl bg-sand p-4 text-sm text-forest">O login deste ambiente ainda não foi habilitado na configuração do servidor. Nenhum cadastro foi realizado.</p>}
 </section>
 <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm font-semibold text-forest">
 <Link href="/entrar" className="underline">Acesso empresarial geral</Link>
 <Link href="/acesso-pendente" className="underline">Aguardando homologação?</Link>
 </div></div></main>;
}
