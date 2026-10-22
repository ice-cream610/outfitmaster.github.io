import {priceForSize} from '../agent/prices.ts';
import {looks,renders,product,outfitKey} from './data.ts';
import type {RenderedLook} from './data.ts';
import type {Outfit,PurchaseItem,Specification} from '../types.ts';
import {unitPrice,validatePurchase} from './domain.ts';

export const scenes=['日常休闲','职业商务','拍照出片','正式礼服'];
export const styles=['简约大气','甜美可爱','优雅知性','冷酷中性','创意设计'];
export interface SetPreferences {scene:string;style:string;budget:string}
export const defaultPreferences:SetPreferences={scene:'全部',style:'全部',budget:''};
export function normalizePreferences(value:Partial<SetPreferences>|null):SetPreferences{
 return {scene:scenes.includes(value?.scene??'')?value!.scene!:'全部',style:styles.includes(value?.style??'')?value!.style!:'全部',budget:typeof value?.budget==='string'&&Number.isFinite(Number(value.budget))&&Number(value.budget)>0?value.budget:''};
}
export const minimumPrice=(id:string)=>Math.min(...product(id).sizes.map(size=>unitPrice(id,size)));
export const setPrice=(r:RenderedLook)=>Math.round(r.productIds.reduce((sum,id)=>sum+Math.round(minimumPrice(id)*100),0))/100;
const displayOrder=['berry','gala','city','sweet','forest','mint','tailor','artist','orchid','petrol','arctic','apple'];
export const sets=renders.filter(r=>r.columns===2||r.cell<3).sort((a,b)=>a.cell-b.cell||displayOrder.indexOf(a.family)-displayOrder.indexOf(b.family));
export const familyFor=(r:RenderedLook)=>looks.find(l=>l.id===r.family)!;
export const setImages=(r:RenderedLook)=>renders.filter(other=>outfitKey(other.productIds,'long')===outfitKey(r.productIds,'long'));
export function recommendSets(prefs:SetPreferences){
 const limit=prefs.budget===''?Infinity:Number(prefs.budget);
 if(!Number.isFinite(limit)&&limit!==Infinity||limit<=0)return [];
 return sets.filter(r=>{const f=familyFor(r);return (prefs.scene==='全部'||f.scene===prefs.scene)&&(prefs.style==='全部'||f.style===prefs.style)&&setPrice(r)<=limit});
}
export function asOutfit(r:RenderedLook,selectedIds=r.productIds):Outfit{
 const f=familyFor(r);return {id:r.id,name:r.name,productIds:[...r.productIds],selectedIds:[...selectedIds],lockedIds:[],avatar:r.avatar,conditions:{scene:f.scene,style:f.style,budget:null,sources:['商品池']},imageTaskId:r.id,createdAt:0,reason:r.note};
}
export function selectedPurchase(r:RenderedLook,selected:string[],specs:Record<string,Specification>){
 if(new Set(selected).size!==selected.length)throw new Error('购买商品不能重复');
 return validatePurchase(asOutfit(r,selected),specs);
}
export const purchaseTotal=(items:PurchaseItem[])=>items.reduce((sum,item)=>sum+Math.round(item.unitPrice*100)*item.quantity,0)/100;
export function mergeBag(current:PurchaseItem[],added:PurchaseItem[]){
 const items=new Map(current.map(item=>[item.productId+'|'+item.size,item]));
 for(const item of added)items.set(item.productId+'|'+item.size,{...item,quantity:1});
 return [...items.values()];
}
export interface DemoOrder {id:string;setId:string;createdAt:string;items:PurchaseItem[];total:number;simulated:true}
export interface DemoShopping {bag:PurchaseItem[];orders:DemoOrder[]}
export const shoppingKey='om.curated.set-shopping.v1';
export const preferencesKey='om.curated.set-preferences.v1';
export function readShopping():DemoShopping{
 try{const value=JSON.parse(localStorage.getItem(shoppingKey)||'{}');const valid=(item:PurchaseItem)=>{try{return item.quantity===1&&(item.unitPrice===unitPrice(item.productId,item.size)||item.unitPrice===priceForSize(product(item.productId).merchant,item.size)/100)}catch{return false}};
  return {bag:Array.isArray(value.bag)?value.bag.filter(valid).map((i:PurchaseItem)=>({...i,unitPrice:unitPrice(i.productId,i.size)})):[],orders:Array.isArray(value.orders)?value.orders.filter((o:DemoOrder)=>o.simulated===true&&typeof o.id==='string'&&Array.isArray(o.items)&&o.items.every(valid)&&o.total===purchaseTotal(o.items)).slice(0,20).map((o:DemoOrder)=>{const items=o.items.map(i=>({...i,unitPrice:unitPrice(i.productId,i.size)}));return {...o,items,total:purchaseTotal(items)}}):[]};
 }catch{return {bag:[],orders:[]}}
}
