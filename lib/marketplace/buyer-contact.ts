export type BuyerContact={
 fullName:string;email:string;phone:string;postalCode:string;street:string;number:string;
 complement:string;neighborhood:string;city:string;state:string;reference:string;
};
export const EMPTY_BUYER_CONTACT:BuyerContact={
 fullName:"",email:"",phone:"",postalCode:"",street:"",number:"",complement:"",
 neighborhood:"",city:"",state:"SP",reference:""
};
const UFS=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
const FIELD_KEYS=Object.keys(EMPTY_BUYER_CONTACT).sort().join(",");
const asText=(item:unknown,max:number)=>typeof item==="string"&&item.length<=max?
 item.trim() :null;
export function normalizeCep(input:string){return input.replace(/\D/g,"").slice(0,8);}
export function normalizePhone(input:string){return input.replace(/\D/g,"");}
export function parseBuyerContact(input:unknown):BuyerContact|null{
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const obj=input as Record<string,unknown>;
 if(Object.keys(obj).sort().join(",")!==FIELD_KEYS)return null;
 const fullName=asText(obj.fullName,160),email=asText(obj.email,254),phone=asText(obj.phone,30);
 const postalCode=asText(obj.postalCode,15),street=asText(obj.street,160);
 const number=asText(obj.number,30),complement=asText(obj.complement,160);
 const neighborhood=asText(obj.neighborhood,100),city=asText(obj.city,100);
 const state=asText(obj.state,4),reference=asText(obj.reference,240);
 if(fullName===null||email===null||phone===null||postalCode===null||street===null||
   number===null||complement===null||neighborhood===null||city===null||
   state===null||reference===null)return null;
 const phoneNumbers=normalizePhone(phone),zip=normalizeCep(postalCode),stateCode=state.toUpperCase();
 if(fullName.length<3||!fullName.includes(" ")||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{10,11}$/.test(phoneNumbers)||
  !/^\d{8}$/.test(zip)||street.length<3||number.length<1||
  neighborhood.length<2||city.length<2||!UFS.has(stateCode))return null;
 return {fullName,email:email.toLowerCase(),phone:phoneNumbers,postalCode:zip,street,number,
   complement,neighborhood,city,state:stateCode,reference};
}
export function contactFromDatabase(row:Record<string,unknown>):BuyerContact{
 return {
 fullName:String(row.full_name??""),email:String(row.contact_email??""),phone:String(row.phone??""),
 postalCode:String(row.postal_code??""),street:String(row.street??""),
 number:String(row.street_number??""),complement:String(row.complement??""),
 neighborhood:String(row.neighborhood??""),city:String(row.city??""),
 state:String(row.state_code??"SP"),reference:String(row.reference??"")
 };
}
export function contactToDatabase(contact:BuyerContact){
 return {
 full_name:contact.fullName,contact_email:contact.email,phone:contact.phone,
 postal_code:contact.postalCode,street:contact.street,street_number:contact.number,
 complement:contact.complement,neighborhood:contact.neighborhood,
 city:contact.city,state_code:contact.state,reference:contact.reference
 };
}
