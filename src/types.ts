export type Category = '外套' | '内搭' | '裤装' | '裙装' | '鞋履' | '连衣裙' | '帽饰' | '包袋';
export type Source = '商品池' | '购物车' | '已购';
export type Avatar = 'short' | 'curly' | 'long' | 'pony';
export interface Product {id:string;name:string;category:Category;price:number;source:Source;cell:number;sheet?:'expanded';color:string;sizes:string[];stock:number;description:string}
export interface Conditions {scene:string;style:string;budget:number|null;sources:Source[]}
export interface Outfit {id:string;name:string;productIds:string[];lockedIds:string[];selectedIds:string[];avatar:Avatar;conditions:Conditions;imageTaskId:string;createdAt:number;reason:string;chatPreferences?:{requirements:string[];excludedIds:string[];scene:string|null;style:string|null}}
export interface Specification {size:string;quantity:number}
export interface PurchaseItem {productId:string;size:string;color:string;quantity:number;unitPrice:number}
export interface Message {id:string;role:'assistant'|'user';text:string;outfitId?:string}
export interface GenerationRequest {base:Outfit;replaceId?:string;nextId?:string;avatar?:Avatar;conditions?:Conditions;lookId?:string;confirmUnlock?:boolean}
export interface OutfitService {generate(request:GenerationRequest,signal:AbortSignal):Promise<Outfit>;checkout(outfit:Outfit,specs:Record<string,Specification>):Promise<PurchaseItem[]>}
