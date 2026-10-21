import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {products,looks,renders,idFor,makeInitial,findRender} from '../src/curated/data.ts';
import {buildOutfit,replaceProduct,recommendations,supportedAvatars,validatePurchase,subtotal} from '../src/curated/domain.ts';

test('every storefront entry starts with long hair, the selected real SKU locked and a matching image',()=>{
 for(const p of products){const o=makeInitial(p.id);assert.equal(o.avatar,'long');assert(o.productIds.includes(p.id));assert.deepEqual(o.lockedIds,[p.id]);assert(findRender(o));assert.match(p.merchant.sourceUrl,/thefrankieshop.com\/products\//);assert(p.merchant.images.every(i=>existsSync('public'+i)))}
});
test('all four complete looks support appearance-only changes without changing any clothing or selections',()=>{
 for(const look of looks){const o=buildOutfit({base:makeInitial(),lookId:look.id,confirmUnlock:true});assert.equal(supportedAvatars(o).length,4);for(const avatar of supportedAvatars(o)){const next=buildOutfit({base:o,avatar});assert.deepEqual(next.productIds,o.productIds);assert.deepEqual(next.selectedIds,o.selectedIds);assert.deepEqual(next.lockedIds,o.lockedIds);assert(findRender(next))}}
});
test('every offered replacement has an exact render and only changes the chosen slot',()=>{
 let transitions=0;
 for(const look of renders){const base={...makeInitial(),avatar:look.avatar,productIds:[...look.productIds],selectedIds:[...look.productIds],lockedIds:[]};for(const id of base.productIds){for(const p of recommendations(base,id)){const next=replaceProduct(base,id,p.id);assert(findRender(next));assert.deepEqual(next.productIds.filter(i=>i!==p.id),base.productIds.filter(i=>i!==id));assert(!next.selectedIds.includes(p.id));assert(!next.selectedIds.includes(id));transitions++}}}
 assert(transitions>=16);
});
test('locked items, unsupported combinations and low budgets cannot silently change the current image',()=>{
 const base=makeInitial(idFor('trousers'));assert.throws(()=>replaceProduct(base,idFor('trousers'),idFor('jeans')),/锁定/);
 assert.throws(()=>buildOutfit({base,lookId:'casual'}),/解锁/);
 assert.throws(()=>buildOutfit({base,conditions:{...base.conditions,budget:1}}),/没有/);
 const variant=replaceProduct({...base,lockedIds:[]},idFor('trousers'),idFor('jeans'));assert.throws(()=>buildOutfit({base:variant,avatar:'curly'}),/未收录/);
 assert.equal(base.avatar,'long');assert(base.productIds.includes(idFor('trousers')));
});
test('purchasing never changes the displayed outfit, and available SKUs use consistent demo prices',()=>{
 const base=makeInitial(),p=products[0],o={...base,selectedIds:[p.id]};assert.equal(findRender(o)?.id,findRender(base)?.id);assert.equal(subtotal(o),p.price);
 assert.throws(()=>validatePurchase(o,{}),/尺码/);assert.throws(()=>validatePurchase(o,{[p.id]:{size:p.sizes[0],quantity:2}}),/限选/);
 const items=validatePurchase(o,{[p.id]:{size:p.sizes[0],quantity:1}});const variant=p.merchant.variants!.find(v=>v.size===p.sizes[0]&&v.available)!;assert.equal(items[0].unitPrice,p.price);assert(p.price<Math.round(Number(variant.price)*720)/100);
});
test('all curated render references exist and IDs uniquely bind whole outfits and appearances',()=>{
 const keys=new Set<string>();for(const r of renders){const key=r.avatar+'|'+[...r.productIds].sort().join('|');assert(!keys.has(key));keys.add(key);assert(existsSync('public/'+r.image.slice(2)));for(const id of r.productIds)assert(products.some(p=>p.id===id))}
 assert.equal(new Set(renders.map(r=>[...r.productIds].sort().join('|'))).size,12);
 assert.equal(renders.length,24);
 const app=readFileSync('src/curated/App.tsx','utf8');assert(app.includes('调整 E 的模样'));assert(!app.includes('om-hair'));assert(!app.includes('本套效果尚未生成'));
});
