import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Pagamento confirmado" backHref="/" showListButton={false} />
      <main className={WRAP + " py-12"}>
        <section className="mx-auto max-w-xl rounded-[2rem] bg-paper p-8 text-center shadow-float ring-1 ring-line/70 sm:p-12">
          <CheckCircle2 size={52} className="mx-auto text-forest" aria-hidden />
          <h1 className="mt-5 text-3xl font-black text-forest-deep">Obrigado pela sua compra.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">Recebemos a confirmação do pagamento pela Stripe. Em breve você verá os próximos passos do pedido.</p>
          <Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-sm font-extrabold text-white">Voltar ao início</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
