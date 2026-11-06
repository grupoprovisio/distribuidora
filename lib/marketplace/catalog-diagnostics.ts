import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {requireMarketplacePortal} from '@/lib/marketplace/session';
const SOURCES=new Set(['MANUAL_AUTHORIZED','SUPPLIER_CSV_AUTHORIZED','SUPPLIER_API_AUTHORIZED','PLATFORM_STOCK']);
export async function catalogDiagnostics(page:number){
 await requireMarketplacePortal('admin');const db=await createClient();
 const products=await db.from('products').select('id,name,status',{count:'exact'}).order('name').order('id').range((page-1)*20,page*20-1);
 if(products.error)throw Error('Consulta indisponível');const ids=(products.data??[]).map(p=>p.id);if(!ids.length)return {items:[],total:products.count??0};
 const [listings,skus]=await Promise.all([db.from('public_catalog_listings').select('product_id,image_storage_path').in('product_id',ids),db.from('supplier_products').select('id,product_id,supplier_org_id,status').in('product_id',ids)]);
 if(listings.error||skus.error)throw Error('Consulta indisponível');
 const skuIds=(skus.data??[]).map(s=>s.id);const orgIds=[...new Set((skus.data??[]).map(s=>s.supplier_org_id))];
 const [offers,stock,orgs,caps]=await Promise.all([
  skuIds.length?db.from('offers').select('id,supplier_product_id,supplier_org_id,status,valid_from,valid_to,min_quantity,source_type').in('supplier_product_id',skuIds):{data:[],error:null},
  skuIds.length?db.from('inventory_positions').select('supplier_product_id,supplier_org_id,available_quantity,reserved_quantity').in('supplier_product_id',skuIds):{data:[],error:null},
  orgIds.length?db.from('organizations').select('id,status,kind,qa_only').in('id',orgIds):{data:[],error:null},
  orgIds.length?db.from('organization_capabilities').select('organization_id,capability,status').in('organization_id',orgIds):{data:[],error:null}
 ]);if([offers,stock,orgs,caps].some(r=>r.error))throw Error('Consulta indisponível');
 const offerIds=(offers.data??[]).map(o=>o.id);const regions=offerIds.length?await db.from('offer_regions').select('offer_id').in('offer_id',offerIds):{data:[],error:null};if(regions.error)throw Error('Consulta indisponível');
 const now=new Date().toISOString();
 const items=(products.data??[]).map(p=>{
  const listing=listings.data?.find(l=>l.product_id===p.id);const reasons:string[]=[];const warnings:string[]=[];
  if(!listing)reasons.push('Publicação na vitrine não ativada');if(p.status!=='active')reasons.push('Produto mestre não está ativo');if(!listing?.image_storage_path)warnings.push('Foto da vitrine não selecionada');
  const productSkus=(skus.data??[]).filter(s=>s.product_id===p.id);const validSkus=productSkus.filter(s=>s.status==='approved');if(!validSkus.length)reasons.push('Produto do fornecedor sem aprovação');
  const candidates=(offers.data??[]).filter(o=>validSkus.some(s=>s.id===o.supplier_product_id&&s.supplier_org_id===o.supplier_org_id));
  const problems=candidates.map(o=>{
   const r:string[]=[];const org=orgs.data?.find(v=>v.id===o.supplier_org_id);const inventory=stock.data?.find(v=>v.supplier_product_id===o.supplier_product_id&&v.supplier_org_id===o.supplier_org_id);
   if(o.status!=='approved')r.push('Oferta aguardando aprovação');if(o.valid_from>now||(o.valid_to&&o.valid_to<=now))r.push('Oferta fora da vigência');if(!SOURCES.has(o.source_type))r.push('Origem da oferta não comercial');
   if(!org||org.status!=='approved'||!['SUPPLIER','PLATFORM_OPERATOR'].includes(org.kind)||!caps.data?.some(c=>c.organization_id===org.id&&c.capability==='SUPPLIER'&&c.status==='approved'))r.push('Fornecedor sem homologação completa');if(org?.qa_only)r.push('Fornecedor de teste');
   if(!inventory||Number(inventory.available_quantity)-Number(inventory.reserved_quantity)<o.min_quantity)r.push('Estoque abaixo do pedido mínimo');if(!regions.data?.some(v=>v.offer_id===o.id))r.push('Oferta sem região de atendimento');return r;
  });
  if(!candidates.length)reasons.push('Nenhuma oferta vinculada a um produto de fornecedor aprovado');else if(!problems.some(r=>r.length===0))reasons.push(...new Set(problems.flat()));
  return {id:p.id,name:p.name,reasons,warnings,visible:reasons.length===0};
 });return {items,total:products.count??0};
}
