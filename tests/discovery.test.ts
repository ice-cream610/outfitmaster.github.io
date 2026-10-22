import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoveryProducts} from '../src/curated/discovery.ts';
import {idFor,product,products} from '../src/curated/data.ts';
import {unitPrice} from '../src/curated/domain.ts';
const empty={bag:[],orders:[]};
test('garment category intersects source and search without leaking other products',()=>{
 const skirt=product(idFor('plum-skirt'));
 assert.deepEqual(discoveryProducts('owned','李子紫',empty,'裙装').map(p=>p.id),[skirt.id]);
 assert.equal(discoveryProducts('owned','李子紫',empty,'裤装').length,0);
 assert.equal(discoveryProducts('cart','李子紫',empty,'裙装').length,0);
 const tops=discoveryProducts('recommend','',empty,'内搭');
 assert(tops.length>0);assert(tops.every(p=>p.category==='内搭'));
 assert.deepEqual(discoveryProducts('recommend','',empty,'全部'),discoveryProducts('recommend','',empty));
});
test('discovery sources select distinct demo products and intersect with search',()=>{
 assert.equal(discoveryProducts('recommend','',empty).length,18);
 const cart=discoveryProducts('cart','',empty),owned=discoveryProducts('owned','',empty);
 assert.equal(cart.length,18);assert.equal(owned.length,17);assert.notDeepEqual(cart,owned);
 assert.equal(discoveryProducts('owned',' 李子紫 ',empty)[0].id,idFor('plum-skirt'));
 assert.equal(discoveryProducts('cart','李子紫',empty).length,0);
});
test('local shopping extends fixtures without duplicates and ignores unknown catalog ids',()=>{
 const p=product(idFor('berry-knit')),item={productId:p.id,size:p.sizes[0],color:p.color,quantity:1,unitPrice:unitPrice(p.id,p.sizes[0])};
 const bag=[item,item,{...item,productId:'unknown'}];
 assert.equal(discoveryProducts('cart','',{bag,orders:[]}).length,19);
 const order={id:'demo',setId:'test',createdAt:'2026-10-21',items:[item],total:item.unitPrice,simulated:true as const};
 assert.equal(discoveryProducts('owned','',{bag:[],orders:[order]}).length,18);
 assert.equal(discoveryProducts('owned','莓果',{bag:[],orders:[order]})[0].id,p.id);
});

test('sources partition all products with owned taking priority over cart and recommendations',()=>{
 const p=product(idFor('berry-knit')),item={productId:p.id,size:p.sizes[0],color:p.color,quantity:1,unitPrice:p.price};
 const shopping={bag:[item],orders:[{id:'demo',setId:'test',createdAt:'2026-10-21',items:[item],total:p.price,simulated:true as const}]};
 const lists=(['recommend','cart','owned'] as const).map(source=>discoveryProducts(source,'',shopping).map(p=>p.id));
 const all=lists.flat();assert.equal(all.length,products.length);assert.equal(new Set(all).size,products.length);
 assert(!lists[0].includes(p.id));assert(!lists[1].includes(p.id));assert(lists[2].includes(p.id));
});
