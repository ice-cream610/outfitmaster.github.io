import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import type {Product,Outfit} from '../types.ts';
import {product,avatarLabels,findRender} from './data.ts';
export {Modal} from '../components';
export function ProductImage({item}:{item:Product}){return <img className="product-image real-product-photo" src={'.'+product(item.id).merchant.images[0]} alt={item.name+' · 商家原图'} loading="lazy"/>}
export function renderStyle(outfit:Pick<Outfit,'avatar'|'productIds'>):CSSProperties{
 const r=findRender(outfit);if(!r)throw new Error('No exact pre-rendered look');
 return {backgroundImage:`url('${r.image}')`,backgroundSize:`${r.columns*100}% ${r.rows*100}%`,backgroundPosition:`${r.cell%r.columns*100/(r.columns-1)}% ${Math.floor(r.cell/r.columns)*100/(r.rows-1)}%`};
}
export function Preview({outfit}:{outfit:Outfit}){
 const r=findRender(outfit);if(!r)throw new Error('Unregistered outfit reached preview');
 return <div className="avatar-image curated-avatar" role="img" data-render-id={r.id} data-avatar={outfit.avatar} aria-label={avatarLabels[outfit.avatar]+'的搭配效果：'+outfit.productIds.map(id=>product(id).name).join('、')} style={renderStyle(outfit)}/>;
}
const loads=new Map<string,Promise<void>>();
export function preloadOutfit(outfit:Outfit){const r=findRender(outfit);if(!r)return Promise.reject(new Error('缺少对应效果'));if(!loads.has(r.image))loads.set(r.image,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>{loads.delete(r.image);reject(new Error('效果图暂未加载成功，请重试'))};image.src=r.image}));return loads.get(r.image)!}
export function ProductGallery({id}:{id:string}){
 const m=product(id).merchant,[index,setIndex]=useState(0);useEffect(()=>setIndex(0),[id]);
 return <div className="curated-gallery"><img src={'.'+m.images[index]} alt={m.name+' · 商品照片 '+(index+1)}/><div>{m.images.map((url,i)=><button key={url} className={index===i?'chosen':''} aria-label={'查看商品照片 '+(i+1)} onClick={()=>setIndex(i)}><img src={'.'+url} alt=""/></button>)}</div></div>;
}
