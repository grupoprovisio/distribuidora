import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { SupplierCompanyEditor } from "@/components/supplier-company-editor";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Homologação de fornecedor · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const statuses: Record<string,string> = {
  approved: "Aprovado", pending: "Em análise", suspended: "Suspenso",
  revoked: "Revogado", rejected: "Rejeitado", active: "Ativo", invited: "Convidado",
};
function tone(status: string) {
  return status === "approved" || status === "active" ? "bg-lime-soft text-forest"
    : status === "pending" || status === "invited" ? "bg-sand text-[#5c3a06]" : "bg-blush text-wine";
}

export default async function SupplierApprovalPage() {
  const access=await requireMarketplacePortal("fornecedor");
  const client = await createClient();
  const assurance=access.allowed.includes("admin")
    ?await client.auth.mfa.getAuthenticatorAssuranceLevel():null;
  const canEdit=!!(assurance&&!assurance.error&&assurance.data.currentLevel==="aal2");
  const [organizations, capabilities, supplierProducts, offers] = await Promise.all([
    client.from("organizations").select("id,legal_name,trade_name,kind,status").limit(100),
    client.from("organization_capabilities").select("organization_id,capability,status").eq("capability","SUPPLIER").limit(100),
    client.from("supplier_products").select("id,supplier_org_id,status").limit(200),
    client.from("offers").select("id,supplier_org_id,status").limit(400),
  ]);
  const error = organizations.error || capabilities.error || supplierProducts.error || offers.error;
  const supplierIds = new Set((capabilities.data ?? []).map(entry=>entry.organization_id));
  const companies = (organizations.data ?? []).filter(org => supplierIds.has(org.id));
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Homologação" backHref="/app/fornecedor" showListButton={false}/>
    <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
      <Link href="/app/fornecedor" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline"><ArrowLeft size={16} aria-hidden /> Área do fornecedor</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-terra">Conformidade e acesso</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">Situação da homologação</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Consulte a situação comercial da sua empresa e dos seus produtos, sem acesso às informações privadas de outros fornecedores. Administradores da Provisio com MFA podem atualizar os nomes cadastrais das empresas.</p>
      {error ? <div role="alert" className="mt-7 rounded-3xl bg-paper p-7 ring-1 ring-line">
        <h2 className="text-lg font-black text-forest-deep">Não foi possível consultar a homologação</h2>
        <p className="mt-2 text-sm text-muted">Verifique a sessão e tente novamente. Nenhum dado parcial será exibido.</p>
      </div> : <>
        {companies.length ? <section className="mt-7 grid gap-4 md:grid-cols-2" aria-label="Organizações fornecedoras">
          {companies.map(org => {
            const cap = (capabilities.data ?? []).find(item => item.organization_id === org.id);
            const products = (supplierProducts.data ?? []).filter(item => item.supplier_org_id === org.id);
            const orgOffers = (offers.data ?? []).filter(item => item.supplier_org_id === org.id);
            return <article key={org.id} data-company-id={org.id} className="rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-lime-soft text-forest"><Building2 size={23} aria-hidden /></span>
              <h2 className="mt-5 text-xl font-black text-forest-deep">{org.trade_name || org.legal_name}</h2>
              <p className="mt-1 text-xs text-muted">{org.legal_name}</p>
              <div className="mt-6 grid gap-3">
                {[
                  ["Situação da empresa",org.status],
                  ["Acesso como fornecedor",cap?.status ?? "pending"],
                ].map(([label,status]) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
                  <span className="text-sm font-semibold text-muted">{label}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${tone(status)}`}>{statuses[status] ?? status}</span>
                </div>)}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-muted">Produtos vinculados</p><p className="mt-1 text-2xl font-black tabular-nums">{products.length}</p></div>
                <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-muted">Ofertas cadastradas</p><p className="mt-1 text-2xl font-black tabular-nums">{orgOffers.length}</p></div>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted">Produtos pendentes: {products.filter(item => item.status === "pending").length}. Ofertas pendentes: {orgOffers.filter(item => item.status === "pending").length}.</p>
              {canEdit&&<SupplierCompanyEditor key={org.id}
                organizationId={org.id} legalName={org.legal_name} tradeName={org.trade_name}/>}
            </article>;
          })}
        </section> : <section className="mt-7 rounded-3xl border border-line bg-paper p-7 text-center">
          <BadgeCheck className="mx-auto text-terra" size={30} aria-hidden />
          <h2 className="mt-4 text-xl font-black text-forest-deep">Nenhuma empresa fornecedora vinculada</h2>
          <p className="mt-2 text-sm text-muted">A homologação e o acesso precisam ser configurados pela administração da Provisio.</p>
        </section>}
        <section className="mt-7 grid gap-3 md:grid-cols-3" aria-label="Etapas necessárias">
          {[
            { icon: Building2, title: "Cadastro empresarial", text: "Empresa com identidade própria e responsáveis autorizados." },
            { icon: ShieldCheck, title: "Aprovação comercial", text: "Capacidade de fornecedor concedida pela administração." },
            { icon: ClipboardCheck, title: "Produtos e ofertas", text: "Revisão de origem, condições comerciais e publicação autorizada." },
          ].map(({icon:Icon,title,text}) => <div key={title} className="rounded-3xl border border-line bg-paper p-5">
            <Icon size={22} className="text-terra" aria-hidden /><h3 className="mt-4 font-black text-forest-deep">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </div>)}
        </section>
      </>}
      <p className="mt-7 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-[#5c3a06]">
        {canEdit?"Edição cadastral disponível apenas para administradores com MFA. Aprovações, permissões e CNPJ não podem ser alterados aqui.":
          "Consulta somente leitura. Para editar nomes empresariais, acesse com uma conta ADM e autenticação em duas etapas."}
        {" "}Não envie documentação sensível por este painel até a ativação do fluxo documental seguro.
      </p>
    </main>
    <SiteFooter />
  </div>;
}
