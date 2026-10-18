import Link from "next/link";
import { Activity, Building2, ClipboardList, PackageSearch, ShieldCheck, Store, ListChecks } from "lucide-react";

const ITEMS = [
  ["/admin", "Visão geral", ClipboardList],
  ["/admin/marketplace", "Marketplace", Store],
  ["/admin/acessos", "Acessos e empresas", Building2],
  ["/admin/marketplace/homologacoes", "Homologações", ListChecks],
  ["/admin/marketplace/catalogo", "Catálogo pendente", PackageSearch],
  ["/admin/marketplace/prontidao", "Prontidão", Activity],
  ["/admin/marketplace/cadastro", "Cadastrar produtos", PackageSearch],
  ["/produtos", "Produtos autorizados", PackageSearch],
  ["/seguranca/mfa", "Segundo fator", ShieldCheck],
] as const;

export function AdminNav() {
  return <nav aria-label="Navegação administrativa" className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 xl:grid-cols-5">
    {ITEMS.map(([href,label,Icon])=><Link key={href} href={href} className="inline-flex min-w-max items-center justify-center gap-2 rounded-2xl bg-paper px-4 py-3 text-xs font-extrabold text-muted shadow-card ring-1 ring-line/70 transition-colors hover:bg-lime-soft hover:text-forest focus-visible:ring-2 focus-visible:ring-forest">
      <Icon size={16} aria-hidden/> {label}
    </Link>)}
  </nav>;
}
