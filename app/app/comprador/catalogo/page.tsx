import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PackageSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";
import { createClient } from "@/lib/supabase/server";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { buyerCatalog } from "@/lib/marketplace/buyer-catalog";

export const metadata:Metadata={title:"Catálogo empresarial · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const currency=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});

export default async function BuyerCatalogPage({searchParams}:{searchParams:Promise<{regiao?:string;pagina?:string}>}) {
  const params=await searchParams;
  const region=(params.regiao??"SP").trim().toUpperCase().slice(0,12);
  const page=/^[0-9]{1,4}$/.test(params.pagina??"1")?Math.min(1000,Math.max(1,Number(params.pagina??"1"))):1;
  // Both helpers independently verify the authenticated user and enforce RLS.
  const summary=await myMarketplaceOrganizations("comprador");
  const catalog=!summary.error && summary.organizations.length
    ? await buyerCatalog(await createClient(),region,page)
    : {items:[],error:summary.error,hasMore:false};
  const nextUrl="/app/comprador/catalogo?regiao="+encodeURIComponent(region)+"&pagina="+String(page+1);
  const prevUrl="/app/comprador/catalogo?regiao="+encodeURIComponent(region)+"&pagina="+String(page-1);
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Catálogo empresarial" backHref="/app/comprador" showListButton={false}/>
    <main className={WRAP+" animate-page-in py-8 sm:py-12"}>
      <Link href="/app/comprador" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline"><ArrowLeft size={16} aria-hidden/> Área do comprador</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-wide text-terra">Acesso privado · Compras empresariais</p>
      <h1 className="mt-2 text-3xl font-black text-forest-deep sm:text-4xl">Catálogo autorizado</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Produtos, preços, embalagens e fornecedores reais serão exibidos somente depois de sua homologação. O catálogo não utiliza preços de terceiros ou comparação externa.</p>
      <div className="mt-6 flex gap-3 rounded-2xl bg-lime-soft p-5 text-sm text-forest"><ShieldCheck size={20} className="shrink-0" aria-hidden/><span>A consulta respeita a autorização no Supabase e a região. Nenhum pedido, pagamento ou reserva é efetuado aqui.</span></div>
      <section className="mt-6 overflow-hidden rounded-[2rem] border border-line bg-paper">
        <div className="border-b border-line p-6 sm:p-8">
          <form method="get" action="/app/comprador/catalogo" className="flex flex-wrap items-end gap-3">
            <label htmlFor="buyer-region" className="grid flex-1 gap-2 text-sm font-extrabold text-forest">Região de atendimento
              <input id="buyer-region" name="regiao" type="text" defaultValue={region} maxLength={12} placeholder="SP ou BR-SP" className="h-12 min-w-0 rounded-xl border border-line bg-canvas px-4 text-base uppercase focus-visible:outline-2 focus-visible:outline-forest"/>
            </label>
            <button type="submit" className="h-12 rounded-xl bg-forest px-5 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-forest">Consultar região</button>
          </form>
        </div>
        {catalog.error ? <div role="alert" className="p-8">
          <ShieldAlert size={28} className="text-terra" aria-hidden/>
          <h2 className="mt-4 text-lg font-black text-forest-deep">Consulta indisponível</h2><p className="mt-2 text-sm text-muted">Verifique sua sessão, sua permissão de comprador ou o código da região.</p>
        </div> : !summary.organizations.length ? <div className="p-8">
          <h2 className="text-lg font-black text-forest-deep">Sua empresa ainda não está homologada</h2><p className="mt-2 text-sm text-muted">Um operador autorizado precisa validar sua empresa antes de liberar ofertas.</p>
        </div> : catalog.items.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.items.map(item=><article key={item.id} className="rounded-2xl border border-line bg-canvas p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-terra">{item.supplier}</p>
            <h2 className="mt-3 text-lg font-black text-forest-deep">{item.productName}</h2>
            <p className="mt-2 text-xs text-muted">SKU: {item.sku} · Embalagem: {item.pack}</p>
            <p className="mt-5 text-2xl font-black tabular-nums text-forest-deep">{currency.format(item.priceMinor/100)}</p>
            <p className="mt-2 text-sm text-muted">Quantidade mínima: {item.minQuantity} · Região: {region}</p>
          </article>)}
        </div> : <div className="px-6 py-14 text-center" role="status">
          <PackageSearch size={31} className="mx-auto text-forest" aria-hidden/>
          <h2 className="mt-4 text-xl font-black text-forest-deep">Ainda não há ofertas liberadas nesta região</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">As ofertas só serão mostradas quando produto, fornecedor, estoque e permissão de visualização estiverem aprovados.</p>
        </div>}
        <nav aria-label="Paginação do catálogo" className="flex items-center justify-between border-t border-line bg-canvas px-5 py-4 text-sm font-bold text-forest">
          <span>Página {page}</span><div className="flex gap-2">
            {page>1 && <Link href={prevUrl} className="rounded-full bg-paper px-4 py-3 ring-1 ring-line">Anterior</Link>}
            {catalog.hasMore && <Link href={nextUrl} className="rounded-full bg-forest px-4 py-3 text-white">Próxima</Link>}
          </div>
        </nav>
      </section>
    </main><SiteFooter/>
  </div>;
}
