import {notFound} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {PackageSearch} from 'lucide-react';
import {AppHeader} from '@/components/app-header';
import {SiteFooter} from '@/components/site-footer';
import {PublicAdd,PublicListLink,CatalogLogin} from '@/components/public-catalog-actions';
import {CatalogCep} from '@/components/catalog-cep';
import {CatalogObservation} from '@/components/catalog-observation';
import {publicCatalog,publicProduct} from '@/lib/marketplace/public-catalog';
import {WRAP} from '@/lib/ui';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const row=(await publicCatalog()).find(r=>r.slug===slug);return {title:row?row.product_name+' · Provisio':'Produto não encontrado · Provisio',description:row?`Consulte ${row.product_name} para sua empresa. Confira a região e monte sua lista de cotação.`:undefined};}
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const row=(await publicCatalog()).find(r=>r.slug===slug);if(!row)notFound();const p=await publicProduct(row);
 return <div className='min-h-dvh bg-canvas'><AppHeader theme='forest' title='Detalhes do produto' backHref='/produtos' showListButton={false}/><main className={WRAP+' py-6'}><nav className='mb-5 flex items-center justify-between gap-3'><Link href='/produtos' className='text-sm font-bold text-forest underline'>Voltar ao catálogo</Link><PublicListLink/></nav><article className='grid gap-6 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-2 sm:p-8'><div className='relative grid aspect-square place-items-center rounded-2xl bg-canvas'>{p.imageUrl?<Image src={p.imageUrl} alt={p.name} fill unoptimized sizes='(max-width:640px) 90vw, 500px' className='object-contain p-5'/>:<PackageSearch size={60} className='text-muted'/>}</div><div><p className='text-xs font-bold uppercase tracking-wide text-muted'>{p.category}</p><h1 className='mt-3 text-2xl font-black leading-tight text-forest-deep sm:text-3xl'>{p.name}</h1><dl className='my-6 grid grid-cols-[auto_1fr] gap-3 text-sm'><dt className='font-bold'>Categoria</dt><dd>{p.category}</dd><dt className='font-bold'>Região das ofertas</dt><dd>{p.regions.join(', ')||'Sob consulta'}</dd><dt className='font-bold'>Embalagem e mínimo</dt><dd>Confira na oferta do fornecedor após entrar.</dd></dl><p className='mb-5 text-sm leading-relaxed text-muted'>Consulte preços e unidades de venda disponíveis para sua empresa. A quantidade adicionada à lista será revisada conforme a embalagem e o pedido mínimo de cada oferta.</p><CatalogLogin slug={p.slug}/><PublicAdd slug={p.slug} name={p.name}/><div className='mt-5'><CatalogCep slug={p.slug}/></div></div></article><CatalogObservation slug={p.slug}/></main><SiteFooter/></div>;
}
