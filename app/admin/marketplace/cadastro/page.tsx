import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "@/components/admin-nav";
import { SiteFooter } from "@/components/site-footer";
import { AdminCommercialForms, type CatalogOption } from "@/components/admin-commercial-catalog-forms";
import { ProductEditAndImage } from "@/components/product-edit-and-image";
import { CommercialBatchForm } from "@/components/commercial-batch-form";
import { CatalogCategoryForms } from "@/components/catalog-category-forms";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Cadastro comercial · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function CommercialCatalogRegistration() {
  // Layout /admin enforces PLATFORM_ADMIN and MFA. Queries also enforce RLS.
  const db=await createClient();
  const [orgs,caps,products,skus,offers,publicListings]=await Promise.all([
    db.from("organizations").select("id,legal_name,trade_name,kind,status").eq("status","approved").limit(250),
    db.from("organization_capabilities").select("organization_id,capability,status").eq("capability","SUPPLIER").eq("status","approved").limit(250),
    db.from("products").select("id,name,slug,status,gtin,base_unit").neq("status","archived").order("name").limit(250),
    db.from("supplier_products").select("id,product_id,supplier_org_id,supplier_sku,status").in("status",["pending","approved"]).limit(250),
    db.from("offers").select("id,supplier_product_id,base_price_minor,min_quantity,status").eq("status","pending").order("created_at",{ascending:false}).limit(250),
    db.from("public_catalog_listings").select("product_id").limit(250),
  ]);
  const categories=await db.from("product_categories").select("id,name").order("name").limit(250);
  const error=[orgs,caps,products,skus,offers,publicListings].some(item=>item.error);
  const supplierSet=new Set((caps.data??[]).map(x=>x.organization_id));
  const supplierOptions:CatalogOption[]=(orgs.data??[]).filter(x=>supplierSet.has(x.id)&&["SUPPLIER","PLATFORM_OPERATOR"].includes(x.kind))
    .map(x=>({id:x.id,label:x.trade_name||x.legal_name}));
  const productName=new Map((products.data??[]).map(x=>[x.id,x.name]));
  const skuName=new Map((skus.data??[]).map(x=>[x.id,x.supplier_sku+" · "+(productName.get(x.product_id)||"Produto indisponível")]));
  const allProducts:CatalogOption[]=(products.data??[]).map(x=>({id:x.id,label:x.name+" ("+x.status+")"}));
  const draftProducts:CatalogOption[]=(products.data??[]).filter(x=>x.status==="draft").map(x=>({id:x.id,label:x.name}));
  const pendingSkus:CatalogOption[]=(skus.data??[]).filter(x=>x.status==="pending").map(x=>({id:x.id,label:skuName.get(x.id)||x.supplier_sku}));
  const approvedSkus:CatalogOption[]=(skus.data??[]).filter(x=>x.status==="approved").map(x=>({id:x.id,label:skuName.get(x.id)||x.supplier_sku}));
  const pendingOffers:CatalogOption[]=(offers.data??[]).map(x=>({
    id:x.id,label:(skuName.get(x.supplier_product_id)||"SKU indisponível")+" · R$ "+(x.base_price_minor/100).toFixed(2).replace(".",",")
  }));
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="wine" title="Cadastro comercial" backHref="/admin/marketplace" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <AdminNav/>
      <Link href="/admin/marketplace/catalogo" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
        <ArrowLeft size={16} aria-hidden/> Voltar à revisão do catálogo
      </Link>
      <p className="mt-6 text-xs font-black uppercase tracking-widest text-terra">Administração · MFA obrigatório</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Cadastro comercial de produtos</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Cadastre produtos mestres, vincule fornecedores e informe estoque e preços próprios. Cada etapa tem aprovação explícita; nenhum preço externo é importado.</p>
      <div className="mt-7 flex items-start gap-3 rounded-2xl bg-lime-soft p-5 text-sm font-semibold text-forest">
        <ShieldCheck size={20} className="shrink-0" aria-hidden/>
        <p>Registros reais no Supabase. Apenas contas administrativas aprovadas com sessão válida e autenticação multifator podem gravar. A página inicial e as áreas públicas da Provisio não são alteradas.</p>
      </div>
      {error?<section role="alert" className="mt-8 rounded-[2rem] border border-line bg-paper p-7">
        <ShieldAlert size={27} className="text-terra" aria-hidden/>
        <h2 className="mt-4 text-xl font-black text-forest-deep">Não foi possível validar os dados de cadastro</h2>
        <p className="mt-2 text-sm text-muted">Verifique o perfil, a sessão e as políticas de segurança no Supabase. Por proteção, os formulários não foram liberados.</p>
      </section>:<>
        {!supplierOptions.length&&<p className="mt-7 rounded-2xl bg-sand p-5 text-sm font-semibold text-[#5c3a06]">
          Nenhum fornecedor autorizado foi encontrado. Você pode criar produtos mestres como rascunho; para vincular SKUs, cadastre e aprove uma empresa fornecedora em Administração → Acessos e empresas.
        </p>}
        <><CommercialBatchForm suppliers={supplierOptions}/><details className="mt-8 rounded-2xl border border-line bg-paper p-5"><summary className="cursor-pointer font-bold text-forest-deep">Ferramentas avançadas de cadastro individual</summary><AdminCommercialForms options={{suppliers:supplierOptions,products:allProducts,draftProducts,pendingSkus,approvedSkus,pendingOffers}}/></details><ProductEditAndImage products={products.data??[]} publicListingIds={(publicListings.data??[]).map(x=>x.product_id)}/>{!categories.error&&<CatalogCategoryForms categories={categories.data??[]} products={products.data??[]}/>}</>
      </>}
      <p className="mt-8 rounded-2xl border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
        Para encontrar registros novos após cada cadastro ou aprovação, atualize esta página. Os seletores exibem no máximo 250 itens por etapa. A operação comercial de pedidos e pagamentos permanece bloqueada até homologação.
      </p>
    </main>
    <SiteFooter/>
  </div>;
}
