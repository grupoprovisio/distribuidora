import type { Metadata } from "next";
import { CalendarClock, MapPinned, PackageCheck, Truck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Entregas e regiões · Distribuidora" };

const STEPS = [
  { icon: PackageCheck, title: "Monte seu pedido", text: "Escolha os produtos, confira a embalagem e informe as quantidades." },
  { icon: MapPinned, title: "Confira sua região", text: "A disponibilidade de entrega e o prazo variam conforme o CEP." },
  { icon: CalendarClock, title: "Combine a janela", text: "A equipe confirma a próxima rota disponível para o seu endereço." },
];

export default function DeliveryPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="terra" title="Entregas" backHref="/" />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="max-w-2xl">
          <span className="grid size-14 place-items-center rounded-2xl bg-sand text-terra"><Truck size={27} aria-hidden /></span>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-forest-deep sm:text-5xl">Sua operação no ritmo da sua rota.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-muted sm:text-lg">Organizamos a entrega por região para que você tenha mais previsibilidade no abastecimento e clareza sobre os próximos passos.</p>
        </section>
        <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Como funciona a entrega">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="relative rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70">
              <span className="text-xs font-black text-terra">0{index + 1}</span>
              <span className="mt-4 grid size-11 place-items-center rounded-2xl bg-mist text-forest"><Icon size={21} aria-hidden /></span>
              <h2 className="mt-5 text-lg font-extrabold">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{text}</p>
            </article>
          ))}
        </section>
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-forest p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-lime">Atendimento regional</p>
            <h2 className="mt-3 text-2xl font-black">Consulte seu CEP antes de fechar.</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">A cobertura, o valor do frete e a janela são confirmados conforme a sua região de entrega.</p>
          </div>
          <div className="rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8">
            <h2 className="text-xl font-extrabold">Precisa de uma rota especial?</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted">Fale com a equipe comercial para compras maiores, recorrentes ou fora da rota padrão.</p>
          </div>
        </section>
        <section className="mt-10 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8" aria-labelledby="delivery-faq">
          <h2 id="delivery-faq" className="text-xl font-extrabold">Dúvidas sobre entrega</h2>
          <div className="mt-4 divide-y divide-line">
            <details className="py-4"><summary className="cursor-pointer text-sm font-extrabold">Como descubro se minha cidade é atendida?</summary><p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted">Informe o CEP no atendimento comercial. A equipe confirma cobertura, prazo e próxima rota disponível.</p></details>
            <details className="py-4"><summary className="cursor-pointer text-sm font-extrabold">O frete é calculado automaticamente?</summary><p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted">O valor depende da região, volume e rota. Ele é confirmado junto com a proposta antes do fechamento do pedido.</p></details>
            <details className="py-4"><summary className="cursor-pointer text-sm font-extrabold">Posso combinar uma entrega especial?</summary><p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted">Sim. Para volumes maiores ou fora da rota padrão, envie uma solicitação de orçamento.</p></details>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
