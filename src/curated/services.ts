import {buildOutfit,validatePurchase,previewCell} from './domain.ts';
import type {Outfit,OutfitService,Message} from '../types.ts';
export const demoService:OutfitService={
 async generate(request,signal){
  // A short, cancellable demo transition keeps the original loading/failure
  // interaction reviewable. It does not represent a live AI generation call.
  await new Promise<void>((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new DOMException('已取消','AbortError'))};const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve()},700);if(signal.aborted)cancel();else signal.addEventListener('abort',cancel,{once:true})});
  return buildOutfit(request);
 },
 async checkout(outfit,specs){return validatePurchase(outfit,specs)}
};
export interface SavedSession {outfit:Outfit;messages:Message[]}
const key='outfit-master.curated-real.v1';
export function readSaved():SavedSession[]{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>{try{return Array.isArray(x?.messages)&&Array.isArray(x.outfit.lockedIds)&&Array.isArray(x.outfit.selectedIds)&&x.outfit.conditions&&previewCell(x.outfit)!==null}catch{return false}}).slice(0,20):[]}catch{return []}}
export function writeSaved(sessions:SavedSession[]){localStorage.setItem(key,JSON.stringify(sessions.slice(0,20)))}
export function track(name:string,outfitId:string){try{const events=JSON.parse(localStorage.getItem('om.curated.events')||'[]');localStorage.setItem('om.curated.events',JSON.stringify([...events,{name,outfitId,at:Date.now(),simulated:true}].slice(-100)))}catch{/* Local demo analytics must not interrupt the outfit. */}}
