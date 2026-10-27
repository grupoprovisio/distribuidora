import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { WRAP } from "@/lib/ui";

const LINKS = [
  { href: "/compradores", label: "Sou comprador" },
  { href: "/fornecedores", label: "Sou fornecedor" },
  { href: "/produtos", label: "Catálogo autorizado" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/contato", label: "Contato" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className={`${WRAP} grid gap-10 py-10 sm:grid-cols-[1.3fr_1fr_1fr] sm:py-14`}>
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-forest-deep">
            <span className="grid size-9 place-items-center rounded-xl bg-forest text-sm text-lime">P</span>
            Grupo Provisio
          </Link>
          <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-muted">
            Distribuidora própria e marketplace B2B em desenvolvimento, com participação de fornecedores homologados.
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Explore</p>
          <nav className="mt-4 grid gap-3 text-sm font-bold text-ink" aria-label="Links institucionais">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="inline-flex items-center gap-1 transition-colors hover:text-forest">
                {link.label} <ArrowUpRight size={14} aria-hidden />
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Fale com a Provisio</p>
          <Link href="/contato" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline">
            <Mail size={16} aria-hidden /> Página de contato
          </Link>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Condições comerciais, áreas de atendimento e logística serão divulgadas após homologação.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className={`${WRAP} flex flex-col gap-2 py-5 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:justify-between`}>
          <span>Grupo Provisio · Distribuidora e marketplace B2B</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/privacidade" className="hover:text-forest">Privacidade</Link>
            <Link href="/termos-marketplace" className="hover:text-forest">Termos do marketplace</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
