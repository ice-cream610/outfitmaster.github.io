import type {CatalogItem} from './types.ts';
export function priceForSize(product:CatalogItem,size:string):number{
 if(!product.sizes.includes(size))throw new Error('所选规格不可售');
 if(product.source!=='merchant'||!product.variants)return product.priceCents;
 const variant=product.variants.find(v=>v.size===size&&v.available);if(!variant)throw new Error('官网快照中所选规格不可售');
 const originalCents=Math.round(Number(variant.price)*100),rate=Number(product.exchangeRate);
 if(!Number.isSafeInteger(originalCents)||originalCents<0||!Number.isFinite(rate)||rate<=0)throw new Error('商品价格快照无效');
 return Math.round(originalCents*rate);
}
