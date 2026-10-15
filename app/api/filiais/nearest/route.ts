import { legacyEndpointGone } from "@/lib/legacy-commercial-access";

/** Old third-party session, receipt or branch data is not part of the Provisio marketplace. */
export function GET() {
  return legacyEndpointGone();
}
