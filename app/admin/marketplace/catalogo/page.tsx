import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Boxes, ClipboardCheck, PackageSearch, ShieldAlert } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata = {title:"Revisão do catálogo · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
type Kind="products"|"supplier_products"|"offers";
type Entry={id:string;title:string;details:string;status:string;value?:number|null};
const PAGE_SIZE=20;
const categories={
  products:{title:"Produtos mestres",label:"Produtos em rascunho",icon:Boxes},
  supplier_products:{title:"Produtos dos fornecedores",label:"SKUs aguardando homologação",icon:PackageSearch},
  offers:{title:"Ofertas comerciais",label:"Ofertas aguardando revisão",icon:ClipboardCheck}
} as const;
const kinds=Object.keys(categories) as Kind[];
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function href(kind:Kind,page=1) {return "/admin/marketplace/catalogo?tipo="+kind+"&pagina="+page;}

async function loadQueue(kind:Kind,page:number) {
  // /admin/layout.tsx validates the platform role + active MFA AAL2 session.
  // Every query uses the original user's Supabase SSR session, never service_role.
  const db=await createClient();
  const [masters,skus,offers]=await Promise.all([
    db.from("products").select("id",{head:true,count:"exact"}).eq("status","draft"),
    db.from("supplier_products").select("id",{head:true,count:"exact"}).eq("status","pending"),
    db.from("offers").select("id",{head:true,count:"exact"}).eq("status","pending")
  ]);
  if(masters.error || skus.error || offers.error) return null;
  const totals:Record<Kind,number>={products:masters.count??0,supplier_products:skus.count??0,offers:offers.count??0};
  const rangeStart=(page-1)*PAGE_SIZE,rangeEnd=rangeStart+PAGE_SIZE-1;
  const entries:Entry[]=[];
  if(kind==="products"){
    const q=await db.from("products").select("id,name,slug,status,base_unit").eq("status","draft")
      .order("created_at",{ascending:false}).range(rangeStart,rangeEnd);
    if(q.error)return null;
    for(const p of q.data??[]) entries.push({
      id:p.id,title:p.name,details:"Slug: "+p.slug+" · Unidade: "+p.base_unit,status:p.status
    });
  }else if(kind==="supplier_products"){
    const q=await db.from("supplier_products")
      .select("id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status")
      .eq("status","pending").order("created_at",{ascending:false}).range(rangeStart,rangeEnd);
    if(q.error)return null;
    const productIds=[...new Set((q.data??[]).map(p=>p.product_id))];
    const orgIds=[...new Set((q.data??[]).map(p=>p.supplier_org_id))];
    const [products,orgs]=await Promise.all([
      productIds.length?db.from("products").select("id,name").in("id",productIds):Promise.resolve({data:[],error:null}),
      orgIds.length?db.from("organizations").select("id,legal_name,trade_name").in("id",orgIds):Promise.resolve({data:[],error:null})
    ]);
    if(products.error || orgs.error)return null;
    const names=new Map((products.data??[]).map(p=>[p.id,p.name]));
    const suppliers=new Map((orgs.data??[]).map(o=>[o.id,o.trade_name||o.legal_name]));
    for(const p of q.data??[])entries.push({
      id:p.id,title:names.get(p.product_id)||"Produto mestre não disponível",
      details:"SKU: "+p.supplier_sku+" · "+p.pack_quantity+" "+p.pack_unit+" · "+(suppliers.get(p.supplier_org_id)||"Empresa indisponível"),
      status:p.status
    });
  }else{
    const q=await db.from("offers").select("id,supplier_product_id,supplier_org_id,status,base_price_minor,min_quantity,source_type,valid_from,valid_to")
      .eq("status","pending").order("created_at",{ascending:false}).range(rangeStart,rangeEnd);
    if(q.error)return null;
    const skuIds=[...new Set((q.data??[]).map(p=>p.supplier_product_id))];
    const orgIds=[...new Set((q.data??[]).map(p=>p.supplier_org_id))];
    const [skus,orgs]=await Promise.all([
      skuIds.length?db.from("supplier_products").select("id,product_id,supplier_sku").in("id",skuIds):Promise.resolve({data:[],error:null}),
      orgIds.length?db.from("organizations").select("id,legal_name,trade_name").in("id",orgIds):Promise.resolve({data:[],error:null})
    ]);
    if(skus.error || orgs.error)return null;
    const ids=[...new Set((skus.data??[]).map(p=>p.product_id))];
    const products=ids.length?await db.from("products").select("id,name").in("id",ids):{data:[],error:null};
    if(products.error)return null;
    const names=new Map((products.data??[]).map(p=>[p.id,p.name]));
    const skuMap=new Map((skus.data??[]).map(p=>[p.id,p]));
    const supplierMap=new Map((orgs.data??[]).map(p=>[p.id,p.trade_name||p.legal_name]));
    for(const o of q.data??[]){
      const sku=skuMap.get(o.supplier_product_id);
      entries.push({
        id:o.id,title:sku?names.get(sku.product_id)||"Produto pendente de vínculo":"SKU não disponível",
        details:(supplierMap.get(o.supplier_org_id)||"Empresa indisponível")+
          " · "+(sku?.supplier_sku||"SKU indisponível")+" · Mínimo "+o.min_quantity+" · Origem "+o.source_type,
        status:o.status,value:Number.isSafeInteger(o.base_price_minor)?o.base_price_minor:null
      });
    }
  }
  return {totals,entries,total:totals[kind]};
}

export default async function AdminCatalogReview({searchParams}:{searchParams:Promise<{tipo?:string;pagina?:string}>}) {
  const params=await searchParams;
  const kind=(params.tipo&&Object.prototype.hasOwnProperty.call(categories,params.tipo)?params.tipo:"supplier_products") as Kind;
  const page=/^[1-9][0-9]{0,3}$/.test(params.pagina??"1")?Math.min(1000,Number(params.pagina??"1")):1;
  const data=await loadQueue(kind,page);
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Revisão do catálogo" backHref="/admin/marketplace" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav/>
      <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline focus-visible:ring-2 focus-visible:ring-forest">
        <ArrowLeft size={16} aria-hidden/> Administração
      </Link>
      <p className="mt-5 text-xs font-black uppercase tracking-widest text-terra">Controle comercial · MFA obrigatório</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Fila de revisão do catálogo</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        Consulte produtos e ofertas pendentes de fornecedores autorizados. Esta página é somente leitura e nenhuma decisão de aprovação é executada automaticamente.
      </p>
      {!data?<section role="alert" className="mt-7 rounded-3xl border border-line bg-paper p-7">
        <ShieldAlert size={24} className="text-terra" aria-hidden/>
        <h2 className="mt-4 text-xl font-black text-forest-deep">Consulta administrativa indisponível</h2>
        <p className="mt-2 text-sm text-muted">A administração não confirmou todas as consultas com segurança. Verifique sua sessão e a política de acesso do banco antes de tentar novamente.</p>
      </section>:<>
        <nav aria-label="Etapas de homologação de catálogo" className="mt-7 grid gap-3 sm:grid-cols-3">
          {kinds.map(key=>{
            const Icon=categories[key].icon;
            return <Link key={key} href={href(key)} aria-current={kind===key?"page":undefined}
              className={"rounded-2xl border p-5 transition focus-visible:ring-2 focus-visible:ring-forest "+
                (key===kind?"border-forest bg-lime-soft":"border-line bg-paper hover:bg-lime-soft")}>
              <Icon size={22} className="text-forest" aria-hidden/>
              <span className="mt-4 block text-sm font-extrabold text-forest-deep">{categories[key].title}</span>
              <span className="mt-2 block text-3xl font-black tabular-nums text-forest-deep">{data.totals[key]}</span>
              <span className="mt-1 block text-xs text-muted">{categories[key].label}</span>
            </Link>;
          })}
        </nav>
        <section className="mt-7 overflow-hidden rounded-[2rem] border border-line bg-paper" aria-labelledby="catalog-queue-heading">
          <div className="border-b border-line p-6 sm:p-8">
            <h2 id="catalog-queue-heading" className="text-xl font-black text-forest-deep">{categories[kind].title} pendentes</h2>
            <p className="mt-2 text-sm text-muted">Dados limitados e paginados do próprio Supabase, acessíveis somente ao administrador com MFA.</p>
          </div>
          {data.entries.length?<ul className="divide-y divide-line">
            {data.entries.map(entry=><li key={entry.id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-forest-deep">{entry.title}</h3>
                <p className="mt-1 break-words text-sm text-muted">{entry.details}</p>
                <p className="mt-2 text-xs text-muted">Referência: {entry.id.slice(0,8)}…</p>
              </div>
              <div className="text-right">
                <span className="inline-flex rounded-full bg-sand px-3 py-1.5 text-xs font-black text-[#5c3a06]">Pendente</span>
                {typeof entry.value==="number"&&<p className="mt-3 text-sm font-extrabold tabular-nums text-forest-deep">{money.format(entry.value/100)}</p>}
              </div>
            </li>)}
          </ul>:<div role="status" className="px-6 py-14 text-center">
            <ClipboardCheck size={28} className="mx-auto text-forest" aria-hidden/>
            <h3 className="mt-4 text-xl font-black text-forest-deep">Nenhuma pendência nesta página</h3>
            <p className="mt-2 text-sm text-muted">Novos produtos e ofertas serão listados após o cadastro por um operador autorizado.</p>
          </div>}
          <nav aria-label="Páginas da fila de catálogo" className="flex items-center justify-between gap-3 border-t border-line bg-canvas p-5 text-sm font-bold text-forest">
            <span>{data.total?Math.min((page-1)*PAGE_SIZE+1,data.total)+" a "+Math.min(page*PAGE_SIZE,data.total)+" de "+data.total:"Sem pendências"}</span>
            <div className="flex gap-2">
              {page>1&&<Link href={href(kind,page-1)} className="inline-flex min-h-11 items-center rounded-full bg-paper px-4 ring-1 ring-line">Anterior</Link>}
              {page*PAGE_SIZE<data.total&&<Link href={href(kind,page+1)} className="inline-flex min-h-11 items-center rounded-full bg-forest px-4 text-white">Próxima <ArrowRight className="ml-2" size={15} aria-hidden/></Link>}
            </div>
          </nav>
        </section>
      </>}
      <aside className="mt-7 rounded-2xl bg-lime-soft p-5 text-sm font-semibold leading-relaxed text-forest">
        Aprovar empresas não publica produtos; o fluxo de publicação, controle de duplicados, estoque e precificação ainda precisa de homologação técnica e comercial. Nenhuma ação financeira é realizada aqui.
      </aside>
    </main>
    <SiteFooter/>
  </div>;
}
