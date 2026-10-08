export const marketplaceFlags = {
  catalogEnabled: process.env.MARKETPLACE_CATALOG_ENABLED === "true",
  checkoutSimulationEnabled: process.env.MARKETPLACE_CHECKOUT_SIMULATION === "true",
  publicSignupEnabled: process.env.MARKETPLACE_PUBLIC_SIGNUP === "true",
} as const;
