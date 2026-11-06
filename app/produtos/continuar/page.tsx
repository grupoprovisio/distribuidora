'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {track} from '@/lib/analytics';
export default function Page(){const router=useRouter();useEffect(()=>{let slug='';try{slug=sessionStorage.getItem('provisio-catalog-return')??'';sessionStorage.removeItem('provisio-catalog-return');}catch{}track('catalog_resume');router.replace(/^[a-z0-9][a-z0-9-]{0,179}$/.test(slug)?'/app/comprador/catalogo?produto='+encodeURIComponent(slug):'/app/comprador/lista');},[router]);return <main className='p-8 text-forest' role='status'>Retomando sua seleção…</main>;}
