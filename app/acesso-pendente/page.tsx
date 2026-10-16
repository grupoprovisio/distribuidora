import Link from "next/link";
import { supabaseAuthEnabled } from "@/lib/supabase/config";
export const metadata = { title: "Acesso em análise · Provisio", robots: {index:false,follow:false} };
export const dynamic = "force-dynamic";
export default function PendingAccessPage() {
  return <main className="mx-auto max-w-xl px-5 py-16">
    <h1 className="text-3xl font-black text-forest">Acesso em análise</h1>
    <p className="mt-4 text-sm leading-relaxed text-muted">
      {supabaseAuthEnabled()?"Sua identidade foi verificada, mas sua conta ainda não possui vínculo empresarial aprovado. Solicite à administração a homologação.":"O login do marketplace ainda não foi habilitado."}
    </p><Link className="mt-6 inline-block font-bold text-forest underline" href="/entrar">Voltar ao acesso</Link>
  </main>;
}
