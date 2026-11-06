'use client';
import {useEffect} from 'react';
import {track} from '@/lib/analytics';
/** No search text, CEP, company IDs or contact information enters analytics. */
export function CatalogObservation({count,filtered=false,slug}:{count?:number;filtered?:boolean;slug?:string}){
 useEffect(()=>{track(slug?'catalog_product_view':filtered?'catalog_search':'catalog_view',{product:slug,result_count:count});if(filtered&&count===0)track('catalog_no_results');},[count,filtered,slug]);return null;
}
