import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAuthEnabled } from "@/lib/supabase/config";

export type Portal = "comprador" | "fornecedor" | "vendedor" | "admin";
type Role = "ORG_ADMIN" | "BUYER" | "REQUESTER" | "APPROVER" | "FINANCE" |
  "READER" | "SUPPLIER_ADMIN" | "SELLER" | "PLATFORM_ADMIN";
type Capability = "BUYER" | "SUPPLIER" | "PLATFORM_OPERATOR";

const PORTAL_ACCESS: Record<Portal, { capability: Capability; roles: Role[] }> = {
  comprador: { capability: "BUYER", roles: ["ORG_ADMIN","BUYER","REQUESTER","APPROVER","FINANCE","READER","PLATFORM_ADMIN"] },
  fornecedor: { capability: "SUPPLIER", roles: ["ORG_ADMIN","SUPPLIER_ADMIN","PLATFORM_ADMIN"] },
  vendedor: { capability: "SUPPLIER", roles: ["SELLER","PLATFORM_ADMIN"] },
  admin: { capability: "PLATFORM_OPERATOR", roles: ["PLATFORM_ADMIN"] },
};

export async function getMarketplaceAccess() {
  if (!supabaseAuthEnabled()) return null;
  const client = await createClient();
  // getUser() consulta Supabase Auth; cookie/session client-side nao implica permissao.
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || user.is_anonymous) return null;
  const { data: profile, error: profileError } = await client
    .from("profiles").select("id,status").eq("id", user.id).maybeSingle();
  if (profileError || profile?.status !== "active") return null;
  const { data: members, error: membersError } = await client
    .from("organization_members")
    .select("organization_id,role,status")
    .eq("user_id",user.id).eq("status","active").limit(100);
  if (membersError || !members?.length) return null;
  const orgIds=[...new Set(members.map(member=>member.organization_id))];
  const [orgResult,capResult]=await Promise.all([
    client.from("organizations").select("id,status").in("id",orgIds),
    client.from("organization_capabilities").select("organization_id,capability,status")
      .in("organization_id",orgIds),
  ]);
  if (orgResult.error || capResult.error) return null;
  const approvedOrgs = new Set((orgResult.data??[])
    .filter(org=>org.status==="approved").map(org=>org.id));
  const activeCaps = new Set((capResult.data??[])
    .filter(cap=>cap.status==="approved")
    .map(cap=>`${cap.organization_id}:${cap.capability}`));
  const allowed = (Object.keys(PORTAL_ACCESS) as Portal[]).filter(portal => {
    const { capability, roles } = PORTAL_ACCESS[portal];
    return members.some(member=>approvedOrgs.has(member.organization_id)
      && activeCaps.has(`${member.organization_id}:${capability}`)
      && roles.includes(member.role as Role));
  });
  return { userId: user.id, email: user.email ?? "", allowed };
}

export async function requireMarketplaceLogin() {
  if (!supabaseAuthEnabled()) redirect("/entrar");
  const access = await getMarketplaceAccess();
  if (!access) {
    // Ausencia de sessao e falta de homologacao sao estados diferentes.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) redirect("/entrar");
    redirect("/acesso-pendente");
  }
  return access;
}
export async function requireMarketplacePortal(portal: Portal) {
  const access = await requireMarketplaceLogin();
  if (!access.allowed.includes(portal)) redirect("/acesso-restrito");
  if (portal === "admin") {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || data.currentLevel !== "aal2") redirect("/seguranca/mfa");
  }
  return access;
}
