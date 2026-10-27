import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Boxes, PackageSearch, Search, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Catálogo de produtos · Grupo Provisio",
  description: "Conheça produtos aprovados disponíveis na Distribuidora Provisio. Condições comerciais para compradores autorizados."
};
export const dynamic="force-dynamic";
const PAGE_SIZE=24;

export default async function ProductsPage({searchParams}:{
  searchParams:Promise<{busca?:string;pagina?:string}>
}){
  const params=await searchParams;
  const search=typeof params.busca==="string"?params.busca.trim().slice(0,80):"";
  const page=/^[1-9][0-9]{0,3}$/.test(params.pagina??"1")
    ?Math.min(400,Number(params.pagina??"1")):1;
  const db=await createClient();
  const {data,error}=await db.rpc("provisio_public_product_showcase",{
    p_search:search,p_limit:PAGE_SIZE+1,p_offset:(page-1)*PAGE_SIZE
  });
  const more=(data?.length??0)>PAGE_SIZE;
  // Only paths explicitly published by the ADM can pass the Storage RLS
  // check. Signed links expire in five minutes; other photos stay private.
  const products=await Promise.all((data??[]).slice(0,PAGE_SIZE).map(async product=>{
    if(!product.image_storage_path)return {...product,imageUrl:null as string|null};
    const photo=await db.storage.from("provisio-produtos")
      .createSignedUrl(product.image_storage_path,5*60);
    return {...product,imageUrl:photo.data?.signedUrl??null};
  }));
  const linkTo=(n:number)=>"/produtos?"+new URLSearchParams({
    ...(search?{busca:search}:{}),pagina:String(n)
  }).toString();

  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="forest" title="Produtos autorizados" backHref="/" showListButton={false}/>
    <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
      <section className="rounded-[2rem] bg-forest p-7 text-white shadow-float sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-lime">Catálogo B2B</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          Produtos com origem, oferta e responsabilidade claras.
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/70 sm:text-base">
          Conheça produtos aprovados com fotos autorizadas para exibição pública. Preços e cotações ficam disponíveis no acesso empresarial, conforme sua região de atendimento.
        </p>
      </section>
      <section className="mt-8 rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-8" aria-labelledby="products-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="products-heading" className="text-2xl font-black text-forest-deep">Produtos disponíveis</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Somente produtos com oferta homologada, estoque e prazo de validade vigente. Ofertas fictícias de testes não são publicadas.
            </p>
          </div>
          <Link href="/entrar" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white">
            Entrar como comprador <ArrowRight size={16} aria-hidden/>
          </Link>
        </div>
        <form action="/produtos" method="get" className="mt-6 flex flex-wrap gap-2">
          <label htmlFor="public-product-search" className="sr-only">Buscar produto</label>
          <input id="public-product-search" type="search" name="busca" maxLength={80} defaultValue={search}
            placeholder="Buscar por nome do produto" className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-4 text-base text-forest"/>
          <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-forest px-5 text-sm font-extrabold text-white">
            <Search size={17} aria-hidden/> Buscar
          </button>
        </form>
        {error?<div role="alert" className="mt-6 rounded-2xl bg-sand p-6 text-sm font-semibold text-forest-deep">
          O catálogo está temporariamente indisponível. Tente atualizar a página.
        </div>:products.length?<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(product=><article key={product.slug}
            className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-paper p-3 sm:p-4">
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-canvas text-forest">
              {product.imageUrl?<Image src={product.imageUrl}
                alt={"Foto de "+product.product_name} fill unoptimized
                sizes="(max-width:640px) 46vw, (max-width:1024px) 30vw, 235px"
                className="object-contain p-2"/>:
                <Boxes size={40} strokeWidth={1.5} aria-hidden/>}
            </div>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-muted">
              {product.category_name}
            </p>
            <h3 className="mt-2 flex-1 text-sm font-black text-forest-deep sm:text-base">
              {product.product_name}
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Atende: {product.regions?.join(", ")||"Consulte disponibilidade"}
            </p>
            <Link href="/entrar" className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-lime-soft px-3 text-center text-xs font-extrabold text-forest">
              Consultar preço <ArrowRight size={14} aria-hidden/>
            </Link>
          </article>)}
        </div>:<div role="status" className="mt-6 rounded-2xl bg-canvas p-7 text-center">
          <PackageSearch size={32} className="mx-auto text-forest" aria-hidden/>
          <h3 className="mt-3 text-lg font-black text-forest-deep">Nenhum produto encontrado</h3>
          <p className="mt-2 text-sm text-muted">Tente outro termo. Produtos sem oferta válida não são exibidos.</p>
        </div>}
        {!error&&<nav aria-label="Páginas do catálogo" className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5 text-sm font-bold text-forest">
          <span>Página {page}</span>
          <div className="flex gap-2">
            {page>1&&<Link className="rounded-full border border-line px-4 py-2" href={linkTo(page-1)}>Anterior</Link>}
            {more&&<Link className="rounded-full bg-forest px-4 py-2 text-white" href={linkTo(page+1)}>Próxima</Link>}
          </div>
        </nav>}
      </section>
      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-lime-soft p-4 text-xs leading-relaxed text-forest">
        <ShieldCheck size={18} className="shrink-0" aria-hidden/>
        A vitrine só mostra produtos publicados pelo ADM. Apenas a foto escolhida para a vitrine fica disponível por link temporário; demais imagens do armazenamento privado, preços e cotações permanecem protegidos.
      </p>
    </main>
    <SiteFooter/>
  </div>;
}
