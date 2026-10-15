import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialOutfit,looks,products,renderedVariants} from '../src/data.ts';
import {replaceProduct,buildOutfit,subtotal,replenishment,previewCell,validatePurchase,recommendations,supportedAvatars} from '../src/domain.ts';
import {demoService} from '../src/services.ts';
test('single item replacement keeps locks and clears only the replaced purchase selection',()=>{
 const o=replaceProduct(initialOutfit,'denim','gray');
 assert.deepEqual(o.productIds,['jacket','knit','gray','loafers']);assert.deepEqual(o.lockedIds,['jacket']);assert.equal(subtotal(o),668);assert.equal(replenishment(o),867);assert.equal(previewCell(o),1);
 assert.equal(subtotal({...o,selectedIds:[...o.selectedIds,'gray']}),867);assert.equal(subtotal(initialOutfit),897);
});
test('purchase selection does not change visual outfit',()=>{const o={...initialOutfit,selectedIds:['jacket','denim']};assert.equal(subtotal(o),628);assert.equal(previewCell(o),0)});
test('cannot replace locked or unavailable products, or wrong categories',()=>{
 assert.throws(()=>replaceProduct({...initialOutfit,lockedIds:['jacket','denim']},'denim','gray'),/锁定/);
 assert.throws(()=>replaceProduct(initialOutfit,'denim','sand'),/缺货/);
 assert.throws(()=>replaceProduct(initialOutfit,'denim','loafers'),/同一类别/);
});
test('budget and source rules never silently relax constraints',()=>{
 const o=buildOutfit({base:initialOutfit,conditions:{...initialOutfit.conditions,budget:880}});assert.ok(replenishment(o)<=880);
 assert.throws(()=>buildOutfit({base:initialOutfit,conditions:{...initialOutfit.conditions,budget:500}}),/没有可用方案/);
 assert.throws(()=>buildOutfit({base:initialOutfit,conditions:{...initialOutfit.conditions,sources:['购物车']}}),/无法组成完整搭配/);
 assert.throws(()=>replaceProduct({...initialOutfit,conditions:{...initialOutfit.conditions,sources:['购物车']}},'denim','gray'),/来源/);
});
test('avatar-only update preserves all garments and unsupported combinations are rejected',()=>{
 const o=buildOutfit({base:initialOutfit,avatar:'curly'});assert.deepEqual(o.productIds,initialOutfit.productIds);assert.equal(previewCell(o),2);assert.throws(()=>replaceProduct(o,'denim','gray'),/精选方案/);
});
test('checkout validates sizes, quantity, availability and selected items only',()=>{
 assert.throws(()=>validatePurchase(initialOutfit,{}),/尺码/);
 const specs={jacket:{size:'M',quantity:1},denim:{size:'M',quantity:1},loafers:{size:'38',quantity:2}};
 const items=validatePurchase(initialOutfit,specs);assert.equal(items.length,3);assert.equal(items.reduce((s,i)=>s+i.unitPrice*i.quantity,0),1166);
 assert.throws(()=>validatePurchase(initialOutfit,{...specs,loafers:{size:'38',quantity:100}}),/库存/);
 assert.throws(()=>validatePurchase(initialOutfit,{...specs,loafers:{size:'38',quantity:1.5}}),/数量/);
});
test('cancelled generation cannot produce a late successful result',async()=>{const c=new AbortController();const task=demoService.generate({base:initialOutfit,replaceId:'denim',nextId:'gray'},c.signal);c.abort();await assert.rejects(task,{name:'AbortError'})});
test('recommendations exclude unavailable stock for every category',()=>{
 for(const id of initialOutfit.productIds){const list=recommendations(initialOutfit,id);assert.ok(list.every(p=>p.stock>0));assert.ok(!list.some(p=>p.id==='sand'));}
});
test('four looks have matching previews and require explicit unlock confirmation',()=>{
 assert.throws(()=>buildOutfit({base:initialOutfit,lookId:'office'}),/解锁/);
 for(const look of looks){const result=buildOutfit({base:initialOutfit,lookId:look.id,confirmUnlock:true});assert.notEqual(previewCell(result),null);assert.deepEqual(result.productIds,look.productIds);assert.equal(result.avatar,look.avatar);assert.ok(result.productIds.every(id=>products.find(p=>p.id===id)!.stock>0));}
});
test('outerwear and tops replace individually without changing other garments',()=>{
 const top=replaceProduct(initialOutfit,'knit','tee');assert.deepEqual(top.productIds,['jacket','tee','denim','loafers']);
 const outer=replaceProduct({...initialOutfit,lockedIds:[]},'jacket','cardigan');assert.deepEqual(outer.productIds,['cardigan','knit','denim','loafers']);
});

 test('every reachable recommendation and avatar has a matching full-body image',()=>{
 const seeds=[initialOutfit,...looks.map(l=>({...initialOutfit,...l})),...renderedVariants.map(v=>({...initialOutfit,...v})),{...initialOutfit,productIds:['jacket','knit','gray','loafers']},{...initialOutfit,avatar:'curly' as const}];
 for(const seed of seeds){const o={...seed,lockedIds:[],conditions:{...initialOutfit.conditions,budget:2000}};
 assert.notEqual(previewCell(o),null);
 for(const id of o.productIds)for(const p of recommendations(o,id)){assert.ok(p.stock>0);const next=replaceProduct(o,id,p.id);assert.notEqual(previewCell(next),null);assert.equal(next.productIds.filter((v,i)=>v!==o.productIds[i]).length,1)}
 for(const avatar of supportedAvatars(o))assert.notEqual(previewCell(buildOutfit({base:o,avatar})),null);
 }
 assert.throws(()=>buildOutfit({base:initialOutfit,avatar:'pony'}),/不支持/);
 });
