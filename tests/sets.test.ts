import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sets,setImages,defaultPreferences,recommendSets,setPrice,asOutfit,selectedPurchase,mergeBag,purchaseTotal,familyFor,normalizePreferences} from '../src/curated/sets.ts';
import {product,outfitKey,findRender} from '../src/curated/data.ts';
import {unitPrice} from '../src/curated/domain.ts';

test('set discovery has twelve distinct complete outfits, exact image galleries and no entry-item locks',()=>{
 assert.equal(sets.length,12);assert.equal(new Set(sets.map(r=>outfitKey(r.productIds,r.avatar))).size,12);
 for(const r of sets){assert.deepEqual(asOutfit(r).lockedIds,[]);assert(findRender(asOutfit(r)));const gallery=setImages(r);assert.equal(gallery.length,r.cell===0?4:1);for(const image of gallery)assert.equal(outfitKey(image.productIds,'long'),outfitKey(r.productIds,'long'))}
 assert.equal(new Set(sets.slice(0,4).map(r=>r.family)).size,4);
});
test('preference matching respects style, occasion and total outfit budget together; no silent budget relaxation',()=>{
 assert.equal(recommendSets(defaultPreferences).length,12);
 const office=sets.find(r=>r.id==='office-0')!;
 const matching=recommendSets({scene:'职业商务',style:'优雅知性',budget:String(setPrice(office))});
 assert(matching.length);assert(matching.every(r=>familyFor(r).scene==='职业商务'&&familyFor(r).style==='优雅知性'&&setPrice(r)<=setPrice(office)));
 assert.deepEqual(recommendSets({...defaultPreferences,budget:'1'}),[]);
 assert.deepEqual(recommendSets({...defaultPreferences,style:'甜美可爱'}),[]);
 assert.deepEqual(normalizePreferences({style:'corrupt',budget:'NaN'}),defaultPreferences);
});
test('set purchases require sizes only for checked pieces and never alter the complete outfit image',()=>{
 const r=sets[0],before=JSON.stringify(r),id=r.productIds[0],size=product(id).sizes[0];
 assert.throws(()=>selectedPurchase(r,[id],{}),/尺码/);assert.throws(()=>selectedPurchase(r,[],{}),/勾选/);
 const items=selectedPurchase(r,[id],{[id]:{size,quantity:1}});
 assert.equal(items.length,1);assert.equal(items[0].unitPrice,unitPrice(id,size));assert.equal(purchaseTotal(items),unitPrice(id,size));assert.equal(JSON.stringify(r),before);
 assert.throws(()=>selectedPurchase(r,[id,id],{[id]:{size,quantity:1}}),/重复/);
 const outside=sets.find(s=>s.productIds.some(p=>!r.productIds.includes(p)))!.productIds.find(p=>!r.productIds.includes(p))!;
 assert.throws(()=>selectedPurchase(r,[outside],{}),/不属于/);
 assert.throws(()=>selectedPurchase(r,[id],{[id]:{size:'INVALID',quantity:1}}),/尺码/);
});
test('repeated add-to-bag merges identical SKUs while preserving different sizes and money totals',()=>{
 const r=sets[0],id=r.productIds[0],p=product(id);
 const a=selectedPurchase(r,[id],{[id]:{size:p.sizes[0],quantity:1}});
 assert.equal(mergeBag(a,a).length,1);
 if(p.sizes.length>1){const b=selectedPurchase(r,[id],{[id]:{size:p.sizes[1],quantity:1}});const merged=mergeBag(a,b);assert.equal(merged.length,2);assert.equal(Math.round(purchaseTotal(merged)*100),Math.round(purchaseTotal(a)*100)+Math.round(purchaseTotal(b)*100))}
});
