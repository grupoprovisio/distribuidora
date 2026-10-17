import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert, MapPin, PackageCheck, Truck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { WRAP } from "@/lib/ui";

export const metadata: Metadata = { title: "Operação do fornecedor · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SupplierOperationsPage() {
  const client = await createClient();
  const [offers, regions, inventory] = await Promise.all([
    client.from("offers").select("id,status,supplier_org_id,supplier_product_id,valid_to").limit(250),
    client.from("offer_regions").select("offer_id,region_code").limit(500),
    client.from("inventory_positions").select("supplier_product_id,supplier_org_id,available_quantity,reserved_quantity,updated_at").limit(250),
  ]);
  const error = offers.error || regions.error || inventory.error;
  const ids = new Set((offers.data ?? []).map(offer => offer.id));
  const regionCount = new Map<string,number>();
  for (const region of regions.data ?? []) {
    if (!ids.has(region.offer_id)) continue;
    regionCount.set(region.region_code, (regionCount.get(region.region_code) ?? 0) + 1);
  }
  const sorted = [...regionCount].sort(([a],[b]) => a.localeCompare(b,"pt-BR"));
  const available = (inventory.data ?? []).filter(item => Number(item.available_quantity) - Number(item.reserved_quantity) > 0).length;
  const metrics = [
    { label: "Ofertas cadastradas", value: offers.data?.length ?? 0, icon: PackageCheck },
    { label: "Regiões configuradas", value: regionCount.size, icon: MapPin },
    { label: "Itens com saldo disponível", value: available, icon: Truck },
  ];
  return <div className="min-h-dvh bg-canvas">
    <AppHeader theme="terra" title="Regiões e prazos" backHref="/app/fornecedor" showListButton={false}/>
    <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
      <Link href="/app/fornecedor" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline"><ArrowLeft size={16} aria-hidden /> Área do fornecedor</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-terra">Operação de fornecimento</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep sm:text-4xl">Disponibilidade e cobertura</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Acompanhe regiões vinculadas às suas ofertas e posições de estoque autorizadas. Nenhuma mudança de disponibilidade é feita nesta tela.</p>
      {error ? <section role="alert" className="mt-7 rounded-3xl border border-line bg-paper p-7">
        <CircleAlert size={24} className="text-terra" aria-hidden />
        <h2 className="mt-4 text-xl font-black text-forest-deep">Não foi possível carregar sua operação</h2>
        <p className="mt-2 text-sm text-muted">Recarregue a página e, se necessário, confirme sua permissão de fornecedor.</p>
      </section> : <>
        <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Resumo operacional">
          {metrics.map(({label,value,icon:Icon}) => <article key={label} className="rounded-3xl border border-line bg-paper p-5">
            <span className="grid size-11 place-items-center rounded-2xl bg-lime-soft text-forest"><Icon size={21} aria-hidden/></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-forest-deep">{value}</p>
          </article>)}
        </section>
        <section className="mt-7 rounded-[2rem] border border-line bg-paper p-6 sm:p-9">
          <h2 className="text-xl font-black text-forest-deep">Regiões vinculadas às ofertas</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Os códigos abaixo refletem regiões cadastradas. A aceitação de pedidos ainda depende de homologação e regras adicionais de preço, estoque e entrega.</p>
          {sorted.length ? <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(([region,count]) => <li key={region} className="flex items-center gap-3 rounded-2xl border border-line p-4">
              <MapPin size={20} className="shrink-0 text-terra" aria-hidden/><span><strong className="block text-sm text-forest-deep">{region}</strong><span className="mt-1 block text-xs text-muted">{count} {count===1?"oferta":"ofertas"} vinculadas</span></span>
            </li>)}
          </ul> : <div className="mt-6 rounded-2xl bg-canvas px-6 py-9 text-center">
            <MapPin className="mx-auto text-terra" size={28} aria-hidden />
            <p className="mt-4 font-black text-forest-deep">Nenhuma região vinculada ainda</p>
            <p className="mt-2 text-sm text-muted">Após o cadastro e a aprovação das ofertas, as regiões atendidas serão exibidas aqui.</p>
          </div>}
        </section>
        <section className="mt-7 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-[#5c3a06]">
          <strong>Sem alterações operacionais automáticas.</strong> Esta visão é somente leitura e usa as permissões do fornecedor. Entrega, reserva, expedição e pedidos ainda não foram ativados.
        </section>
      </>}
    </main><SiteFooter/>
  </div>;
}
