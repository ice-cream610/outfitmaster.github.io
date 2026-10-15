import {buildOutfit,validatePurchase,previewCell} from './domain.ts';
import {findRender} from './data.ts';
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
export interface ChatRequest {base:Outfit;message:string;history:Pick<Message,'role'|'text'>[]}
export interface ChatStatus {configured:boolean;model:string;message:string}
export interface ChatResult {baseId:string;reply:string;outfit:Outfit|null;action:'recommend'|'reply'|'appearance';model:string;trace:unknown}
export async function chatStatus(signal?:AbortSignal):Promise<ChatStatus>{
 const res=await fetch('/api/curated/chat/status',{signal});if(!res.ok)throw new Error('对话服务暂未连接');return res.json();
}
export async function requestChat(request:ChatRequest,signal:AbortSignal):Promise<ChatResult>{
 let res:Response;
 try{res=await fetch('/api/curated/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.any([signal,AbortSignal.timeout(100000)])})}
 catch(e){if(signal.aborted)throw e;throw new Error('对话连接失败或超时，原搭配已保留。请确认后端已启动，再重试。')}
 let result:ChatResult&{error?:string};
 try{result=await res.json()}catch{throw new Error('对话服务返回异常，原搭配已保留')}
 if(!res.ok)throw new Error(result.error||'对话暂时不可用，请稍后重试');
 if(result.baseId!==request.base.id||typeof result.reply!=='string')throw new Error('对话版本不匹配，请重试');
 if(result.outfit){const o=result.outfit,r=findRender(o);if(!r||r.id!==o.imageTaskId||o.avatar!==request.base.avatar||JSON.stringify(o.lockedIds)!==JSON.stringify(request.base.lockedIds)||!o.lockedIds.every(id=>o.productIds.includes(id))||o.selectedIds.some(id=>!request.base.selectedIds.includes(id)||!o.productIds.includes(id)))throw new Error('搭配结果校验失败，原搭配已保留')}
 return result;
}
const key='outfit-master.curated-real.v1';
export function readSaved():SavedSession[]{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>{try{return Array.isArray(x?.messages)&&Array.isArray(x.outfit.lockedIds)&&Array.isArray(x.outfit.selectedIds)&&x.outfit.conditions&&previewCell(x.outfit)!==null}catch{return false}}).slice(0,20):[]}catch{return []}}
export function writeSaved(sessions:SavedSession[]){localStorage.setItem(key,JSON.stringify(sessions.slice(0,20)))}
export function track(name:string,outfitId:string){try{const events=JSON.parse(localStorage.getItem('om.curated.events')||'[]');localStorage.setItem('om.curated.events',JSON.stringify([...events,{name,outfitId,at:Date.now(),simulated:true}].slice(-100)))}catch{/* Local demo analytics must not interrupt the outfit. */}}
