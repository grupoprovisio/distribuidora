import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, CircleAlert, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "@/components/admin-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import {
  areaPercent, DELIVERY_PROGRESS, DELIVERY_TRACKS, OVERALL_PROGRESS, PROJECT_AREAS, REVIEW_DATE, STAGE_WEIGHTS,
  TOTAL_PROGRESS, type ProgressDimension
} from "@/lib/marketplace/project-progress";
import { WRAP } from "@/lib/ui";
import { summarizeQaIdentityReadiness, type QaIdentitySnapshot } from "@/lib/marketplace/qa-readiness";
import { readQaTransactionScope } from "@/lib/marketplace/qa-transaction-gate";

export const metadata: Metadata = {
  title: "Evolução do projeto · ADM Provisio",
  description: "Progresso auditável do marketplace B2B com duas jornadas comerciais.",
  robots: { index: false, follow: false },
};
export const dynamic="force-dynamic";

const DIMENSIONS: {key:ProgressDimension; title:string;help:string}[]=[
  {key:"code",title:"Implementação",help:"Critérios identificados no código, incluindo o trabalho ainda em branch isolada."},
  {key:"tests",title:"Testes",help:"Cobertura de validação; testes em PostgreSQL descartável não equivalem a E2E autenticado."},
  {key:"production",title:"Produção",help:"Funcionalidades comprovadas na versão publicada, não apenas disponíveis em Preview."},
];
type LiveCount={name:string;value:number;href:string};

async function readLiveSnapshot():Promise<LiveCount[]|null>{
  // Este painel está protegido pelo layout /admin, que exige PLATFORM_ADMIN + MFA AAL2.
  // O Supabase utiliza somente cookies SSR do usuário com RLS; nunca service_role.
  const db=await createClient();
  const queries=await Promise.all([
    db.from("organizations").select("id",{head:true,count:"exact"}).eq("status","approved"),
    db.from("products").select("id",{head:true,count:"exact"}).eq("status","active"),
    db.from("supplier_products").select("id",{head:true,count:"exact"}).eq("status","approved"),
    db.from("offers").select("id",{head:true,count:"exact"}).eq("status","approved"),
    db.from("supplier_product_submissions").select("id",{head:true,count:"exact"}).eq("status","pending"),
  ]);
  if(queries.some(query=>query.error || query.count===null))return null;
  return [
    {name:"Empresas aprovadas",value:queries[0].count??0,href:"/admin/acessos"},
    {name:"Produtos ativos",value:queries[1].count??0,href:"/admin/marketplace/cadastro"},
    {name:"SKUs homologados",value:queries[2].count??0,href:"/admin/marketplace/cadastro"},
    {name:"Ofertas aprovadas",value:queries[3].count??0,href:"/admin/marketplace/catalogo"},
    {name:"Cadastros em análise",value:queries[4].count??0,href:"/admin/marketplace/solicitacoes"},
  ];
}
async function readHostedQaSummary():Promise<QaIdentitySnapshot|null> {
  // Somente o ADM com MFA consegue acessar esta página; consultas SSR respeitam RLS.
  // Falhar fechado: listas truncadas ou indisponíveis não geram percentuais fictícios.
  const db=await createClient();
  const [organizations,members,capabilities,profiles,mfa]=await Promise.all([
    db.from("organizations").select("id,kind,status,trade_name",{count:"exact"}).limit(500),
    db.from("organization_members").select("organization_id,user_id,role,status",{count:"exact"}).limit(500),
    db.from("organization_capabilities").select("organization_id,capability,status",{count:"exact"}).limit(500),
    db.from("profiles").select("id,status",{count:"exact"}).limit(500),
    db.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const results=[organizations,members,capabilities,profiles];
  if(results.some(result=>result.error || result.count===null ||
    (result.count??0)>500 || !result.data) || mfa.error) return null;
  return summarizeQaIdentityReadiness({
    organizations:organizations.data??[],
    members:members.data??[],
    capabilities:capabilities.data??[],
    profiles:profiles.data??[],
    adminAal2:mfa.data.currentLevel==="aal2",
  });
}

type QaPersistenceSnapshot={quotes:number;proposals:number;orders:number;delivered:number};
const qaPersistenceSteps=[
  {key:"quotes",label:"Cotações QA gravadas"},
  {key:"proposals",label:"Propostas QA gravadas"},
  {key:"orders",label:"Pedidos QA gravados"},
  {key:"delivered",label:"Entregas QA registradas"},
] as const;
async function readHostedQaTransactions():Promise<QaPersistenceSnapshot|null>{
  const scope=readQaTransactionScope(process.env);
  if(!scope || process.env.MARKETPLACE_TRANSACTIONS_ENABLED==="true") return null;
  const db=await createClient();
  // Only configured QA orgs. Migration 0028 requires PLATFORM_ADMIN with live MFA AAL2.
  const [quotes,proposals,orders,delivered]=await Promise.all([
    db.from("quote_requests").select("id",{head:true,count:"exact"}).eq("buyer_org_id",scope.buyer),
    db.from("quote_proposals").select("id",{head:true,count:"exact"}).in("supplier_org_id",[...scope.suppliers]),
    db.from("purchase_orders").select("id",{head:true,count:"exact"}).eq("buyer_org_id",scope.buyer),
    db.from("order_fulfillments").select("id",{head:true,count:"exact"})
      .eq("buyer_org_id",scope.buyer).eq("status","delivered"),
  ]);
  if([quotes,proposals,orders,delivered].some(item=>item.error || item.count===null))return null;
  return {quotes:quotes.count??0,proposals:proposals.count??0,
    orders:orders.count??0,delivered:delivered.count??0};
}

const priorityLabels={P0:"Bloqueio imediato",P1:"Essencial para testar",P2:"Operação ampliada",P3:"Comercialização completa"} as const;

export default async function ProgressPage(){
  const [live,qa,qaPersistence]=await Promise.all([readLiveSnapshot(),readHostedQaSummary(),readHostedQaTransactions()]);
  const transactionalEnabled=process.env.MARKETPLACE_TRANSACTIONS_ENABLED==="true";
  const qaTransactionEnabled=!transactionalEnabled && readQaTransactionScope(process.env)!==null;
  const blockers=PROJECT_AREAS.filter(area=>area.priority==="P0"||area.priority==="P1");
  const persistedSteps=qaPersistence?qaPersistenceSteps.filter(step=>qaPersistence[step.key]>0).length:0;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Progresso do projeto" backHref="/admin/marketplace" showListButton={false}/>
    <main className={WRAP+" py-8 sm:py-12"}>
      <AdminNav/>
      <div className="mt-6 flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest" aria-hidden>
          <ChartNoAxesCombined size={23}/>
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Provisio · Planejamento e homologação</p>
          <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Quanto falta para concluir?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Somente <strong>Sou Comprador</strong> e <strong>Sou Fornecedor</strong>, além do ADM interno.
            O progresso é uma estimativa baseada em critérios revisados em {REVIEW_DATE}, não uma certificação de prontidão comercial.
          </p>
        </div>
      </div>

      <section aria-label="Visão geral do andamento" className="mt-8 rounded-[2rem] bg-forest p-6 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Avanço geral estimado</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          <p className="text-5xl font-black tabular-nums tracking-tight sm:text-6xl">{OVERALL_PROGRESS}%</p>
          <p className="max-w-md text-sm leading-relaxed text-white/80">
            Média ponderada: implementação {STAGE_WEIGHTS.code}%, testes {STAGE_WEIGHTS.tests}% e produção {STAGE_WEIGHTS.production}%.
            A pontuação não libera pedidos, pagamentos nem publicação automática.
          </p>
        </div>
        <div role="progressbar" aria-label="Progresso global estimado" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={OVERALL_PROGRESS} className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-lime" style={{width:OVERALL_PROGRESS+"%"}}/>
        </div>
      </section>

      <section aria-labelledby="technical-progress-title" className="mt-5">
        <h2 id="technical-progress-title" className="text-xl font-black text-forest-deep">
          Avanço do frontend e backend
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Recortes da implementação por camada, com critérios compartilhados entre as duas frentes.
          Estas notas representam o código preparado, não aprovação de testes hospedados.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["frontend", "backend"] as const).map(track => (
            <article key={track} className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <h3 className="font-black text-forest-deep">{DELIVERY_TRACKS[track].title}</h3>
                <p className="text-3xl font-black tabular-nums text-forest">{DELIVERY_PROGRESS[track]}%</p>
              </div>
              <div role="progressbar" aria-label={"Implementação "+DELIVERY_TRACKS[track].title}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={DELIVERY_PROGRESS[track]}
                className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-forest" style={{width: DELIVERY_PROGRESS[track]+"%"}}/>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{DELIVERY_TRACKS[track].summary}</p>
            </article>
          ))}
        </div>
      </section>
      <section aria-label="Etapas independentes do projeto" className="mt-5 grid gap-3 md:grid-cols-3">
        {DIMENSIONS.map(stage=><article key={stage.key} className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-sm font-black text-forest-deep">{stage.title}</h2>
          <p className="mt-2 text-3xl font-black tabular-nums text-forest">{TOTAL_PROGRESS[stage.key]}%</p>
          <div role="progressbar" aria-label={"Andamento de "+stage.title.toLowerCase()} aria-valuemin={0} aria-valuemax={100} aria-valuenow={TOTAL_PROGRESS[stage.key]}
            className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-forest" style={{width:TOTAL_PROGRESS[stage.key]+"%"}}/>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">{stage.help}</p>
        </article>)}
      </section>

      <section aria-labelledby="qa-identities-title" className="mt-8 rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="qa-identities-title" className="text-xl font-black text-forest-deep">Identidades independentes para homologação</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Checagem ao vivo de organizações de testes, vínculos ativos e permissões mínimas no Supabase hospedado.
              Administradores não contam como compradores ou fornecedores independentes.
            </p>
          </div>
          <p className="rounded-full bg-lime-soft px-4 py-2 text-sm font-black tabular-nums text-forest-deep">
            {qa ? qa.completed+" de "+qa.total+" perfis preparados" : "Verificação indisponível"}
          </p>
        </div>
        {!qa ? <p role="alert" className="mt-5 text-sm text-wine">
          Não foi possível confirmar os vínculos com RLS. Nenhuma identidade foi presumida como aprovada.
        </p> : <>
          <div role="progressbar" aria-label="Perfis independentes preparados para homologação"
            aria-valuemin={0} aria-valuemax={qa.total} aria-valuenow={qa.completed}
            className="mt-5 h-2.5 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-forest" style={{width:(100*qa.completed/qa.total)+"%"}}/>
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {qa.milestones.map(item=><li key={item.id} className="rounded-2xl border border-line p-4">
              <p className="flex items-center gap-2 text-sm font-black text-forest-deep">
                {item.complete?<ShieldCheck size={18} className="text-forest" aria-hidden/>:
                  <CircleAlert size={18} className="text-terra" aria-hidden/>}
                {item.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.explanation}</p>
              <p className="mt-2 text-xs font-extrabold text-terra">
                {item.complete?"Vínculo conferido":"Vínculo pendente"}
              </p>
            </li>)}
          </ol>
        </>}
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Transações comerciais: <strong>{transactionalEnabled?"habilitadas globalmente":"desabilitadas para o público"}</strong>.
          Homologação isolada: <strong>{qaTransactionEnabled?"ativa somente para as três organizações QA autorizadas":"desativada"}</strong>.
          Esta seção comprova somente pré-requisitos de identidade, não login de cada conta,
          teste adversarial RLS, upload, cotação ou pedido; nada aqui altera o avanço geral.
        </p>
      </section>

      <section aria-labelledby="qa-persistence-title" className="mt-8 rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <h2 id="qa-persistence-title" className="text-xl font-black text-forest-deep">Evidências QA persistidas no Supabase</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Leitura ao vivo das organizações autorizadas de homologação com RLS e MFA administrativo.
          Não representa faturamento, pagamento ou operação com clientes comerciais.
        </p>
        {!qaPersistence?<p role="alert" className="mt-5 text-sm text-muted">
          Evidência indisponível: confirme a configuração QA, a sessão ADM com MFA e as permissões de leitura.
          Nenhum percentual foi presumido.
        </p>:<>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black tabular-nums text-forest">{Math.round(persistedSteps*100/qaPersistenceSteps.length)}%</p>
              <p className="mt-1 text-xs text-muted">{persistedSteps} de {qaPersistenceSteps.length} tipos de registro presentes</p>
            </div>
            <p className="text-xs font-semibold text-muted">Portão SQL QA · não é o avanço geral</p>
          </div>
          <div role="progressbar" aria-label="Registros persistidos do fluxo QA" aria-valuemin={0}
            aria-valuemax={qaPersistenceSteps.length} aria-valuenow={persistedSteps}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-forest" style={{width:(100*persistedSteps/qaPersistenceSteps.length)+"%"}}/>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {qaPersistenceSteps.map(step=><li key={step.key} className="rounded-2xl border border-line p-4">
              <p className="text-xs font-semibold text-muted">{step.label}</p>
              <p className="mt-2 text-2xl font-black tabular-nums text-forest-deep">{qaPersistence[step.key]}</p>
            </li>)}
          </ul>
        </>}
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Estes registros podem decorrer de testes SQL com contexto de autenticação simulado.
          Mesmo 4/4 não comprova cotação → entrega via HTTP hospedado com sessões reais independentes.
          Vendas comerciais permanecem bloqueadas.
        </p>
      </section>
      <section aria-labelledby="free-qa-title" className="mt-5 rounded-2xl border border-line bg-paper p-5">
        <h2 id="free-qa-title" className="text-base font-black text-forest-deep">Homologação no Supabase Free</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          O plano Free não impede a homologação QA. A proteção nativa contra senhas vazadas, disponível no
          Supabase Pro, permanece como risco registrado para revisão antes da abertura comercial,
          sem bloquear esta fase. MFA administrativo, RLS, sessões e isolamento QA/comercial seguem obrigatórios.
        </p>
      </section>

      <section aria-labelledby="live-title" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="live-title" className="text-xl font-black text-forest-deep">Dados comerciais existentes</h2>
            <p className="mt-1 text-xs text-muted">Consultados ao vivo no Supabase com suas permissões de ADM. Não entram no cálculo de implementação.</p>
          </div>
          <Link href="/admin/marketplace/prontidao" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
            Ver critérios de prontidão <ArrowRight size={16} aria-hidden/>
          </Link>
        </div>
        {!live?<div role="alert" className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-paper p-5 text-sm text-wine">
          <CircleAlert size={21} aria-hidden/> Não foi possível consultar os indicadores. Nenhum valor foi substituído por números fictícios.
        </div>:<ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {live.map(item=><li key={item.name} className="rounded-2xl border border-line bg-paper p-4">
            <Link href={item.href} className="block rounded-md focus-visible:outline-2 focus-visible:outline-forest">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{item.name}</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-forest-deep">{item.value}</p>
            </Link>
          </li>)}
        </ul>}
      </section>

      <section className="mt-9" aria-labelledby="areas-title">
        <h2 id="areas-title" className="text-xl font-black text-forest-deep">Andamento por área</h2>
        <p className="mt-2 text-sm text-muted">
          Notas de 0 a 100, calculadas sobre quatro critérios por dimensão em cada área.
          O avanço do código inclui esta branch isolada; somente a coluna Produção reflete a versão publicada.
        </p>
        <div tabIndex={0} role="region" aria-label="Tabela de andamento por área, rolável horizontalmente"
          className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper focus-visible:outline-2 focus-visible:outline-forest">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wider text-muted">
              <tr><th scope="col" className="px-5 py-4">Área</th><th scope="col" className="px-3 py-4 text-center">Código</th>
                <th scope="col" className="px-3 py-4 text-center">Testes</th>
                <th scope="col" className="px-3 py-4 text-center">Produção</th>
                <th scope="col" className="px-5 py-4">Próxima entrega</th></tr>
            </thead>
            <tbody>{PROJECT_AREAS.map(area=><tr key={area.id} className="border-b border-line/80 last:border-b-0 align-top">
              <th scope="row" className="px-5 py-4 font-bold text-forest-deep">
                <Link href={area.href} className="hover:underline focus-visible:underline">{area.name}</Link>
                <span className="mt-1 block text-[11px] font-semibold text-muted">{area.priority} · {priorityLabels[area.priority]}</span>
              </th>
              {DIMENSIONS.map(stage=><td key={stage.key} className="px-3 py-4 text-center font-black tabular-nums text-forest">
                {areaPercent(area,stage.key)}%
              </td>)}
              <td className="max-w-xs px-5 py-4 text-xs leading-relaxed text-muted">{area.next}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="priorities-title" className="mt-9">
        <h2 id="priorities-title" className="text-xl font-black text-forest-deep">Prioridades para avançar</h2>
        <ol className="mt-4 grid gap-3 lg:grid-cols-2">
          {blockers.map(area=><li key={area.id} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-xs font-extrabold uppercase tracking-wide text-terra">{area.priority} · {priorityLabels[area.priority]}</p>
            <h3 className="mt-2 font-black text-forest-deep">{area.name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">Já implementado: {area.evidence}</p>
            <p className="mt-3 text-sm leading-relaxed text-forest">{area.next}</p>
          </li>)}
        </ol>
      </section>
      <div className="mt-9 flex flex-wrap gap-3 rounded-2xl border border-line bg-paper p-5 text-sm text-muted">
        <ShieldCheck size={21} className="shrink-0 text-forest" aria-hidden/>
        <p>Os percentuais são indicadores de planejamento, revistos manualmente por commit, e não equivalem a serviços homologados.
          Cotações e pedidos comerciais permanecem protegidos por <code>MARKETPLACE_TRANSACTIONS_ENABLED=false</code> até testes completos; a modalidade QA não autoriza outras empresas.
          Nenhum valor financeiro ou produto de demonstração é considerado faturamento real.</p>
      </div>
    </main>
    <SiteFooter/>
  </div>;
}
