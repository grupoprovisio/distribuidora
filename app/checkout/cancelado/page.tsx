import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export default function CheckoutCanceledPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Checkout cancelado" backHref="/checkout" showListButton={false} />
      <main className={WRAP + " py-12"}>
        <section className="mx-auto max-w-xl rounded-[2rem] bg-paper p-8 text-center shadow-float ring-1 ring-line/70 sm:p-12">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-terra">Tudo bem</p>
          <h1 className="mt-3 text-3xl font-black text-forest-deep">O pagamento não foi concluído.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">Você pode voltar ao checkout quando quiser e tentar novamente.</p>
          <Link href="/checkout" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white"><ArrowLeft size={16} aria-hidden /> Voltar ao checkout</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
