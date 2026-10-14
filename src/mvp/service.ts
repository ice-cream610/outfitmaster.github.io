import {catalog as seedCatalog,users as seedUsers} from '../agent/catalog.ts';
import {runWorkflow} from '../agent/workflow.ts';
import type {CatalogItem,DemoUser,WorkflowRequest,WorkflowResult,Behavior} from '../agent/types.ts';
import type {EAvatar,ERender} from './Avatar.tsx';
import {priceForSize} from '../agent/prices.ts';
export interface Bootstrap {catalog:CatalogItem[];users:DemoUser[];mode:'offline'|'llm';storage:'sqlite'|'browser';renderConfigured?:boolean}
export function readLocal<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
export function writeLocal(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
async function request<T>(url:string,body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal});
 if(!(response.headers.get('content-type')??'').includes('application/json'))throw new Error('服务未启动');
 const result=await response.json();if(!response.ok)throw new Error(result.error||'请求失败');return result;
}
export async function bootstrap():Promise<Bootstrap>{
 try{const data=await request<Bootstrap>('/api/bootstrap',undefined,AbortSignal.timeout(2500));if(!Array.isArray(data.catalog)||!Array.isArray(data.users)||!['offline','llm'].includes(data.mode)||data.catalog.some(p=>p.source!=='merchant'))throw new Error('后端数据版本较旧，请重启服务');return data}
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
 const cart={id:crypto.randomUUID(),totalCents:items.reduce((s,i)=>s+priceForSize(boot.catalog.find(p=>p.id===i.productId)!,i.size)*i.quantity,0),items,simulated:true};
 if(!writeLocal('om.cart.'+userId,cart))throw new Error('浏览器无法保存购物清单');return cart;
}
export async function generateERender(boot:Bootstrap,userId:string,result:WorkflowResult,outfitId:string,avatar:EAvatar,signal:AbortSignal):Promise<ERender>{
 if(boot.storage!=='sqlite')throw new Error('请启动本地后端并配置图像接口；当前是浏览器模式，不能执行实时换装。');
 const input={userId,sessionId:result.state.id,version:result.state.version,outfitId,avatar};
 let job=await request<{id:string;key:string;status:string;image?:string;error?:string;productIds:string[]}>('/api/render-jobs',input,signal);
 for(let i=0;i<150&&job.status==='running';i++){
  await new Promise<void>((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('已取消','AbortError'));const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},1500);function abort(){clearTimeout(timer);reject(new DOMException('已取消','AbortError'))}signal.addEventListener('abort',abort,{once:true})});
  job=await request('/api/render-jobs/'+encodeURIComponent(job.id)+'?userId='+encodeURIComponent(userId),undefined,signal);
 }
 if(job.status==='failed'||!job.image)throw new Error(job.error||'效果尚未完成，请稍后重试查询');
 return {key:job.key,image:job.image,status:job.status==='reviewed'?'reviewed':'generated-unreviewed',avatar,productIds:job.productIds};
}
