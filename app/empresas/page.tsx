import { redirect } from "next/navigation";

/** Compatibilidade com links antigos: cadastro empresarial agora está na jornada de comprador. */
export default function EmpresasPage() {
  redirect("/compradores");
}
