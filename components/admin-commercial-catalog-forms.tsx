"use client";

import { useActionState } from "react";
import {
  activateProduct,approveOffer,approveSupplierSku,createDraftProduct,
  createPendingOffer,createPendingSku,setInventory,type Feedback
} from "@/app/admin/marketplace/cadastro/actions";

export type CatalogOption={id:string;label:string};
export type AdminCommercialOptions={
  suppliers:CatalogOption[];products:CatalogOption[];draftProducts:CatalogOption[];
  pendingSkus:CatalogOption[];approvedSkus:CatalogOption[];pendingOffers:CatalogOption[];
};

const first:Feedback={status:"idle",message:""};
const input="min-h-12 w-full rounded-xl border border-line bg-canvas px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-forest";
const btn="min-h-12 rounded-full bg-forest px-6 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60";
const label="grid gap-1.5 text-sm font-extrabold text-forest";
function Message({state}:{state:Feedback}) {
  return state.status==="idle"?null:<p role={state.status==="error"?"alert":"status"}
    className={"rounded-xl px-4 py-3 text-sm font-bold "+(state.status==="error"?"bg-blush text-wine":"bg-lime-soft text-forest")}>
    {state.message}
  </p>;
}
function OptionSelect({name,options,placeholder}:{name:string;options:CatalogOption[];placeholder:string}) {
  return <select name={name} required defaultValue="" className={input}>
    <option value="" disabled>{placeholder}</option>
    {options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
  </select>;
}
function Section({title,detail,children}:{title:string;detail:string;children:React.ReactNode}) {
  return <section className="rounded-[2rem] border border-line bg-paper p-5 sm:p-7">
    <h2 className="text-xl font-black text-forest-deep">{title}</h2>
    <p className="mt-2 mb-5 text-sm leading-relaxed text-muted">{detail}</p>
    {children}
  </section>;
}
export function AdminCommercialForms({options}:{options:AdminCommercialOptions}) {
  const [product,addProduct,pendingProduct]=useActionState(createDraftProduct,first);
  const [activation,activate,pendingActivation]=useActionState(activateProduct,first);
  const [sku,addSku,pendingSku]=useActionState(createPendingSku,first);
  const [approval,approveSku,pendingApproval]=useActionState(approveSupplierSku,first);
  const [inventory,saveStock,pendingStock]=useActionState(setInventory,first);
  const [offer,addOffer,pendingOffer]=useActionState(createPendingOffer,first);
  const [published,publish,pendingPublish]=useActionState(approveOffer,first);

  return <div className="mt-8 grid gap-6 lg:grid-cols-2">
    <Section title="1. Cadastrar produto mestre" detail="O produto entra como rascunho. Nenhuma oferta ou preço é publicado.">
      <form action={addProduct} className="grid gap-4">
        <label className={label}>Nome comercial <input className={input} name="name" required maxLength={160} placeholder="Farinha de trigo 1 kg"/></label>
        <label className={label}>Identificador para URL <input className={input} name="slug" required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="farinha-trigo-1kg"/></label>
        <label className={label}>GTIN/EAN (opcional) <input className={input} name="gtin" inputMode="numeric" pattern="[0-9]{8,14}" maxLength={14} placeholder="7890000000000"/></label>
        <label className={label}>Unidade base <select className={input} name="base_unit" defaultValue="un"><option value="un">Unidade</option><option value="kg">Quilograma</option><option value="l">Litro</option></select></label>
        <button className={btn} disabled={pendingProduct}>{pendingProduct?"Gravando…":"Cadastrar como rascunho"}</button>
        <Message state={product}/>
      </form>
    </Section>

    <Section title="2. Ativar produto mestre" detail="Ative apenas depois de conferir a identidade do item. A ativação não publica uma oferta.">
      <form action={activate} className="grid gap-4">
        <label className={label}>Produto em rascunho <OptionSelect name="product_id" options={options.draftProducts} placeholder="Selecione o produto"/></label>
        <button className={btn} disabled={pendingActivation||!options.draftProducts.length}>{pendingActivation?"Verificando…":"Ativar produto"}</button>
        <Message state={activation}/>
      </form>
    </Section>

    <Section title="3. Vincular SKU ao fornecedor" detail="Somente empresas homologadas como fornecedoras podem receber SKUs. A associação começa pendente.">
      <form action={addSku} className="grid gap-4">
        <label className={label}>Fornecedor homologado <OptionSelect name="supplier_org_id" options={options.suppliers} placeholder="Selecione o fornecedor"/></label>
        <label className={label}>Produto mestre <OptionSelect name="product_id" options={options.products} placeholder="Selecione um produto"/></label>
        <label className={label}>SKU do fornecedor <input className={input} name="supplier_sku" required maxLength={100} placeholder="FAR-TRI-1KG"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Qtd. por embalagem <input className={input} name="pack_quantity" type="number" required min="0.001" max="1000000" step="0.001" defaultValue="1"/></label>
          <label className={label}>Unidade <select className={input} name="pack_unit" defaultValue="un"><option value="un">un</option><option value="kg">kg</option><option value="l">l</option></select></label>
        </div>
        <button className={btn} disabled={pendingSku||!options.suppliers.length||!options.products.length}>{pendingSku?"Gravando…":"Vincular SKU pendente"}</button>
        <Message state={sku}/>
      </form>
    </Section>

    <Section title="4. Homologar SKU" detail="O sistema exige produto mestre ativo e fornecedor aprovado.">
      <form action={approveSku} className="grid gap-4">
        <label className={label}>SKU pendente <OptionSelect name="sku_id" options={options.pendingSkus} placeholder="Selecione um SKU"/></label>
        <button className={btn} disabled={pendingApproval||!options.pendingSkus.length}>{pendingApproval?"Conferindo…":"Homologar SKU"}</button>
        <Message state={approval}/>
      </form>
    </Section>

    <Section title="5. Informar disponibilidade" detail="Estoque é uma posição absoluta. Informe somente a quantidade efetivamente disponível.">
      <form action={saveStock} className="grid gap-4">
        <label className={label}>SKU homologado <OptionSelect name="sku_id" options={options.approvedSkus} placeholder="Selecione um SKU"/></label>
        <label className={label}>Quantidade disponível <input className={input} name="available" required type="number" min="0" step="0.001" max="100000000" defaultValue="0"/></label>
        <button className={btn} disabled={pendingStock||!options.approvedSkus.length}>{pendingStock?"Atualizando…":"Confirmar quantidade disponível"}</button>
        <Message state={inventory}/>
      </form>
    </Section>

    <Section title="6. Criar oferta comercial pendente" detail="Preços em centavos (1250 = R$ 12,50), sem integração externa. Região e validade são verificadas antes da homologação.">
      <form action={addOffer} className="grid gap-4">
        <label className={label}>SKU homologado <OptionSelect name="sku_id" options={options.approvedSkus} placeholder="Selecione um SKU"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Preço (centavos) <input className={input} type="number" required name="price_minor" min="1" max="1000000000" step="1" placeholder="1250"/></label>
          <label className={label}>Pedido mínimo <input className={input} type="number" required name="minimum" min="1" step="1" defaultValue="1"/></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>UF de atendimento <input className={input} name="region" required maxLength={5} placeholder="SP"/></label>
          <label className={label}>Válida até (opcional) <input className={input} type="date" name="valid_to"/></label>
        </div>
        <button className={btn} disabled={pendingOffer||!options.approvedSkus.length}>{pendingOffer?"Criando…":"Registrar oferta pendente"}</button>
        <Message state={offer}/>
      </form>
    </Section>

    <Section title="7. Aprovar oferta para catálogo" detail="O banco recusa a aprovação sem fornecedor homologado, SKU e produto ativos, região e estoque suficientes.">
      <form action={publish} className="grid gap-4">
        <label className={label}>Oferta pendente <OptionSelect name="offer_id" options={options.pendingOffers} placeholder="Selecione uma oferta"/></label>
        <p className="rounded-xl bg-sand p-4 text-xs font-semibold text-[#5c3a06]">
          Esta ação é uma decisão comercial. Confirme preços, estoque e cobertura antes de aprovar. Checkout e pagamentos ainda não estão habilitados.
        </p>
        <button className={btn} disabled={pendingPublish||!options.pendingOffers.length}>{pendingPublish?"Conferindo…":"Aprovar oferta"}</button>
        <Message state={published}/>
      </form>
    </Section>
  </div>;
}
