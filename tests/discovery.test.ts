import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoveryProducts} from '../src/curated/discovery.ts';
import {idFor,product} from '../src/curated/data.ts';
import {unitPrice} from '../src/curated/domain.ts';
const empty={bag:[],orders:[]};
test('discovery sources select distinct real products and intersect with search',()=>{
 assert.equal(discoveryProducts('recommend','',empty).length,6);
 const cart=discoveryProducts('cart','',empty),owned=discoveryProducts('owned','',empty);
 assert.equal(cart.length,6);assert.equal(owned.length,6);assert.notDeepEqual(cart,owned);
 assert.equal(discoveryProducts('owned',' 牛仔裤 ',empty)[0].id,idFor('jeans'));
 assert.equal(discoveryProducts('cart','牛仔裤',empty).length,0);
});
test('local shopping extends fixtures without duplicates and ignores unknown catalog ids',()=>{
 const p=product(idFor('polo')),item={productId:p.id,size:p.sizes[0],color:p.color,quantity:1,unitPrice:unitPrice(p.id,p.sizes[0])};
 const bag=[item,item,{...item,productId:'unknown'}];
 assert.equal(discoveryProducts('cart','',{bag,orders:[]}).length,7);
 const order={id:'demo',setId:'test',createdAt:'2026-10-21',items:[item],total:item.unitPrice,simulated:true as const};
 assert.equal(discoveryProducts('owned','',{bag:[],orders:[order]}).length,7);
 assert.equal(discoveryProducts('owned','Polo',{bag:[],orders:[order]})[0].id,p.id);
});

test('sources partition all products with owned taking priority over cart and recommendations',()=>{
 const p=product(idFor('polo')),item={productId:p.id,size:p.sizes[0],color:p.color,quantity:1,unitPrice:p.price};
 const shopping={bag:[item],orders:[{id:'demo',setId:'test',createdAt:'2026-10-21',items:[item],total:p.price,simulated:true as const}]};
 const lists=(['recommend','cart','owned'] as const).map(source=>discoveryProducts(source,'',shopping).map(p=>p.id));
 const all=lists.flat();assert.equal(all.length,18);assert.equal(new Set(all).size,18);
 assert(!lists[0].includes(p.id));assert(!lists[1].includes(p.id));assert(lists[2].includes(p.id));
});
