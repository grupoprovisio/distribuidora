import assert from "node:assert/strict";
import { previewAuthorizedCsv } from "../lib/marketplace/csv-import.ts";

const columns="supplier_sku,product_name,base_unit,pack_quantity,pack_unit,base_price_minor,min_quantity,regions";
const data="SUP-001,Produto local,un,1,un,1250,2,SP|RJ";
const file=(content,header=columns)=>header+"\n"+content;
const valid=previewAuthorizedCsv(file(data));
assert.equal(valid.accepted,true);
assert.equal(valid.rows.length,1);
assert.equal(valid.rows[0].basePriceMinor,1250);
assert.deepEqual(valid.rows[0].regions,["SP","RJ"]);

for(const [target,source,field] of [
  [",1,un,1250",",1,caixa,1250","pack_unit"],
  ["SP|RJ","SP|INVALID_REGION","regions"],
  ["1250","12.50","base_price_minor"],
  ["SUP-001","", "supplier_sku"]
]){
  const result=previewAuthorizedCsv(file(data.replace(target,source)));
  assert.equal(result.accepted,false,field);
  assert.ok(result.errors.some(error=>error.field===field),field);
}
assert.equal(previewAuthorizedCsv(file(data),"VTEX_SCRAPE").accepted,false);
assert.equal(previewAuthorizedCsv(file(data),"ATACADAO_EXTERNAL").accepted,false);
assert.equal(previewAuthorizedCsv(file(data),"UNVERIFIED_EXTERNAL").accepted,false);

// Importações do Google Planilhas podem conter separador ; e nomes com vírgula.
const semicolon=previewAuthorizedCsv("supplier_sku;product_name;base_unit;pack_quantity;pack_unit;base_price_minor;min_quantity;regions\nA;Farinha, especial;kg;1;kg;2300;1;SP|RJ");
assert.equal(semicolon.accepted,true);
assert.equal(semicolon.rows[0].productName,"Farinha, especial");

// CSV válido com aspas escapadas e quebras de linha dentro do nome.
const complex=previewAuthorizedCsv(file('A,"Molho ""especial"", tomates\nfrescos",kg,1,kg,1699,1,BR-SP\nB,Arroz,kg,1,kg,2500,1,SP'));
assert.equal(complex.accepted,true,JSON.stringify(complex.errors));
assert.equal(complex.rows[0].line,2);
assert.equal(complex.rows[1].line,4);
assert.equal(complex.rows[0].productName,'Molho "especial", tomates\nfrescos');

// Proteções contra truncamento, aspas malformadas e inconsistência estrutural.
const malformed=previewAuthorizedCsv(file('A,"Campo sem fechamento,kg,1,kg,1699,1,SP'));
assert.equal(malformed.accepted,false);
assert.ok(malformed.errors.some(error=>error.field==="csv"));
const shortRow=previewAuthorizedCsv(file("A,Arroz,kg,1,kg,2500,1"));
assert.equal(shortRow.accepted,false);
assert.ok(shortRow.errors.some(error=>error.field==="csv"));
assert.equal(previewAuthorizedCsv(columns+"\n").accepted,false);
assert.equal(previewAuthorizedCsv("").accepted,false);
assert.equal(previewAuthorizedCsv(file(data,columns.replace("supplier_sku,","product_name,"))).accepted,false);

// SKU duplicado deve ser bloqueado mesmo quando a primeira linha tem erro.
const duplicate=previewAuthorizedCsv(file("A,Produto,kg,0,kg,1000,1,SP\n a ,Outro,kg,1,kg,1200,1,RJ"));
assert.equal(duplicate.accepted,false);
assert.ok(duplicate.errors.some(error=>error.field==="supplier_sku"&&error.line===3));

// Converter zero vazio para número não gera preços falsos, pois zero é permitido,
// mas um campo de preço vazio NÃO deve ser tratado como 0 na importação.
const rejectedOutside=previewAuthorizedCsv(file(data.replace(",1250,",",999999999999999999999999,")));
assert.equal(rejectedOutside.accepted,false);
assert.ok(rejectedOutside.errors.some(error=>error.field==="base_price_minor"));
const tooLarge=previewAuthorizedCsv(columns+"\n"+data.repeat(140000));
assert.equal(tooLarge.accepted,false);
assert.ok(tooLarge.errors.some(error=>error.field==="csv"));
console.log("marketplace-csv-check: CSV robusto com cabeçalho, aspas, separadores, linhas e segurança OK");
