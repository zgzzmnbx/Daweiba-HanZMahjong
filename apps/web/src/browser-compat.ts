/** randomUUID requires HTTPS; getRandomValues remains available on HTTP. */
export function newActionId():string{
 if(typeof globalThis.crypto.randomUUID==='function')return globalThis.crypto.randomUUID();
 const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export async function copyInvitation(text:string):Promise<boolean>{
 try{if(navigator.clipboard){await navigator.clipboard.writeText(text);return true;}}catch{/* Fall through to the HTTP-compatible user-gesture copy. */}
 const input=document.createElement('textarea'),focus=document.activeElement as HTMLElement|null;
 input.value=text;input.readOnly=true;input.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px';
 (document.querySelector('dialog[open]')??document.body).append(input);input.select();input.setSelectionRange(0,text.length);
 try{return document.execCommand('copy');}catch{return false;}finally{input.remove();focus?.focus({preventScroll:true});}
}
