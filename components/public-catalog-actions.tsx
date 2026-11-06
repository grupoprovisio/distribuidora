'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import { useCallback,useMemo,useState,useSyncExternalStore } from 'react';
import { INTENT_KEY,INTENT_EVENT,parseIntent,type CatalogIntent } from '@/lib/marketplace/catalog-intent';
import { track } from '@/lib/analytics';
function subscribe(fn:()=>void){window.addEventListener('storage',fn);window.addEventListener(INTENT_EVENT,fn);return()=>{window.removeEventListener('storage',fn);window.removeEventListener(INTENT_EVENT,fn);};}
function current(){try{return localStorage.getItem(INTENT_KEY)??'[]';}catch{return '[]';}}
export function usePublicList(){
 const raw=useSyncExternalStore(subscribe,current,()=> '[]');
 const items=useMemo(()=>parseIntent(raw),[raw]);
 const update=useCallback((item:CatalogIntent)=>{
  const rows=parseIntent(current()).filter(v=>v.slug!==item.slug);
  if(item.quantity>0)rows.push(item);
  if(rows.length>100)return false;
  const safe=parseIntent(JSON.stringify(rows));
  if(safe.length!==rows.length)return false;
  try{localStorage.setItem(INTENT_KEY,JSON.stringify(safe));window.dispatchEvent(new Event(INTENT_EVENT));return true;}catch{return false;}
 },[]);
 return {items,update};
}
export function PublicListLink(){const {items}=usePublicList();return <Link href='/produtos/lista' className='inline-flex min-h-11 items-center rounded-full bg-lime px-4 text-sm font-black text-forest-deep'>Minha lista ({items.length})</Link>;}
export function PublicAdd({slug,name}:{slug:string;name:string}){
 const router=useRouter();const {items,update}=usePublicList();const [notice,setNotice]=useState('');const selected=items.some(v=>v.slug===slug);
 return <div><button type='button' className='mt-2 min-h-11 w-full rounded-xl bg-forest px-2 text-xs font-extrabold text-white' onClick={()=>{
  if(selected){router.push('/produtos/lista');return;}
  const ok=update({slug,name,quantity:1});setNotice(ok?'Adicionado à lista':'Não foi possível salvar. Verifique o armazenamento do navegador.');if(ok)track('catalog_add',{product:slug});
 }}>{selected?'Ver na minha lista':'Adicionar à lista'}</button><p role='status' className='mt-1 text-xs text-forest'>{notice}</p></div>;
}
export function CatalogLogin({slug,children='Consultar preço'}:{slug?:string;children?:React.ReactNode}){
 return <Link href={slug?'/entrar?origem=catalogo&produto='+encodeURIComponent(slug):'/entrar?origem=catalogo'} onClick={()=>track('catalog_login_start',{product:slug})} className='inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-soft px-3 text-center text-xs font-extrabold text-forest'>{children}</Link>;
}
export function PublicList(){
 const {items,update}=usePublicList();const [error,setError]=useState('');
 function change(item:CatalogIntent,quantity:number){if(!update({...item,quantity}))setError('Não foi possível salvar a alteração neste navegador.');else setError('');}
 return <><p className='mt-3 text-sm text-muted'>Escolha as quantidades desejadas. Embalagens, pedido mínimo, preços e disponibilidade serão confirmados no acesso empresarial. Esta lista fica salva neste navegador.</p>
 {error&&<p role='alert'>{error}</p>}
 {items.length?<><ul className='mt-6 divide-y divide-line rounded-2xl border border-line bg-paper px-4'>{items.map(item=><li key={item.slug} className='flex flex-wrap items-center gap-3 py-4'><Link href={'/produtos/'+item.slug} className='min-w-40 flex-1 text-sm font-bold text-forest'>{item.name}</Link><label className='text-xs font-bold'>Quantidade<input aria-label={'Quantidade de '+item.name} type='number' min={1} max={100000} value={item.quantity} onChange={e=>{const q=Number(e.target.value);if(Number.isSafeInteger(q)&&q>0)change(item,q);}} className='ml-2 min-h-11 w-24 rounded-xl border border-line px-3'/></label><button onClick={()=>change(item,0)} className='min-h-11 px-3 text-sm underline'>Remover</button></li>)}</ul><div className='mt-6 flex flex-wrap gap-3'><CatalogLogin>Entrar para continuar</CatalogLogin><Link href='/app/comprador/lista' className='inline-flex min-h-11 items-center rounded-xl bg-forest px-4 text-sm font-bold text-white'>Já estou conectado · revisar ofertas</Link></div><p className='mt-3 text-xs text-muted'>Ainda não tem acesso? <Link href='/contato' className='underline'>Solicite o cadastro da sua empresa.</Link></p></>:<p role='status' className='my-8 rounded-2xl bg-paper p-6'>Sua lista está vazia. Adicione produtos no catálogo para começar.</p>}
 <Link href='/produtos' className='mt-6 inline-flex min-h-11 items-center text-sm font-bold text-forest underline'>Continuar escolhendo produtos</Link></>;
}
