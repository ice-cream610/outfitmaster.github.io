import merchant from '../../data/merchant-catalog.json' with {type:'json'};
import type {CatalogItem} from '../agent/types.ts';
import type {Avatar,Product,Outfit,Category} from '../types.ts';

// This is a finite, photographed merchant wardrobe. The atlas is indexed by the
// complete product set AND avatar, never by a garment color or approximate match.
export const wardrobe={
 blazer:['15621033951392','Newark 灰色细条纹西装'], shirt:['15830335553696','Mela 浅蓝修身衬衫'],
 trousers:['15621034115232','Brickell 灰色条纹阔腿裤'], flats:['15119194620064','Maude 黑色漆皮平底鞋'],
 jeans:['7567394209952','Isabella 水洗蓝牛仔裤'], tee:['15135618433184','Laval 奶油白廓形 T 恤'],
 shorts:['14662803357856','Pomona 酒红抽绳短裤'], grayShorts:['15830335914144','Kate 灰色混纺短裤'],
 polo:['15899158642848','Vila 奶油白 Polo 衫'], knit:['15830335750304','Gala 巧克力棕高领针织'],
 skirt:['15830336372896','Samantha 深海军蓝拉链半裙'], boots:['15829183332512','Camille 黑色皮革长靴'],
 brownPants:['15685221843104','Dune 深棕拼接长裤'], navyKnit:['15830334406816','Gala 海军蓝高领针织'],
 anorak:['15803170357408','Sora 橄榄色尼龙套头外套'], track:['15803170422944','Sora 橄榄色阔腿运动裤'],
 moccasins:['15129428164768','Low Classic 深棕羊毛莫卡辛鞋'], trench:['15899159003296','Orival 深橄榄短风衣']
} as const;
type Garment=keyof typeof wardrobe;
export const idFor=(key:Garment)=>'tfs-'+wardrobe[key][0];
export interface RealProduct extends Product {merchant:CatalogItem}
export const products:RealProduct[]=Object.values(wardrobe).map(([id,name],cell)=>{
 const m=(merchant as unknown as CatalogItem[]).find(p=>p.id==='tfs-'+id)!;
 if(!m)throw new Error('Missing real merchant product: '+id);
 const category:Category=m.slot==='outer'?'外套':m.slot==='top'?'内搭':m.slot==='shoes'?'鞋履':/Skirt/.test(m.name)?'裙装':'裤装';
 return {id:m.id,name,category,price:m.priceCents/100,source:'商品池',cell,color:m.color,sizes:m.sizes,stock:m.stock>0?1:0,description:m.description??'',merchant:m};
});
export const product=(id:string):RealProduct=>{const p=products.find(p=>p.id===id);if(!p)throw new Error('商品不属于当前精选衣橱');return p};
export const avatarLabels:Record<Avatar,string>={long:'长直发 · 方框眼镜',short:'短碎发 · 轻松自然',curly:'齐肩卷发 · 圆框眼镜',pony:'高马尾 · 活力俏皮'};
const families:{id:string;label:string;name:string;scene:string;style:string;keys:Garment[];variants:[Garment,Garment][];note:string}[]=[
 {id:'office',label:'知性通勤',name:'知性通勤 · 干练不拘谨',scene:'职业商务',style:'优雅知性',keys:['blazer','shirt','trousers','flats'],variants:[['trousers','jeans'],['shirt','tee']],note:'细条纹西装与同色长裤形成整体，浅蓝衬衫提亮；也可以只换牛仔裤，放松一点。'},
 {id:'casual',label:'松弛日常',name:'松弛日常 · 一点酒红的心动',scene:'日常休闲',style:'简约大气',keys:['tee','shorts','flats'],variants:[['shorts','grayShorts'],['tee','polo']],note:'奶油白与酒红形成柔和对比，利落平底鞋收住轮廓。短裤和上衣都准备了单件替换。'},
 {id:'knit',label:'温柔秋日',name:'温柔秋日 · 织物与皮革的相遇',scene:'拍照出片',style:'优雅知性',keys:['knit','skirt','boots'],variants:[['skirt','brownPants'],['knit','navyKnit']],note:'厚实针织与带光泽的半裙形成材质对比，长靴连接下装线条，棕与深蓝保持沉稳。'},
 {id:'outdoor',label:'轻装周末',name:'轻装周末 · 走进橄榄绿',scene:'日常休闲',style:'冷酷中性',keys:['anorak','track','moccasins'],variants:[['track','jeans'],['anorak','trench']],note:'同色尼龙上下装统一整体，毛绒鞋增加柔软触感；换牛仔裤或短风衣可以改变材质节奏。'}
];
export const looks=families.map((f,index)=>({...f,avatar:'long' as Avatar,productIds:f.keys.map(idFor),cell:index}));
export interface RenderedLook {id:string;family:string;avatar:Avatar;productIds:string[];image:string;cell:number;columns:number;rows:number;name:string;note:string}
export const renders:RenderedLook[]=families.flatMap(f=>{
 const base=f.keys.map(idFor),image='./curated/'+f.id+'-v1.png';
 const outfits=[base,...f.variants.map(([before,after])=>base.map(id=>id===idFor(before)?idFor(after):id))];
 return [0,1,2,3,4,5].map(cell=>({id:f.id+'-'+cell,family:f.id,avatar:cell<3?'long':(['short','curly','pony'] as Avatar[])[cell-3],productIds:outfits[cell<3?cell:0],image,cell,columns:3,rows:2,name:f.name+(cell===1?' · 下装新灵感':cell===2?' · 换一种层次':''),note:f.note}));
});
export const outfitKey=(ids:string[],avatar:Avatar)=>avatar+'|'+[...ids].sort().join('|');
export const findRender=(o:Pick<Outfit,'productIds'|'avatar'>)=>renders.find(r=>outfitKey(r.productIds,r.avatar)===outfitKey(o.productIds,o.avatar));
export function makeInitial(entryId=idFor('blazer')):Outfit{
 const render=renders.find(r=>r.avatar==='long'&&r.productIds.includes(entryId));
 if(!render)throw new Error('此商品尚未纳入当前精选搭配');
 const family=looks.find(l=>l.id===render.family)!;
 return {id:'initial-'+entryId,name:render.name,productIds:[...render.productIds],lockedIds:[entryId],selectedIds:[...render.productIds],avatar:'long',conditions:{scene:family.scene,style:family.style,budget:16000,sources:['商品池','购物车','已购']},imageTaskId:render.id,createdAt:Date.now(),reason:render.note};
}
export const avatarExample=(avatar:Avatar):Outfit=>({...makeInitial(),avatar});
