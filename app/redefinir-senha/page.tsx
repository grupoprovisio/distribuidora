import type { Metadata } from "next";
import { PasswordUpdateForm } from "@/components/marketplace-password-update";
export const metadata: Metadata = {title:"Definir nova senha · Provisio",robots:{index:false,follow:false}};
export const dynamic = "force-dynamic";
export default function ResetPasswordPage(){
  return <main className="min-h-dvh bg-canvas px-5 py-12">
    <section className="mx-auto max-w-lg rounded-[2rem] bg-paper p-7 shadow-card ring-1 ring-line/70">
      <h1 className="text-2xl font-black text-forest">Definir nova senha</h1>
      <p className="mt-3 text-sm text-muted">Acesse esta página pelo link enviado ao seu e-mail. Escolha uma senha exclusiva.</p>
      <PasswordUpdateForm/>
    </section>
  </main>;
}
