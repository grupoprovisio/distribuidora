import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
/** /admin/layout.tsx exige administrador válido + MFA antes do redirecionamento. */
export default function AdminPage() {
  redirect("/admin/marketplace");
}
