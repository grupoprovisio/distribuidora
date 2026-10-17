/** Only permit fixtures and unauthenticated demo handlers in explicitly opted-in local development. */
export function isLocalMarketplaceDemoEnabled() {
  return process.env.NODE_ENV === "development" && process.env.MARKETPLACE_DEMO_API_ENABLED === "true";
}
export function demoEndpointDisabled() {
  return Response.json({ ok: false, reason: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
