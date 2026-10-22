import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";
import { PROGRESS_GATES } from "@/lib/marketplace/progress-gates";

export const metadata: Metadata = {
  title: "Progresso do projeto · Administração Provisio",
  robots: { index: false, follow: false },
};

/** Protegido pelo layout administrativo existente: PLATFORM_ADMIN e MFA. */
export default function MarketplaceProgressPage() {
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Progresso do projeto" backHref="/admin/marketplace" showListButton={false} />
    <main className={WRAP + " py-8 sm:py-12"}>
      <AdminNav />
      <h1 className="mt-5 text-3xl font-black text-forest-deep">Evolução do Marketplace B2B</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Acompanhe separadamente código implementado, testes aprovados e funcionamento validado em produção. Uma etapa não comprova a outra. Escopo: somente Sou comprador e Sou fornecedor; ADM é uma área administrativa.</p>
      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {PROGRESS_GATES.map((gate) => <section key={gate.id} className="rounded-3xl border border-line bg-paper p-6" aria-labelledby={"gate-" + gate.id}>
          <h2 id={"gate-" + gate.id} className="font-black text-forest-deep">{gate.title}</h2>
          <p className="mt-3 text-4xl font-black tabular-nums text-forest">{gate.percent === null ? "—" : gate.percent + "%"}</p>
          <p className="mt-1 text-xs font-bold text-muted">{gate.status}</p>
          <div role={gate.percent === null ? undefined : "progressbar"} aria-label={gate.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={gate.percent === null ? undefined : gate.percent} className="mt-5 h-3 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-forest" style={{ width: (gate.percent ?? 0) + "%" }} />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted">{gate.evidence}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted"><strong>Para avançar:</strong> {gate.next}</p>
        </section>)}
      </div>
      <aside className="mt-7 rounded-2xl border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
        <strong>Importante:</strong> pontuações anteriores de 74% e 80% referem-se a branches de desenvolvimento, e não à produção atual. Sem evidências suficientes, o percentual aparece como não aferido (—), nunca como 100%. O painel não habilita pagamentos, transações nem alterações no banco.
      </aside>
      <div className="mt-6 flex gap-4 text-sm font-extrabold text-forest">
        <Link href="/admin/marketplace/prontidao" className="underline">Prontidão cadastral</Link>
        <Link href="/admin/marketplace" className="underline">Voltar ao ADM</Link>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
