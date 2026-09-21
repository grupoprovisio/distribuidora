import { redirect } from "next/navigation";

// As ofertas viraram a aba "Promoções". Links antigos continuam funcionando.
export default function OfertasPage() {
  redirect("/promocoes");
}
