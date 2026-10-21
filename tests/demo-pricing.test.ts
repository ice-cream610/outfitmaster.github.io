import {test} from 'node:test';
import assert from 'node:assert/strict';
import {products,makeInitial} from '../src/curated/data.ts';
import {unitPrice,subtotal,replenishment} from '../src/curated/domain.ts';
import {readShopping} from '../src/curated/sets.ts';
import {priceForSize} from '../src/agent/prices.ts';
test('demo catalog, SKU checkout and outfit totals share affordable prices',()=>{
 for(const p of products){assert(p.price>=59&&p.price<=329);assert(p.price<p.merchant.priceCents/100);for(const size of p.sizes)assert.equal(unitPrice(p.id,size),p.price)}
 assert.equal(subtotal(makeInitial()),756);assert.equal(replenishment(makeInitial()),756);
});
test('previous merchant-price shopping records survive repricing',()=>{
 const p=products[0],item={productId:p.id,size:p.sizes[0],color:p.color,quantity:1,unitPrice:priceForSize(p.merchant,p.sizes[0])/100};
 const saved=JSON.stringify({bag:[item],orders:[{id:'old',simulated:true,items:[item],total:item.unitPrice}]});
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>saved}});
 try{const result=readShopping();assert.equal(result.bag[0].unitPrice,299);assert.equal(result.orders[0].total,299)}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage')}
});
