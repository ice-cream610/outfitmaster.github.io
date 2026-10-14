import {buildOutfit,validatePurchase,previewCell} from './domain.ts';
import type {Outfit,OutfitService,Message} from './types.ts';
// Replace this adapter with your own server API. Never put model credentials in the client.
export const demoService:OutfitService={
 async generate(request,signal){await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve()},1100);function cancel(){clearTimeout(timer);reject(new DOMException('已取消','AbortError'))}if(signal.aborted)cancel();else signal.addEventListener('abort',cancel,{once:true})});return buildOutfit(request)},
 async checkout(outfit,specs){return validatePurchase(outfit,specs)}
};
export interface SavedSession {outfit:Outfit;messages:Message[]}
const key='outfit-master.saved.v1';
export function readSaved():SavedSession[]{try{const raw=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(raw)?raw.filter(x=>x?.outfit?.id&&Array.isArray(x.outfit.productIds)&&Array.isArray(x.messages)&&Array.isArray(x.outfit.lockedIds)&&Array.isArray(x.outfit.selectedIds)&&x.outfit.conditions&&previewCell(x.outfit)!==null).slice(0,20):[]}catch{return []}}
export function writeSaved(sessions:SavedSession[]){localStorage.setItem(key,JSON.stringify(sessions.slice(0,20)))}
export function track(name:string,outfitId:string){try{const events=JSON.parse(localStorage.getItem('outfit-master.events.v1')||'[]');localStorage.setItem('outfit-master.events.v1',JSON.stringify([...events,{name,outfitId,at:Date.now()}].slice(-100)))}catch{/* Demo analytics are best effort; do not block shopping interactions. */}}
