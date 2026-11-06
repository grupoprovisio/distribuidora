import {AppHeader} from '@/components/app-header';
import {PublicList} from '@/components/public-catalog-actions';
import {WRAP} from '@/lib/ui';
export const metadata={title:'Minha lista · Provisio',robots:{index:false,follow:false}};
export default function Page(){return <><AppHeader theme='forest' title='Minha lista' backHref='/produtos' showListButton={false}/><main className={WRAP+' py-6'}><h1 className='text-2xl font-black text-forest'>Sua lista de cotação</h1><PublicList/></main></>;}
