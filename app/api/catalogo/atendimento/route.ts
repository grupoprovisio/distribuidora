import {NextResponse} from 'next/server';
import {publicCatalog} from '@/lib/marketplace/public-catalog';
export async function GET(request:Request){
 const url=new URL(request.url);const cep=(url.searchParams.get('cep')??'').replace(/-/g,'');
 const reply=(message:string,status=200)=>NextResponse.json({message},{status,headers:{'Cache-Control':'no-store'}});
 if(!/^\d{8}$/.test(cep))return reply('Informe um CEP com oito dígitos.',400);
 try{
  const res=await fetch('https://viacep.com.br/ws/'+cep+'/json/',{signal:AbortSignal.timeout(2500),next:{revalidate:86400}});
  if(!res.ok)return reply('Serviço de CEP indisponível. Tente novamente.',503);
  const place=await res.json();if(place.erro||typeof place.uf!=='string')return reply('CEP não encontrado. Confira os números.',422);
  const slug=url.searchParams.get('produto');const rows=(await publicCatalog()).filter(p=>!slug||p.slug===slug);
  const available=rows.some(p=>p.regions?.some(r=>r===place.uf||r==='BR-'+place.uf||r==='BR'));
  return reply(available?`Há ofertas para ${place.localidade} / ${place.uf}. A entrega ao endereço, o frete e o prazo dependem da confirmação na cotação.`:`Não encontramos ofertas publicadas para ${place.localidade} / ${place.uf}${slug?' deste produto':''}. Consulte a Provisio para verificar alternativas.`);
 }catch{return reply('Consulta temporariamente indisponível. Tente novamente.',503);}
}
