import { IdCard, MapPin, Phone, ReceiptText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { brl } from "@/lib/format";
import type { Profile } from "@/lib/vtex-auth";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const card = "rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6";

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-forest">
        <Icon size={16} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm font-bold">{value || "Não informado"}</p>
      </div>
    </li>
  );
}

/** Dados pessoais da conta logada. CPF e telefone já chegam mascarados do servidor. */
export function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-4">
      <section className={card} aria-label="Dados pessoais">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-lime text-2xl font-extrabold text-forest-deep">
            {initials(profile.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold tracking-tight">{profile.name}</h2>
            <p className="truncate text-sm font-medium text-muted">{profile.email}</p>
          </div>
        </div>
        <ul className="mt-3 divide-y divide-line">
          <Row icon={IdCard} label="CPF" value={profile.documentMasked} />
          <Row icon={Phone} label="Telefone" value={profile.phoneMasked} />
        </ul>
        <p className="mt-1 text-[11px] font-medium text-muted">CPF e telefone aparecem parcialmente ocultos por segurança.</p>
      </section>

      <section className={card} aria-label="Endereços">
        <h2 className="text-sm font-extrabold">Endereços</h2>
        {profile.addresses.length > 0 ? (
          <ul className="mt-2 divide-y divide-line">
            {profile.addresses.map((a, i) => (
              <li key={i} className="flex gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-forest">
                  <MapPin size={16} aria-hidden />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-bold">{a.label}</p>
                  <p className="font-medium text-muted">{[a.street, a.district].filter(Boolean).join(" · ")}</p>
                  <p className="font-medium text-muted">{[a.city, a.postalCode].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-medium text-muted">Nenhum endereço salvo.</p>
        )}
      </section>

      <section className={card} aria-label="Pedidos recentes">
        <h2 className="text-sm font-extrabold">Pedidos recentes</h2>
        {profile.orders.length > 0 ? (
          <ul className="mt-2 divide-y divide-line">
            {profile.orders.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-forest">
                  <ReceiptText size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">Pedido {o.id}</p>
                  <p className="text-xs font-medium text-muted">
                    {o.date ? new Date(o.date).toLocaleDateString("pt-BR") : ""}
                    {o.status ? ` · ${o.status}` : ""}
                  </p>
                </div>
                <p className="text-sm font-extrabold tabular-nums">{brl(o.total)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-medium text-muted">Nenhum pedido encontrado.</p>
        )}
      </section>

      <LogoutButton />
    </div>
  );
}
