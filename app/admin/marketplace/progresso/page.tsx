import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, CircleCheck, CircleDashed, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import {
  FRONTEND_EARNED_POINTS,
  FRONTEND_MILESTONES,
  FRONTEND_PERCENT,
  FRONTEND_PROGRESS_REVIEWED_AT,
  FRONTEND_TOTAL_POINTS,
} from "@/lib/marketplace/frontend-progress";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Progresso do front-end · Administração Provisio",
  robots: { index: false, follow: false },
};

/**
 * Rota herdada de /admin/layout.tsx: PLATFORM_ADMIN + sessão viva + MFA AAL2.
 * O progresso é uma revisão editorial versionada, NÃO uma contagem de testes,
 * execução E2E, disponibilidade do backend ou prontidão comercial.
 */
export default function FrontendProgressPage() {
  if (FRONTEND_TOTAL_POINTS !== 100 || FRONTEND_MILESTONES.some((m) => m.completed < 0 || m.completed > m.weight)) {
    throw new Error("Revisar pesos do painel de frontend antes de publicar.");
  }
  const remaining = FRONTEND_TOTAL_POINTS - FRONTEND_EARNED_POINTS;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Progresso do front-end" backHref="/admin/marketplace" showListButton={false} />
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav />
      <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
        <ArrowLeft size={16} aria-hidden /> Administração
      </Link>
      <div className="mt-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest"><ChartNoAxesCombined size={23} aria-hidden /></span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Revisão manual do repositório · {FRONTEND_PROGRESS_REVIEWED_AT}</p>
          <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">O que falta para chegar a 100%?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Acompanhamento ponderado da implementação do front-end, baseado no código revisado. A conclusão de interfaces não significa que as transações comerciais ou o lançamento em produção estejam liberados.
          </p>
        </div>
      </div>
      <section className="mt-8 rounded-[2rem] bg-forest p-6 text-white shadow-float sm:p-9" aria-labelledby="progress-summary-heading">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 id="progress-summary-heading" className="text-xs font-extrabold uppercase tracking-[0.14em] text-lime">Implementação estimada do front-end</h2>
            <p className="mt-4 text-5xl font-black tabular-nums sm:text-6xl">{FRONTEND_PERCENT}%</p>
            <p className="mt-3 text-sm font-medium text-white/80">{FRONTEND_EARNED_POINTS} pontos entregues · {remaining} pontos pendentes</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-5">
            <LockKeyhole size={23} className="text-lime" aria-hidden />
            <p className="mt-2 text-sm font-extrabold">Publicação comercial ainda não liberada</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/75">Dependências: Preview, contas homologadas, MFA real, testes E2E, pagamentos e operação de pedidos.</p>
          </div>
        </div>
        <div role="progressbar" aria-label="Percentual estimado de implementação do front-end" aria-valuemin={0} aria-valuemax={100} aria-valuenow={FRONTEND_PERCENT} className="mt-7 h-4 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-lime" style={{width: FRONTEND_PERCENT+"%"}} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/80">Critério: dez frentes com pesos somando 100 pontos. Pontuação atribuída por revisão de implementação; falta validação automatizada desta branch e inspeção visual real.</p>
      </section>
      <section className="mt-8" aria-labelledby="frontend-details-title">
        <h2 id="frontend-details-title" className="text-xl font-black text-forest-deep">Avanço por frente</h2>
        <p className="mt-2 text-sm text-muted">Veja evidências existentes e os itens necessários para completar cada área.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {FRONTEND_MILESTONES.map((milestone) => {
            const percentage = Math.round(100*milestone.completed/milestone.weight);
            return <article key={milestone.id} className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-forest-deep">{milestone.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted">Peso no projeto: {milestone.weight}%</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-black tabular-nums text-forest">
                  {percentage===100?<CircleCheck size={17} aria-hidden/>:<CircleDashed size={17} aria-hidden/>}
                  {percentage}%
                </span>
              </div>
              <div role="progressbar" aria-label={"Progresso de "+milestone.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} className="mt-4 h-2.5 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-forest" style={{width: percentage+"%"}} />
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-wider text-forest">Já implementado</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{milestone.delivered}</p>
              <p className="mt-4 text-xs font-black uppercase tracking-wider text-terra">Ainda falta</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{milestone.remaining}</p>
              <Link href={milestone.href} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
                Acessar área <ArrowRight size={16} aria-hidden />
              </Link>
            </article>;
          })}
        </div>
      </section>
      <aside className="mt-8 flex items-start gap-3 rounded-2xl bg-lime-soft p-5 text-sm leading-relaxed text-forest">
        <ShieldCheck size={21} className="shrink-0" aria-hidden />
        <p>Escopo consolidado: <strong>Sou comprador</strong> e <strong>Sou fornecedor</strong>. Nenhuma área de representantes ou vendedores será desenvolvida. Este indicador não cria dados, não modifica políticas RLS e não substitui a verificação cadastral em <Link href="/admin/marketplace/prontidao" className="font-extrabold underline">Prontidão</Link>.</p>
      </aside>
    </main>
    <SiteFooter />
  </div>;
}
