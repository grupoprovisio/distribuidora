import { BadgePercent } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FilialCardText } from "@/components/filial-chip";
import { PromoView } from "@/components/promo-view";
import { WRAP } from "@/lib/ui";

export const metadata = { title: "Promoções · Distribuidora" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const ORDERS = ["pct", "save", "price", "near"] as const;

export default async function PromocoesPage(props: PageProps<"/promocoes">) {
  const sp = await props.searchParams;
  const colecao = /^\d{1,6}$/.test(first(sp.colecao)) ? first(sp.colecao) : undefined;
  const depto = /^[a-z0-9-]{1,80}$/.test(first(sp.depto)) ? first(sp.depto) : undefined;
  const ordemRaw = first(sp.ordem);
  const ordem = (ORDERS as readonly string[]).includes(ordemRaw) ? (ordemRaw as (typeof ORDERS)[number]) : "pct";

  return (
    <>
      <AppHeader theme="plum" title="Promoções">
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-forest-deep">
            <BadgePercent size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 [&_p:first-child]:text-white [&_p:last-child]:text-white/70">
            <FilialCardText />
          </div>
        </div>
      </AppHeader>
      <main className={`${WRAP} pt-2`}>
        <PromoView colecao={colecao} depto={depto} ordem={ordem} />
      </main>
    </>
  );
}
