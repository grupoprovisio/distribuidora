import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { WRAP } from "@/lib/ui";

const LINKS = [
  { href: "/empresas", label: "Para empresas" },
  { href: "/quem-somos", label: "Quem somos" },
  { href: "/entregas", label: "Entregas e regiões" },
  { href: "/contato", label: "Fale com a equipe" },
  { href: "/categorias", label: "Categorias" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className={`${WRAP} grid gap-10 py-10 sm:grid-cols-[1.3fr_1fr_1fr] sm:py-14`}>
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-forest-deep">
            <span className="grid size-9 place-items-center rounded-xl bg-forest text-sm text-lime">D</span>
            Distribuidora Provisio
          </Link>
          <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-muted">
            Abastecimento simples para negócios que precisam comprar bem, receber no prazo e voltar a comprar sem perder tempo.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-forest">
            <span className="rounded-full bg-lime-soft px-3 py-1.5">Varejo por Unidade</span>
            <span className="rounded-full bg-mist px-3 py-1.5">Compra pelo celular</span>
          </div>
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
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Atendimento</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-2"><MessageCircle size={16} className="text-forest" aria-hidden /> WhatsApp comercial</span>
            <span className="inline-flex items-center gap-2"><Phone size={16} className="text-forest" aria-hidden /> (11) 98269-8119</span>
            <span className="inline-flex items-center gap-2"><Mail size={16} className="text-forest" aria-hidden /> Contato@grupoprovisio.com</span>
            <address className="text-sm not-italic leading-relaxed">
              <span className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden />
                <span>R. Marivaldo Fernandes, 99 - Interlagos, São Paulo - SP, 04792-060</span>
              </span>
              <a
                href="https://maps.app.goo.gl/iH6NFjrzpH8H6iUS9"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-6 mt-1 inline-flex items-center gap-1 font-bold text-forest underline underline-offset-2 hover:text-forest-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                Ver no Google Maps <ArrowUpRight size={14} aria-hidden />
              </a>
            </address>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className={`${WRAP} flex flex-col gap-2 py-5 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:justify-between`}>
          <span>Distribuidora Provisio · catálogo e pedidos para o seu negócio</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/privacidade" className="hover:text-forest">Política de privacidade</Link>
            <Link href="/termos" className="hover:text-forest">Termos de uso</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
