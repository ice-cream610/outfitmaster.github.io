import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {products,looks,renders,idFor,makeInitial,findRender} from '../src/curated/data.ts';
import {buildOutfit,replaceProduct,recommendations,supportedAvatars,validatePurchase,subtotal} from '../src/curated/domain.ts';
import {asOutfit,sets} from '../src/curated/sets.ts';

test('all 53 demo products have independent assets, internal detail links and exact entry outfits',()=>{
 assert.equal(products.length,53);
 for(const p of products){const o=makeInitial(p.id);assert(o.productIds.includes(p.id));assert.deepEqual(o.lockedIds,[p.id]);assert(findRender(o));assert.equal(p.merchant.sourceUrl,'#product/'+p.id);assert(p.id.startsWith('edit-'));assert(p.merchant.images.every(i=>existsSync('public'+i)))}
 assert.equal(new Set(products.map(p=>p.merchant.images[0])).size,53);
});
test('supported appearance changes keep clothing, locks and selections intact',()=>{
 for(const r of sets){const o=asOutfit(r);assert(supportedAvatars(o).length<=2);for(const avatar of supportedAvatars(o)){const next=buildOutfit({base:o,avatar});assert.deepEqual(next.productIds,o.productIds);assert.deepEqual(next.selectedIds,o.selectedIds);assert.deepEqual(next.lockedIds,o.lockedIds);assert(findRender(next))}}
});
test('every offered single-piece replacement has an exact render and preserves other items',()=>{
 let transitions=0;
 for(const r of sets){const base=asOutfit(r);let count=0;for(const id of base.productIds)for(const p of recommendations(base,id)){const next=replaceProduct(base,id,p.id);assert(findRender(next));assert.deepEqual(next.productIds.filter(i=>i!==p.id),base.productIds.filter(i=>i!==id));assert(!next.selectedIds.includes(p.id));assert(!next.selectedIds.includes(id));transitions++;count++}assert(count>=1,r.id+' has no replacement')}
 assert(transitions>=80);
});
test('locks, unsupported combinations and finite budgets reject invalid outfits',()=>{
 const base=makeInitial(idFor('plum-skirt'));
 assert.throws(()=>replaceProduct(base,idFor('plum-skirt'),idFor('mustard-pants')),/锁定/);
 assert.throws(()=>buildOutfit({base,lookId:'mint'}),/解锁/);
 assert.throws(()=>buildOutfit({base,conditions:{...base.conditions,budget:1}}),/没有/);
 const variant=replaceProduct({...base,lockedIds:[]},idFor('plum-skirt'),idFor('mustard-pants'));
 assert.throws(()=>buildOutfit({base:variant,avatar:'curly'}),/未收录/);
 assert(base.productIds.includes(idFor('plum-skirt')));
});
test('blank budget remains null across serialization and style changes can select all new styles',()=>{
 const base={...makeInitial(),lockedIds:[]};
 assert.equal(JSON.parse(JSON.stringify(base)).conditions.budget,null);
 for(const f of looks){const next=buildOutfit({base,conditions:{scene:f.scene,style:f.style,budget:null,sources:['商品池']}});const r=findRender(next)!;const selected=looks.find(f=>f.id===r.family)!;assert.equal(selected.scene,f.scene);assert.equal(selected.style,f.style)}
 for(const budget of [-1,NaN,Infinity])assert.throws(()=>buildOutfit({base,conditions:{...base.conditions,budget}}));
});
test('purchase validation uses demo prices and cannot change the displayed outfit',()=>{
 const base=makeInitial(),p=products[0],o={...base,selectedIds:[p.id]};assert.equal(findRender(o)?.id,findRender(base)?.id);assert.equal(subtotal(o),p.price);
 assert.throws(()=>validatePurchase(o,{}),/尺码/);assert.throws(()=>validatePurchase(o,{[p.id]:{size:p.sizes[0],quantity:2}}),/限选/);
 assert.equal(validatePurchase(o,{[p.id]:{size:p.sizes[0],quantity:1}})[0].unitPrice,p.price);
});
test('44 clothing combinations bind unique exact assets with only four extra avatar alternatives',()=>{
 const keys=new Set<string>();for(const r of renders){const key=r.avatar+'|'+[...r.productIds].sort().join('|');assert(!keys.has(key));keys.add(key);assert(existsSync('public/'+r.image.slice(2)));for(const id of r.productIds)assert(products.some(p=>p.id===id))}
 assert.equal(new Set(renders.map(r=>[...r.productIds].sort().join('|'))).size,44);assert.equal(renders.length,48);
});
