export type CatalogIntent = {slug:string;name:string;quantity:number};
export const INTENT_KEY='provisio-public-list-v1';
export const INTENT_EVENT='provisio:public-list';
export function parseIntent(raw:string):CatalogIntent[] {
  try {
    const data:unknown=JSON.parse(raw);
    if(!Array.isArray(data))return [];
    const rows:CatalogIntent[]=[];
    const seen=new Set<string>();
    for(const v of data) {
      if(!v||typeof v!=='object')continue;
      const {slug,name,quantity}=v as Partial<CatalogIntent>;
      if(typeof slug!=='string'||!/^[a-z0-9][a-z0-9-]{0,179}$/.test(slug)||seen.has(slug)
        ||typeof quantity!=='number'||!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)continue;
      rows.push({slug,name:typeof name==='string'?name.slice(0,160):slug,quantity});
      seen.add(slug);if(rows.length===100)break;
    }
    return rows;
  } catch{return [];}
}
export function matchesCatalog(value:string,term:string) {
  const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  return normalize(value).includes(normalize(term));
}
