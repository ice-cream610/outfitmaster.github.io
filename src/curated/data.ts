import catalog from '../../data/editorial-catalog.json' with {type:'json'};
import type {CatalogItem} from '../agent/types.ts';
import type {Avatar,Product,Outfit,Category} from '../types.ts';

type Row=[string,string,Category,number,string,number,string];
const rows=catalog.products as Row[];
export const idFor=(key:string)=>'edit-'+key;
export const wardrobe=Object.fromEntries(rows.map(([key,name])=>[key,[key,name]]));
export const demoPrices=Object.fromEntries(rows.map(([key,,,price])=>[key,price]));
export interface RealProduct extends Product {merchant:CatalogItem;reference:number}
const material=(name:string)=>/绒/.test(name)?'绒感织物':/缎|礼服/.test(name)?'缎面织物':/针织|毛衣|开衫/.test(name)?'针织面料':/皮|鞋|靴/.test(name)?'皮革质感':/帆布/.test(name)?'帆布':'棉混纺质感';
export const products:RealProduct[]=rows.map(([key,name,category,price,color,reference,description],cell)=>{
 const id=idFor(key),sizes=category==='鞋履'?['35','36','37','38','39','40']:['帽饰','包袋'].includes(category)?['均码']:['S','M','L'];
 const families=catalog.families.filter(f=>f.keys.includes(key)||f.variants.some(v=>v.includes(key)));
 const slot:CatalogItem['slot']=category==='外套'?'outer':category==='内搭'?'top':category==='鞋履'?'shoes':category==='连衣裙'?'dress':['帽饰','包袋'].includes(category)?'bag':'bottom';
 const copy=name+'。'+families[0].note;
 const merchant:CatalogItem={id,name,slot,kind:category,priceCents:price*100,stock:1,color,hex:'#777777',hue:0,saturation:0.5,lightness:0.5,
  styles:[...new Set(families.map(f=>f.style))] as CatalogItem['styles'],scenes:[...new Set(families.map(f=>f.scene))] as CatalogItem['scenes'],formality:category==='连衣裙'?5:2,fit:'regular',pattern:/条纹|格纹/.test(name)?'stripe':/花|提花/.test(name)?'print':'solid',seasons:['spring','autumn'],
  images:['/editorial/product-'+key+'.png'],source:'studio',sourceUrl:'#product/'+id,sourceTitle:'参考图灵感 · 模拟商品',description:copy+'\n设计细节：'+description,sizes,currency:'CNY',priceNote:'Demo 模拟价格',merchant:'STUDIO EDIT',merchantProductId:id,merchantCategory:category,capturedAt:'2026-10-21',availability:'模拟可选',stockNote:'演示规格',materials:[material(name)+'（模拟描述）'],variants:sizes.map(size=>({id:id+'-'+size,size,available:true,price:String(price),currency:'CNY',sku:id+'-'+size}))};
 return {id,name,category,price,source:'商品池',cell,color,sizes,stock:1,description:copy,merchant,reference};
});
export const product=(id:string):RealProduct=>{const p=products.find(p=>p.id===id);if(!p)throw new Error('此商品已不在当前灵感衣橱');return p};
export const avatarLabels:Record<Avatar,string>={long:'长直发 · 方框眼镜',short:'短碎发 · 轻松自然',curly:'齐肩卷发 · 圆框眼镜',pony:'高马尾 · 活力俏皮'};
const familyAvatars:Record<string,Avatar>={artist:'curly',petrol:'pony',city:'long',arctic:'short',orchid:'curly',sweet:'pony',tailor:'short',gala:'long'};
export const looks=catalog.families.map((f,cell)=>({...f,avatar:familyAvatars[f.id]??'long',productIds:f.keys.map(idFor),cell}));
export interface RenderedLook {id:string;family:string;avatar:Avatar;productIds:string[];image:string;cell:number;columns:number;rows:number;name:string;note:string}
export const renders:RenderedLook[]=catalog.families.flatMap((f,index)=>{
 const base=f.keys.map(idFor),variants=f.variants.map(([before,after])=>base.map(id=>id===idFor(before)?idFor(after):id));
 const combined=base.map(id=>{const swap=f.variants.find(([before])=>id===idFor(before));return swap?idFor(swap[1]):id});
 return (index<4?[0,1,2,[4,5,3,4][index]]:[0,1,2,3]).map(cell=>{
  const swap=cell===1||cell===2?f.variants[cell-1]:null;
  return {id:f.id+'-'+cell,family:f.id,avatar:index<4?(cell<3?'long':(['short','curly','pony'] as Avatar[])[cell-3]):familyAvatars[f.id],productIds:cell<3?[base,...variants][cell]:index<4?base:combined,image:'./editorial/'+f.id+'.png',cell,columns:index<4?3:2,rows:2,
   name:swap?f.label+' · '+product(idFor(swap[1])).name:index>=4&&cell===3?f.label+' · 双重变奏':f.name,note:swap?'将'+product(idFor(swap[0])).name+'换成'+product(idFor(swap[1])).name+'，保留其余单品。'+f.note:f.note};
 });
});
export const outfitKey=(ids:string[],avatar:Avatar)=>avatar+'|'+[...ids].sort().join('|');
export const findRender=(o:Pick<Outfit,'productIds'|'avatar'>)=>renders.find(r=>outfitKey(r.productIds,r.avatar)===outfitKey(o.productIds,o.avatar));
export function makeInitial(entryId=products[0].id):Outfit{
 const render=renders.find(r=>r.productIds.includes(entryId));
 if(!render)throw new Error('此商品尚未纳入当前精选搭配');
 const family=looks.find(l=>l.id===render.family)!;
 return {id:'initial-'+entryId,name:render.name,productIds:[...render.productIds],lockedIds:[entryId],selectedIds:[...render.productIds],avatar:render.avatar,conditions:{scene:family.scene,style:family.style,budget:null,sources:['商品池','购物车','已购']},imageTaskId:render.id,createdAt:Date.now(),reason:render.note};
}
export const avatarExample=(avatar:Avatar):Outfit=>{const r=renders.find(r=>r.avatar===avatar)!;return {...makeInitial(r.productIds[0]),productIds:r.productIds,avatar}};
