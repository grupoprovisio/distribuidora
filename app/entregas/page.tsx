import { redirect } from "next/navigation";

/** Legacy page retired; browser data remains available for explicit local export. */
export default function LegacyEntregasPage() {
  redirect("/como-funciona");
}
