import {requireMarketplacePortal} from '@/lib/marketplace/session';
import {myMarketplaceOrganizations} from '@/lib/marketplace/my-organizations';
import {AppHeader} from '@/components/app-header';
import {BuyerPublicList} from '@/components/buyer-public-list';
import {WRAP} from '@/lib/ui';
export const dynamic='force-dynamic';
export default async function Page(){const access=await requireMarketplacePortal('comprador');const summary=await myMarketplaceOrganizations('comprador',access);return <><AppHeader theme='forest' title='Revisar minha lista' backHref='/produtos/lista' showListButton={false}/><main className={WRAP+' py-6'}><h1 className='text-2xl font-black text-forest'>Escolha as ofertas para sua lista</h1><p className='mt-3 text-sm text-muted'>Selecione sua empresa e região, consulte as ofertas atuais e confirme quais deseja adicionar à cesta.</p>{summary.error?<p role='alert'>Não foi possível consultar sua empresa.</p>:<BuyerPublicList userId={access.userId} organizations={summary.organizations.slice(0,1).map(o=>({id:o.id,name:o.name}))}/>}</main></>;}
