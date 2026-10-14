import {product,products,looks,renderedVariants} from './data.ts';
import type {Outfit,GenerationRequest,Specification,PurchaseItem} from './types.ts';
export const subtotal=(o:Outfit)=>o.selectedIds.reduce((s,id)=>s+product(id).price,0);
export const replenishment=(o:Outfit)=>o.productIds.reduce((s,id)=>s+(product(id).source==='已购'?0:product(id).price),0);
export function previewCell(o:Outfit):number|null{
 if(o.productIds.join(',')==='jacket,knit,denim,loafers'&&['short','curly'].includes(o.avatar))return o.avatar==='short'?0:2;
 if(o.productIds.join(',')==='jacket,knit,gray,loafers'&&o.avatar==='short')return 1;
 const look=looks.find(l=>l.avatar===o.avatar&&l.productIds.join(',')===o.productIds.join(','));
 return look?10+look.cell:renderedVariants.find(v=>v.avatar===o.avatar&&v.productIds.join(',')===o.productIds.join(','))?.cell??null;
}
export const supportedAvatars=(o:Outfit)=>(['short','long','curly','pony'] as const).filter(avatar=>previewCell({...o,avatar})!==null);
export const slot=(category:string)=>['裤装','裙装'].includes(category)?'下装':category;
export function recommendations(o:Outfit,replaceId:string|null){
 return products.filter(p=>!!replaceId&&previewCell({...o,productIds:o.productIds.map(id=>id===replaceId?p.id:id)})!==null&&p.stock>0&&!o.productIds.includes(p.id)&&o.conditions.sources.includes(p.source)&&(!replaceId||slot(p.category)===slot(product(replaceId).category))&&(!replaceId||replenishment(o)-(product(replaceId).source==='已购'?0:product(replaceId).price)+(p.source==='已购'?0:p.price)<=o.conditions.budget));
}
export function replaceProduct(base:Outfit,oldId:string,newId:string):Outfit{
 if(!base.productIds.includes(oldId))throw new Error('当前搭配中没有这件商品');
 if(base.lockedIds.includes(oldId))throw new Error('这件商品已锁定，请先确认解锁');
 const next=product(newId),old=product(oldId);
 if(slot(next.category)!==slot(old.category))throw new Error('替换商品必须属于同一类别');
 if(next.stock<1)throw new Error('这件商品暂时缺货，请选择其他单品');
 if(!base.conditions.sources.includes(next.source))throw new Error('当前来源中没有这件商品，请调整筛选');
 const result={...base,productIds:base.productIds.map(id=>id===oldId?newId:id),selectedIds:base.selectedIds.filter(id=>id!==oldId)};
 if(replenishment(result)>base.conditions.budget)throw new Error('搭配超出待购预算，请提高预算或调整商品');
 if(previewCell(result)===null)throw new Error('这组搭配不在精选方案中，请选择推荐的单品');
 return result;
}
export function buildOutfit(req:GenerationRequest):Outfit{
 let result=structuredClone(req.base);
 if(req.lookId){
  const look=looks.find(l=>l.id===req.lookId);if(!look)throw new Error('搭配不存在');
  const conflicts=result.lockedIds.filter(id=>!look.productIds.includes(id));
  if(conflicts.length&&!req.confirmUnlock)throw new Error('整套切换需要先确认解锁');
  result={...result,productIds:[...look.productIds],avatar:look.avatar,lockedIds:result.lockedIds.filter(id=>look.productIds.includes(id)),selectedIds:look.productIds.filter(id=>product(id).source!=='已购'),conditions:{...result.conditions,scene:look.scene}};
  if(result.productIds.some(id=>product(id).stock<=0))throw new Error('该搭配暂不可售');
  if(result.productIds.some(id=>!result.lockedIds.includes(id)&&!result.conditions.sources.includes(product(id).source)))throw new Error('当前来源不包含此搭配，请调整来源');
  if(replenishment(result)>result.conditions.budget)throw new Error('此搭配超出待购预算，请调整预算');
 }

 if(req.conditions){
  result.conditions=structuredClone(req.conditions);
  const pants=result.productIds.find(id=>slot(product(id).category)==='下装')!;
  const candidates=products.filter(p=>slot(p.category)==='下装'&&p.stock>0&&result.conditions.sources.includes(p.source)).sort((a,b)=>a.price-b.price);
  const currentAllowed=result.conditions.sources.includes(product(pants).source)||result.lockedIds.includes(pants);
  if(!currentAllowed||replenishment(result)>result.conditions.budget){
   const candidate=candidates.find(p=>{try{replaceProduct(result,pants,p.id);return true}catch{return false}});
   if(!candidate)throw new Error('当前来源、锁定项和预算下没有可用方案，请放宽条件');
   result=replaceProduct(result,pants,candidate.id);
  }
  // Only locked entry items survive a source change; never silently broaden the candidate pool.
  if(result.productIds.some(id=>!result.lockedIds.includes(id)&&!result.conditions.sources.includes(product(id).source)))throw new Error('当前来源无法组成完整搭配，请保留已购与商品池，或调整锁定项');
 }
 if(req.replaceId&&req.nextId)result=replaceProduct(result,req.replaceId,req.nextId);
 if(req.avatar)result.avatar=req.avatar;
 if(previewCell(result)===null)throw new Error('当前搭配不支持此形象，请选择已开放的形象');
 const id=crypto.randomUUID();
 const changed=result.productIds.some((id,i)=>id!==req.base.productIds[i]);
 const reason=req.lookId?'已切换整套搭配与对应形象，商品和待购金额同步更新；请重新确认购买规格。':req.avatar?'已更新形象预设，所有服饰与购买勾选保持不变。':changed?`已更新需要调整的单品，其他商品保持不变。当前待购搭配 ¥${replenishment(result)}；新单品请重新确认是否购买。`:`已应用「${result.conditions.scene} · ${result.conditions.style}」，现有示例商品满足预算与来源条件，保留当前搭配。`;
 return {...result,id,createdAt:Date.now(),imageTaskId:'demo-'+id,name:looks.find(l=>l.productIds.join(',')===result.productIds.join(','))?.name||(result.productIds.includes('gray')?'利落通勤 · 换一种轻盈':'我的搭配 · 新灵感'),reason};
}
export function validatePurchase(o:Outfit,specs:Record<string,Specification>):PurchaseItem[]{
 if(!o.selectedIds.length)throw new Error('请先勾选需要购买的商品');
 return o.selectedIds.map(id=>{
  const p=product(id),s=specs[id];
  if(!s||!p.sizes.includes(s.size))throw new Error('请选择「'+p.name+'」的尺码');
  if(!Number.isInteger(s.quantity)||s.quantity<1||s.quantity>p.stock)throw new Error('「'+p.name+'」库存不足或数量无效');
  return {productId:id,size:s.size,color:p.color,quantity:s.quantity,unitPrice:p.price};
 });
}
