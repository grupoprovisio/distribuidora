"use client";

import { useMemo, useState } from "react";
import { FilterX, Package, Search, ShieldAlert } from "lucide-react";

export type SupplierCatalogRow = {
  id: string;
  supplierName: string;
  productName: string;
  supplierSku: string;
  packDescription: string;
  productStatus: string;
  status: string;
  offerCount: number;
  approvedOffers: number;
  basePriceMinor: number | null;
  minQuantity: number | null;
  sourceTypes: string[];
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const labels: Record<string,string> = {
  approved: "Aprovado",
  pending: "Pendente",
  rejected: "Rejeitado",
  suspended: "Suspenso",
  active: "Ativo",
  draft: "Rascunho",
};

function statusTone(status: string) {
  if (status === "approved" || status === "active") return "bg-lime-soft text-forest";
  if (status === "pending" || status === "draft") return "bg-sand text-[#5c3a06]";
  return "bg-blush text-wine";
}

export function SupplierCatalogBrowser({ rows, page, total }: { rows: SupplierCatalogRow[]; page: number; total: number }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter(row =>
      (status === "all" || row.status === status) &&
      (!needle || [row.productName, row.supplierSku, row.supplierName]
        .some(value => value.toLocaleLowerCase("pt-BR").includes(needle)))
    );
  }, [rows, search, status]);

  return (
    <>
      <section aria-label="Resumo do catálogo" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "SKUs nesta página", value: rows.length },
          { label: "Pendentes nesta página", value: rows.filter(row => row.status === "pending").length },
          { label: "Ofertas aprovadas nesta página", value: rows.reduce((acc,row) => acc + row.approvedOffers, 0) },
        ].map(metric => <article key={metric.label} className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tabular-nums text-forest-deep">{metric.value}</p>
        </article>)}
      </section>

      <section aria-labelledby="supplier-catalog-title" className="mt-6 overflow-hidden rounded-[2rem] border border-line bg-paper">
        <div className="border-b border-line p-5 sm:p-7">
          <h2 id="supplier-catalog-title" className="text-xl font-black text-forest-deep">Produtos da sua organização</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Dados reais, somente leitura, limitados pelas permissões do seu usuário. Busca e filtros se aplicam somente aos 30 SKUs carregados nesta página. O catálogo público permanece separado até homologação.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-extrabold text-forest" htmlFor="supplier-product-search">
              Buscar produto ou SKU
              <span className="relative block">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input id="supplier-product-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
                  placeholder="Digite um produto ou código"
                  className="min-h-12 w-full rounded-xl border border-line bg-canvas pl-10 pr-4 text-base font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-forest" />
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-extrabold text-forest" htmlFor="supplier-product-status">
              Situação
              <select id="supplier-product-status" value={status} onChange={event => setStatus(event.target.value)}
                className="min-h-12 rounded-xl border border-line bg-canvas px-4 text-base font-semibold text-forest focus-visible:ring-2 focus-visible:ring-forest">
                <option value="all">Todas</option><option value="approved">Aprovados</option>
                <option value="pending">Pendentes</option><option value="rejected">Rejeitados</option>
                <option value="suspended">Suspensos</option>
              </select>
            </label>
          </div>
        </div>
        <p className="px-5 py-3 text-xs font-semibold text-muted" role="status" aria-live="polite">Página {page} · {total} SKUs autorizados no total · {filtered.length} resultado(s) nos filtros desta página</p>
        {filtered.length ? (
          <>
          <div className="grid gap-3 p-4 md:hidden" aria-label="Produtos desta página em cartões">
            {filtered.map(row => (
              <article key={row.id} className="min-w-0 rounded-2xl border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-black text-forest-deep">{row.productName}</h3>
                    <p className="mt-1 break-words text-xs text-muted">{row.supplierName}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusTone(row.status)}`}>
                    {labels[row.status] ?? row.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-line pt-4 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-muted">SKU</dt>
                    <dd className="mt-1 break-all font-extrabold text-forest">{row.supplierSku}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-muted">Embalagem</dt>
                    <dd className="mt-1 break-words font-semibold text-ink">{row.packDescription}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">Ofertas</dt>
                    <dd className="mt-1 font-black tabular-nums text-forest-deep">{row.offerCount}</dd>
                    <dd className="text-xs text-muted">{row.approvedOffers} aprovadas</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted">Preço base</dt>
                    <dd className="mt-1 font-black tabular-nums text-forest-deep">
                      {row.basePriceMinor === null ? "—" : money.format(row.basePriceMinor / 100)}
                    </dd>
                    <dd className="text-xs text-muted">
                      {row.basePriceMinor === null ? "Sem oferta cadastrada" : `Mínimo ${row.minQuantity ?? 1} un.`}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[730px] border-collapse text-left">
              <thead><tr className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                {["Produto / fornecedor","SKU e embalagem","Homologação","Ofertas","Preço base"].map(label =>
                  <th key={label} scope="col" className="px-5 py-4 font-extrabold">{label}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} className="border-b border-line/80 align-top last:border-none">
                    <td className="px-5 py-4"><strong className="block text-sm text-forest-deep">{row.productName}</strong>
                      <span className="mt-1 block text-xs text-muted">{row.supplierName}</span>
                    </td>
                    <td className="px-5 py-4"><span className="text-sm font-bold text-forest">{row.supplierSku}</span>
                      <span className="mt-1 block text-xs text-muted">{row.packDescription}</span></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusTone(row.status)}`}>
                      {labels[row.status] ?? row.status}</span></td>
                    <td className="px-5 py-4"><span className="text-sm font-black tabular-nums text-forest-deep">{row.offerCount}</span>
                      <span className="mt-1 block text-xs text-muted">{row.approvedOffers} aprovadas</span></td>
                    <td className="px-5 py-4"><span className="text-sm font-bold tabular-nums text-forest-deep">
                      {row.basePriceMinor === null ? "—" : money.format(row.basePriceMinor / 100)}
                    </span><span className="mt-1 block text-xs text-muted">
                      {row.basePriceMinor === null ? "Sem oferta cadastrada" : `Mínimo ${row.minQuantity ?? 1} un.`}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-lime-soft text-forest">
              {rows.length ? <FilterX size={28} aria-hidden /> : <Package size={28} aria-hidden />}
            </span>
            <h3 className="mt-5 text-xl font-black text-forest-deep">
              {rows.length ? "Nenhum produto corresponde aos filtros" : "Seu catálogo ainda não tem produtos"}
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
              {rows.length
                ? "Ajuste os filtros ou navegue para outra página. A busca considera apenas os SKUs desta página."
                : "Após a homologação, os produtos e as ofertas autorizadas da sua organização aparecerão aqui. Não são exibidos dados de outros fornecedores."}
            </p>
            {rows.length ? <button type="button" onClick={() => { setSearch(""); setStatus("all"); }}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-black text-white focus-visible:ring-2 focus-visible:ring-forest">
              Limpar filtros</button> : null}
          </div>
        )}
        <div className="flex items-start gap-3 border-t border-line bg-canvas p-5 text-xs leading-relaxed text-muted">
          <ShieldAlert size={18} className="shrink-0 text-terra" aria-hidden />
          <p><strong>Sem publicação automática:</strong> aprovar um produto não substitui a autorização da oferta, sua vigência, procedência e região. Esta listagem não permite criar pedidos ou pagamentos.</p>
        </div>
      </section>
    </>
  );
}
