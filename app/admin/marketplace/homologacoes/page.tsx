import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, ClipboardList, ShieldAlert, UsersRound, UserRoundCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "@/components/admin-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Homologações pendentes · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const PAGE_SIZE=20;
type Queue="organizations"|"capabilities"|"memberships"|"profiles";
type Entry={key:string;title:string;detail:string;status:string};
const config={
  organizations:{label:"Empresas",hash:"org-title",info:"Empresas com situação pendente",icon:Building2},
  capabilities:{label:"Capacidades",hash:"cap-title",info:"Solicitações de acesso comprador ou fornecedor",icon:ClipboardList},
  memberships:{label:"Vínculos",hash:"members-title",info:"Convites empresariais ainda não ativados",icon:UsersRound},
  profiles:{label:"Usuários",hash:"users-title",info:"Perfis que aguardam aprovação",icon:UserRoundCheck}
} as const;
const keyList=Object.keys(config) as Queue[];
function urlFor(kind:Queue,page:number){return "/admin/marketplace/homologacoes?tipo="+kind+"&pagina="+page;}

async function getQueue(kind:Queue,page:number) {
  // The parent /admin/layout.tsx requires PLATFORM_ADMIN and a validated AAL2 session.
  // Every PostgREST request enforces the same user's RLS, without service_role.
  const client=await createClient();
  const counts=await Promise.all([
    client.from("organizations").select("id",{count:"exact",head:true}).eq("status","pending"),
    client.from("organization_capabilities").select("organization_id",{count:"exact",head:true}).eq("status","pending"),
    client.from("organization_members").select("id",{count:"exact",head:true}).eq("status","invited"),
    client.from("profiles").select("id",{count:"exact",head:true}).eq("status","pending")
  ]);
  if (counts.some(x=>x.error)) return null;
  const totals=Object.fromEntries(keyList.map((key,i)=>[key,counts[i].count??0])) as Record<Queue,number>;
  const start=(page-1)*PAGE_SIZE,end=start+PAGE_SIZE-1;
  let entries:Entry[]=[];
  if(kind==="organizations") {
    const r=await client.from("organizations").select("id,legal_name,trade_name,kind,status")
      .eq("status","pending").order("created_at",{ascending:false}).range(start,end);
    if(r.error)return null;
    entries=(r.data??[]).map(x=>({key:x.id,title:x.trade_name||x.legal_name,detail:x.legal_name+" · "+(x.kind==="BUYER"?"Comprador":x.kind==="SUPPLIER"?"Fornecedor":"Operadora"),status:x.status}));
  } else if (kind==="capabilities") {
    const r=await client.from("organization_capabilities").select("organization_id,capability,status")
      .eq("status","pending").order("organization_id",{ascending:true}).range(start,end);
    if(r.error)return null;
    const ids=[...new Set((r.data??[]).map(x=>x.organization_id))];
    const organizations=ids.length?await client.from("organizations").select("id,legal_name,trade_name").in("id",ids):null;
    if(organizations?.error)return null;
    const names=new Map((organizations?.data??[]).map(x=>[x.id,x.trade_name||x.legal_name]));
    entries=(r.data??[]).map(x=>({key:x.organization_id+":"+x.capability,title:names.get(x.organization_id)||"Empresa sem nome disponível",detail:"Capacidade solicitada: "+(x.capability==="BUYER"?"Comprador":x.capability==="SUPPLIER"?"Fornecedor":"Operadora"),status:x.status}));
  } else if (kind==="memberships") {
    const r=await client.from("organization_members").select("id,organization_id,user_id,role,status")
      .eq("status","invited").order("created_at",{ascending:false}).range(start,end);
    if(r.error)return null;
    const ids=[...new Set((r.data??[]).map(x=>x.organization_id))];
    const organizations=ids.length?await client.from("organizations").select("id,legal_name,trade_name").in("id",ids):null;
    if(organizations?.error)return null;
    const names=new Map((organizations?.data??[]).map(x=>[x.id,x.trade_name||x.legal_name]));
    entries=(r.data??[]).map(x=>({key:x.id,title:names.get(x.organization_id)||"Empresa sem nome disponível",detail:"Papel: "+x.role+" · Usuário: "+x.user_id.slice(0,8)+"…",status:x.status}));
  } else {
    const r=await client.from("profiles").select("id,display_name,status")
      .eq("status","pending").order("created_at",{ascending:false}).range(start,end);
    if(r.error)return null;
    entries=(r.data??[]).map(x=>({key:x.id,title:x.display_name,detail:"Usuário: "+x.id.slice(0,8)+"…",status:x.status}));
  }
  return {entries,totals,total:totals[kind]};
}

export default async function ReviewQueue({searchParams}:{searchParams:Promise<{tipo?:string;pagina?:string}>}) {
  const search=await searchParams;
  const kind=(search.tipo && Object.prototype.hasOwnProperty.call(config,search.tipo)?search.tipo:"organizations") as Queue;
  const page=/^[1-9][0-9]{0,3}$/.test(search.pagina??"1")?Math.min(1000,Number(search.pagina??"1")):1;
  const data=await getQueue(kind,page);
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Homologações" backHref="/admin/marketplace" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav/>
      <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline"><ArrowLeft size={16} aria-hidden/> Administração</Link>
      <p className="mt-6 text-xs font-black uppercase tracking-widest text-terra">Área interna · MFA obrigatório</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Fila de homologações</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Acompanhe revisões pendentes de empresas e acessos. Esta tela não aprova automaticamente cadastros, ofertas ou produtos.</p>
      {!data ? <section role="alert" className="mt-7 rounded-2xl border border-line bg-paper p-7">
        <ShieldAlert className="text-terra" size={26} aria-hidden/>
        <h2 className="mt-4 text-xl font-black text-forest-deep">Fila indisponível</h2>
        <p className="mt-2 text-sm text-muted">Não foi possível verificar todas as pendências com segurança. Confira sua sessão e o segundo fator.</p>
      </section> : <>
        <nav aria-label="Categorias de homologação" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {keyList.map(key=>{
            const Icon=config[key].icon;
            return <Link href={urlFor(key,1)} key={key} aria-current={key===kind?"page":undefined}
              className={"rounded-2xl border p-5 transition focus-visible:ring-2 focus-visible:ring-forest "+(key===kind?"border-forest bg-lime-soft":"border-line bg-paper hover:bg-lime-soft")}>
              <Icon size={22} className="text-forest" aria-hidden/>
              <span className="mt-3 block text-sm font-extrabold text-forest-deep">{config[key].label}</span>
              <span className="mt-2 block text-3xl font-black tabular-nums text-forest-deep">{data.totals[key]}</span>
            </Link>;
          })}
        </nav>
        <section className="mt-7 overflow-hidden rounded-[2rem] border border-line bg-paper" aria-labelledby="queue-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
            <div><h2 id="queue-heading" className="text-xl font-black text-forest-deep">{config[kind].info}</h2>
              <p className="mt-2 text-sm text-muted">Consulta privada de dados reais; nenhuma decisão automática.</p></div>
            <Link href={"/admin/acessos#"+config[kind].hash} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white">
              Revisar acessos <ArrowRight size={16} aria-hidden/>
            </Link>
          </div>
          {data.entries.length ? <ul className="divide-y divide-line">
            {data.entries.map(item=><li key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <div><h3 className="font-extrabold text-forest-deep">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.detail}</p></div>
              <span className="rounded-full bg-sand px-3 py-1.5 text-xs font-black text-[#5c3a06]">
                {item.status==="invited"?"Convidado":"Em análise"}
              </span>
            </li>)}
          </ul> : <div role="status" className="px-7 py-14 text-center">
            <ClipboardList className="mx-auto text-forest" size={30} aria-hidden/>
            <h3 className="mt-4 text-xl font-black text-forest-deep">Nenhuma pendência nesta página</h3>
            <p className="mt-2 text-sm text-muted">Quando houver solicitações reais, elas aparecerão aqui.</p>
          </div>}
          <nav aria-label="Navegação entre páginas" className="flex items-center justify-between gap-3 border-t border-line bg-canvas p-5 text-sm font-bold text-forest">
            <span>{data.total?Math.min((page-1)*PAGE_SIZE+1,data.total)+" a "+Math.min(page*PAGE_SIZE,data.total)+" de "+data.total:"Nenhuma pendência"}</span>
            <div className="flex gap-2">
              {page>1&&<Link href={urlFor(kind,page-1)} className="inline-flex min-h-11 items-center rounded-full bg-paper px-4 ring-1 ring-line">Anterior</Link>}
              {page*PAGE_SIZE<data.total&&<Link href={urlFor(kind,page+1)} className="inline-flex min-h-11 items-center rounded-full bg-forest px-4 text-white">Próxima</Link>}
            </div>
          </nav>
        </section>
      </>}
      <p className="mt-6 rounded-2xl bg-lime-soft p-5 text-sm text-forest">Aprovar o vínculo de uma empresa não publica automaticamente produtos ou libera pedidos. Produtos e ofertas requerem homologação comercial específica.</p>
    </main>
    <SiteFooter/>
  </div>;
}
