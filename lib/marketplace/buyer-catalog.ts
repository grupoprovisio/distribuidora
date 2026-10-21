import "server-only";
import { createClient } from "@/lib/supabase/server";
import { allowedBuyerRegionCodes } from "@/lib/marketplace/brazil-regions";

type Client = Awaited<ReturnType<typeof createClient>>;
export type PrivateOffer = {
  id: string;
  slug: string;
  productName: string;
  supplier: string;
  sku: string;
  pack: string;
  priceMinor: number;
  minQuantity: number;
  tiers: {minQuantity:number;unitPriceMinor:number}[];
};
export type BuyerCatalogResult = { items: PrivateOffer[]; error: boolean; hasMore: boolean; regionNotAuthorized?: boolean };
const SOURCES = new Set(["MANUAL_AUTHORIZED","SUPPLIER_CSV_AUTHORIZED","SUPPLIER_API_AUTHORIZED","PLATFORM_STOCK"]);
const PAGE_SIZE = 24;

/** Only the authenticated user's RLS-visible rows are used; no service_role key. */
export async function buyerCatalog(client: Client, region: string, page: number): Promise<BuyerCatalogResult> {
  const empty: BuyerCatalogResult = { items: [], error: false, hasMore: false };
  const regionCodes=allowedBuyerRegionCodes(region);
  if (!regionCodes.length || !Number.isSafeInteger(page) || page < 1 || page > 1000) return {...empty,error:true};
  // A local buyer must hold an active organization entitlement for this
  // specific delivery region. Global offers marked "BR" are still scoped here.
  const normalized=region.trim().toUpperCase();
  const uf=normalized.startsWith("BR-")?normalized.slice(3):normalized;
  if(normalized==="BR" || !/^[A-Z]{2}$/.test(uf)) return {...empty,error:true};
  const allowedRegion=await client.from("buyer_delivery_regions")
    .select("buyer_org_id").eq("region_code","BR-"+uf).limit(1);
  if(allowedRegion.error)return {...empty,error:true};
  if(!allowedRegion.data?.length)return {...empty,regionNotAuthorized:true};
  const now = new Date().toISOString();
  const offset = (page - 1) * PAGE_SIZE;
  // Filter by selected delivery region BEFORE paginating; a buyer may be
  // entitled to multiple UFs, but this page must not mix their offers.
  // PostgREST's !inner embed makes the region predicate part of the SQL query.
  // range() is inclusive, so PAGE_SIZE+1 checks whether the next page exists.
  const query = await client.from("offers")
    .select("id,supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from,valid_to,offer_regions!inner(region_code)")
    .in("offer_regions.region_code",regionCodes)
    .eq("status","approved").lte("valid_from",now)
    .or("valid_to.is.null,valid_to.gt." + now)
    .order("created_at",{ascending:false}).range(offset,offset+PAGE_SIZE);
  if (query.error) return {...empty,error:true};
  const hasMore=(query.data?.length??0)>PAGE_SIZE;
  const visible=(query.data??[]).slice(0,PAGE_SIZE).filter(o=>SOURCES.has(o.source_type)
    && o.status==="approved" && o.valid_from<=now && (!o.valid_to || o.valid_to>now)
    && Number.isSafeInteger(o.base_price_minor) && o.base_price_minor>=0);
  if (!visible.length) return {...empty,hasMore:hasMore&&page<1000};
  const ids=visible.map(o=>o.id);
  const skuIds=[...new Set(visible.map(o=>o.supplier_product_id))];
  const orgIds=[...new Set(visible.map(o=>o.supplier_org_id))];
  const [skus,orgs,regions,inventory,capabilities,priceTiers]=await Promise.all([
    client.from("supplier_products").select("id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status").in("id",skuIds).eq("status","approved"),
    client.from("organizations").select("id,legal_name,trade_name,kind,status").in("id",orgIds).eq("status","approved"),
    client.from("offer_regions").select("offer_id,region_code").in("offer_id",ids).in("region_code",regionCodes),
    client.from("inventory_positions").select("supplier_product_id,supplier_org_id,available_quantity,reserved_quantity").in("supplier_product_id",skuIds),
    client.from("organization_capabilities").select("organization_id,capability,status").in("organization_id",orgIds).eq("capability","SUPPLIER").eq("status","approved"),
    client.from("offer_price_tiers").select("offer_id,min_quantity,unit_price_minor").in("offer_id",ids).limit(1001)
  ]);
  if ([skus,orgs,regions,inventory,capabilities,priceTiers].some(q=>q.error) || (priceTiers.data?.length??0)>1000) return {...empty,error:true};
  const productIds=[...new Set((skus.data??[]).map(s=>s.product_id))];
  if (!productIds.length) return {...empty,hasMore:hasMore&&page<1000};
  const products=await client.from("products").select("id,slug,name,status").in("id",productIds).eq("status","active");
  if (products.error) return {...empty,error:true};
  const prodMap=new Map((products.data??[]).map(p=>[p.id,p]));
  const skuMap=new Map((skus.data??[]).map(s=>[s.id,s]));
  const orgMap=new Map((orgs.data??[]).filter(o=>o.kind==="SUPPLIER"||o.kind==="PLATFORM_OPERATOR").map(o=>[o.id,o]));
  const capIds=new Set((capabilities.data??[]).map(c=>c.organization_id));
  const regionIds=new Set((regions.data??[]).map(r=>r.offer_id));
  const stockMap=new Map((inventory.data??[]).map(s=>[s.supplier_product_id+":"+s.supplier_org_id,s]));
  const items:PrivateOffer[]=[];
  for (const offer of visible) {
    const sku=skuMap.get(offer.supplier_product_id);
    const org=orgMap.get(offer.supplier_org_id);
    if (!sku || !org || sku.supplier_org_id!==org.id || !capIds.has(org.id) || !regionIds.has(offer.id)) continue;
    const product=prodMap.get(sku.product_id);
    const stock=stockMap.get(sku.id+":"+org.id);
    if (!product || !stock) continue;
    if (Number(stock.available_quantity)-Number(stock.reserved_quantity)<offer.min_quantity) continue;
    items.push({
      id:offer.id,slug:product.slug,productName:product.name,supplier:org.trade_name||org.legal_name,
      sku:sku.supplier_sku,pack:String(sku.pack_quantity)+" "+sku.pack_unit,
      priceMinor:offer.base_price_minor,minQuantity:offer.min_quantity,
      tiers:(priceTiers.data??[]).filter(t=>t.offer_id===offer.id && Number.isSafeInteger(t.unit_price_minor) && t.unit_price_minor>=0 && Number.isSafeInteger(t.min_quantity) && t.min_quantity>=offer.min_quantity)
        .map(t=>({minQuantity:t.min_quantity,unitPriceMinor:t.unit_price_minor})).sort((a,b)=>a.minQuantity-b.minQuantity)
    });
  }
  return {items,error:false,hasMore:hasMore&&page<1000};
}
