import { redirect } from "next/navigation";

/** Compatibilidade: fluxo legado foi substituido pelo marketplace com origem autorizada. */
export default function RetiredComparatorPage() {
  redirect("/app");
}
