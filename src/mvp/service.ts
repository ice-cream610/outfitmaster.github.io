import {catalog as seedCatalog,users as seedUsers} from '../agent/catalog.ts';
import {runWorkflow} from '../agent/workflow.ts';
import type {CatalogItem,DemoUser,WorkflowRequest,WorkflowResult,Behavior} from '../agent/types.ts';
export interface Bootstrap {catalog:CatalogItem[];users:DemoUser[];mode:'offline'|'llm';storage:'sqlite'|'browser'}
export function readLocal<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
export function writeLocal(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
async function request<T>(url:string,body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal});
 if(!(response.headers.get('content-type')??'').includes('application/json'))throw new Error('服务未启动');
 const result=await response.json();if(!response.ok)throw new Error(result.error||'请求失败');return result;
}
export async function bootstrap():Promise<Bootstrap>{
 try{const data=await request<Bootstrap>('/api/bootstrap',undefined,AbortSignal.timeout(2500));if(!Array.isArray(data.catalog)||!Array.isArray(data.users)||!['offline','llm'].includes(data.mode))throw new Error('服务响应不符合约定');return data}
 catch{return {catalog:seedCatalog,users:seedUsers.map(u=>({...u,events:[...u.events,...readLocal<Behavior[]>('om.events.'+u.id,[])]})),mode:'offline',storage:'browser'}}
}
export async function recommend(input:WorkflowRequest,boot:Bootstrap,signal:AbortSignal):Promise<WorkflowResult>{
 if(boot.storage==='sqlite')return request('/api/recommend',input,signal);
 await new Promise<void>((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('已取消','AbortError'));const timer=setTimeout(resolve,100);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('已取消','AbortError'))},{once:true})});
 return runWorkflow(input,boot.catalog,boot.users);
}
export async function recordEvent(boot:Bootstrap,userId:string,productId:string,type:Behavior['type']):Promise<Behavior>{
 if(boot.storage==='sqlite'){const result=await request<{event:Behavior}>('/api/events',{userId,productId,type,seconds:25});return result.event}
 const event:Behavior={id:crypto.randomUUID(),productId,type,at:new Date().toISOString(),seconds:25,simulated:true};
 writeLocal('om.events.'+userId,[...readLocal<Behavior[]>('om.events.'+userId,[]),event].slice(-500));return event;
}
export async function checkout(boot:Bootstrap,userId:string,result:WorkflowResult,outfitId:string,items:{productId:string;size:string;quantity:number}[]){
 if(boot.storage==='sqlite')return request<{totalCents:number;id:string}>('/api/cart',{userId,sessionId:result.state.id,outfitId,items});
 if(!items.length)throw new Error('请选择待购商品');
 const outfit=result.outfits.find(o=>o.id===outfitId);if(!outfit)throw new Error('方案不存在');
 for(const item of items){const p=boot.catalog.find(p=>p.id===item.productId);if(!p||!outfit.productIds.includes(p.id)||!p.sizes.includes(item.size)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>p.stock)throw new Error('请选择有效尺码，并检查数量与库存')}
 const cart={id:crypto.randomUUID(),totalCents:items.reduce((s,i)=>s+boot.catalog.find(p=>p.id===i.productId)!.priceCents*i.quantity,0),items,simulated:true};
 if(!writeLocal('om.cart.'+userId,cart))throw new Error('浏览器无法保存购物清单');return cart;
}
