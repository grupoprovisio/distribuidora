import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupplierCsvSaveForm } from "@/components/supplier-csv-save-form";

export const dynamic="force-dynamic";
export default async function ImportAdminPage(){
  const db=await createClient();
  const [orgs,caps]=await Promise.all([
    db.from("organizations").select("id,legal_name,trade_name,kind,status").eq("status","approved"),
    db.from("organization_capabilities").select("organization_id,status").eq("capability","SUPPLIER").eq("status","approved")
  ]);
  const eligible=new Set((caps.data??[]).map(x=>x.organization_id));
  const suppliers=(orgs.data??[]).filter(x=>eligible.has(x.id)&&["SUPPLIER","PLATFORM_OPERATOR"].includes(x.kind))
    .map(x=>({id:x.id,name:x.trade_name||x.legal_name}));
  return <main className="mx-auto max-w-3xl px-5 py-10 text-forest-deep">
    <Link href="/app/fornecedor/importar" className="text-sm font-bold underline">Voltar à pré-validação</Link>
    <h1 className="mt-6 text-3xl font-black">Salvar catálogo CSV no Supabase</h1>
    <p className="mt-3 text-sm text-muted">Cadastro administrativo protegido por MFA. Produtos ficam em rascunho, SKUs pendentes de homologação; preços e ofertas NÃO são publicados automaticamente.</p>
    {orgs.error||caps.error?<p role="alert">Não foi possível consultar fornecedores autorizados.</p>:<SupplierCsvSaveForm suppliers={suppliers}/>}
    <p className="mt-6 text-sm">Após salvar, acesse <Link href="/admin/marketplace/cadastro" className="font-bold underline">Cadastro comercial</Link> para homologar e criar ofertas.</p>
  </main>;
}
