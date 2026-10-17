import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, Clock3, LockKeyhole, PackageSearch } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

type ModuleSpec = {
  note: string;
  next: string;
  steps: readonly { title: string; description: string }[];
  fields: readonly string[];
};

const SPECS: Record<string, ModuleSpec> = {
  "Catálogo autorizado": {
    note: "A vitrine exibirá somente produtos e condições comerciais autorizados.",
    next: "O catálogo será disponibilizado após cadastro e homologação dos produtos próprios e parceiros.",
    steps: [
      { title: "Encontre produtos", description: "Busca por categoria, nome, marca ou código de produto." },
      { title: "Compare condições", description: "Consulte ofertas elegíveis por região, embalagem e mínimo." },
      { title: "Adicione à compra", description: "Organize itens conforme as regras comerciais da oferta." },
    ],
    fields: ["Produto e fornecedor", "Embalagem e unidade", "Preço vigente", "Disponibilidade regional"],
  },
  "Cotações": {
    note: "Uma cotação permite registrar necessidades e comparar respostas elegíveis.",
    next: "Solicitações e propostas só ficarão disponíveis quando o fluxo de cotações estiver homologado.",
    steps: [
      { title: "Prepare a solicitação", description: "Defina produto, quantidade, prazo e endereço." },
      { title: "Receba propostas", description: "Compare fornecedores homologados e a validade de cada oferta." },
      { title: "Escolha com segurança", description: "Confirme condições antes de gerar um pedido comercial." },
    ],
    fields: ["Solicitação", "Prazo de resposta", "Fornecedor", "Status da proposta"],
  },
  "Pedidos e subpedidos": {
    note: "A compra será apresentada em uma visão consolidada, mesmo com fornecedores distintos.",
    next: "O acompanhamento de pedidos exige checkout e persistência validados; não há pedidos reais nesta tela.",
    steps: [
      { title: "Confirme a compra", description: "Revise valores, endereço e fornecedores antes de concluir." },
      { title: "Acompanhe cada fornecedor", description: "Cada subpedido terá suas etapas e prazos próprios." },
      { title: "Registre ocorrências", description: "Divergências e entregas parciais terão histórico rastreável." },
    ],
    fields: ["Número do pedido", "Fornecedor", "Status", "Entrega prevista"],
  },
  "Catálogo do fornecedor": {
    note: "Seu catálogo ficará isolado de outros fornecedores e terá aprovação comercial.",
    next: "A publicação de ofertas será habilitada somente após homologação e autorização administrativa.",
    steps: [
      { title: "Cadastre os SKUs", description: "Informe códigos, embalagens, unidades e características reais." },
      { title: "Configure a oferta", description: "Defina preço, pedido mínimo e vigência com base na sua operação." },
      { title: "Solicite revisão", description: "Uma oferta só poderá ser publicada após a aprovação necessária." },
    ],
    fields: ["SKU", "Produto mestre", "Embalagem", "Status de homologação"],
  },
  "Regiões e prazos": {
    note: "A disponibilidade comercial respeitará a capacidade logística de cada fornecedor.",
    next: "As configurações comerciais só serão gravadas quando as permissões e regras de entrega estiverem validadas.",
    steps: [
      { title: "Defina a cobertura", description: "Cadastre cidades, CEPs ou regiões em que consegue atender." },
      { title: "Configure prazos", description: "Registre dias e janelas operacionais compatíveis com a sua logística." },
      { title: "Controle disponibilidade", description: "Ofertas poderão considerar estoque e capacidade de expedição." },
    ],
    fields: ["Região atendida", "Prazo de preparo", "Janela de entrega", "Pedido mínimo"],
  },
  "Homologação": {
    note: "A aprovação antecede a disponibilização pública de qualquer oferta.",
    next: "Documentos empresariais exigem armazenamento seguro e regras de revisão; nenhum envio foi ativado aqui.",
    steps: [
      { title: "Dados da empresa", description: "Identifique a organização e seus responsáveis autorizados." },
      { title: "Validação documental", description: "A equipe revisará dados fiscais e condições aplicáveis." },
      { title: "Liberação comercial", description: "Ofertas aprovadas serão publicadas por região elegível." },
    ],
    fields: ["Empresa", "Documentos", "Etapa de análise", "Próxima ação"],
  },
};

export function MarketplaceModule({ title, description, backHref, accent = "forest" }: { title: string; description: string; backHref: string; accent?: "forest" | "plum" | "terra" }) {
  const spec = SPECS[title];
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme={accent} title={title} backHref={backHref} showListButton={false} />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <div className="mx-auto max-w-5xl">
          <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline focus-visible:outline-2 focus-visible:outline-forest">
            <ArrowLeft size={16} aria-hidden /> Voltar ao portal
          </Link>
          <section className="mt-5 overflow-hidden rounded-[2rem] bg-paper shadow-card ring-1 ring-line/70">
            <div className="border-b border-line p-6 sm:p-9">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-terra">
                <LockKeyhole size={15} aria-hidden /> Área empresarial protegida
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-muted sm:text-base">{description}</p>
              <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-sand p-4 text-sm font-medium leading-relaxed text-[#5c3a06]">
                <Clock3 size={19} className="mt-0.5 shrink-0" aria-hidden />
                <span><strong className="block">Módulo em preparação</strong> Esta tela demonstra o fluxo esperado. Ainda não há leitura ou gravação de operações reais.</span>
              </div>
            </div>
            {spec && (
              <div className="p-6 sm:p-9">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime-soft text-forest"><PackageSearch size={20} aria-hidden /></span>
                  <div>
                    <h2 className="text-lg font-black text-forest-deep">Como será o fluxo</h2>
                    <p className="mt-1 text-sm text-muted">{spec.note}</p>
                  </div>
                </div>
                <ol className="mt-6 grid gap-3 md:grid-cols-3">
                  {spec.steps.map((step, index) => (
                    <li key={step.title} className="rounded-2xl border border-line bg-canvas p-5">
                      <span className="text-xs font-black tabular-nums text-terra">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="mt-3 text-base font-black text-forest-deep">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                    </li>
                  ))}
                </ol>
                <section className="mt-9" aria-labelledby="fields-heading">
                  <h2 id="fields-heading" className="text-lg font-black text-forest-deep">Informações que serão apresentadas</h2>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {spec.fields.map(label => (
                      <div key={label} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-forest">
                        <CircleCheck size={17} className="shrink-0 text-terra" aria-hidden /> {label}
                      </div>
                    ))}
                  </div>
                </section>
                <div className="mt-9 rounded-2xl bg-lime-soft p-5">
                  <h2 className="text-base font-black text-forest-deep">Próxima etapa de ativação</h2>
                  <p className="mt-2 text-sm leading-relaxed text-forest">{spec.next}</p>
                  <Link href={backHref} className="mt-4 inline-flex min-h-11 items-center gap-2 font-extrabold text-forest hover:underline">
                    Voltar à visão geral <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
