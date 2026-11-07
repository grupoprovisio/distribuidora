"use client";
import { useEffect } from "react";

export function ClearPaidBasket({userId,buyerOrgId,region}:{userId?:string;buyerOrgId?:string;region?:string}){
  useEffect(()=>{
    if(!userId||!buyerOrgId||!region)return;
    try{window.localStorage.removeItem(["provisio-b2b-cesta-v2",userId,buyerOrgId,region].join(":"));}
    catch{}
  },[userId,buyerOrgId,region]);
  return null;
}
