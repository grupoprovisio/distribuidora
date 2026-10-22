"use client";
import {useActionState} from "react";
import {submitSupplierProduct} from "@/app/app/fornecedor/catalogo/submit-actions";
const initial={status:"idle" as const,message:""};
const field="mt-1 block w-full rounded-xl border border-line bg-canvas p-3 text-base";
export function SupplierProductRequest({organizations}:{organizations:{id:string;name:string}[]}){
 const [state,action,pending]=useActionState(submitSupplierProduct,initial);
 return <section className="mb-7 rounded-3xl border border-line bg-paper p-6">
  <h2 className="text-xl font-black text-forest-deep">Solicitar cadastro de produto</h2>
  <p className="mt-2 text-sm text-muted">Somente administradores da empresa fornecedora. Os dados ficam pendentes de revisao da Provisio, sem oferta publica.</p>
  <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-bold">Empresa<select className={field} name="supplier_org_id" required defaultValue=""><option value="" disabled>Selecione sua empresa</option>{organizations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   <label className="text-sm font-bold">SKU<input className={field} name="supplier_sku" maxLength={100} required/></label>
   <label className="text-sm font-bold">Nome do produto<input className={field} name="product_name" minLength={2} maxLength={160} required/></label>
   <label className="text-sm font-bold">Unidade base<select className={field} name="base_unit"><option value="un">Unidade</option><option value="kg">Quilograma</option><option value="l">Litro</option></select></label>
   <label className="text-sm font-bold">Quantidade por embalagem<input className={field} name="pack_quantity" type="number" step=".001" min=".001" defaultValue="1" required/></label>
   <label className="text-sm font-bold">Unidade embalagem<select className={field} name="pack_unit"><option value="un">Unidade</option><option value="kg">Quilograma</option><option value="l">Litro</option></select></label>
   <label className="text-sm font-bold">Preco em centavos<input className={field} name="base_price_minor" type="number" min="1" step="1" placeholder="1250 = R$ 12,50" required/></label>
   <label className="text-sm font-bold">Estoque disponivel<input className={field} name="available_quantity" type="number" step=".001" min="0" defaultValue="0" required/></label>
   <button type="submit" disabled={pending||!organizations.length} className="min-h-12 rounded-full bg-forest px-6 font-extrabold text-white disabled:opacity-50 sm:col-span-2">{pending?"Enviando...":"Enviar para homologacao"}</button>
   {state.message&&<p className="text-sm sm:col-span-2" role={state.status==="error"?"alert":"status"}>{state.message}</p>}
  </form>
 </section>;
}
