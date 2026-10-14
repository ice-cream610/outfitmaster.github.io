import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';
import {extractGeneratedImage,renderKey} from '../server/render.mjs';
import {priceForSize} from '../src/agent/prices.ts';
const root=new URL('../',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const products=read('data/merchant-catalog.json'),manifest=read('data/e-render-manifest.json');
test('production catalog contains real storefront records and original photos only',()=>{
 assert.equal(products.length,92);for(const p of products){assert.equal(p.source,'merchant');assert(p.sourceUrl.startsWith('https://thefrankieshop.com/products/'));assert(p.description.length>20);assert(p.originalPrice);assert.equal(p.originalCurrency,'USD');assert.equal(p.priceCents,Math.round(Number(p.originalPrice)*7.2*100));assert(p.stockNote.includes('未公开'));for(const image of p.images){assert(image.startsWith('/merchant/'));assert(existsSync(new URL('public'+image,root)))}for(const cached of p.cacheFiles)assert.equal(cached.sha256,createHash('sha256').update(readFileSync(new URL('public'+cached.url,root))).digest('hex'))}
});
test('cached E render binds an exact product set and original character, never a different outfit',()=>{
 const r=manifest.renders[0];assert.equal(r.key,renderKey(r.productIds,r.avatar));assert.equal(r.key,renderKey([...r.productIds].reverse(),r.avatar));assert.notEqual(r.key,renderKey([...r.productIds.slice(1)],r.avatar));assert.notEqual(r.key,renderKey(r.productIds,'long'));assert.equal(r.status,'generated-unreviewed');assert(r.productIds.every(id=>products.some(p=>p.id===id)));assert(existsSync(new URL('public'+r.image,root)));
});
test('image adapter only extracts returned output images, not input or text',()=>{
 assert.equal(extractGeneratedImage({steps:[{type:'user_input',content:[{type:'image',data:'input'}]}]}),undefined);
 assert.equal(extractGeneratedImage({steps:[{type:'model_output',content:[{type:'text',text:'done'},{type:'image',data:'output',mime_type:'image/png'}]}]}).data,'output');
 assert.equal(extractGeneratedImage({outputs:[{type:'text',text:'failed'}]}),undefined);
});
test('checkout uses selected available SKU price instead of inventing stock or trusting client price',()=>{
 const p={...products[0],sizes:['S','M'],variants:[{size:'S',available:true,price:'85.00'},{size:'M',available:true,price:'95.00'},{size:'L',available:false,price:'80.00'}]};
 assert.equal(priceForSize(p,'S'),61200);assert.equal(priceForSize(p,'M'),68400);assert.throws(()=>priceForSize(p,'L'));
});
test('E identity remains the exact user-supplied asset, not a newly drawn vector character',()=>{
 const identity=read('data/e-identity-contract.json');assert.equal(identity.redesignAuthorized,false);assert.equal(identity.sha256,createHash('sha256').update(readFileSync(new URL(identity.path,root))).digest('hex'));
 const component=readFileSync(new URL('src/mvp/Avatar.tsx',root),'utf8');assert(!component.includes('<svg'));assert(component.includes('/reference/e/identity-sheet.png'));
});
