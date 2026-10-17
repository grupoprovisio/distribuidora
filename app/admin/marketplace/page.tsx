import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck, ShieldAlert, ShieldCheck, Store, UsersRound } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Marketplace · Administração · Provisio",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const titles: Record<string,string> = { BUYER: "Compradora", SUPPLIER: "Fornecedora", PLATFORM_OPERATOR: "Operadora" };
const labels: Record<string,string> = { pending:"Em análise", approved:"Aprovada", suspended:"Suspensa" };
const pill = (status:string) => status === "approved" ? "bg-lime-soft text-forest"
  : status === "pending" ? "bg-sand text-[#5c3a06]" : "bg-blush text-wine";

async function administrativeSnapshot() {
  // /admin/layout.tsx requires a verified platform admin with MFA (AAL2).
  // Queries use only the user's SSR cookie and Postgres RLS. No privileged key.
  const client=await createClient();
  const [all,suppliers,buyers,pending,members,recent] = await Promise.all([
    client.from("organizations").select("id",{head:true,count:"exact"}),
    client.from("organizations").select("id",{head:true,count:"exact"}).eq("kind","SUPPLIER").eq("status","approved"),
    client.from("organizations").select("id",{head:true,count:"exact"}).eq("kind","BUYER").eq("status","approved"),
    client.from("organizations").select("id",{head:true,count:"exact"}).eq("status","pending"),
    client.from("organization_members").select("id",{head:true,count:"exact"}).eq("status","active"),
    client.from("organizations").select("id,legal_name,trade_name,kind,status,created_at").order("created_at",{ascending:false}).limit(8)
  ]);
  if ([all,suppliers,buyers,pending,members,recent].some(result=>result.error)) return null;
  return {
    counts: [
      {icon:Building2,label:"Empresas cadastradas",value:all.count??0,tone:"bg-mist text-forest"},
      {icon:Store,label:"Fornecedores aprovados",value:suppliers.count??0,tone:"bg-lime-soft text-forest"},
      {icon:UsersRound,label:"Compradores aprovados",value:buyers.count??0,tone:"bg-sand text-terra"},
      {icon:ClipboardCheck,label:"Empresas em análise",value:pending.count??0,tone:"bg-blush text-wine"},
    ],
    activeMembers: members.count??0,
    recent:recent.data??[],
  };
}

export default async function MarketplaceAdminPage() {
  const snapshot=await administrativeSnapshot();
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Administração do marketplace" backHref="/admin" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav/>
      <section className="rounded-[2rem] bg-forest p-6 text-white shadow-float sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Governança comercial</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">Administração do marketplace Provisio</h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/75">
          Consulte organizações e homologações reais, com acesso restrito ao operador autorizado e MFA. Nenhum dado de faturamento, pedido ou comissão é estimado.
        </p>
      </section>
      {!snapshot ? <section role="alert" className="mt-7 rounded-3xl border border-line bg-paper p-7">
        <ShieldAlert size={25} className="text-terra" aria-hidden/>
        <h2 className="mt-4 text-xl font-black text-forest-deep">Dados administrativos indisponíveis</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">O Supabase não confirmou as informações necessárias. Recarregue a página e verifique a sessão com MFA; os valores não foram substituídos por números fictícios.</p>
      </section> : <>
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores reais das organizações">
          {snapshot.counts.map(({icon:Icon,label,value,tone})=><article key={label} className="rounded-3xl border border-line bg-paper p-5">
            <span className={"grid size-10 place-items-center rounded-2xl "+tone}><Icon size={19} aria-hidden/></span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.1em] text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-forest-deep">{value}</p>
          </article>)}
        </section>
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-line bg-paper" aria-labelledby="recent-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
            <div><h2 id="recent-title" className="text-xl font-black text-forest-deep">Últimas organizações</h2>
              <p className="mt-1 text-sm text-muted">{snapshot.activeMembers} vínculos de usuários ativos no total</p>
            </div>
            <Link href="/admin/acessos" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white">
              Gerenciar acessos <ArrowRight size={16} aria-hidden/>
            </Link>
          </div>
          {snapshot.recent.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead><tr className="border-b border-line bg-canvas text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-4">Organização</th>
                <th scope="col" className="px-5 py-4">Perfil</th>
                <th scope="col" className="px-5 py-4">Homologação</th>
              </tr></thead>
              <tbody>{snapshot.recent.map(org=><tr key={org.id} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-4"><strong className="block text-sm text-forest-deep">{org.trade_name||org.legal_name}</strong>
                  <span className="text-xs text-muted">{org.legal_name}</span></td>
                <td className="px-5 py-4 text-sm font-semibold">{titles[org.kind]??org.kind}</td>
                <td className="px-5 py-4"><span className={"inline-flex rounded-full px-3 py-1 text-xs font-black "+pill(org.status)}>{labels[org.status]??org.status}</span></td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="px-6 py-12 text-center" role="status">
            <Building2 className="mx-auto text-forest" size={27} aria-hidden/>
            <h3 className="mt-4 text-lg font-black text-forest-deep">Nenhuma empresa cadastrada</h3>
            <p className="mt-2 text-sm text-muted">Empresas reais aparecerão aqui após o registro e a validação pela administração.</p>
          </div>}
        </section>
      </>}
      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-[2rem] border border-line bg-paper p-6">
          <h2 className="text-xl font-black text-forest-deep">Próximas ações</h2>
          <p className="mt-2 text-sm text-muted">Os processos comerciais continuam sujeitos a aprovação administrativa.</p>
          <div className="mt-5 grid gap-3">
            {[
              {href:"/admin/acessos",title:"Empresas e permissões",detail:"Aprovar perfis, organizações, vínculos e capacidades."},
              {href:"/admin/marketplace/homologacoes",title:"Fila de homologações",detail:"Veja pendências reais de empresas, usuários e acessos antes de tomar uma decisão."},
              {href:"/app/fornecedor",title:"Operação do fornecedor",detail:"Acesso condicionado à capacidade de fornecedor no Supabase."},
              {href:"/produtos",title:"Catálogo autorizado",detail:"Visualize a vitrine institucional, sem ofertas externas."},
            ].map(({href,title,detail})=><Link href={href} key={href} className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4 hover:bg-lime-soft">
              <span><strong className="block text-sm font-extrabold text-forest-deep">{title}</strong>
              <span className="mt-1 block text-xs text-muted">{detail}</span></span>
              <ArrowRight size={17} className="shrink-0 text-forest" aria-hidden/>
            </Link>)}
          </div>
        </div>
        <aside className="rounded-[2rem] bg-wine p-6 text-white">
          <ShieldCheck size={26} className="text-lime" aria-hidden/>
          <h2 className="mt-4 text-xl font-black">Segurança em primeiro lugar</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">A sessão é validada no servidor e exige segundo fator para funções administrativas. Pedidos, estoque, preços e receitas não são inferidos a partir destes indicadores.</p>
        </aside>
      </section>
    </main>
    <SiteFooter/>
  </div>;
}
