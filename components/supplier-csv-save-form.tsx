"use client";
import { useActionState, useState, type ChangeEvent } from "react";
import { saveSupplierCsv, type ImportFeedback } from "@/app/admin/marketplace/importar/actions";
import { previewAuthorizedCsv } from "@/lib/marketplace/csv-import";

const initial:ImportFeedback={status:"idle",message:""};
export function SupplierCsvSaveForm({suppliers}:{suppliers:{id:string;name:string}[]}){
  const [state,action,pending]=useActionState(saveSupplierCsv,initial);
  const [csv,setCsv]=useState("");
  const [valid,setValid]=useState("");
  async function choose(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    setCsv("");setValid("");
    if(!file)return;
    if(file.size>1024*1024){setValid("Arquivo acima de 1 MB.");return;}
    const raw=await file.text();
    const check=previewAuthorizedCsv(raw);
    setValid(check.accepted?`${check.rows.length} linhas válidas para cadastro. Limite de 50 por envio.`:`${check.errors.length} erros de validação. Corrija o CSV.`);
    if(check.accepted && check.rows.length<=50)setCsv(raw);
  }
  return <form action={action} className="mt-8 space-y-5 rounded-3xl border border-line bg-paper p-6">
    <label className="block text-sm font-bold">Organização fornecedora
      <select name="supplier_org_id" required className="mt-2 block w-full rounded-xl border border-line p-3" defaultValue="">
        <option value="" disabled>Selecionar fornecedor</option>
        {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
    <label className="block text-sm font-bold">Planilha CSV preenchida
      <input className="mt-2 block w-full rounded-xl border border-line p-3" type="file" accept=".csv,text/csv" onChange={choose}/>
    </label>
    <input type="hidden" name="csv" value={csv}/>
    {valid&&<p className="text-sm" role="status">{valid}</p>}
    {state.message&&<p className="rounded-xl bg-canvas p-4 text-sm" role="status">{state.message}</p>}
    <button className="rounded-xl bg-forest px-6 py-3 font-bold text-white disabled:opacity-50" disabled={pending||!csv||!suppliers.length} type="submit">
      {pending?"Salvando...":"Salvar produtos no Supabase"}
    </button>
  </form>;
}
