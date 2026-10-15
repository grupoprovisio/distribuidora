import { redirect } from "next/navigation";

/** Controlled migration: preserve bookmarked paths without fetching third-party pricing. */
export default function CategoriasLegacyPage() {
  redirect("/produtos");
}
