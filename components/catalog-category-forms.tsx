"use client";
import {useActionState} from "react";
import {createCategory,assignCategory,type CategoryFeedback} from "@/app/admin/marketplace/cadastro/category-actions";
const init:CategoryFeedback={status:"idle",message:""};
export function CatalogCategoryForms({categories,products}:{categories:{id:string;name:string}[];products:{id:string;name:string}[]}){
 const [created,create,pendingCreate]=useActionState(createCategory,init);
 const [linked,link,pendingLink]=useActionState(assignCategory,init);
 return <section className="mt-7 rounded-3xl border border-line bg-paper p-6">
  <h2 className="text-xl font-black text-forest-deep">Categorias comerciais</h2>
  <p className="mt-2 text-sm text-muted">Crie uma categoria e vincule aos produtos cadastrados. Cadastro restrito a ADM com MFA.</p>
  <div className="mt-5 grid gap-6 md:grid-cols-2">
   <form action={create} className="grid content-start gap-3">
    <label className="text-sm font-bold">Categoria<input name="name" minLength={2} maxLength={80} required placeholder="Hortifruti" className="mt-2 w-full rounded-xl border border-line p-3"/></label>
    <label className="text-sm font-bold">Identificador<input name="slug" maxLength={100} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="hortifruti" className="mt-2 w-full rounded-xl border border-line p-3"/></label>
    <button disabled={pendingCreate} className="rounded-full bg-forest px-5 py-3 font-bold text-white disabled:opacity-50">{pendingCreate?"Cadastrando...":"Criar categoria"}</button>
    {created.message&&<p role={created.status==="error"?"alert":"status"} className="text-sm">{created.message}</p>}
   </form>
   <form action={link} className="grid content-start gap-3">
    <label className="text-sm font-bold">Produto<select name="product_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-line p-3"><option value="" disabled>Selecionar produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="text-sm font-bold">Categoria<select name="category_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-line p-3"><option value="" disabled>Selecionar categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <button disabled={pendingLink||!categories.length||!products.length} className="rounded-full bg-forest px-5 py-3 font-bold text-white disabled:opacity-50">{pendingLink?"Vinculando...":"Vincular categoria"}</button>
    {linked.message&&<p role={linked.status==="error"?"alert":"status"} className="text-sm">{linked.message}</p>}
   </form>
  </div>
 </section>;
}
