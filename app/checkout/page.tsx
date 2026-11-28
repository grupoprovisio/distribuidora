import { redirect } from "next/navigation";

// Legacy public checkout must not bypass buyer membership or per-product pricing.
export default function CheckoutPage() {
  redirect("/app/comprador/cesta");
}
