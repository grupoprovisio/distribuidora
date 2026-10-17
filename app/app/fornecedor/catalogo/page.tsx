import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Boxes, FileSpreadsheet } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { SupplierCatalogBrowser, type SupplierCatalogRow } from "@/components/supplier-catalog-browser";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Catálogo do fornecedor · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SupplierCatalogPage() {
  // Guard de /app/fornecedor/layout.tsx mais RLS no próprio Supabase.
  const client = await createClient();
  const [supplierProducts, products, offers, organizations] = await Promise.all([
    client.from("supplier_products").select("id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status").order("created_at", { ascending: false }).limit(100),
    client.from("products").select("id,name,status").limit(100),
    client.from("offers").select("id,supplier_org_id,supplier_product_id,base_price_minor,min_quantity,status,source_type").limit(500),
    client.from("organizations").select("id,trade_name,legal_name").limit(100),
  ]);
  const error = supplierProducts.error || products.error || offers.error || organizations.error;
  const byProduct = new Map((products.data ?? []).map(product => [product.id, product]));
  const byOrganization = new Map((organizations.data ?? []).map(org => [org.id, org]));
  const bySupplierProduct = new Map<string, NonNullable<typeof offers.data>>();
  for (const offer of offers.data ?? []) {
    const key = offer.supplier_product_id + ":" + offer.supplier_org_id;
    const current = bySupplierProduct.get(key) ?? [];
    current.push(offer);
    bySupplierProduct.set(key, current);
  }
  // Somente origens próprias/homologadas podem entrar na vitrine comercial privada.
  // Ofertas externas VTEX/Atacadão não entram nem como comparação.
  const allowedSources = new Set(["MANUAL_AUTHORIZED", "SUPPLIER_CSV_AUTHORIZED", "SUPPLIER_API_AUTHORIZED", "PLATFORM_STOCK"]);
  const rows: SupplierCatalogRow[] = (supplierProducts.data ?? []).map(item => {
    const product = byProduct.get(item.product_id);
    const org = byOrganization.get(item.supplier_org_id);
    const entryOffers = (bySupplierProduct.get(item.id + ":" + item.supplier_org_id) ?? []).filter(offer => allowedSources.has(offer.source_type));
    const approved = entryOffers.filter(offer => offer.status === "approved");
    const first = approved[0];
    return {
      id: item.id,
      supplierName: org?.trade_name || org?.legal_name || "Minha organização",
      productName: product?.name ?? "Produto aguardando cadastro mestre",
      supplierSku: item.supplier_sku,
      packDescription: `${item.pack_quantity} ${item.pack_unit}`,
      productStatus: product?.status ?? "unknown",
      status: item.status,
      offerCount: entryOffers.length,
      approvedOffers: approved.length,
      basePriceMinor: first?.base_price_minor ?? null,
      minQuantity: first?.min_quantity ?? null,
      sourceTypes: entryOffers.map(offer => offer.source_type),
    };
  });

  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Meu catálogo" backHref="/app/fornecedor" showListButton={false} />
    <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
      <Link href="/app/fornecedor" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
        <ArrowLeft size={16} aria-hidden /> Área do fornecedor
      </Link>
      <div className="mt-5 mb-7">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-terra">Área privada · fornecedor</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">Catálogo da sua organização</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Acompanhe seus produtos, embalagens e ofertas cadastradas, sem acessar catálogos de outros fornecedores.
        </p>
      </div>
      <Link href="/app/fornecedor/importar" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white transition hover:bg-forest-deep focus-visible:ring-2 focus-visible:ring-forest">
        <FileSpreadsheet size={17} aria-hidden/> Pré-validar planilha CSV
      </Link>
      {error ? <section role="alert" className="rounded-[2rem] border border-line bg-paper p-7">
        <Boxes size={27} className="text-terra" aria-hidden />
        <h2 className="mt-4 text-xl font-black text-forest-deep">Não foi possível consultar o catálogo</h2>
        <p className="mt-2 text-sm text-muted">Confira sua sessão e a homologação da organização. Não exibimos informações parciais por segurança.</p>
      </section> : <SupplierCatalogBrowser rows={rows} />}
    </main>
    <SiteFooter />
  </div>;
}
