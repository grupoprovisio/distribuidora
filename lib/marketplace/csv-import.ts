import type { OfferSourceType } from "@/lib/marketplace/catalog";

export type CsvOfferRow = {
  line: number; supplierSku: string; productName: string; baseUnit: "un" | "kg" | "l";
  packQuantity: number; packUnit: string; basePriceMinor: number;
  minQuantity: number; regions: string[]; sourceType: OfferSourceType;
};
export type CsvImportError = { line: number; field: string; message: string };
export type CsvImportPreview = { rows: CsvOfferRow[]; errors: CsvImportError[]; accepted: boolean; sourceType: OfferSourceType };

const authorized = new Set<OfferSourceType>(["SUPPLIER_CSV_AUTHORIZED", "MANUAL_AUTHORIZED", "PLATFORM_STOCK"]);
const units = new Set(["un", "kg", "l"]);
const regionCode = /^[A-Z]{2}(?:-[A-Z0-9]{2,8})?$/;
const required = ["supplier_sku","product_name","base_unit","pack_quantity","pack_unit","base_price_minor","min_quantity","regions"] as const;
const MAX_RECORDS = 1000;
const MAX_BYTES = 1024 * 1024;

type ParsedRow = { line: number; cells: string[] };

function separatorFromHeader(header: string): "," | ";" {
  let commas = 0, semicolons = 0, quoted = false;
  for (let i=0; i<header.length; i++) {
    const char=header[i];
    if (char === '"') {
      if (quoted && header[i+1] === '"') i++;
      else quoted=!quoted;
    } else if (!quoted && char === ",") commas++;
    else if (!quoted && char === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}

/** Parse RFC 4180-style CSV, preserving the physical line of each record. */
function parseCsv(source: string): { records: ParsedRow[]; error: CsvImportError | null } {
  const text=source.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
  const header=text.split("\n",1)[0] ?? "";
  const delimiter=separatorFromHeader(header);
  const records:ParsedRow[]=[];
  let row:string[]=[];
  let field="";
  let quoted=false, closed=false;
  let line=1, start=1;
  let contentStarted=false;

  function complete() {
    row.push(field.trim());
    if (row.some(value=>value !== "")) records.push({line:start,cells:row});
    row=[];field="";closed=false;contentStarted=false;
  }
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i+1] === '"') { field+='"'; i++; }
        else { quoted=false;closed=true; }
      } else {
        field+=c;
        if (c === "\n") line++;
      }
      continue;
    }
    if (c === delimiter) {
      row.push(field.trim());
      field="";closed=false;contentStarted=false;
      continue;
    }
    if (c === "\n") {
      complete();
      line++;start=line;
      if (records.length > MAX_RECORDS+1) return {
        records:[],error:{line:start,field:"csv",message:"Limite de 1.000 produtos por arquivo. Divida o CSV."}
      };
      continue;
    }
    if (c === '"') {
      if (field.length === 0 && !closed && !contentStarted) {
        quoted=true;contentStarted=true;
        continue;
      }
      return {records:[],error:{line:start,field:"csv",message:"Aspas fora da posição esperada. Revise as aspas do campo."}};
    }
    if (closed) {
      if (c === " " || c === "\t") continue;
      return {records:[],error:{line:start,field:"csv",message:"Texto inesperado após fechar aspas."}};
    }
    field+=c;contentStarted=true;
  }
  if (quoted) return {records:[],error:{line:start,field:"csv",message:"Campo entre aspas não foi fechado."}};
  if (row.length || field.length || closed) complete();
  return {records,error:null};
}

export function previewAuthorizedCsv(csv: string, sourceType: OfferSourceType = "SUPPLIER_CSV_AUTHORIZED"): CsvImportPreview {
  const rows: CsvOfferRow[]=[];
  const errors: CsvImportError[]=[];
  const fail=(line:number,field:string,message:string)=>errors.push({line,field,message});
  if (!authorized.has(sourceType)) {
    fail(1,"sourceType","A origem não é autorizada para o catálogo Provisio.");
    return {rows,errors,accepted:false,sourceType};
  }
  if (new TextEncoder().encode(csv).byteLength > MAX_BYTES) {
    fail(1,"csv","Arquivo excede 1 MB. Divida o catálogo em lotes menores.");
    return {rows,errors,accepted:false,sourceType};
  }
  const parsed=parseCsv(csv);
  if (parsed.error) {
    errors.push(parsed.error);
    return {rows,errors,accepted:false,sourceType};
  }
  const [head,...lines]=parsed.records;
  if (!head) {
    fail(1,"csv","O arquivo CSV está vazio.");
    return {rows,errors,accepted:false,sourceType};
  }
  const headers=head.cells.map(c=>c.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) fail(head.line,"csv","Existem colunas duplicadas no cabeçalho.");
  for (const key of required) if (!headers.includes(key)) fail(head.line,key,"Coluna obrigatória ausente.");
  if (errors.length) return {rows,errors,accepted:false,sourceType};
  if (lines.length > MAX_RECORDS) {
    fail(head.line,"csv","Limite de 1.000 produtos por arquivo. Divida o CSV.");
    return {rows,errors,accepted:false,sourceType};
  }
  if (!lines.length) fail(head.line,"csv","O arquivo não possui produtos.");
  const indexes=Object.fromEntries(headers.map((name,index)=>[name,index]));
  const observed=new Set<string>();
  for (const record of lines) {
    if (record.cells.length !== headers.length) {
      fail(record.line,"csv","Quantidade de colunas diferente do cabeçalho; confira separadores e aspas.");
      continue;
    }
    const value=(key:string)=>record.cells[indexes[key]] ?? "";
    const sku=value("supplier_sku");
    const name=value("product_name");
    const normalizedRegions=value("regions").split("|").map(v=>v.trim().toUpperCase()).filter(Boolean);
    const pack=Number(value("pack_quantity"));
    const minor=Number(value("base_price_minor"));
    const minimum=Number(value("min_quantity"));
    const base=value("base_unit").toLowerCase();
    const packUnit=value("pack_unit").toLowerCase();
    if (sku.length === 0 || sku.length > 100) fail(record.line,"supplier_sku","SKU obrigatório (até 100 caracteres).");
    if (name.length === 0 || name.length > 200) fail(record.line,"product_name","Nome obrigatório (até 200 caracteres).");
    if (!units.has(base)) fail(record.line,"base_unit","Unidade deve ser un, kg ou l.");
    if (!units.has(packUnit)) fail(record.line,"pack_unit","Unidade de embalagem deve ser un, kg ou l.");
    if (!value("pack_quantity") || !Number.isFinite(pack) || pack <= 0 || pack>1000000) fail(record.line,"pack_quantity","Quantidade da embalagem inválida.");
    if (!value("base_price_minor") || !Number.isSafeInteger(minor) || minor<0) fail(record.line,"base_price_minor","Preço deve ser inteiro seguro em centavos.");
    if (!value("min_quantity") || !Number.isSafeInteger(minimum) || minimum<=0) fail(record.line,"min_quantity","Quantidade mínima deve ser um inteiro positivo.");
    if (!normalizedRegions.length || normalizedRegions.some(code=>!regionCode.test(code))
      || new Set(normalizedRegions).size!==normalizedRegions.length) {
      fail(record.line,"regions","Regiões inválidas ou duplicadas (ex.: SP|RJ).");
    }
    if (sku) {
      const normalized=sku.toLocaleUpperCase("pt-BR");
      if (observed.has(normalized)) fail(record.line,"supplier_sku","SKU duplicado neste arquivo.");
      observed.add(normalized);
    }
    if (errors.some(error=>error.line===record.line)) continue;
    rows.push({
      line:record.line,supplierSku:sku,productName:name,baseUnit:base as CsvOfferRow["baseUnit"],
      packQuantity:pack,packUnit,basePriceMinor:minor,minQuantity:minimum,regions:normalizedRegions,sourceType
    });
  }
  return {rows,errors,accepted:errors.length===0 && rows.length>0,sourceType};
}


/** Exporta erros em CSV UTF-8 para correção local; nenhum dado é enviado ao servidor. */
export function exportCsvValidationErrors(errors: readonly CsvImportError[]): string {
  const cell=(v:string|number)=>'"'+String(v).replace(/"/g,'""')+'"';
  return "\uFEFFlinha,campo,erro\n"+errors.map(error=>
    [cell(error.line),cell(error.field),cell(error.message)].join(",")
  ).join("\n")+"\n";
}
