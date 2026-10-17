import { ArrowRight, BadgeCheck, ClipboardList, MapPinned, PackageSearch, ShieldCheck, Truck } from "lucide-react";
type Role = "comprador" | "fornecedor";
const journeys = {
  comprador: {
    title: "Do abastecimento ao recebimento, sem perder o contexto.",
    subtitle: "Uma jornada desenhada para a rotina de quem compra para uma empresa.",
    steps: [
      { icon: PackageSearch, title: "Encontre a oferta certa", detail: "Consulte produtos homologados, embalagens, região de atendimento e condições de volume." },
      { icon: ClipboardList, title: "Organize sua compra", detail: "Separe necessidades, prepare cotações e acompanhe pedidos por fornecedor." },
      { icon: Truck, title: "Acompanhe a operação", detail: "Consulte as etapas de atendimento e recebimento quando os pedidos forem ativados." },
    ],
    questions: [
      ["Preciso de CNPJ para comprar?", "O cadastro comercial será destinado a empresas. Os requisitos de homologação serão divulgados antes da abertura das compras."],
      ["Os preços do site já estão disponíveis?", "Não. O catálogo comercial exibirá apenas ofertas próprias ou de fornecedores previamente autorizados."],
      ["Já consigo fazer pedidos?", "Ainda não. Os fluxos públicos mostram a proposta; pedidos reais dependem da homologação do ambiente."],
    ],
  },
  fornecedor: {
    title: "Uma entrada clara para parceiros que querem fornecer.",
    subtitle: "Cada empresa terá sua própria operação comercial dentro da plataforma.",
    steps: [
      { icon: BadgeCheck, title: "Apresente sua empresa", detail: "Compartilhe segmento, portfólio e região de atendimento para avaliação comercial." },
      { icon: ShieldCheck, title: "Passe pela homologação", detail: "Produtos e ofertas dependerão de aprovação antes de ficarem disponíveis para compradores." },
      { icon: MapPinned, title: "Defina suas condições", detail: "Após aprovação, a operação poderá configurar preços, mínimos e regiões de entrega." },
    ],
    questions: [
      ["Posso cadastrar produtos agora?", "A área comercial está em preparação. A publicação exigirá uma organização fornecedora homologada."],
      ["Quem define o preço dos produtos?", "Cada fornecedor definirá suas condições comerciais permitidas, respeitando o processo de aprovação da plataforma."],
      ["Como serão feitos os pedidos?", "Pedidos serão separados por fornecedor, com responsabilidade e condições registradas em cada subpedido."],
    ],
  },
} as const;

export function MarketplaceJourney({ role }: { role: Role }) {
  const item = journeys[role];
  return (
    <>
      <section className="mt-14" aria-labelledby="journey-title">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-terra">Como vai funcionar</p>
        <h2 id="journey-title" className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">{item.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{item.subtitle}</p>
        <ol className="mt-6 grid gap-3 lg:grid-cols-3">
          {item.steps.map(({ icon: Icon, title, detail }, index) => (
            <li key={title} className="rounded-3xl border border-line bg-paper p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-lime-soft text-forest"><Icon size={21} aria-hidden /></span>
                <span className="text-sm font-black tabular-nums text-muted">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-6 text-lg font-black text-forest-deep">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
              {index < 2 ? <ArrowRight className="mt-5 text-terra" size={17} aria-hidden /> : null}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-14" aria-labelledby="faq-title">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-terra">Dúvidas comuns</p>
        <h2 id="faq-title" className="mt-2 text-2xl font-black tracking-tight text-forest-deep sm:text-3xl">Antes de começar</h2>
        <div className="mt-6 grid gap-3">
          {item.questions.map(([question, answer]) => (
            <details key={question} className="group rounded-2xl border border-line bg-paper px-5 py-4">
              <summary className="cursor-pointer text-sm font-extrabold text-forest-deep focus-visible:outline-2 focus-visible:outline-forest">{question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
