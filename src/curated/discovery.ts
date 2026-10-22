import {products} from './data.ts';
import type {DemoShopping} from './sets.ts';

export type DiscoverySource='recommend'|'cart'|'owned';
export const sourceOptions: {id:DiscoverySource;label:string;emoji:string}[]=[
 {id:'recommend',label:'给点商品推荐',emoji:'✨'},
 {id:'cart',label:'还在购物车纠结',emoji:'🤔'},
 {id:'owned',label:'已经买了但不会搭',emoji:'🥺'},
];
// Demo source contexts are exclusive; completed purchases take priority.
const cartSeeds=products.filter((_,i)=>i%3===1).map(p=>p.id);
const ownedSeeds=products.filter((_,i)=>i%3===2).map(p=>p.id);
export function discoveryProducts(source:DiscoverySource,query:string,shopping:DemoShopping){
 const owned=new Set([...ownedSeeds,...shopping.orders.flatMap(o=>o.items.map(i=>i.productId))]);
 const cart=new Set([...cartSeeds,...shopping.bag.map(i=>i.productId)]);
 const search=query.trim().toLowerCase();
 return products.filter(p=>(source==='owned'?owned.has(p.id):source==='cart'?cart.has(p.id)&&!owned.has(p.id):!owned.has(p.id)&&!cart.has(p.id))&&
  (!search||[p.name,p.merchant.name,p.color,p.merchant.description].join(' ').toLowerCase().includes(search)));
}
