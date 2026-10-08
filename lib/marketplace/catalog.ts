import type { OfferOrigin } from "@/lib/marketplace/types";

export type OrganizationKind = "BUYER" | "SUPPLIER" | "PLATFORM_OPERATOR";
export type OfferSourceType = "MANUAL_AUTHORIZED" | "SUPPLIER_CSV_AUTHORIZED" | "SUPPLIER_API_AUTHORIZED" | "PLATFORM_STOCK" | "ATACADAO_EXTERNAL" | "VTEX_SCRAPE" | "UNVERIFIED_EXTERNAL";
export type CommercialOfferOrigin = OfferOrigin;

export type Organization = { id: string; legalName: string; kind: OrganizationKind; isPlatformOwned: boolean; approved: boolean };
export type Product = { id: string; slug: string; name: string; baseUnit: "un" | "kg" | "l"; status: "active" | "draft" };
export type SupplierProduct = { id: string; supplierOrgId: string; productId: string; supplierSku: string; packQuantity: number; packUnit: string; status: "approved" | "pending" | "rejected" };
export type OfferTier = { minQuantity: number; unitPriceMinor: number };
export type Offer = {
  id: string;
  supplierProductId: string;
  supplierOrgId: string;
  sourceType: OfferSourceType;
  basePriceMinor: number;
  minQuantity: number;
  status: "approved" | "pending" | "suspended";
  validFrom: string;
  validTo?: string;
  regions: string[];
  tiers: OfferTier[];
};

const AUTHORIZED_SOURCES = new Set<OfferSourceType>(["MANUAL_AUTHORIZED", "SUPPLIER_CSV_AUTHORIZED", "SUPPLIER_API_AUTHORIZED", "PLATFORM_STOCK"]);

export function isAuthorizedSource(source: OfferSourceType) {
  return AUTHORIZED_SOURCES.has(source);
}

export function isOfferSellable(offer: Offer, supplier: Organization, product: Product, now = new Date()) {
  const starts = new Date(offer.validFrom).getTime() <= now.getTime();
  const ends = !offer.validTo || new Date(offer.validTo).getTime() >= now.getTime();
  return supplier.approved && offer.status === "approved" && product.status === "active" && isAuthorizedSource(offer.sourceType) && starts && ends && offer.basePriceMinor >= 0 && offer.minQuantity > 0;
}

export type CatalogRecord = { organization: Organization; product: Product; supplierProduct: SupplierProduct; offer: Offer };

export interface AuthorizedOffersRepository {
  search(term?: string): Promise<CatalogRecord[]>;
  getSellableOffer(id: string, now?: Date): Promise<CatalogRecord | null>;
}

export class InMemoryAuthorizedOffersRepository implements AuthorizedOffersRepository {
  constructor(private readonly records: CatalogRecord[]) {}

  async search(term = "") {
    const normalized = term.trim().toLocaleLowerCase("pt-BR");
    return this.records.filter((record) => isOfferSellable(record.offer, record.organization, record.product) && (!normalized || `${record.product.name} ${record.supplierProduct.supplierSku}`.toLocaleLowerCase("pt-BR").includes(normalized)));
  }

  async getSellableOffer(id: string, now = new Date()) {
    const record = this.records.find((item) => item.offer.id === id);
    return record && isOfferSellable(record.offer, record.organization, record.product, now) ? record : null;
  }
}

export const demoAuthorizedCatalog: CatalogRecord[] = [
  {
    organization: { id: "org-platform-demo", legalName: "Distribuidora própria — demonstração", kind: "PLATFORM_OPERATOR", isPlatformOwned: true, approved: true },
    product: { id: "product-arroz-demo", slug: "arroz-demo", name: "Arroz branco — demonstração", baseUnit: "kg", status: "active" },
    supplierProduct: { id: "supplier-product-arroz-demo", supplierOrgId: "org-platform-demo", productId: "product-arroz-demo", supplierSku: "PLAT-ARROZ-DEMO", packQuantity: 5, packUnit: "kg", status: "approved" },
    offer: { id: "offer-arroz-demo", supplierProductId: "supplier-product-arroz-demo", supplierOrgId: "org-platform-demo", sourceType: "PLATFORM_STOCK", basePriceMinor: 2490, minQuantity: 1, status: "approved", validFrom: "2026-01-01T00:00:00.000Z", regions: ["BR"], tiers: [{ minQuantity: 10, unitPriceMinor: 2290 }] },
  },
];

export const demoRepository = new InMemoryAuthorizedOffersRepository(demoAuthorizedCatalog);
