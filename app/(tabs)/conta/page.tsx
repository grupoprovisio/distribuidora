import Link from "next/link";
import { cookies } from "next/headers";
import { Building2, ChevronRight, CreditCard, Heart, QrCode, ShoppingBasket, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { LoginForm } from "@/components/login-form";
import { LogoutButton } from "@/components/logout-button";
import { ProfileView } from "@/components/profile-view";
import { PendingBanner, PurchasesShortcut, PurchasesSync } from "@/components/purchases-shortcut";
import { SectionTitle } from "@/components/section";
import { WRAP } from "@/lib/ui";
import { getProfile, SESSION_COOKIE } from "@/lib/vtex-auth";

export const metadata = { title: "Conta · Distribuidora" };

// Favoritos saiu da barra flutuante e mora aqui, junto dos outros atalhos.
const SHORTCUTS: { href: string; label: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { href: "/conta/configuracoes", label: "Configurações", hint: "Filial, comparação e modelo de compra", icon: SlidersHorizontal, tone: "bg-sand text-[#8a5a12]" },
  { href: "/favoritos", label: "Favoritos", hint: "Produtos que você acompanha", icon: Heart, tone: "bg-blush text-[#a02a4a]" },
  { href: "/lista", label: "Minha lista", hint: "Compare o total entre filiais", icon: ShoppingBasket, tone: "bg-lime-soft text-forest" },
  { href: "/scan", label: "Escanear código", hint: "QR code ou código de barras", icon: QrCode, tone: "bg-mist text-[#24628f]" },
];

export default async function ContaPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = token ? await getProfile(token) : undefined;

  return (
    <>
      <AppHeader theme="forest" title="Conta" />

      <main className={`${WRAP} pt-2`}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div>
            {result?.status !== "error" ? <PurchasesSync email={result?.status === "ok" ? result.profile.email : null} /> : null}
            {result?.status === "ok" ? <PendingBanner /> : null}
            {result?.status === "ok" ? (
              <ProfileView profile={result.profile} />
            ) : result?.status === "error" ? (
              <div className="space-y-4">
                <p className="rounded-3xl bg-sand px-5 py-4 text-sm font-bold text-[#5c3a06]">
                  Não consegui carregar sua conta agora. Tente de novo em instantes.
                </p>
                <LogoutButton />
              </div>
            ) : (
              <LoginForm notice={token ? "Sua sessão expirou. Entre novamente." : undefined} />
            )}
          </div>

          <aside aria-label="Atalhos">
            <section className="mb-4 rounded-[2rem] bg-forest p-5 text-white shadow-card" aria-label="Perfil comercial">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white/12 text-lime"><Building2 size={19} aria-hidden /></span><div><p className="text-xs font-black uppercase tracking-[0.12em] text-white/60">Perfil comercial</p><p className="text-sm font-extrabold">Configure sua empresa</p></div></div>
              <dl className="mt-5 grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl bg-white/10 p-3"><dt className="font-semibold text-white/60">Tabela</dt><dd className="mt-1 font-extrabold">Padrão</dd></div><div className="rounded-2xl bg-white/10 p-3"><dt className="font-semibold text-white/60">Crédito</dt><dd className="mt-1 font-extrabold">A definir</dd></div></dl>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-white/65"><CreditCard size={13} aria-hidden /> Condições liberadas após análise cadastral.</p>
            </section>
            <SectionTitle>Atalhos</SectionTitle>
            <ul className="divide-y divide-line overflow-hidden rounded-[2rem] bg-paper shadow-card ring-1 ring-line/70">
              <PurchasesShortcut />
              {SHORTCUTS.map(({ href, label, hint, icon: Icon, tone }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas active:bg-canvas">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold">{label}</span>
                      <span className="block truncate text-xs font-medium text-muted">{hint}</span>
                    </span>
                    <ChevronRight size={18} className="text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </>
  );
}
