import { legacyEndpointGone } from "@/lib/legacy-commercial-access";

/** Legacy public VTEX/Atacadao commerce is retired in the isolated B2B branch. */
export function POST() {
  return legacyEndpointGone();
}
