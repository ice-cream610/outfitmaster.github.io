import type {CatalogItem,DemoUser,Behavior,Preferences,Constraints,SessionState,WorkflowRequest,WorkflowResult,IntentProvider,TraceStep,Recommendation,Score,Slot,Style} from './types.ts';
import {scenes,styles} from './types.ts';
import {parseOffline} from './intent.ts';
import knowledge from '../../data/styling-knowledge.json' with {type:'json'};
export const defaultConstraints:Constraints={scene:'日常休闲',style:'自动',budgetCents:1200000,excludeSlots:[],excludeKinds:[],excludeColors:[],preferColors:[],preferFit:'',includeAccessories:false};
export const scoreWeights:Score=knowledge.weights;
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const mean=(ns:number[])=>ns.length?ns.reduce((s,n)=>s+n,0)/ns.length:.5;
export function inferPreferences(events:Behavior[],catalog:CatalogItem[],now=Date.now()):Preferences {
 const byId=new Map(catalog.map(p=>[p.id,p]));const counts:Partial<Record<Style,number>>={};const colors:Record<string,number>={};const evidence:Preferences['evidence']=[];
 for(const event of events){
  const p=byId.get(event.productId);if(!p)continue;
  const age=Math.max(0,(now-Date.parse(event.at))/86400000);if(!Number.isFinite(age))continue;
  const base={view:.6,favorite:2,purchase:4,dismiss:-2}[event.type];
  const duration=event.type==='view'?Math.min(1.5,Math.max(.2,(event.seconds??20)/40)):1;
  const weight=base*duration*Math.exp(-age/30);
  for(const style of p.styles)counts[style]=(counts[style]??0)+weight/p.styles.length;
  colors[p.color]=(colors[p.color]??0)+weight;evidence.push({productId:p.id,type:event.type,weight:Math.round(weight*100)/100});
 }
 const sum=Object.values(counts).reduce((s,n)=>s+Math.max(0,n??0),0);
 for(const key of styles)counts[key]=sum?Math.max(0,counts[key]??0)/sum:1/styles.length;
 return {styles:counts,colors,evidence: evidence.slice(-40),sampleCount:events.length};
}
export function ownedProducts(user:DemoUser){return new Set(user.events.filter(e=>e.type==='purchase').map(e=>e.productId))}
export const purchaseTotal=(items:CatalogItem[],owned:Set<string>)=>items.reduce((s,p)=>s+(owned.has(p.id)?0:p.priceCents),0);
function allowed(p:CatalogItem,c:Constraints){return p.stock>0&&!c.excludeSlots.includes(p.slot)&&!c.excludeKinds.includes(p.kind)&&!c.excludeColors.some(color=>p.color.includes(color))}
export function colorCompatibility(a:CatalogItem,b:CatalogItem){
 if(a.saturation<.16||b.saturation<.16)return .93;
 const diff=Math.min(Math.abs(a.hue-b.hue),360-Math.abs(a.hue-b.hue));
 if(diff<40)return .92;
 if(diff>150&&Math.min(a.saturation,b.saturation)<.45)return .82;
 return a.saturation>.6&&b.saturation>.6?.35:.67;
}
export function scoreOutfit(items:CatalogItem[],c:Constraints,pref:Preferences,owned:Set<string>):Score {
 const pairs:number[]=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)pairs.push(colorCompatibility(items[i],items[j]));
 const common=styles.map(s=>items.filter(p=>p.styles.includes(s)).length/items.length);
 const style= c.style==='自动'?Math.max(...common):mean(items.map(p=>p.styles.includes(c.style as Style)?1:.35));
 const goal=c.scene==='正式礼服'?4:c.scene==='职业商务'?3: c.scene==='日常休闲'?1.5:2.5;
 const formal=items.map(p=>p.formality);
 const scene=mean(items.map(p=>p.scenes.includes(c.scene)?1:clamp(1-Math.abs(p.formality-goal)*.25)))*(.85+.15*clamp(1-(Math.max(...formal)-Math.min(...formal))/4));
 const top=items.find(p=>p.slot==='top'),bottom=items.find(p=>p.slot==='bottom');
 const proportion=top&&bottom?(top.fit==='loose'&&bottom.fit==='loose'?.6:top.fit==='slim'&&bottom.fit==='loose'?1:.85):.9;
 const patterned=items.filter(p=>p.pattern!=='solid').length;
 const maxPref=Math.max(.01,...Object.values(pref.styles).map(n=>n??0));
 let preference=mean(items.map(p=>mean(p.styles.map(s=>(pref.styles[s]??.2)/maxPref))));
 if(c.style!=='自动')preference=.7*style+.3*preference;
 if(c.preferFit)preference=.65*preference+.35*mean(items.filter(p=>['top','bottom','dress'].includes(p.slot)).map(p=>p.fit===c.preferFit?1:.2));
 if(c.preferColors.length)preference=.6*preference+.4*(items.some(p=>c.preferColors.some(color=>p.color.includes(color)))?1:.1);
 return {color:mean(pairs),style,scene,proportion,pattern:patterned<=1?1:patterned===2?.6:.3,preference,value:clamp(1-purchaseTotal(items,owned)/Math.max(1,c.budgetCents))};
}
export function validateOutfit(ids:string[],catalog:CatalogItem[],state:SessionState,owned:Set<string>,preserved:string[]=[]):string[]{
 const errors:string[]=[];const items=ids.map(id=>catalog.find(p=>p.id===id));
 if(items.some(p=>!p))return ['商品 ID 不存在'];
 const ps=items as CatalogItem[];const counts=(slot:Slot)=>ps.filter(p=>p.slot===slot).length;
 if(new Set(ids).size!==ids.length)errors.push('存在重复商品');
 if(!ids.includes(state.anchorId))errors.push('入口商品未保留');
 if([...state.lockedIds,...preserved].some(id=>!ids.includes(id)))errors.push('锁定或局部保留商品被改变');
 if(!(counts('dress')===1&&counts('top')===0&&counts('bottom')===0||counts('dress')===0&&counts('top')===1&&counts('bottom')===1))errors.push('搭配需要一件上衣与一件下装，或一件连衣裙');
 if(counts('shoes')!==1||counts('outer')>1||counts('bag')>1)errors.push('鞋履缺失或品类重复');
 if(ps.some(p=>!allowed(p,state.constraints)))errors.push('商品违反库存或排除条件');
 if(purchaseTotal(ps,owned)>state.constraints.budgetCents)errors.push('超过待购预算');
 return errors;
}
function assertConstraints(c:Constraints){
 if(!scenes.includes(c.scene)||!(c.style==='自动'||styles.includes(c.style)))throw new Error('无效的场景或风格');
 if(!Number.isSafeInteger(c.budgetCents)||c.budgetCents<0||c.budgetCents>100000000)throw new Error('预算必须是有效金额');
 for(const key of ['excludeSlots','excludeKinds','excludeColors','preferColors'] as const)if(!Array.isArray(c[key])||c[key].some(v=>typeof v!=='string'))throw new Error('条件格式不正确');
}
export async function runWorkflow(request:WorkflowRequest,catalog:CatalogItem[],users:DemoUser[],provider?:IntentProvider,signal?:AbortSignal):Promise<WorkflowResult>{
 signal?.throwIfAborted();
 const trace:TraceStep[]=[];let tick=performance.now();
 const log=(name:string,summary:string,details:unknown,status:TraceStep['status']='ok')=>{const now=performance.now();trace.push({name,summary,details,status,durationMs:Math.round(now-tick)});tick=now};
 const user=users.find(u=>u.id===request.userId);if(!user)throw new Error('请选择有效的演示用户');
 const anchor=catalog.find(p=>p.id===request.anchorId);if(!anchor)throw new Error('入口商品不存在');
 const base=request.state;
 if(base&&(base.anchorId!==anchor.id||base.userId!==user.id))throw new Error('会话与入口商品或用户不一致');
 const state:SessionState=base?structuredClone(base):{id:crypto.randomUUID(),version:0,anchorId:anchor.id,userId:user.id,lockedIds:[anchor.id],currentIds:[],constraints:structuredClone(defaultConstraints),rejectedIds:[]};
 if(request.currentIds)state.currentIds=[...request.currentIds];
 if(request.lockedIds)state.lockedIds=[...new Set([anchor.id,...request.lockedIds])];
 state.constraints={...state.constraints,...request.conditions};
 assertConstraints(state.constraints);
 if([...state.lockedIds,...state.currentIds].some(id=>!catalog.some(p=>p.id===id)))throw new Error('会话包含无效商品');
 log('接收输入','读取入口商品、标签和当前方案',{anchorId:anchor.id,images:anchor.images,conditions:state.constraints,baseVersion:state.version});
 const preferences=inferPreferences(user.events,catalog);const owned=ownedProducts(user);
 log('推断用户偏好',preferences.sampleCount?`依据 ${preferences.sampleCount} 条行为，购买权重高于浏览`:'无历史记录，使用均衡先验',{...preferences,formula:'eventWeight × dwellFactor × exp(-ageDays/30); purchase=4, favorite=2, view=0.6, dismiss=-2',note:'模拟行为；权重是可调启发式，不代表购买概率'});
 const mode=provider?.mode??'offline';
 const patch=request.message?.trim()?await (provider?.parse(request.message,state,signal)??Promise.resolve(parseOffline(request.message,state))):{};
 signal?.throwIfAborted();
 const {replaceSlot= request.replaceSlot,cheaper,lockSlots,unlockSlots,clarification,...conditions}=patch;
 state.constraints={...state.constraints,...conditions};assertConstraints(state.constraints);
 if(cheaper&&!('budgetCents' in patch)&&state.currentIds.length){const current=state.currentIds.map(id=>catalog.find(p=>p.id===id)!);state.constraints.budgetCents=Math.min(state.constraints.budgetCents,Math.floor(purchaseTotal(current,owned)*.85));}
 if(unlockSlots)state.lockedIds=state.lockedIds.filter(id=>id===anchor.id||!unlockSlots.includes(catalog.find(p=>p.id===id)!.slot));
 if(lockSlots)state.lockedIds=[...new Set([...state.lockedIds,...state.currentIds.filter(id=>lockSlots.includes(catalog.find(p=>p.id===id)!.slot))])];
 log('解析需求',request.message?(mode==='llm'?'语言模型返回结构化修改':'离线规则解析本次修改'):'首次推荐使用标签和历史偏好',{message:request.message??null,patch,effective:state.constraints,mode},clarification?'warning':'ok');
 const result=(outfits:Recommendation[],reply:string,needsClarification=false):WorkflowResult=>({state,outfits,trace,preferences,reply,mode,needsClarification});
 if(clarification)return result([],clarification,true);
 if(request.selectedProductId&&!replaceSlot)throw new Error('指定替换商品时必须提供品类');
 const preserved=replaceSlot?state.currentIds.filter(id=>catalog.find(p=>p.id===id)!.slot!==replaceSlot):[];
 if(replaceSlot){
  const old=state.currentIds.find(id=>catalog.find(p=>p.id===id)!.slot===replaceSlot);
  if(!old)return result([],`当前方案没有可替换的该类商品。`,true);
  if(state.lockedIds.includes(old))return result([],'要替换的商品已锁定，请先解锁；入口商品始终保留。',true);
  if(!request.selectedProductId)state.rejectedIds=[...new Set([...state.rejectedIds,old])].slice(-40);
 }
 const requiredIds=[...new Set([...state.lockedIds,...preserved,anchor.id,...(request.selectedProductId?[request.selectedProductId]:[])])];
 const required=requiredIds.map(id=>catalog.find(p=>p.id===id));
 if(required.some(p=>!p))throw new Error('替换商品不存在');
 const fixed=required as CatalogItem[];
 if(request.selectedProductId&&fixed.find(p=>p.id===request.selectedProductId)!.slot!==replaceSlot)throw new Error('替换商品品类不一致');
 if(fixed.some(p=>!allowed(p,state.constraints)))return result([],'锁定或保留的商品与排除条件、库存冲突，请调整条件或解锁商品。',true);
 if(purchaseTotal(fixed,owned)>state.constraints.budgetCents)return result([],'锁定与保留商品已超过待购预算，请提高预算或解锁可调整单品。',true);
 const hasDress=fixed.some(p=>p.slot==='dress'),hasSeparates=fixed.some(p=>p.slot==='top'||p.slot==='bottom');
 if(hasDress&&hasSeparates)return result([],'连衣裙不能与当前锁定的上下装同时组成基础方案，请解锁冲突商品。',true);
 const templates:Slot[][]=hasDress?[['dress','shoes']]:hasSeparates?[['top','bottom','shoes']]:[['top','bottom','shoes'],['dress','shoes']];
 if(state.constraints.includeAccessories)for(const slots of templates)slots.push('bag');
 for(const slots of templates)for(const p of fixed)if(!slots.includes(p.slot))slots.push(p.slot);
 const pool=catalog.filter(p=>allowed(p,state.constraints)&&!state.rejectedIds.includes(p.id));
 log('检索候选',`筛选后 ${pool.length} 件商品；保留 ${fixed.length} 件`,{candidateIds:pool.map(p=>p.id),requiredIds,templates,replaceSlot:replaceSlot??null,ownedIds:[...owned]});
 let evaluated=0;const complete:Recommendation[]=[];
 for(const slots of templates){
  if(slots.some(slot=>fixed.filter(p=>p.slot===slot).length>1))continue;
  let beam:CatalogItem[][]=[[]];
  for(const slot of slots){
   const locked=fixed.find(p=>p.slot===slot);let candidates=locked?[locked]:pool.filter(p=>p.slot===slot);
   // Keep inexpensive candidates as well as high-scoring ones; feasibility precedes taste.
   candidates=candidates.sort((a,b)=>b.styles.reduce((s,st)=>s+(preferences.styles[st]??0),0)-a.styles.reduce((s,st)=>s+(preferences.styles[st]??0),0));
   const cheap=[...candidates].sort((a,b)=>(owned.has(a.id)?0:a.priceCents)-(owned.has(b.id)?0:b.priceCents)).slice(0,8);
   candidates=[...new Map([...candidates.slice(0,22),...cheap].map(p=>[p.id,p])).values()];
   const expanded=beam.flatMap(combo=>candidates.map(p=>[...combo,p])).filter(combo=>purchaseTotal(combo,owned)<=state.constraints.budgetCents);
   evaluated+=expanded.length;
   expanded.sort((a,b)=>weighted(scoreOutfit(b,state.constraints,preferences,owned))-weighted(scoreOutfit(a,state.constraints,preferences,owned)));
   beam=expanded.slice(0,160);
  }
  for(const combo of beam){
   const ids=combo.map(p=>p.id);if(validateOutfit(ids,catalog,state,owned,preserved).length)continue;
   const breakdown=scoreOutfit(combo,state.constraints,preferences,owned);
   const common=styles.reduce((a,b)=>combo.filter(p=>p.styles.includes(a)).length>=combo.filter(p=>p.styles.includes(b)).length?a:b);
   complete.push({id:crypto.randomUUID(),productIds:ids,totalCents:combo.reduce((s,p)=>s+p.priceCents,0),purchaseCents:purchaseTotal(combo,owned),score:Math.round(weighted(breakdown)*100),breakdown,reasons:[`以${anchor.name}为中心，${state.constraints.style==='自动'?common:state.constraints.style}贯穿整套。`,`颜色协调 ${Math.round(breakdown.color*100)} 分，场景适配 ${Math.round(breakdown.scene*100)} 分；${combo.filter(p=>p.pattern!=='solid').length>1?'允许多图案混搭，注意视觉重点':'用纯色留白突出主要单品'}。`,`待购 ¥${(purchaseTotal(combo,owned)/100).toFixed(0)}，${combo.filter(p=>owned.has(p.id)).length} 件已有衣物不重复计价。`],formula:slots.map(slot=>({top:'上衣',bottom:'下装',dress:'连衣裙',shoes:'鞋履',outer:'外套',bag:'包袋'}[slot])).join(' ＋ ')});
  }
 }
 complete.sort((a,b)=>b.score-a.score||a.purchaseCents-b.purchaseCents);
 const selected:Recommendation[]=[];const seen=new Set<string>();
 for(const candidate of complete){
  const key=[...candidate.productIds].sort().join('|');if(seen.has(key))continue;seen.add(key);
  // Alternatives should differ in at least two movable slots when available.
  if(selected.some(o=>candidate.productIds.filter(id=>!o.productIds.includes(id)).length<(replaceSlot?1:2)))continue;
  selected.push(candidate);if(selected.length===3)break;
 }
 if(!selected.length&&complete.length)selected.push(complete[0]);
 log('组合与整体评分',`评估 ${evaluated} 个部分组合，得到 ${complete.length} 套可行方案`,{weights:scoreWeights,beamWidth:160,heuristic:true,probability:false,selected:selected.map(o=>({productIds:o.productIds,score:o.score,breakdown:o.breakdown})),note:'有界束搜索，无法证明无解或全局最优；无结果时说明本次候选搜索未找到方案'});
 if(!selected.length)return result([],'本次候选搜索没有找到满足全部条件的完整搭配。可以提高预算、放宽排除条件，或更换入口商品。');
 log('校验硬约束','商品、结构、库存、预算和锁定项全部通过',selected.map(o=>({id:o.id,errors:validateOutfit(o.productIds,catalog,state,owned,preserved)})));
 state.version+=1;state.currentIds=selected[0].productIds;
 log('保存方案与效果状态','保存商品组合；E 效果必须绑定同一组合与角色',{version:state.version,renderer:'original E identity + garment-reference image editing',imageStatus:'not_generated',note:'没有匹配效果图时显示商品原图与明确标注的角色参考，不用二维贴图或旧图片冒充上身效果'});
 return result(selected,`${selected.length} 套搭配已准备好。${replaceSlot?'仅替换指定品类，其他商品保持。':''}${selected[0].reasons[0]}`);
}
function weighted(score:Score){return (Object.keys(scoreWeights) as (keyof Score)[]).reduce((sum,key)=>sum+score[key]*scoreWeights[key],0)}
