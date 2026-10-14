export const scenes = ['日常休闲','职业商务','拍照出片','正式礼服'] as const;
export const styles = ['简约大气','甜美可爱','优雅知性','冷酷中性','创意设计'] as const;
export type Scene = typeof scenes[number];
export type Style = typeof styles[number];
export type Slot = 'top'|'bottom'|'dress'|'outer'|'shoes'|'bag';
export interface CatalogItem {
 id:string; name:string; slot:Slot; kind:string; priceCents:number; stock:number;
 color:string; hex:string; hue:number; saturation:number; lightness:number;
 styles:Style[]; scenes:Scene[]; formality:number; fit:'slim'|'regular'|'loose';
 pattern:'solid'|'stripe'|'print'; seasons:string[]; images:string[];
 cutout?:string; source:'studio'|'dummyjson'; sourceUrl:string; sourceTitle?:string;
 description:string; sizes:string[]; currency:'CNY'; priceNote:string;
}
export interface Behavior {id:string; productId:string; type:'view'|'favorite'|'purchase'|'dismiss'; at:string; seconds?:number; simulated?:boolean}
export interface DemoUser {id:string; name:string; subtitle:string; events:Behavior[]}
export interface Preferences {styles:Partial<Record<Style,number>>; colors:Record<string,number>; evidence:{productId:string;type:string;weight:number}[]; sampleCount:number}
export interface Constraints {scene:Scene; style:Style|'自动'; budgetCents:number; excludeSlots:Slot[]; excludeKinds:string[]; excludeColors:string[]; preferColors:string[]; preferFit:''|'slim'|'regular'|'loose'; includeAccessories:boolean}
export interface TraceStep {name:string; status:'ok'|'warning'; summary:string; details:unknown; durationMs:number}
export interface Score {color:number;style:number;scene:number;proportion:number;pattern:number;preference:number;value:number}
export interface Recommendation {id:string; productIds:string[]; totalCents:number; purchaseCents:number; score:number; breakdown:Score; reasons:string[]; formula:string}
export interface SessionState {id:string; version:number; anchorId:string; lockedIds:string[]; currentIds:string[]; constraints:Constraints; rejectedIds:string[]; userId:string}
export interface IntentPatch {scene?:Scene;style?:Style|'自动';budgetCents?:number;excludeSlots?:Slot[];excludeKinds?:string[];excludeColors?:string[];preferColors?:string[];preferFit?:Constraints['preferFit'];includeAccessories?:boolean;replaceSlot?:Slot;cheaper?:boolean;lockSlots?:Slot[];unlockSlots?:Slot[];clarification?:string}
export interface WorkflowRequest {anchorId:string;userId:string;conditions?:Partial<Constraints>;message?:string;state?:SessionState;currentIds?:string[];lockedIds?:string[];selectedProductId?:string;replaceSlot?:Slot;nonce?:string}
export interface WorkflowResult {state:SessionState;outfits:Recommendation[];trace:TraceStep[];preferences:Preferences;reply:string;mode:'offline'|'llm';needsClarification:boolean}
export interface IntentProvider {mode:'offline'|'llm';parse(message:string,state:SessionState,signal?:AbortSignal):Promise<IntentPatch>}
export const slotNames:Record<Slot,string>={top:'上衣',bottom:'下装',dress:'连衣裙',outer:'外套',shoes:'鞋履',bag:'包袋'};
