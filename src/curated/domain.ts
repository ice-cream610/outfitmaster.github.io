import {product,products,looks,renders,findRender} from './data.ts';
import type {Outfit,GenerationRequest,Specification,PurchaseItem,Avatar} from '../types.ts';
import {priceForSize} from '../agent/prices.ts';
export const subtotal=(o:Outfit)=>Math.round(o.selectedIds.reduce((s,id)=>s+Math.round(product(id).price*100),0))/100;
export const replenishment=(o:Outfit)=>o.productIds.reduce((s,id)=>s+(product(id).source==='已购'?0:Math.round(product(id).price*100)),0)/100;
export const previewCell=(o:Outfit)=>{const r=findRender(o);return r?renders.indexOf(r):null};
export const supportedAvatars=(o:Outfit)=>(['long','short','curly','pony'] as Avatar[]).filter(avatar=>!!findRender({...o,avatar}));
export const slot=(category:string)=>['裤装','裙装'].includes(category)?'下装':category;
export function recommendations(o:Outfit,replaceId:string|null){
 if(!replaceId||!o.productIds.includes(replaceId))return [];
 return products.filter(p=>p.id!==replaceId&&!o.productIds.includes(p.id)&&p.stock>0&&o.conditions.sources.includes(p.source)&&slot(p.category)===slot(product(replaceId).category)&&!!findRender({...o,productIds:o.productIds.map(id=>id===replaceId?p.id:id)})&&replenishment(o)-product(replaceId).price+p.price<=(o.conditions.budget??Infinity));
}
function validate(o:Outfit){
 if(o.conditions.budget!==null&&(!Number.isFinite(o.conditions.budget)||o.conditions.budget<0||o.conditions.budget>1000000))throw new Error('请输入有效预算，或留空不限预算');
 if(!findRender(o))throw new Error('这组搭配暂未收录，请选择已开放的单品组合');
 if(o.productIds.some(id=>product(id).stock<=0))throw new Error('商品快照显示暂不可售');
 if(o.productIds.some(id=>!o.lockedIds.includes(id)&&!o.conditions.sources.includes(product(id).source)))throw new Error('当前来源无法组成完整搭配，请保留商品池');
 if(replenishment(o)>(o.conditions.budget??Infinity))throw new Error('搭配超出待购预算，请提高预算或调整商品');
}
export function replaceProduct(o:Outfit,oldId:string,newId:string):Outfit{
 if(!o.productIds.includes(oldId))throw new Error('当前方案中没有这件商品');
 if(o.lockedIds.includes(oldId))throw new Error('这件商品已锁定，请先确认解锁');
 if(slot(product(oldId).category)!==slot(product(newId).category))throw new Error('替换商品必须属于同一类别');
 const next={...o,productIds:o.productIds.map(id=>id===oldId?newId:id),selectedIds:o.selectedIds.filter(id=>id!==oldId)};validate(next);return next;
}
export function buildOutfit(req:GenerationRequest):Outfit{
 let next=structuredClone(req.base);
 // An explicit manual reset of the outfit/preferences takes precedence over
 // the previous conversation's saved requirements. Appearance-only edits do not.
 if(req.lookId||req.conditions)delete next.chatPreferences;
 if(req.lookId){
  const look=looks.find(l=>l.id===req.lookId);if(!look)throw new Error('搭配不存在');
  if(next.lockedIds.some(id=>!look.productIds.includes(id))&&!req.confirmUnlock)throw new Error('整套切换需要先确认解锁');
  next={...next,avatar:findRender({productIds:look.productIds,avatar:next.avatar})?next.avatar:look.avatar,productIds:[...look.productIds],lockedIds:next.lockedIds.filter(id=>look.productIds.includes(id)),selectedIds:[...look.productIds],conditions:{...next.conditions,scene:look.scene,style:look.style}};
 }
 if(req.replaceId&&req.nextId)next=replaceProduct(next,req.replaceId,req.nextId);
 if(req.avatar)next.avatar=req.avatar;
 if(req.conditions){
  next.conditions=structuredClone(req.conditions);
  const matches=renders.filter(r=>next.lockedIds.every(id=>r.productIds.includes(id))).filter(r=>{
   try{validate({...next,avatar:r.avatar,productIds:r.productIds});return true}catch{return false}
  });
  const ranked=matches.map(r=>({r,score:(r.avatar===next.avatar?0.05:0)+(looks.find(l=>l.id===r.family)!.scene===next.conditions.scene?5:0)+(looks.find(l=>l.id===r.family)!.style===next.conditions.style?4:0)+r.productIds.filter(id=>next.productIds.includes(id)).length/10})).sort((a,b)=>b.score-a.score);
  if(!ranked.length)throw new Error('当前锁定、来源与预算下没有已收录的方案，请放宽条件');
  next.avatar=ranked[0].r.avatar;next.productIds=[...ranked[0].r.productIds];next.selectedIds=next.selectedIds.filter(id=>next.productIds.includes(id));
 }
 validate(next);const render=findRender(next)!;
 const changed=next.productIds.some(id=>!req.base.productIds.includes(id));
 const family=looks.find(l=>l.id===render.family)!;
 const preferenceMismatch=req.conditions&&(family.scene!==next.conditions.scene||family.style!==next.conditions.style);
 const reason=req.avatar?'已保存形象，服饰、锁定与购买勾选保持不变。':req.lookId?render.note:changed?'已更新单品与对应效果，其他锁定项保持不变；新单品请重新勾选购买。':preferenceMismatch?'已应用筛选。在当前锁定与预算下，没有同时匹配全部标签的预设，暂时保留可用方案；可解锁后体验其他风格。':'已应用条件，当前搭配满足预算与来源限制。';
 return {...next,id:crypto.randomUUID(),name:render.name,createdAt:Date.now(),imageTaskId:render.id,reason};
}
export const unitPrice=(id:string,size:string)=>{priceForSize(product(id).merchant,size);return product(id).price};
export function validatePurchase(o:Outfit,specs:Record<string,Specification>):PurchaseItem[]{
 if(!o.selectedIds.length)throw new Error('请先勾选需要购买的商品');
 return o.selectedIds.map(id=>{if(!o.productIds.includes(id))throw new Error('购买商品不属于当前搭配');const p=product(id),s=specs[id];if(!s||!p.sizes.includes(s.size))throw new Error('请选择「'+p.name+'」的尺码');if(s.quantity!==1)throw new Error('本地演示每款限选 1 件');return {productId:id,size:s.size,color:p.color,quantity:1,unitPrice:unitPrice(id,s.size)}});
}
