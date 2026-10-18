import Link from "next/link";
import type { Metadata } from "next";
import { UF_CODES } from "@/lib/marketplace/brazil-regions";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import {
  addCapability, addMembership, addBuyerRegion, revokeBuyerRegion, createOrganization,
  setCapabilityStatus, setMembershipStatus, setOrganizationStatus, setProfileStatus,
} from "./actions";

export const metadata:Metadata={title:"Governança de acessos · Provisio",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

const formClass="flex flex-wrap items-end gap-2";
const inputClass="min-h-10 rounded-xl border border-line bg-white px-3 text-sm text-forest";
const buttonClass="min-h-10 rounded-full bg-forest px-4 text-sm font-bold text-white hover:bg-forest-deep";
const states={users:["active","pending","blocked"],orgs:["approved","pending","suspended"],
  members:["active","invited","revoked"],caps:["approved","pending","revoked"]} as const;

export default async function AccessAdminPage(){
  const access=await requireMarketplacePortal("admin");
  const client=await createClient();
  const [profiles,orgs,members,caps,buyerRegions]=await Promise.all([
    client.from("profiles").select("id,display_name,status").order("created_at",{ascending:false}).limit(100),
    client.from("organizations").select("id,legal_name,kind,status,is_platform_owned").order("created_at",{ascending:false}).limit(100),
    client.from("organization_members").select("id,organization_id,user_id,role,status").order("created_at",{ascending:false}).limit(100),
    client.from("organization_capabilities").select("organization_id,capability,status").limit(100),
    client.from("buyer_delivery_regions").select("buyer_org_id,region_code").order("region_code").limit(200),
  ]);
  if(profiles.error||orgs.error||members.error||caps.error||buyerRegions.error){
    return <main className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-2xl font-black text-forest">Acesso não autorizado</h1>
      <p className="mt-4 text-sm text-muted">As informações da organização não puderam ser carregadas. Confira sua sessão e MFA.</p>
    </main>;
  }
  const users=profiles.data||[],organizations=orgs.data||[],membership=members.data||[],capabilities=caps.data||[];
  const entitledBuyers=new Set(capabilities.filter(c=>c.capability==="BUYER"&&c.status==="approved").map(c=>c.organization_id));
  const buyers=organizations.filter(o=>o.kind==="BUYER"&&o.status==="approved"&&entitledBuyers.has(o.id));
  const orgNames=new Map(organizations.map(o=>[o.id,o.legal_name]));


  return <main className="mx-auto max-w-6xl px-5 py-8 pb-24">
    <Link href="/admin/marketplace" className="text-sm font-bold text-forest underline">← Administração</Link>
    <p className="mt-7 text-xs font-black uppercase tracking-widest text-terra">Grupo Provisio · MFA obrigatório</p>
    <h1 className="mt-2 text-3xl font-black text-forest-deep">Governança de acessos</h1>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
      Gerencie contas existentes, organizações e permissões. Novos usuários são convidados pelo Supabase Auth.
      Nenhum cadastro público ou papel de administrador de plataforma pode ser criado nesta interface.
      Todas as mudanças passam por RLS e auditoria privada.
    </p>
    <div className="mt-5">
      <a className="text-sm font-bold text-forest underline"
        href="https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/users"
        rel="noopener noreferrer" target="_blank">Convidar usuário pelo Supabase Auth ↗</a>
    </div>

    <section className="mt-9 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70" aria-labelledby="org-title">
      <h2 id="org-title" className="text-xl font-black text-forest-deep">Organizações ({organizations.length})</h2>
      <form action={createOrganization} className={`${formClass} mt-5`}>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Razão social / nome legal
          <input required minLength={2} maxLength={200} name="legal_name" className={inputClass}/>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Nome comercial
          <input name="trade_name" maxLength={160} className={inputClass}/>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Perfil
          <select name="kind" className={inputClass}>
            <option value="BUYER">Comprador</option><option value="SUPPLIER">Fornecedor</option>
          </select>
        </label>
        <button className={buttonClass}>Criar pendente</button>
      </form>
      <div className="mt-5 space-y-3">
        {organizations.map(org=><div key={org.id} className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div><strong className="text-sm text-forest">{org.legal_name}</strong>
              <p className="mt-1 text-xs text-muted">{org.kind} · {org.is_platform_owned?"Plataforma · ":""}{org.id}</p>
            </div>
            {org.is_platform_owned ? <span className="rounded-xl bg-lime-soft px-3 py-2 text-xs font-bold text-forest">Organização central protegida</span> : <form action={setOrganizationStatus} className={formClass}>
              <input type="hidden" name="organization_id" value={org.id}/>
              <select name="status" defaultValue={org.status} className={inputClass}>
                {states.orgs.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
              <button className={buttonClass}>Salvar</button>
            </form>}
          </div>
        </div>)}
      </div>
    </section>

    <section className="mt-6 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70" aria-labelledby="users-title">
      <h2 id="users-title" className="text-xl font-black text-forest-deep">Perfis de usuário ({users.length})</h2>
      <p className="mt-2 text-xs text-muted">O usuário recém-convidado fica pendente. Ativar perfil não atribui acesso empresarial automaticamente.</p>
      <div className="mt-5 space-y-3">{users.map(user=><div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
        <div className="min-w-0"><strong className="text-sm text-forest">{user.display_name}</strong>
          <p className="mt-1 break-all text-xs text-muted">{user.id}</p></div>
        {user.id===access.userId ? <span className="rounded-xl bg-lime-soft px-3 py-2 text-xs font-bold text-forest">Sua conta protegida</span> : <form action={setProfileStatus} className={formClass}>
          <input type="hidden" name="user_id" value={user.id}/>
          <select name="status" defaultValue={user.status} className={inputClass}>
            {states.users.map(v=><option key={v} value={v}>{v}</option>)}
          </select><button className={buttonClass}>Salvar</button>
        </form>}
      </div>)}</div>
    </section>

    <section className="mt-6 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70" aria-labelledby="cap-title">
      <h2 id="cap-title" className="text-xl font-black text-forest-deep">Capacidades comerciais ({capabilities.length})</h2>
      <form action={addCapability} className={`${formClass} mt-5`}>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Empresa
          <select name="organization_id" required className={inputClass}>
            {organizations.map(x=><option value={x.id} key={x.id}>{x.legal_name}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Capacidade
          <select name="capability" className={inputClass}>
            <option value="BUYER">Comprador</option><option value="SUPPLIER">Fornecedor</option>
          </select></label>
        <button className={buttonClass} disabled={!organizations.length}>Adicionar pendente</button>
      </form>
      <div className="mt-5 space-y-3">{capabilities.map(cap=><div key={`${cap.organization_id}-${cap.capability}`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
        <div><strong className="text-sm text-forest">{cap.capability}</strong>
          <p className="mt-1 break-all text-xs text-muted">{cap.organization_id}</p>
        </div>
        {cap.capability==="PLATFORM_OPERATOR" ? <span className="rounded-xl bg-lime-soft px-3 py-2 text-xs font-bold text-forest">Capacidade reservada</span> : <form action={setCapabilityStatus} className={formClass}>
          <input type="hidden" name="organization_id" value={cap.organization_id}/>
          <input type="hidden" name="capability" value={cap.capability}/>
          <select name="status" defaultValue={cap.status} className={inputClass}>
            {states.caps.map(v=><option key={v} value={v}>{v}</option>)}
          </select><button className={buttonClass}>Salvar</button>
        </form>}
      </div>)}</div>
    </section>

    <section className="mt-6 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70" aria-labelledby="buyer-region-title">
      <h2 id="buyer-region-title" className="text-xl font-black text-forest-deep">Regiões autorizadas de compradores</h2>
      <p className="mt-2 text-sm text-muted">
        Apenas compradores com empresa homologada e região explicitamente liberada podem consultar preços de fornecedores.
        A liberação não cria pedidos nem ativa pagamentos.
      </p>
      <form action={addBuyerRegion} className={`${formClass} mt-5`}>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Empresa compradora aprovada
          <select name="buyer_org_id" required className={inputClass}>
            {buyers.length?<option value="">Selecione uma empresa</option>:<option value="">Nenhum comprador aprovado</option>}
            {buyers.map(o=><option value={o.id} key={o.id}>{o.legal_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">UF autorizada
          <select name="region_code" required className={inputClass}>
            {UF_CODES.map(state=><option key={state} value={`BR-${state}`}>{state}</option>)}
          </select>
        </label>
        <button className={buttonClass} disabled={!buyers.length}>Autorizar região</button>
      </form>
      <div className="mt-5 space-y-3">
        {(buyerRegions.data??[]).map(r=><div key={r.buyer_org_id+":"+r.region_code}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
          <div><strong className="text-sm text-forest">{orgNames.get(r.buyer_org_id)||"Empresa não disponível"}</strong>
            <p className="mt-1 text-xs text-muted">Região: {r.region_code}</p>
          </div>
          <form action={revokeBuyerRegion} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="buyer_org_id" value={r.buyer_org_id}/>
            <input type="hidden" name="region_code" value={r.region_code}/>
            <label className="text-xs font-bold text-muted">
              <input name="confirm" type="checkbox" value="revogar" required className="mr-2" />
              Confirmo a revogação desta região
            </label>
            <button className="min-h-11 rounded-full border border-wine px-4 text-xs font-extrabold text-wine">
              Revogar região
            </button>
          </form>
        </div>)}
      </div>
    </section>

    <section className="mt-6 rounded-3xl bg-paper p-6 shadow-card ring-1 ring-line/70" aria-labelledby="members-title">
      <h2 id="members-title" className="text-xl font-black text-forest-deep">Vínculos empresariais ({membership.length})</h2>
      <form action={addMembership} className={`${formClass} mt-5`}>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Empresa
          <select name="organization_id" required className={inputClass}>
            {organizations.map(x=><option key={x.id} value={x.id}>{x.legal_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Usuário
          <select name="user_id" required className={inputClass}>
            {users.map(u=><option key={u.id} value={u.id}>{u.display_name} ({u.id.slice(0,8)})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">Papel
          <select name="role" required className={inputClass}>
            {["ORG_ADMIN","BUYER","REQUESTER","APPROVER","FINANCE","READER","SUPPLIER_ADMIN"].map(role=>
              <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <button className={buttonClass} disabled={!users.length||!organizations.length}>Criar convite interno</button>
      </form>
      <div className="mt-5 space-y-3">{membership.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
        <div><strong className="text-sm text-forest">{m.role}</strong>
          <p className="mt-1 break-all text-xs text-muted">Usuário {m.user_id} · Empresa {m.organization_id}</p>
        </div>
        {m.user_id===access.userId && m.role==="PLATFORM_ADMIN" ? <span className="rounded-xl bg-lime-soft px-3 py-2 text-xs font-bold text-forest">Vínculo administrador protegido</span> : <form action={setMembershipStatus} className={formClass}>
          <input type="hidden" name="membership_id" value={m.id}/>
          <select name="status" defaultValue={m.status} className={inputClass}>
            {states.members.map(v=><option key={v} value={v}>{v}</option>)}
          </select><button className={buttonClass}>Salvar</button>
        </form>}
      </div>)}</div>
    </section>
  </main>;
}
