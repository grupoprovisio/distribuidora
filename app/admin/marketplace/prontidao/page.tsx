import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, Boxes, CheckCircle2, ClipboardList, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "@/components/admin-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Prontidão de testes · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
type CountItem={label:string;count:number;href:string;what:string;ready:boolean};

async function currentReadiness(){
  // AdminLayout requires active PLATFORM_ADMIN + MFA AAL2. All queries use RLS.
  const client=await createClient();
  const now=new Date().toISOString();
  const result=await Promise.all([
    client.from("organizations").select("id",{head:true,count:"exact"}).eq("kind","PLATFORM_OPERATOR").eq("is_platform_owned",true).eq("status","approved"),
    client.from("organizations").select("id",{head:true,count:"exact"}).eq("kind","BUYER").eq("status","approved"),
    client.from("organization_capabilities").select("organization_id",{head:true,count:"exact"}).eq("capability","BUYER").eq("status","approved"),
    client.from("organization_capabilities").select("organization_id",{head:true,count:"exact"}).eq("capability","SUPPLIER").eq("status","approved"),
    client.from("products").select("id",{head:true,count:"exact"}).eq("status","active"),
    client.from("supplier_products").select("id",{head:true,count:"exact"}).eq("status","approved"),
    client.from("inventory_positions").select("supplier_product_id",{head:true,count:"exact"}).gt("available_quantity",0),
    client.from("offers").select("id",{head:true,count:"exact"}).eq("status","approved").lte("valid_from",now).or("valid_to.is.null,valid_to.gt."+now),
    client.from("buyer_delivery_regions").select("buyer_org_id",{head:true,count:"exact"})
  ]);
  if(result.some(item=>item.error || item.count === null))return null;
  const counts=result.map(item=>item.count??0);
  const [platform,buyerOrg,buyerCap,supplierCap,products,skus,stock,offers,regions]=counts;
  const steps:CountItem[]=[
    {label:"Organização operadora",count:platform,href:"/admin/acessos",what:"Precisa da identidade jurídica real e de administrador com MFA.",ready:platform>0},
    {label:"Empresa compradora homologada",count:buyerOrg,href:"/admin/acessos",what:"Empresa de cliente aprovada para a área de compras.",ready:buyerOrg>0},
    {label:"Capacidade de comprador aprovada",count:buyerCap,href:"/admin/acessos",what:"Vínculo comercial BUYER aprovado em alguma organização.",ready:buyerCap>0},
    {label:"Capacidade de fornecedor aprovada",count:supplierCap,href:"/admin/acessos",what:"Distribuidora própria ou fornecedor parceiro com autorização SUPPLIER.",ready:supplierCap>0},
    {label:"Produtos mestres ativos",count:products,href:"/admin/marketplace/cadastro",what:"Produtos cadastrados e ativados pela administração.",ready:products>0},
    {label:"SKUs de fornecedores homologados",count:skus,href:"/admin/marketplace/cadastro",what:"Produtos vinculados a fornecedores para venda.",ready:skus>0},
    {label:"Posições de estoque positivas",count:stock,href:"/admin/marketplace/cadastro",what:"Registros com saldo informado maior que zero; aprovação final ainda verifica reserva e mínimo.",ready:stock>0},
    {label:"Ofertas aprovadas e vigentes",count:offers,href:"/admin/marketplace/catalogo",what:"Preços aprovados na janela de validade atual; a oferta ainda deve atender às regras de região e estoque.",ready:offers>0},
    {label:"Regiões de comprador autorizadas",count:regions,href:"/admin/acessos",what:"UF liberada por um administrador para uma empresa compradora.",ready:regions>0},
  ];
  return {steps,ready:steps.every(x=>x.ready)};
}

export default async function ReadinessPage(){
  const snapshot=await currentReadiness();
  const completed=snapshot?.steps.filter(x=>x.ready).length??0;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Prontidão comercial" backHref="/admin/marketplace" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav/>
      <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
        <ArrowLeft size={16} aria-hidden/> Administração do marketplace
      </Link>
      <div className="mt-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest"><Activity size={23} aria-hidden/></span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-terra">Painel privado · MFA obrigatório</p>
          <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Prontidão para testar produtos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Veja os requisitos que já possuem registros reais no Supabase. Nenhum produto, cliente, fornecedor ou preço é criado para preencher estes indicadores.
          </p>
        </div>
      </div>
      {!snapshot?<section role="alert" className="mt-8 rounded-3xl border border-line bg-paper p-7">
        <ShieldAlert size={26} className="text-terra" aria-hidden/>
        <h2 className="mt-4 text-lg font-black text-forest-deep">Verificação indisponível</h2>
        <p className="mt-2 text-sm text-muted">Não foi possível verificar todas as condições com segurança. Confira sua sessão com MFA e a disponibilidade do Supabase.</p>
      </section>:<>
        <section aria-label="Resultado da verificação do catálogo" className="mt-8 rounded-[2rem] bg-forest p-6 text-white shadow-float sm:p-9">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-lime">Prontidão cadastral</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-4xl font-black tabular-nums">{completed} / {snapshot.steps.length}</p>
              <p className="mt-2 text-sm font-semibold text-white/75">etapas com registros de referência</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              {snapshot.ready?<CheckCircle2 size={18} aria-hidden/>:<LockKeyhole size={18} aria-hidden/>}
              {snapshot.ready?"Pré-requisitos cadastrais presentes":"Cadastro comercial ainda incompleto"}
            </span>
          </div>
          <div role="progressbar" aria-label="Etapas cadastrais atendidas" aria-valuemin={0} aria-valuemax={snapshot.steps.length} aria-valuenow={completed}
            className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-lime" style={{width:(100*completed/snapshot.steps.length)+"%"}}/>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/75">
            Esta verificação é cadastral, não substitui testes reais de login, isolamento entre empresas, frete, pedidos, pagamentos e emissão fiscal.
          </p>
        </section>
        <ol className="mt-7 grid gap-3 md:grid-cols-2">
          {snapshot.steps.map((item,index)=><li key={item.label} className="rounded-3xl border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-xs font-black tabular-nums text-terra">{String(index+1).padStart(2,"0")}</span>
                <div>
                  <h2 className="font-black text-forest-deep">{item.label}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.what}</p>
                </div>
              </div>
              <span className={"shrink-0 rounded-full px-2.5 py-1.5 text-xs font-black "+
                (item.ready?"bg-lime-soft text-forest":"bg-sand text-[#5c3a06]")}>{item.count} registro(s)</span>
            </div>
            <Link href={item.href} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
              {item.ready?"Conferir etapa":"Resolver pendência"} <ArrowRight size={16} aria-hidden/>
            </Link>
          </li>)}
        </ol>
      </>}
      <aside className="mt-8 flex gap-3 rounded-2xl bg-lime-soft p-5 text-sm leading-relaxed text-forest">
        <ShieldCheck size={22} className="shrink-0" aria-hidden/>
        <p>O cadastro de produtos é permitido apenas a administradores aprovados com MFA; a consulta do comprador exige região autorizada. A plataforma ainda não processa pagamentos nem pedidos reais.</p>
      </aside>
    </main>
    <SiteFooter/>
  </div>;
}
