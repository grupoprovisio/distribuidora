/** Side-effect free quote validation; no network requests or database mutation. */
const ref=(value,label)=>{if(typeof value!=="string" || !/^[a-zA-Z0-9_-]{3,128}$/.test(value))throw new TypeError(label+" inválido");return value;};
export function createQuoteDraft({buyerOrgId,requestId,items,expiresAt}){
 ref(buyerOrgId,"Empresa");ref(requestId,"Solicitação");
 if(!Array.isArray(items)||items.length<1||items.length>100)throw new RangeError("Quantidade de itens inválida");
 const deadline=new Date(expiresAt);
 if(!Number.isFinite(deadline.getTime())||deadline.getTime()<=Date.now())throw new RangeError("Prazo expirado");
 const seen=new Set();
 const rows=items.map(({productId,quantity,notes})=>{
  ref(productId,"Produto");
  if(seen.has(productId))throw new TypeError("Produto duplicado");
  seen.add(productId);
  if(typeof quantity!=="number"||!Number.isFinite(quantity)||quantity<=0||quantity>1_000_000||Math.round(quantity*1000)!==quantity*1000)throw new RangeError("Quantidade inválida");
  if(typeof notes!=="undefined"&&(typeof notes!=="string"||notes.length>500))throw new TypeError("Observação inválida");
  return Object.freeze({productId,quantity,notes:notes??""});
 });
 return Object.freeze({buyerOrgId,requestId,items:Object.freeze(rows),expiresAt:deadline.toISOString(),status:"draft",notice:"Rascunho local: não foi enviado a fornecedores."});
}
