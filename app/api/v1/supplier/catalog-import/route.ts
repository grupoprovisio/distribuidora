import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { previewAuthorizedCsv } from "@/lib/marketplace/csv-import";

export const runtime = "nodejs";
const MAX_BYTES=1024*1024;
/** Closed by default until isolated staging migration + RLS tests are approved. */
export async function POST(request: Request) {
  if (process.env.MARKETPLACE_CATALOG_WRITES_ENABLED !== "true")
    return NextResponse.json({error:"Importação transacional ainda não habilitada."},{status:503});
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json"))
    return NextResponse.json({error:"Formato inválido."},{status:415});
  const raw=await request.text();
  if (new TextEncoder().encode(raw).length>MAX_BYTES)
    return NextResponse.json({error:"Lote acima de 1 MB."},{status:413});
  let input:unknown;
  try { input=JSON.parse(raw); } catch {return NextResponse.json({error:"JSON inválido."},{status:400});}
  if (!input || typeof input!=="object" || Array.isArray(input))
    return NextResponse.json({error:"Solicitação inválida."},{status:400});
  const body=input as Record<string,unknown>;
  if(typeof body.organizationId!=="string" || typeof body.csv!=="string")
    return NextResponse.json({error:"Organização e CSV obrigatórios."},{status:400});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.organizationId))
    return NextResponse.json({error:"Organização inválida."},{status:400});
  const result=previewAuthorizedCsv(body.csv,"SUPPLIER_CSV_AUTHORIZED");
  if (!result.accepted || result.rows.length>100)
    return NextResponse.json({error:"CSV inválido ou acima de 100 linhas.",details:result.errors.slice(0,20)},{status:422});
  const organizations=await myMarketplaceOrganizations("fornecedor");
  if (organizations.error || !organizations.organizations.some(o=>o.id===body.organizationId
    && (o.role==="ORG_ADMIN" || o.role==="SUPPLIER_ADMIN")))
    return NextResponse.json({error:"Sem permissão de importação."},{status:403});
  const client=await createClient();
  const payload=result.rows.map(row=>({
    supplierSku:row.supplierSku,productName:row.productName,
    baseUnit:row.baseUnit,packQuantity:row.packQuantity,packUnit:row.packUnit,
    basePriceMinor:row.basePriceMinor,minQuantity:row.minQuantity,regions:row.regions
  }));
  // Type assertion confines the as-yet-unapplied RPC to this gateway.
  type RpcClient={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{message:string}|null}>};
  const rpc=(client as unknown as RpcClient).rpc;
  const {data,error}=await rpc.call(client,"provisio_submit_supplier_catalog",
    {p_organization_id:body.organizationId,p_rows:payload});
  if(error) return NextResponse.json({error:"Importação não concluída. Nenhum lote deve ser considerado cadastrado."},{status:409});
  return NextResponse.json({result:data,status:"pending"},{status:201});
}
