'use client';
import {useState,type FormEvent} from 'react';
export function CatalogCep({slug}:{slug?:string}){
 const [cep,setCep]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
  const res=await fetch('/api/catalogo/atendimento?cep='+encodeURIComponent(cep)+(slug?'&produto='+encodeURIComponent(slug):''));
  const data=await res.json();setMessage(data.message??'Consulta indisponível. Tente novamente.');
 }catch{setMessage('Não foi possível consultar o CEP. Tente novamente.');}finally{setBusy(false);}}
 return <form onSubmit={submit} className='rounded-2xl border border-line bg-paper p-4'><label htmlFor='catalog-cep' className='text-sm font-bold text-forest'>Consulte sua região pelo CEP</label><div className='mt-2 flex gap-2'><input id='catalog-cep' inputMode='numeric' autoComplete='postal-code' placeholder='00000-000' maxLength={9} pattern='[0-9]{5}-?[0-9]{3}' required value={cep} onChange={e=>setCep(e.target.value)} className='min-h-11 min-w-0 flex-1 rounded-xl border border-line px-3'/><button disabled={busy} className='min-h-11 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-60'>{busy?'Consultando…':'Consultar'}</button></div><p role='status' className='mt-2 text-xs leading-relaxed text-muted'>{message||'Consulta inicial de região. Frete e prazo são confirmados na revisão da cotação.'}</p></form>;
}
