"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { saveSupplierCompanyProfile, type CompanyProfileFeedback } from "@/app/app/fornecedor/homologacao/actions";

type Props={organizationId:string;legalName:string;tradeName:string|null};
const initial:CompanyProfileFeedback={status:"idle",message:""};
const input="min-h-11 w-full min-w-0 rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-forest";

function CompanyForm({organizationId,legalName,tradeName,onClose}:Props&{onClose:()=>void}){
  const router=useRouter();
  const [result,action,pending]=useActionState(saveSupplierCompanyProfile,initial);
  useEffect(()=>{
    if(result.status==="success")router.refresh();
  },[result.status,router]);
  if(result.status==="success")return <div className="grid gap-3">
    <p role="status" className="rounded-xl bg-lime-soft p-3 text-xs font-bold text-forest">{result.message}</p>
    <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-4 text-xs font-bold text-forest">
      Concluir edição
    </button>
  </div>;
  return <form action={action} className="grid gap-3" aria-label={"Editar cadastro de "+(tradeName||legalName)}>
    <input type="hidden" name="organization_id" value={organizationId}/>
    <label className="grid gap-1 text-xs font-bold text-forest">
      Razão social / nome legal
      <input name="legal_name" required minLength={2} maxLength={200}
        defaultValue={legalName} autoComplete="organization" className={input}/>
    </label>
    <label className="grid gap-1 text-xs font-bold text-forest">
      Nome fantasia / nome exibido
      <input name="trade_name" maxLength={160} defaultValue={tradeName??""}
        autoComplete="off" className={input}/>
    </label>
    <p className="text-xs leading-relaxed text-muted">
      Apenas os nomes serão alterados. CNPJ, tipo da empresa, homologação e permissões permanecem protegidos.
    </p>
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 text-xs font-extrabold text-white disabled:opacity-60">
        <Save size={15} aria-hidden/>{pending?"Salvando...":"Salvar dados cadastrais"}
      </button>
      <button type="button" disabled={pending} onClick={onClose}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-xs font-bold text-forest disabled:opacity-60">
        <X size={15} aria-hidden/> Cancelar
      </button>
    </div>
    {result.status==="error"&&<p role="alert" className="rounded-xl bg-blush p-3 text-xs font-bold text-wine">{result.message}</p>}
  </form>;
}

export function SupplierCompanyEditor({organizationId,legalName,tradeName}:Props){
  const [editing,setEditing]=useState(false);
  return <div className="mt-5 border-t border-line pt-4">
    {!editing?<button type="button" onClick={()=>setEditing(true)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest px-4 text-xs font-extrabold text-forest hover:bg-lime-soft">
      <Pencil size={15} aria-hidden/> Editar dados cadastrais
    </button>:<CompanyForm organizationId={organizationId} legalName={legalName} tradeName={tradeName}
      onClose={()=>setEditing(false)}/>}
  </div>;
}
