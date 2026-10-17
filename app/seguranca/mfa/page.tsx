import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { MarketplaceMfaForm } from "@/components/marketplace-mfa-form";
import { requireMarketplaceLogin } from "@/lib/marketplace/session";
export const metadata: Metadata = { title:"Verificação em duas etapas · Provisio", robots:{index:false,follow:false} };
export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const access=await requireMarketplaceLogin();
  if (!access.allowed.includes("admin")) redirect("/acesso-restrito");
  return <main className="min-h-dvh bg-canvas px-5 py-12">
    <section className="mx-auto max-w-lg rounded-[2rem] bg-paper p-7 shadow-card ring-1 ring-line/70">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-lime-soft text-forest">
        <ShieldCheck aria-hidden size={24}/>
      </div>
      <h1 className="mt-5 text-2xl font-black text-forest-deep">Proteção adicional da administração</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Para acessar a área administrativa da Provisio, confirme o código do aplicativo autenticador.
        Esta etapa é obrigatória mesmo após inserir a senha.
      </p>
      <MarketplaceMfaForm />
    </section>
  </main>;
}
