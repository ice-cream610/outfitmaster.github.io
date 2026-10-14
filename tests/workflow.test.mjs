import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runWorkflow,validateOutfit,inferPreferences,ownedProducts,scoreOutfit,defaultConstraints} from '../src/agent/workflow.ts';
import {parseOffline} from '../src/agent/intent.ts';
import {validatePatch} from '../server/model.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const catalog=[...read('studio-catalog.json'),...read('external-catalog.json')],users=read('users.json');
const request={anchorId:'studio-0-1',userId:'user-0'};
test('first recommendation contains anchor and valid complete outfits with exact price',async()=>{
 const r=await runWorkflow(request,catalog,users);assert.equal(r.outfits.length,3);
 for(const o of r.outfits){assert.deepEqual(validateOutfit(o.productIds,catalog,r.state,ownedProducts(users[0])),[]);assert.equal(o.totalCents,o.productIds.reduce((s,id)=>s+catalog.find(p=>p.id===id).priceCents,0));assert(o.productIds.includes(request.anchorId));assert(o.purchaseCents<=r.state.constraints.budgetCents)}
 assert.equal(r.trace.length,7);assert.equal(r.mode,'offline');
});
test('only replace bottom preserves every other product even in alternative 2',async()=>{
 const first=await runWorkflow(request,catalog,users);const current=first.outfits[1].productIds;
 const r=await runWorkflow({...request,state:first.state,currentIds:current,message:'只换裤子'},catalog,users);
 assert(r.outfits.length);const kept=current.filter(id=>catalog.find(p=>p.id===id).slot!=='bottom');
 for(const o of r.outfits)for(const id of kept)assert(o.productIds.includes(id));
 const old=current.find(id=>catalog.find(p=>p.id===id).slot==='bottom');assert(!r.outfits[0].productIds.includes(old));
});
test('locked bottom cannot be replaced',async()=>{
 const first=await runWorkflow(request,catalog,users);const bottom=first.outfits[0].productIds.find(id=>catalog.find(p=>p.id===id).slot==='bottom');
 const r=await runWorkflow({...request,state:first.state,lockedIds:[request.anchorId,bottom],message:'只换裤子'},catalog,users);assert.equal(r.outfits.length,0);assert(r.reply.includes('锁定'));
});
test('budget conflict never silently changes anchor',async()=>{
 const r=await runWorkflow({...request,userId:'user-4',conditions:{budgetCents:100}},catalog,users);assert.equal(r.outfits.length,0);assert(r.reply.includes('预算'));assert.equal(r.state.anchorId,request.anchorId);
});
test('explicit ban applies to skirts and dresses, without excluding trousers',async()=>{
 const r=await runWorkflow({...request,message:'不要裙子'},catalog,users);assert(r.outfits.length);for(const o of r.outfits)assert(o.productIds.every(id=>!['skirt','dress'].includes(catalog.find(p=>p.id===id).kind)));
});
test('dress anchor uses dress-shoes template without duplicate top or bottom',async()=>{
 const r=await runWorkflow({...request,anchorId:'studio-2-6'},catalog,users);assert(r.outfits.length);for(const o of r.outfits){const ps=o.productIds.map(id=>catalog.find(p=>p.id===id));assert(ps.some(p=>p.slot==='dress'));assert(!ps.some(p=>['top','bottom'].includes(p.slot)))}
});
test('bag anchor completes core clothing as well as keeping bag',async()=>{
 const r=await runWorkflow({...request,anchorId:'studio-0-11'},catalog,users);assert(r.outfits.length);for(const o of r.outfits)assert.deepEqual(validateOutfit(o.productIds,catalog,r.state,ownedProducts(users[0])),[]);
});
test('budget-only intent does not erase previous scene, exclusions or locks',async()=>{
 const first=await runWorkflow({...request,conditions:{scene:'职业商务'},message:'不要裙子'},catalog,users);
 const patch=parseOffline('预算改成300元，其他不变',first.state);assert.deepEqual(patch,{budgetCents:30000});
 const r=await runWorkflow({...request,state:first.state,message:'预算改成900元，其他不变'},catalog,users);assert.equal(r.state.constraints.scene,'职业商务');assert(r.state.constraints.excludeKinds.includes('skirt'));
});
test('ambiguous offline request asks for clarification, not fake understanding',async()=>{
 const r=await runWorkflow({...request,message:'像那张图里的感觉'},catalog,users);assert.equal(r.needsClarification,true);assert.equal(r.outfits.length,0);
});
test('purchases outweigh views and old events decay; cold start is uniform',()=>{
 const now=Date.parse('2026-10-14T00:00:00Z');const sample=[{id:'a',type:'purchase',productId:'studio-0-1',at:'2026-10-13T00:00:00Z'},{id:'b',type:'view',productId:'studio-1-1',at:'2026-10-13T00:00:00Z',seconds:20},{id:'c',type:'purchase',productId:'studio-3-1',at:'2025-10-13T00:00:00Z'}];
 const p=inferPreferences(sample,catalog,now);assert(p.evidence[0].weight>p.evidence[1].weight);assert(p.evidence[2].weight<p.evidence[1].weight);assert(Object.values(inferPreferences([],catalog,now).styles).every(v=>v===.2));
});
test('invalid model patch is rejected; unknown keys cannot modify session',()=>{
 assert.throws(()=>validatePatch({budgetCents:-1}));assert.throws(()=>validatePatch({lockedIds:[]}));assert.throws(()=>validatePatch({replaceSlot:'payment'}));assert.throws(()=>validatePatch({includeAccessories:'yes'}));assert.deepEqual(validatePatch({budgetCents:30000}),{budgetCents:30000});
});
test('injected LLM provider changes constraints through validated patch',async()=>{
 const provider={mode:'llm',async parse(){return validatePatch({scene:'职业商务',style:'优雅知性',budgetCents:80000})}};
 const r=await runWorkflow({...request,message:'周一去办公室见客户'},catalog,users,provider);assert.equal(r.mode,'llm');assert.equal(r.state.constraints.scene,'职业商务');assert(r.outfits.length);
});
test('whole-outfit score penalizes clashing formality, patterns and oversize pair',()=>{
 const ps=['studio-0-1','studio-0-4','studio-0-9'].map(id=>catalog.find(p=>p.id===id));const pref=inferPreferences([],catalog);
 const good=scoreOutfit(ps,{...defaultConstraints,scene:'职业商务'},pref,new Set());
 const changed=ps.map((p,i)=>({...p,fit:'loose',pattern:'print',formality:i===0?1:4,scenes:[]}));
 const bad=scoreOutfit(changed,{...defaultConstraints,scene:'职业商务'},pref,new Set());assert(good.pattern>bad.pattern);assert(good.proportion>bad.proportion);assert(good.scene>bad.scene);
});
test('missing stock, duplicate product and invalid price are rejected',async()=>{
 const r=await runWorkflow(request,catalog,users);const o=r.outfits[0];assert(validateOutfit([...o.productIds,o.productIds[0]],catalog,r.state,new Set()).length);assert(validateOutfit(['does-not-exist'],catalog,r.state,new Set()).length);
 await assert.rejects(()=>runWorkflow({...request,conditions:{budgetCents:NaN}},catalog,users));
 const missing=await runWorkflow({...request,anchorId:'studio-4-7'},catalog,users);assert.equal(missing.outfits.length,0);
});
test('cancelled model refinement does not advance state or return a result',async()=>{
 const first=await runWorkflow(request,catalog,users);const controller=new AbortController();
 const provider={mode:'llm',async parse(){controller.abort();return {budgetCents:80000}}};
 await assert.rejects(()=>runWorkflow({...request,state:first.state,message:'预算改为八百'},catalog,users,provider,controller.signal),{name:'AbortError'});
 assert.equal(first.state.version,1);assert.equal(first.state.constraints.budgetCents,90000);
});
