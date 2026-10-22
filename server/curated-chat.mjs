import {readFileSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {products,product,renders,findRender,looks} from '../src/curated/data.ts';
import {slot,replenishment} from '../src/curated/domain.ts';
import {scenes,styles} from '../src/agent/types.ts';

const slots=['内搭','外套','下装','连衣裙','鞋履','帽饰','包袋'];
const ids=products.map(p=>p.id);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const string=(v,max)=>typeof v==='string'&&v.length<=max;
function list(v,allowed,max=64){return Array.isArray(v)&&v.length<=max&&new Set(v).size===v.length&&v.every(x=>allowed.includes(x))}
function requirements(v){return Array.isArray(v)&&v.length<=12&&v.every(x=>string(x,200))}
const fail=message=>{throw new Error(message)};

export function validateChatInput(input){
 if(!object(input)||!string(input.message,2000)||!input.message.trim())fail('需求请输入 1～2000 字');
 const o=input.base;
 if(!object(o)||!string(o.id,150)||!list(o.productIds,ids,12)||!findRender(o)||!list(o.lockedIds,o.productIds)||!list(o.selectedIds,o.productIds))fail('当前搭配状态无效，请重新打开穿搭页');
 const c=o.conditions;
 if(!object(c)||!scenes.includes(c.scene)||!styles.includes(c.style)||(c.budget!==null&&(!Number.isFinite(c.budget)||c.budget<0||c.budget>1000000))||!list(c.sources,['商品池','购物车','已购'],3))fail('当前搭配条件无效');
 const memory=o.chatPreferences;
 if(memory&&(!object(memory)||!requirements(memory.requirements)||!list(memory.excludedIds,ids)||!(memory.scene===null||scenes.includes(memory.scene))||!(memory.style===null||styles.includes(memory.style))))fail('对话偏好无效，请重新开始');
 if(!Array.isArray(input.history)||input.history.length>12||input.history.some(m=>!object(m)||!['assistant','user'].includes(m.role)||!string(m.text,2000)))fail('对话历史无效');
 // Never forward arbitrary fields, client-provided URLs, prices or instructions.
 const render=findRender(o);
 return {message:input.message.trim(),history:input.history.map(({role,text})=>({role,text})),base:{id:o.id,name:render.name,productIds:[...o.productIds],lockedIds:[...o.lockedIds],selectedIds:[...o.selectedIds],avatar:o.avatar,conditions:structuredClone(c),imageTaskId:render.id,createdAt:Date.now(),reason:'',...(memory?{chatPreferences:structuredClone(memory)}:{})}};
}

export function validateIntent(v){
 const keys=['action','reply','requirements','excludedIds','keepIds','changeSlots','budget','scene','style','cheaper'];
 if(!object(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||!['recommend','reply','appearance'].includes(v.action)||!string(v.reply,1000)||!requirements(v.requirements)||!list(v.excludedIds,ids)||!list(v.keepIds,ids)||!(v.changeSlots===null||list(v.changeSlots,slots,7))||!(v.budget===null||Number.isFinite(v.budget)&&v.budget>=0&&v.budget<=1000000)||!(v.scene===null||scenes.includes(v.scene))||!(v.style===null||styles.includes(v.style))||typeof v.cheaper!=='boolean')fail('模型需求解析结构不合法，原搭配已保留，请重试');
 return v;
}

export function selectCandidates(base,intent){
 const budget=intent.budget??base.conditions.budget;
 const unchanged=slots.filter(s=>intent.changeSlots!==null&&!intent.changeSlots.includes(s));
 const sameSlot=(r,s)=>r.productIds.filter(id=>slot(product(id).category)===s).sort().join('|')===base.productIds.filter(id=>slot(product(id).category)===s).sort().join('|');
 return renders.filter(r=>{
  const family=looks.find(l=>l.id===r.family);
  const total=replenishment({...base,productIds:r.productIds});
  if(r.avatar!==base.avatar&&(intent.changeSlots!==null||findRender({productIds:r.productIds,avatar:base.avatar})))return false;
  return [...base.lockedIds,...intent.keepIds].every(id=>r.productIds.includes(id))&&
   r.productIds.every(id=>!intent.excludedIds.includes(id)&&product(id).stock>0&&(base.lockedIds.includes(id)||base.conditions.sources.includes(product(id).source)))&&
   total<=(budget??Infinity)&&(!intent.cheaper||Math.round(total*100)<Math.round(replenishment(base)*100))&&
   (!intent.scene||family.scene===intent.scene)&&(!intent.style||family.style===intent.style)&&unchanged.every(s=>sameSlot(r,s));
 });
}

function validateDecision(v,candidates){
 if(!object(v)||Object.keys(v).sort().join(',')!=='checks,renderId,reply'||!string(v.reply,1200)||!v.reply.trim()||!(v.renderId===null||candidates.some(r=>r.id===v.renderId))||!Array.isArray(v.checks)||v.checks.length<1||v.checks.length>16||v.checks.some(c=>!object(c)||!string(c.requirement,250)||typeof c.met!=='boolean'||!string(c.evidence,350))||(v.renderId!==null&&v.checks.some(c=>!c.met)))fail('模型评审结果未通过校验，原搭配已保留，请重试');
 return v;
}

export function createProductImageLoader(root){
 const cache=new Map();
 return id=>{
  if(!cache.has(id)){
   const photo=product(id).merchant.images[0];
   if(!/^\/(?:merchant|editorial)\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(photo))fail('商品参考图路径无效');
   const bytes=readFileSync(path.join(root,'public',photo.slice(1)));
   if(bytes.length>5*1024*1024)fail('商品参考图过大');
   // Resize transport copies only; catalog originals remain untouched.
   cache.set(id,sharp(bytes).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).jpeg({quality:82}).toBuffer().then(bytes=>({id,url:`data:image/jpeg;base64,${bytes.toString('base64')}`})).catch(error=>{cache.delete(id);throw error}));
  }
  return cache.get(id);
 };
}

const describe=p=>({id:p.id,name:p.name,slot:slot(p.category),color:p.color,estimatedCNY:p.price,description:p.description.slice(0,700),materials:p.merchant.materials,fit:p.merchant.fit});

export async function runCuratedChat(input,{provider,loadImage,onTrace=()=>{}},signal){
 const {base,message,history}=validateChatInput(input);
 const trace={id:crypto.randomUUID(),at:new Date().toISOString(),model:provider.status.model,baseId:base.id,steps:[]};
 const add=(stage,data)=>trace.steps.push({stage,...data});
 const finish=(reply,outfit=null,action='reply')=>({reply,outfit,action,baseId:base.id,model:provider.status.model,trace});
 try{
  if(!provider.status.configured)fail(provider.status.message);
  signal?.throwIfAborted();
  let start=Date.now();
  const parsed=await provider.complete('intent',{message,history,current:base,memory:base.chatPreferences??null,products:products.map(describe)},[],signal);
  const intent=validateIntent(parsed.value);
  if(intent.keepIds.some(id=>!base.productIds.includes(id)))fail('模型要求保留不存在的当前单品，原搭配已保留');
  add('理解需求',{intent,usage:parsed.usage,durationMs:Date.now()-start});
  if(intent.action!=='recommend')return finish(intent.reply||'请进一步描述你的穿搭需求。',null,intent.action);
  const candidates=selectCandidates(base,intent);
  add('硬条件筛选',{count:candidates.length,renderIds:candidates.map(r=>r.id),lockedIds:base.lockedIds,budget:intent.budget??base.conditions.budget,changeSlots:intent.changeSlots});
  if(!candidates.length)return finish('当前锁定单品、预算、品类或风格要求下，预生成搭配库里没有符合条件的方案，原搭配已保留。'+(base.lockedIds.length?'你可以先点击左侧锁按钮解锁允许更换的商品，或调整预算/需求。':'可以调整预算或需求；目前还不支持任意商品组合实时试穿。'));
  const imageIds=[...new Set([...base.productIds,...candidates.flatMap(r=>r.productIds)])];
  start=Date.now();
  const images=await Promise.all(imageIds.map(loadImage));
  signal?.throwIfAborted();
  const judged=await provider.complete('rank',{message,intent,current:base,candidates:candidates.map(r=>({renderId:r.id,productIds:r.productIds,estimatedCNY:replenishment({...base,productIds:r.productIds}),scene:looks.find(l=>l.id===r.family).scene,style:looks.find(l=>l.id===r.family).style})),products:imageIds.map(id=>describe(product(id)))},images,signal);
  signal?.throwIfAborted();
  const decision=validateDecision(judged.value,candidates);
  add('视觉评审',{decision,productImageIds:imageIds,usage:judged.usage,durationMs:Date.now()-start});
  if(!decision.renderId)return finish(decision.reply);
  // Recheck membership, not model-provided product IDs or prices.
  const chosen=selectCandidates(base,intent).find(r=>r.id===decision.renderId);
  if(!chosen)fail('搭配校验失败，原搭配已保留');
  const family=looks.find(l=>l.id===chosen.family);
  const outfit={...base,id:crypto.randomUUID(),name:chosen.name,avatar:chosen.avatar,productIds:[...chosen.productIds],selectedIds:base.selectedIds.filter(id=>chosen.productIds.includes(id)),conditions:{...base.conditions,budget:intent.budget??base.conditions.budget,scene:intent.scene??family.scene,style:intent.style??family.style},imageTaskId:chosen.id,createdAt:Date.now(),reason:decision.reply,chatPreferences:{requirements:intent.requirements,excludedIds:intent.excludedIds,scene:intent.scene,style:intent.style}};
  add('应用前校验',{renderId:chosen.id,productIds:chosen.productIds,estimatedCNY:replenishment(outfit),locksPreserved:true,avatarPreserved:chosen.avatar===base.avatar});
  return finish(decision.reply,outfit,'recommend');
 }catch(e){add('未应用',{message:e.name==='AbortError'?'已取消':e.message});throw e}
 finally{try{onTrace(trace)}catch{/* Diagnostics cannot turn a valid outfit into a failure. */}}
}
