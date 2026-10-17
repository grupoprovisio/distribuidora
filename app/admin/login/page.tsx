import { redirect } from "next/navigation";

// Um unico provedor de identidade: Admin nao mantem formularios falsos ou legados.
// A autorizacao de /admin continua exigindo AAL2 e PLATFORM_ADMIN no servidor.
export default function AdminLoginRedirect() {
  redirect("/entrar");
}
