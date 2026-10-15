import Link from "next/link";
import { LockKeyhole, ShieldAlert, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

/** Never accept credentials in a form without a real authenticated backend. */
export default function AdminLoginPage() {
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Acesso administrativo" backHref="/" showListButton={false} />
    <main className={`${WRAP} grid min-h-[calc(100dvh-7rem)] place-items-center py-10`}>
      <section className="w-full max-w-xl rounded-[2rem] bg-paper p-7 shadow-card ring-1 ring-line/70 sm:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-blush text-wine"><LockKeyhole size={23} aria-hidden /></span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-wine">Ambiente em desenvolvimento</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep">Autenticação administrativa ainda indisponível</h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-muted">
          Este projeto não recebe credenciais de funcionários nesta etapa. O acesso real dependerá de autenticação própria,
          MFA, isolamento de organizações e políticas RLS homologadas em staging.
        </p>
        <div className="mt-5 flex gap-3 rounded-2xl bg-sand p-4 text-sm font-semibold text-forest-deep">
          <ShieldAlert size={22} aria-hidden className="shrink-0" />
          Não informe senha, dados financeiros nem documentos em telas de demonstração.
        </div>
        <Link href="/admin/marketplace" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-extrabold text-white">
          Ver painel demonstrativo <ArrowRight size={16} aria-hidden />
        </Link>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
