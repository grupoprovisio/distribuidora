import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminNav } from "@/components/admin-nav";
import { SupplierSubmissionReview } from "@/components/supplier-submission-review";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata:Metadata={title:"Solicitações de fornecedores · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function SupplierSubmissionsPage(){
 const db=await createClient();
 const requests=await db.from("supplier_product_submissions")
  .select("id,supplier_org_id,supplier_sku,product_name,category_id,region_code,pack_quantity,pack_unit,base_price_minor,available_quantity")
  .eq("status","pending").order("created_at",{ascending:false}).limit(50);
 const orgIds=[...new Set((requests.data??[]).map(row=>row.supplier_org_id))];
 const catIds=[...new Set((requests.data??[]).map(row=>row.category_id).filter((id):id is string=>!!id))];
 const [orgs,categories]=await Promise.all([
  orgIds.length?db.from("organizations").select("id,legal_name,trade_name").in("id",orgIds):Promise.resolve({data:[],error:null}),
  catIds.length?db.from("product_categories").select("id,name").in("id",catIds):Promise.resolve({data:[],error:null})
 ]);
 const error=requests.error||orgs.error||categories.error;
 const orgMap=new Map((orgs.data??[]).map(o=>[o.id,o.trade_name||o.legal_name]));
 const categoryMap=new Map((categories.data??[]).map(c=>[c.id,c.name]));
 const submissions=(requests.data??[]).map(r=>({
  id:r.id,supplierName:orgMap.get(r.supplier_org_id)||"Empresa indisponível",
  productName:r.product_name,sku:r.supplier_sku,categoryName:r.category_id?categoryMap.get(r.category_id)||"Categoria indisponível":"Não classificado",
  region:r.region_code.replace("BR-",""),priceMinor:r.base_price_minor,
  stock:r.available_quantity,unit:r.pack_unit,quantity:r.pack_quantity
 }));
 return <div className="min-h-dvh bg-canvas">
  <AppHeader theme="wine" title="Homologação de produtos" backHref="/admin/marketplace" showListButton={false}/>
  <main className={WRAP+" py-8 sm:py-12"}>
    <AdminNav/>
    <p className="mt-6 text-xs font-black uppercase tracking-widest text-terra">ADMIN · MFA OBRIGATÓRIO</p>
    <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Solicitações de fornecedores</h1>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
      Revise produtos e preços enviados por fornecedores homologados. Aceitar uma solicitação cria apenas um produto em rascunho, um SKU pendente e uma oferta pendente, sem venda automática.
    </p>
    <Link href="/admin/marketplace/cadastro" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-extrabold text-white">
      Abrir cadastro e homologação comercial
    </Link>
    {error?<p role="alert" className="mt-8 rounded-2xl border border-line bg-paper p-6 text-sm text-wine">
      Não foi possível consultar as solicitações. Revise a sessão e a estrutura do banco antes de continuar.
    </p>:<SupplierSubmissionReview submissions={submissions}/>}
  </main>
  <SiteFooter/>
 </div>;
}
