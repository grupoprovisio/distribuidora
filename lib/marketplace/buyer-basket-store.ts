"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";

export type BasketItem={offerId:string;quantity:number};
const EVENT="provisio:basket-changed";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parse=(value:string):BasketItem[]=>{
  try{
    const data:unknown=JSON.parse(value);
    if(!Array.isArray(data))return [];
    const seen=new Set<string>();
    const rows:BasketItem[]=[];
    for(const item of data){
      if(!item||typeof item!=="object")continue;
      const {offerId,quantity}=item as Partial<BasketItem>;
      if(typeof offerId!=="string"||!UUID.test(offerId)||seen.has(offerId)
        ||typeof quantity!=="number"||!Number.isSafeInteger(quantity)
        ||quantity<1||quantity>100000)continue;
      seen.add(offerId);rows.push({offerId,quantity});
      if(rows.length===100)break;
    }
    return rows;
  }catch{return [];}
};
const keyFor=(userId:string,orgId:string,region:string)=>
  ["provisio-b2b-cesta-v2",userId,orgId,region].join(":");
function current(key:string){
  if(typeof window==="undefined")return "[]";
  try{return window.localStorage.getItem(key)??"[]";}catch{return "[]";}
}
function save(key:string,items:BasketItem[]){
  try{window.localStorage.setItem(key,JSON.stringify(items));}
  catch{return false;}
  window.dispatchEvent(new Event(EVENT));
  return true;
}
/** Only offer ids and quantities are cached. Prices and approval are server-only. */
export function useBuyerBasket(userId:string,orgId:string,region:string){
  const key=keyFor(userId,orgId,region);
  const subscribe=useCallback((onChange:()=>void)=>{
    window.addEventListener("storage",onChange);
    window.addEventListener(EVENT,onChange);
    return ()=>{window.removeEventListener("storage",onChange);window.removeEventListener(EVENT,onChange);};
  },[]);
  const raw=useSyncExternalStore(subscribe,()=>current(key),()=>"[]");
  const items=useMemo(()=>parse(raw),[raw]);
  const setQuantity=useCallback((offerId:string,quantity:number)=>{
    if(!UUID.test(offerId)||!Number.isSafeInteger(quantity)||quantity<0||quantity>100000)return false;
    const values=parse(current(key));
    const index=values.findIndex(row=>row.offerId===offerId);
    if(index>=0){
      if(quantity===0)values.splice(index,1);
      else values[index]={offerId,quantity};
    }else if(quantity>0){
      if(values.length>=100)return false;
      values.push({offerId,quantity});
    }
    return save(key,values);
  },[key]);
  const clear=useCallback(()=>save(key,[]),[key]);
  const count=items.reduce((n,item)=>n+item.quantity,0);
  return {items,count,distinctCount:items.length,setQuantity,clear,
    getQuantity:(id:string)=>items.find(item=>item.offerId===id)?.quantity??0};
}
