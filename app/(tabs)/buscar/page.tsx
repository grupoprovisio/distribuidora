import { redirect } from "next/navigation";

/** Controlled migration: preserve bookmarked paths without fetching third-party pricing. */
export default function BuscarLegacyPage() {
  redirect("/produtos");
}
