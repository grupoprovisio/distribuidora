"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { previewAuthorizedCsv } from "@/lib/marketplace/csv-import";

export type ImportFeedback = { status: "idle" | "success" | "error"; message: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function slugify(name:string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90);
}

export async function saveSupplierCsv(_previous: ImportFeedback, form:FormData):Promise<ImportFeedback> {
  // Writing commercial data is an administrative act requiring a verified MFA session.
  await requireMarketplacePortal("admin");
  const content=form.get("csv");
  const supplier=form.get("supplier_org_id");
  if(typeof content!=="string" || new TextEncoder().encode(content).length>1024*1024 ||
     typeof supplier!=="string" || !uuid.test(supplier))
    return {status:"error",message:"Selecione a empresa fornecedora e um CSV de até 1 MB."};
  const parsed=previewAuthorizedCsv(content,"SUPPLIER_CSV_AUTHORIZED");
  if(!parsed.accepted || parsed.rows.length>50)
    return {status:"error",message:"O arquivo precisa estar válido e conter no máximo 50 produtos por envio. Divida arquivos maiores."};
  const db=await createClient();
  const [organization,capability]=await Promise.all([
    db.from("organizations").select("kind,status").eq("id",supplier).maybeSingle(),
    db.from("organization_capabilities").select("status").eq("organization_id",supplier).eq("capability","SUPPLIER").maybeSingle(),
  ]);
  if(organization.error || capability.error || organization.data?.status!=="approved" ||
     capability.data?.status!=="approved" || !["SUPPLIER","PLATFORM_OPERATOR"].includes(organization.data.kind))
    return {status:"error",message:"Fornecedor sem homologação comercial válida."};
  let created=0, skipped=0;
  const problems:string[]=[];
  for (const row of parsed.rows) {
    const existing=await db.from("supplier_products").select("id").eq("supplier_org_id",supplier)
      .eq("supplier_sku",row.supplierSku).limit(1);
    if(existing.error){problems.push(`Linha ${row.line}: falha na consulta do SKU.`);continue;}
    if(existing.data?.length){skipped++;continue;}
    const base=slugify(row.productName);
    if(!base){problems.push(`Linha ${row.line}: nome de produto inválido.`);continue;}
    const slug=(base.slice(0,75)+"-"+crypto.randomUUID().slice(0,8));
    const product=await db.from("products").insert({slug,name:row.productName,base_unit:row.baseUnit,status:"draft"}).select("id").single();
    if(product.error || !product.data){problems.push(`Linha ${row.line}: não foi possível gravar o produto.`);continue;}
    const sku=await db.from("supplier_products").insert({supplier_org_id:supplier,product_id:product.data.id,
      supplier_sku:row.supplierSku,pack_quantity:row.packQuantity,pack_unit:row.packUnit,status:"pending"}).select("id").single();
    if(sku.error || !sku.data){problems.push(`Linha ${row.line}: produto salvo, mas falhou o vínculo do SKU; revisão necessária.`);continue;}
    created++;
  }
  revalidatePath("/app/fornecedor/catalogo");
  revalidatePath("/admin/marketplace/cadastro");
  revalidatePath("/admin/marketplace/importar");
  return {status:problems.length?"error":"success",message:`${created} produtos salvos como rascunho; ${skipped} SKUs já existentes, ignorados. Nenhuma oferta foi publicada. `+
    (problems.length?problems.slice(0,5).join(" "):"Faça a homologação dos SKUs e cadastre preços, estoque e regiões no painel comercial.")};
}
