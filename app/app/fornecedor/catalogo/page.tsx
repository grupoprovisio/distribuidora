import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Boxes, FileSpreadsheet } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { SupplierCatalogBrowser, type SupplierCatalogRow } from "@/components/supplier-catalog-browser";
import { SupplierProductRequest } from "@/components/supplier-product-request";
import { SupplierCommercialEditor, type SupplierEditableSku } from "@/components/supplier-commercial-editor";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Catálogo do fornecedor · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const PAGE_SIZE=30;
function catalogUrl(page:number) { return "/app/fornecedor/catalogo?pagina="+page; }

export default async function SupplierCatalogPage({searchParams}:{searchParams:Promise<{pagina?:string}>}) {
  // /app/fornecedor/layout.tsx protects this route; every query below respects RLS.
  const params=await searchParams;
  const page=/^[1-9][0-9]{0,3}$/.test(params.pagina??"1")
    ? Math.min(1000,Number(params.pagina??"1")):1;
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  const memberships=user?await client.from("organization_members").select("organization_id,role").eq("user_id",user.id).eq("status","active").in("role",["ORG_ADMIN","SUPPLIER_ADMIN","PLATFORM_ADMIN"]).limit(100):{data:[],error:null};
  const requestOrgIds=(memberships.data??[]).map(m=>m.organization_id);
  const requestOrgs=requestOrgIds.length?await client.from("organizations").select("id,trade_name,legal_name").in("id",requestOrgIds).eq("status","approved"):{data:[],error:null};
  const requestCaps=requestOrgIds.length?await client.from("organization_capabilities").select("organization_id").in("organization_id",requestOrgIds).eq("capability","SUPPLIER").eq("status","approved"):{data:[],error:null};
  const authorizedIds=new Set((requestCaps.data??[]).map(x=>x.organization_id));
  const authorizedOrganizations=(requestOrgs.data??[]).filter(x=>authorizedIds.has(x.id)).map(x=>({id:x.id,name:x.trade_name||x.legal_name}));
  const categoryResult=await client.from("product_categories").select("id,name").order("name").limit(100);
  const intake=authorizedIds.size?await client.from("supplier_product_submissions")
    .select("id,product_name,supplier_sku,status,created_at").in("supplier_org_id",[...authorizedIds])
    .order("created_at",{ascending:false}).limit(12):{data:[],error:null};
  const from=(page-1)*PAGE_SIZE;
  const supplierProducts=await client.from("supplier_products")
    .select("id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status",{count:"exact"})
    .order("created_at",{ascending:false}).range(from,from+PAGE_SIZE-1);
  const items=supplierProducts.data??[];
  const productIds=[...new Set(items.map(item=>item.product_id))];
  const supplierOrgIds=[...new Set(items.map(item=>item.supplier_org_id))];
  const skuIds=items.map(item=>item.id);
  const stockResult=skuIds.length?await client.from("inventory_positions")
    .select("supplier_product_id,available_quantity").in("supplier_product_id",skuIds).limit(PAGE_SIZE):{data:[],error:null};

  // Never issue an unscoped joined-table scan: constrain reads to the 30 current
  // supplier SKUs and their own supplier organizations, while RLS remains in force.
  const [products,organizations,offers]=items.length?await Promise.all([
    client.from("products").select("id,name,status").in("id",productIds),
    client.from("organizations").select("id,trade_name,legal_name").in("id",supplierOrgIds),
    client.from("offers").select("id,supplier_org_id,supplier_product_id,base_price_minor,min_quantity,status,source_type")
      .in("supplier_product_id",skuIds).in("supplier_org_id",supplierOrgIds)
      .order("created_at",{ascending:false}).limit(1001),
  ]):[
    {data:[],error:null},
    {data:[],error:null},
    {data:[],error:null},
  ];
  // Do not display misleading partial offer totals if this bounded query overflows.
  const error=supplierProducts.error||products.error||organizations.error||offers.error||stockResult.error||memberships.error||requestOrgs.error||requestCaps.error||categoryResult.error||intake.error
    ||(offers.data?.length??0)>1000;
  const byProduct=new Map((products.data??[]).map(product=>[product.id,product]));
  const byOrganization=new Map((organizations.data??[]).map(org=>[org.id,org]));
  type OfferRow={id:string;supplier_org_id:string;supplier_product_id:string;base_price_minor:number;min_quantity:number;status:string;source_type:string};
  const bySupplierProduct=new Map<string,OfferRow[]>();
  for(const offer of offers.data??[]){
    const key=offer.supplier_product_id+":"+offer.supplier_org_id;
    const current=bySupplierProduct.get(key)??[];
    current.push(offer);
    bySupplierProduct.set(key,current);
  }
  const sources=new Set(["MANUAL_AUTHORIZED","SUPPLIER_CSV_AUTHORIZED","SUPPLIER_API_AUTHORIZED","PLATFORM_STOCK"]);
  const rows:SupplierCatalogRow[]=items.map(item=>{
    const product=byProduct.get(item.product_id);
    const org=byOrganization.get(item.supplier_org_id);
    const ownOffers=(bySupplierProduct.get(item.id+":"+item.supplier_org_id)??[])
      .filter(offer=>sources.has(offer.source_type));
    const approved=ownOffers.filter(offer=>offer.status==="approved");
    const first=approved[0];
    return {
      id:item.id,supplierName:org?.trade_name||org?.legal_name||"Minha organização",
      productName:product?.name??"Produto aguardando cadastro mestre",
      supplierSku:item.supplier_sku,packDescription:item.pack_quantity+" "+item.pack_unit,
      productStatus:product?.status??"unknown",status:item.status,
      offerCount:ownOffers.length,approvedOffers:approved.length,
      basePriceMinor:first?.base_price_minor??null,minQuantity:first?.min_quantity??null,
      sourceTypes:ownOffers.map(offer=>offer.source_type)
    };
  });
  const inventoryBySku=new Map((stockResult.data??[]).map(position=>[position.supplier_product_id,position.available_quantity]));
  const editableSkus:SupplierEditableSku[]=items
    .filter(item=>item.status==="approved" && authorizedIds.has(item.supplier_org_id)
       && byProduct.get(item.product_id)?.status==="active")
    .map(item=>{
      const approvedOffers=(bySupplierProduct.get(item.id+":"+item.supplier_org_id)??[])
         .filter(offer=>offer.status==="approved");
      return {
        id:item.id,
        label:(byProduct.get(item.product_id)?.name||"Produto")+" · "+item.supplier_sku,
        available:inventoryBySku.get(item.id)??null,
        priceMinor:approvedOffers[0]?.base_price_minor??null
      };
    });
  const total=supplierProducts.count??0;
  const hasNext=page<1000 && page*PAGE_SIZE<total;
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Meu catálogo" backHref="/app/fornecedor" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <Link href="/app/fornecedor" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline"><ArrowLeft size={16} aria-hidden/> Área do fornecedor</Link>
      <div className="mt-5 mb-7">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-terra">Área privada · fornecedor</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">Catálogo da sua organização</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Acompanhe seus produtos, embalagens e ofertas cadastradas, sem acessar catálogos de outros fornecedores.
        </p>
      </div>
      {!categoryResult.error&&<SupplierProductRequest organizations={authorizedOrganizations} categories={categoryResult.data??[]}/>}
      <Link href="/app/fornecedor/importar" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white transition hover:bg-forest-deep focus-visible:ring-2 focus-visible:ring-forest">
        <FileSpreadsheet size={17} aria-hidden/> Pré-validar planilha CSV
      </Link>
      {error?<section role="alert" className="rounded-[2rem] border border-line bg-paper p-7">
        <Boxes size={27} className="text-terra" aria-hidden/>
        <h2 className="mt-4 text-xl font-black text-forest-deep">Não foi possível consultar o catálogo</h2>
        <p className="mt-2 text-sm text-muted">Verifique sua sessão ou a homologação da organização. A listagem não apresenta dados parciais por segurança.</p>
      </section>:<>
        {(intake.data??[]).length>0&&<section className="mb-6 rounded-2xl border border-line bg-paper p-5" aria-label="Solicitações recentes">
          <h2 className="font-black text-forest-deep">Solicitações recentes</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{(intake.data??[]).map(req=><li key={req.id} className="flex flex-wrap justify-between gap-2 py-3">
            <span className="font-semibold">{req.product_name} · {req.supplier_sku}</span>
            <span className="text-muted">{req.status==="pending"?"Em análise":req.status==="approved"?"Aceito para cadastro":"Rejeitado"}</span>
          </li>)}</ul>
        </section>}
        <SupplierCommercialEditor skus={editableSkus}/>
        <SupplierCatalogBrowser rows={rows} page={page} total={total}/>
        <nav aria-label="Páginas do catálogo do fornecedor" className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-5 text-sm font-extrabold text-forest">
          <span>{total?Math.min(from+1,total)+" a "+Math.min(from+PAGE_SIZE,total)+" de "+total:"Nenhum SKU cadastrado"}</span>
          <div className="flex flex-wrap gap-2">
            {page>1&&<Link href={catalogUrl(page-1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 py-2 focus-visible:ring-2 focus-visible:ring-forest">
              <ArrowLeft size={16} aria-hidden/> Anterior
            </Link>}
            {hasNext&&<Link href={catalogUrl(page+1)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 py-2 text-white focus-visible:ring-2 focus-visible:ring-forest">
              Próxima <ArrowRight size={16} aria-hidden/>
            </Link>}
          </div>
        </nav>
      </>}
    </main>
    <SiteFooter/>
  </div>;
}
