import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";
import { ClearPaidBasket } from "@/components/clear-paid-basket";

type CheckoutSession = { payment_status?: string; status?: string; metadata?: Record<string,string> };

async function readSession(sessionId: string | undefined): Promise<CheckoutSession | null> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId), {
    headers: { Authorization: "Bearer " + secret },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<CheckoutSession>;
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const session = await readSession((await searchParams).session_id);
  const paid = session?.payment_status === "paid";

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title={paid ? "Pagamento confirmado" : "Pagamento em processamento"} backHref="/" showListButton={false} />
      <main className={WRAP + " py-12"}>
        <section className="mx-auto max-w-xl rounded-[2rem] bg-paper p-8 text-center shadow-float ring-1 ring-line/70 sm:p-12">
          {paid ? <CheckCircle2 size={52} className="mx-auto text-forest" aria-hidden /> : <Clock3 size={52} className="mx-auto text-terra" aria-hidden />}
          <h1 className="mt-5 text-3xl font-black text-forest-deep">{paid ? "Obrigado pela sua compra." : "Estamos confirmando seu pagamento."}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {paid ? "A Stripe confirmou o pagamento. Em breve você verá os próximos passos do pedido." : "O pagamento pode levar alguns instantes para ser confirmado. Você receberá a atualização assim que o webhook da Stripe processar a sessão."}
          </p>
          <Link href="/app/comprador/pedidos" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-sm font-extrabold text-white">Acompanhar pedido</Link>
          {paid&&<ClearPaidBasket userId={session?.metadata?.created_by} buyerOrgId={session?.metadata?.buyer_org_id} region={session?.metadata?.region??"BR-SP"}/>} 
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
