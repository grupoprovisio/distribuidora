/** Contrato comercial. Nunca deve ser populado por feeds VTEX/Atacadão. */
export type OrganizationKind = "operator" | "buyer" | "supplier" | "hybrid";
export type OrganizationStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";
export type MembershipRole = "owner" | "admin" | "buyer" | "approver" | "seller" | "supplier_operator" | "auditor";
export type OfferOrigin = "operator_inventory" | "approved_supplier";
export type OfferStatus = "draft" | "pending_review" | "active" | "paused" | "rejected";
export type MoneyCents = number;

export interface CommercialOffer {
  id: string;
  productId: string;
  sellerOrganizationId: string;
  origin: OfferOrigin;
  status: OfferStatus;
  currency: "BRL";
  unitPriceCents: MoneyCents;
  minQuantity: number;
  stockAvailable: number;
  validUntil: string | null;
}

export function isSaleableOffer(offer: CommercialOffer, approvedSeller: boolean, now = new Date()): boolean {
  return approvedSeller && offer.status === "active" && (offer.origin === "operator_inventory" || offer.origin === "approved_supplier") && Number.isSafeInteger(offer.unitPriceCents) && offer.unitPriceCents >= 0 && Number.isInteger(offer.minQuantity) && offer.minQuantity > 0 && Number.isInteger(offer.stockAvailable) && offer.stockAvailable >= offer.minQuantity && (offer.validUntil === null || (Number.isFinite(Date.parse(offer.validUntil)) && Date.parse(offer.validUntil) > now.getTime()));
}

export function assertCommercialOrigin(input: unknown): asserts input is OfferOrigin {
  if (input !== "operator_inventory" && input !== "approved_supplier") throw new Error("Oferta não autorizada: dados de comparadores externos não podem ser comercializados.");
}
