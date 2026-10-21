import {products,idFor} from './data.ts';
import type {DemoShopping} from './sets.ts';

export type DiscoverySource='recommend'|'cart'|'owned';
export const sourceOptions: {id:DiscoverySource;label:string;emoji:string}[]=[
 {id:'recommend',label:'给点商品推荐',emoji:'✨'},
 {id:'cart',label:'还在购物车纠结',emoji:'🤔'},
 {id:'owned',label:'已经买了但不会搭',emoji:'🥺'},
];
// Seeded demo contexts; merchant photographs and SKUs remain real. Local shopping
// activity extends these fixtures without fabricating purchases in order history.
const cartSeeds=['blazer','shorts','knit','boots','anorak','trench'] as const;
const ownedSeeds=['shirt','jeans','tee','flats','skirt','track'] as const;
export function discoveryProducts(source:DiscoverySource,query:string,shopping:DemoShopping){
 const owned=new Set([...ownedSeeds.map(idFor),...shopping.orders.flatMap(o=>o.items.map(i=>i.productId))]);
 const cart=new Set([...cartSeeds.map(idFor),...shopping.bag.map(i=>i.productId)]);
 const search=query.trim().toLowerCase();
 return products.filter(p=>(source==='recommend'||(source==='owned'?owned.has(p.id):cart.has(p.id)))&&
  (!search||[p.name,p.merchant.name,p.color,p.merchant.description].join(' ').toLowerCase().includes(search)));
}
