export type OrganizationKind = "BUYER" | "SUPPLIER" | "PLATFORM_OPERATOR";
export type OfferSourceType = "MANUAL_AUTHORIZED" | "SUPPLIER_CSV_AUTHORIZED" | "SUPPLIER_API_AUTHORIZED" | "PLATFORM_STOCK" | "ATACADAO_EXTERNAL" | "VTEX_SCRAPE" | "UNVERIFIED_EXTERNAL";
export type Organization = { id: string; legalName: string; kind: OrganizationKind; isPlatformOwned: boolean; approved: boolean };
export type Product = { id: string; slug: string; name: string; baseUnit: "un" | "kg" | "l"; status: "active" | "draft" };
export type SupplierProduct = { id: string; supplierOrgId: string; productId: string; supplierSku: string; packQuantity: number; packUnit: string; status: "approved" | "pending" | "rejected" };
export type OfferTier = { minQuantity: number; unitPriceMinor: number };
export type Offer = {
  id: string; supplierProductId: string; supplierOrgId: string; sourceType: OfferSourceType;
  basePriceMinor: number; minQuantity: number; status: "approved" | "pending" | "suspended";
  validFrom: string; validTo?: string; regions: string[]; tiers: OfferTier[];
};

const AUTHORIZED_SOURCES = new Set<OfferSourceType>(["MANUAL_AUTHORIZED", "SUPPLIER_CSV_AUTHORIZED", "SUPPLIER_API_AUTHORIZED", "PLATFORM_STOCK"]);
const validMoney = (value: number) => Number.isSafeInteger(value) && value >= 0;
const validQuantity = (value: number) => Number.isSafeInteger(value) && value > 0;

export function isAuthorizedSource(source: OfferSourceType) { return AUTHORIZED_SOURCES.has(source); }

/** Fail closed: approval, provenance, dates, amounts and tier structure must all be valid. */
export function isOfferSellable(offer: Offer, supplier: Organization, product: Product, now = new Date()) {
  const start = Date.parse(offer.validFrom);
  const end = offer.validTo ? Date.parse(offer.validTo) : Infinity;
  const current = now.getTime();
  const tiers = Array.isArray(offer.tiers) && offer.tiers.every((tier) =>
    validQuantity(tier.minQuantity) && tier.minQuantity >= offer.minQuantity && validMoney(tier.unitPriceMinor));
  return supplier.approved && (supplier.kind === "SUPPLIER" || supplier.kind === "PLATFORM_OPERATOR") &&
    (supplier.kind !== "PLATFORM_OPERATOR" || supplier.isPlatformOwned) &&
    offer.status === "approved" && product.status === "active" && isAuthorizedSource(offer.sourceType) &&
    Number.isFinite(start) && !Number.isNaN(end) && Number.isFinite(current) &&
    start <= current && current <= end && end >= start &&
    validMoney(offer.basePriceMinor) && validQuantity(offer.minQuantity) &&
    Array.isArray(offer.regions) && offer.regions.length > 0 &&
    offer.regions.every((region) => /^[A-Z]{2}(?:-[A-Z0-9]{2,12})?$/.test(region)) && tiers;
}

export type CatalogRecord = { organization: Organization; product: Product; supplierProduct: SupplierProduct; offer: Offer };

/** Prevent misbound offers/stock from being listed under another organization's identity. */
export function isCatalogRecordSellable(record: CatalogRecord, now = new Date()) {
  const { organization, product, supplierProduct, offer } = record;
  return Boolean(organization.id && product.id && supplierProduct.id && offer.id) &&
    supplierProduct.status === "approved" && validQuantity(supplierProduct.packQuantity) &&
    supplierProduct.supplierOrgId === organization.id &&
    supplierProduct.productId === product.id &&
    offer.supplierOrgId === organization.id &&
    offer.supplierProductId === supplierProduct.id &&
    isOfferSellable(offer, organization, product, now);
}

/** Regions are explicit: BR allows subdivisions BR-SP; other regions require a match. */
export function isOfferEligibleForRegion(offer: Offer, buyerRegion: string) {
  const region = buyerRegion.trim().toUpperCase();
  if (!/^[A-Z]{2}(?:-[A-Z0-9]{2,12})?$/.test(region)) return false;
  return offer.regions.some((allowed) => allowed === region || (allowed.length === 2 && region.startsWith(allowed + "-")));
}

export interface AuthorizedOffersRepository {
  search(term?: string, region?: string): Promise<CatalogRecord[]>;
  getSellableOffer(id: string, now?: Date, region?: string): Promise<CatalogRecord | null>;
}

export class InMemoryAuthorizedOffersRepository implements AuthorizedOffersRepository {
  constructor(private readonly records: CatalogRecord[]) {}
  async search(term = "", region?: string) {
    if (!region) return [];
    const normalized = term.trim().toLocaleLowerCase("pt-BR");
    return this.records.filter((record) =>
      isCatalogRecordSellable(record) &&
      isOfferEligibleForRegion(record.offer, region) &&
      (!normalized || `${record.product.name} ${record.supplierProduct.supplierSku}`.toLocaleLowerCase("pt-BR").includes(normalized)));
  }
  async getSellableOffer(id: string, now = new Date(), region?: string) {
    if (!region) return null;
    const record = this.records.find((item) => item.offer.id === id);
    return record && isCatalogRecordSellable(record, now) && isOfferEligibleForRegion(record.offer, region) ? record : null;
  }
}

/** Entirely fictitious local fixture. Never use for production listings or orders. */
export const demoAuthorizedCatalog: CatalogRecord[] = [{
  organization: { id: "org-platform-demo", legalName: "Distribuidora própria — demonstração", kind: "PLATFORM_OPERATOR", isPlatformOwned: true, approved: true },
  product: { id: "product-arroz-demo", slug: "arroz-demo", name: "Arroz branco — demonstração", baseUnit: "kg", status: "active" },
  supplierProduct: { id: "supplier-product-arroz-demo", supplierOrgId: "org-platform-demo", productId: "product-arroz-demo", supplierSku: "PLAT-ARROZ-DEMO", packQuantity: 5, packUnit: "kg", status: "approved" },
  offer: { id: "offer-arroz-demo", supplierProductId: "supplier-product-arroz-demo", supplierOrgId: "org-platform-demo", sourceType: "PLATFORM_STOCK", basePriceMinor: 2490, minQuantity: 1, status: "approved", validFrom: "2026-01-01T00:00:00.000Z", regions: ["BR"], tiers: [{ minQuantity: 10, unitPriceMinor: 2290 }] },
}];
export const demoRepository = new InMemoryAuthorizedOffersRepository(demoAuthorizedCatalog);
