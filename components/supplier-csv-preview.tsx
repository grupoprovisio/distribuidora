"use client";

import { useState, type ChangeEvent } from "react";
import { ArrowDownToLine, FileCheck2, FileWarning, UploadCloud } from "lucide-react";
import { previewAuthorizedCsv, type CsvImportPreview } from "@/lib/marketplace/csv-import";

const COLUMNS=["supplier_sku","product_name","base_unit","pack_quantity","pack_unit","base_price_minor","min_quantity","regions"] as const;
const EXAMPLE="SKU-001,Farinha de trigo,kg,1,kg,1250,5,SP|RJ";
const TEMPLATE=COLUMNS.join(",")+"\n"+EXAMPLE+"\n";
const HREF="data:text/csv;charset=utf-8,"+encodeURIComponent("\ufeff"+TEMPLATE);
const FORMAT=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const MAX_BYTES=1024*1024;

export function SupplierCsvPreview() {
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState<CsvImportPreview|null>(null);

  async function onFile(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    setName(file?.name??"");
    setResult(null);
    setError("");
    if(!file)return;
    if(file.size>MAX_BYTES) {setError("O arquivo ultrapassa 1 MB. Divida o CSV em lotes menores.");return;}
    if(!/\.csv$/i.test(file.name)) {setError("Selecione um arquivo com extensão .csv.");return;}
    setLoading(true);
    try {
      const source=await file.text();
      const preview=previewAuthorizedCsv(source,"SUPPLIER_CSV_AUTHORIZED");
      setResult(preview);
    } catch {
      setError("Não foi possível ler o arquivo neste navegador. Salve novamente como CSV UTF-8 e tente outra vez.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="mt-7 overflow-hidden rounded-[2rem] border border-line bg-paper" aria-labelledby="csv-title">
    <div className="border-b border-line p-6 sm:p-8">
      <h2 id="csv-title" className="text-xl font-black text-forest-deep">Conferir arquivo</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Use o modelo da Provisio. Os valores de preço devem estar em centavos inteiros (1250 = R$ 12,50); informe regiões como SP|RJ e quantidades numéricas.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={HREF} download="modelo_catalogo_provisio.csv" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lime-soft px-5 text-sm font-extrabold text-forest hover:bg-lime focus-visible:ring-2 focus-visible:ring-forest">
          <ArrowDownToLine size={17} aria-hidden/> Baixar modelo CSV
        </a>
      </div>
      <label htmlFor="supplier-csv-file" className="mt-6 block text-sm font-extrabold text-forest">Arquivo CSV UTF-8 (até 1 MB)</label>
      <input id="supplier-csv-file" type="file" accept=".csv,text/csv" onChange={onFile}
        className="mt-2 block w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm text-forest file:mr-3 file:rounded-full file:border-0 file:bg-forest file:px-4 file:py-2 file:font-extrabold file:text-white focus-visible:ring-2 focus-visible:ring-forest"/>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted"><UploadCloud size={15} aria-hidden/> Nenhum arquivo é enviado automaticamente.</p>
      {name&&<p className="mt-3 break-all text-xs font-semibold text-forest">Selecionado: {name}</p>}
    </div>
    {loading&&<p role="status" className="p-6 text-sm font-semibold text-muted">Conferindo colunas e dados…</p>}
    {error&&<div role="alert" className="flex gap-3 p-6 text-sm font-semibold text-wine"><FileWarning size={20} className="shrink-0" aria-hidden/>{error}</div>}
    {result&&<div className="p-6 sm:p-8">
      <div className="flex items-start gap-3">
        {result.accepted?<FileCheck2 size={24} className="shrink-0 text-forest" aria-hidden/>:<FileWarning size={24} className="shrink-0 text-terra" aria-hidden/>}
        <div role="status">
          <h3 className="text-lg font-black text-forest-deep">
            {result.accepted?"Estrutura válida para preparação":"Arquivo precisa de ajustes"}
          </h3>
          <p className="mt-2 text-sm text-muted">{result.rows.length} linhas válidas · {result.errors.length} problemas encontrados. Nenhuma oferta foi cadastrada.</p>
        </div>
      </div>
      {result.errors.length>0&&<section aria-labelledby="csv-errors" className="mt-6 rounded-2xl border border-sand bg-sand/30 p-5">
        <h4 id="csv-errors" className="text-base font-black text-forest-deep">Correções necessárias</h4>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink">
          {result.errors.slice(0,30).map((item,index)=><li key={index}>Linha {item.line}, coluna <strong>{item.field}</strong>: {item.message}</li>)}
        </ul>
        {result.errors.length>30&&<p className="mt-3 text-xs font-semibold text-muted">Mostrando os primeiros 30 problemas. Corrija e valide novamente.</p>}
      </section>}
      {result.rows.length>0&&<section aria-labelledby="csv-rows" className="mt-7">
        <h4 id="csv-rows" className="text-base font-black text-forest-deep">Prévia das linhas válidas</h4>
        <p className="mt-1 text-xs text-muted">Exibindo até 30 linhas; valores de exemplo do seu arquivo, sem publicação.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[700px] text-left">
            <thead><tr className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              {["Linha","SKU","Produto","Embalagem","Preço","Mínimo","Regiões"].map(label=><th key={label} scope="col" className="px-4 py-3">{label}</th>)}
            </tr></thead>
            <tbody>{result.rows.slice(0,30).map(item=><tr key={item.line} className="border-b border-line/70 text-sm last:border-0">
              <td className="px-4 py-3">{item.line}</td>
              <td className="px-4 py-3 font-extrabold text-forest">{item.supplierSku}</td>
              <td className="px-4 py-3">{item.productName}</td>
              <td className="px-4 py-3">{item.packQuantity} {item.packUnit}</td>
              <td className="px-4 py-3 tabular-nums">{FORMAT.format(item.basePriceMinor/100)}</td>
              <td className="px-4 py-3">{item.minQuantity}</td>
              <td className="px-4 py-3">{item.regions.join(", ")}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
      <p className="mt-7 border-t border-line pt-5 text-sm font-semibold leading-relaxed text-muted">
        {result.accepted?"O arquivo tem uma estrutura de pré-cadastro consistente. A integração de envio e homologação ficará disponível apenas após autorização administrativa.":"Nenhum cadastro ou alteração foi realizado. Corrija os problemas e selecione o CSV novamente."}
      </p>
    </div>}
    {!result&&!loading&&!error&&<div className="px-6 py-12 text-center text-sm text-muted">
      Selecione um CSV para visualizar a pré-validação. Não é necessário conectar uma planilha externa.
    </div>}
  </section>;
}
