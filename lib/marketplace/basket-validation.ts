import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { getMarketplaceAccess } from "@/lib/marketplace/session";

type Access=NonNullable<Awaited<ReturnType<typeof getMarketplaceAccess>>>;
type Client=Awaited<ReturnType<typeof createClient>>;
export type BasketSelection={offerId:string;quantity:number};
export type BasketPriceTier={minQuantity:number;unitPriceMinor:number};
export type ValidatedBasketLine={
  offerId:string;productName:string;supplier:string;sku:string;pack:string;
  imageUrl:string|null; quantity:number; minQuantity:number;
  available:number;unitPriceMinor:number;subtotalMinor:number;
  tiers:BasketPriceTier[];valid:boolean;reason:string|null;
};
export type BasketValidation={ok:boolean;reason?:string;lines:ValidatedBasketLine[];
  totalMinor:number;ready:boolean;region:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateBasketInput(lines:unknown):lines is BasketSelection[] {
  return Array.isArray(lines) && lines.length>0 && lines.length<=30 &&
    lines.every(line=>line && typeof line==="object" && !Array.isArray(line)
      && Object.keys(line).sort().join(",")==="offerId,quantity"
      && typeof line.offerId==="string" && UUID.test(line.offerId)
      && typeof line.quantity==="number" && Number.isSafeInteger(line.quantity)
      && line.quantity>=1 && line.quantity<=100000)
    && new Set(lines.map(line=>line.offerId)).size===lines.length;
}
export function basketUnitPrice(base:number, tiers:BasketPriceTier[],quantity:number){
  return tiers.filter(t=>t.minQuantity<=quantity)
    .reduce((price,t)=>t.unitPriceMinor,base);
}
/** Revalidates every offer from authorized Supabase RLS rows, not from localStorage prices. */
export async function validateBuyerBasket(
  db:Client,access:Access,buyerOrgId:string,region:string,selected:BasketSelection[]
):Promise<BasketValidation> {
  const empty=(reason:string):BasketValidation=>({ok:false,reason,lines:[],totalMinor:0,ready:false,region});
  if(!access.organizationIds.comprador.includes(buyerOrgId)||!access.allowed.includes("comprador")
    ||!/^BR-[A-Z]{2}$/.test(region)||!validateBasketInput(selected))return empty("invalid_request");
  const allowed=await db.from("buyer_delivery_regions").select("buyer_org_id")
    .eq("buyer_org_id",buyerOrgId).eq("region_code",region).maybeSingle();
  if(allowed.error||!allowed.data)return empty("region_not_authorized");
  const ids=selected.map(l=>l.offerId);
  const now=new Date().toISOString();
  const offers=await db.from("offers")
    .select("id,supplier_product_id,supplier_org_id,base_price_minor,min_quantity,status,valid_from,valid_to,source_type")
    .in("id",ids).limit(30);
  if(offers.error)return empty("offers_unavailable");
  const rows=offers.data??[];
  const skuIds=[...new Set(rows.map(o=>o.supplier_product_id))];
  const supplierIds=[...new Set(rows.map(o=>o.supplier_org_id))];
  if(!skuIds.length)return empty("offers_unavailable");
  const [skus,suppliers,inventory,regions,tiers,caps]=await Promise.all([
    db.from("supplier_products").select("id,product_id,supplier_org_id,supplier_sku,pack_quantity,pack_unit,status")
      .in("id",skuIds),
    db.from("organizations").select("id,trade_name,legal_name,kind,status")
      .in("id",supplierIds),
    db.from("inventory_positions").select("supplier_product_id,supplier_org_id,available_quantity,reserved_quantity")
      .in("supplier_product_id",skuIds),
    db.from("offer_regions").select("offer_id,region_code").in("offer_id",ids).in("region_code",[region,"BR"]),
    db.from("offer_price_tiers").select("offer_id,min_quantity,unit_price_minor").in("offer_id",ids),
    db.from("organization_capabilities").select("organization_id,capability,status")
      .in("organization_id",supplierIds).eq("capability","SUPPLIER").eq("status","approved"),
  ]);
  if([skus,suppliers,inventory,regions,tiers,caps].some(q=>q.error))
    return empty("catalog_unavailable");
  const productIds=[...new Set((skus.data??[]).map(s=>s.product_id))];
  const products=await db.from("products").select("id,name,status")
    .in("id",productIds.length?productIds:["00000000-0000-4000-8000-000000000000"]);
  if(products.error)return empty("catalog_unavailable");
  const images=productIds.length?await db.from("product_images")
    .select("product_id,storage_path").in("product_id",productIds)
    .order("created_at",{ascending:false}).limit(100):null;
  const imageById=new Map<string,string>();
  for(const i of images?.data??[]){if(!imageById.has(i.product_id))imageById.set(i.product_id,i.storage_path);}
  const signed=await Promise.all([...imageById].map(async([id,path])=>{
    const r=await db.storage.from("provisio-produtos").createSignedUrl(path,15*60);
    return [id,r.data?.signedUrl??null] as const;
  }));
  const imagesMap=new Map<string,string|null>(signed);
  const byId=new Map(rows.map(o=>[o.id,o]));
  const skuMap=new Map((skus.data??[]).map(o=>[o.id,o]));
  const orgMap=new Map((suppliers.data??[]).map(o=>[o.id,o]));
  const stockMap=new Map((inventory.data??[]).map(o=>[o.supplier_product_id+":"+o.supplier_org_id,o]));
  const productMap=new Map((products.data??[]).map(o=>[o.id,o]));
  const entitled=new Set((caps.data??[]).map(o=>o.organization_id));
  const offerRegions=new Set((regions.data??[]).map(o=>o.offer_id));
  const validSources=new Set(["MANUAL_AUTHORIZED","SUPPLIER_CSV_AUTHORIZED","SUPPLIER_API_AUTHORIZED","PLATFORM_STOCK"]);
  let total=0;
  const lines=selected.map(({offerId,quantity}):ValidatedBasketLine=>{
    const offer=byId.get(offerId),sku=offer?skuMap.get(offer.supplier_product_id):undefined;
    const seller=offer?orgMap.get(offer.supplier_org_id):undefined;
    const product=sku?productMap.get(sku.product_id):undefined;
    const inv=offer?stockMap.get(offer.supplier_product_id+":"+offer.supplier_org_id):undefined;
    const available=inv?Math.max(0,Number(inv.available_quantity)-Number(inv.reserved_quantity)):0;
    const priceTiers:BasketPriceTier[]=(tiers.data??[])
      .filter(t=>t.offer_id===offerId && Number.isSafeInteger(t.min_quantity)
        && Number.isSafeInteger(t.unit_price_minor)&&t.unit_price_minor>0)
      .map(t=>({minQuantity:t.min_quantity,unitPriceMinor:t.unit_price_minor}))
      .sort((a,b)=>a.minQuantity-b.minQuantity);
    const minQuantity=offer?.min_quantity??1;
    const unit=offer?basketUnitPrice(offer.base_price_minor,priceTiers,quantity):0;
    const valid=!!(offer&&sku&&seller&&product&&inv&&product.status==="active"
      && sku.status==="approved" && sku.supplier_org_id===offer.supplier_org_id
      && (seller.kind==="SUPPLIER"||seller.kind==="PLATFORM_OPERATOR") && seller.status==="approved"
      && entitled.has(offer.supplier_org_id)&&offerRegions.has(offerId)
      && validSources.has(offer.source_type)&&offer.status==="approved"
      && offer.valid_from<=now&&(!offer.valid_to||offer.valid_to>now)
      && available>=quantity&&quantity>=minQuantity
      && Number.isSafeInteger(unit)&&unit>0&&Number.isSafeInteger(unit*quantity)
      && unit*quantity<=Number.MAX_SAFE_INTEGER);
    const sub=valid?unit*quantity:0;
    total+=sub;
    return {offerId,productName:product?.name??"Produto indisponível",
      supplier:seller?.trade_name||seller?.legal_name||"Fornecedor",
      sku:sku?.supplier_sku??"",pack:sku?String(sku.pack_quantity)+" "+sku.pack_unit:"",
      imageUrl:product?imagesMap.get(product.id)??null:null,
      quantity,minQuantity,available,unitPriceMinor:unit,
      subtotalMinor:sub,tiers:priceTiers,valid,reason:valid?null:"Oferta, quantidade ou estoque indisponível"};
  });
  return {ok:true,lines,totalMinor:total,ready:lines.length>0
    && lines.every(line=>line.valid),region};
}
