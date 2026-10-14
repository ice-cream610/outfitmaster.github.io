import type {CatalogItem} from '../agent/types.ts';
import manifest from '../../data/e-render-manifest.json';
export type EAvatar='short'|'long'|'curly'|'pony';
export const avatarNames:Record<EAvatar,string>={short:'E1 · 短碎发',long:'E2 · 长直发与方框眼镜',curly:'E3 · 卷发与圆框眼镜',pony:'E4 · 高马尾'};
export const assetUrl=(url:string)=>url.startsWith('/')&&!url.startsWith('/api/')?'.'+url:url;
export const renderKey=(ids:string[],avatar:EAvatar)=>'e-original-v1|'+avatar+'|'+[...ids].sort().join('|');
export interface ERender {key:string;image:string;status:'generated-unreviewed'|'reviewed';avatar:EAvatar;productIds:string[]}
export function getOutfitRender(items:CatalogItem[],avatar:EAvatar){return (manifest.renders as ERender[]).find(r=>r.key===renderKey(items.map(p=>p.id),avatar))}
export function GarmentImage({item,className=''}:{item:CatalogItem;className?:string}){
 return <img className={'om-garment '+className} src={assetUrl(item.images[0])} alt={item.name} loading="lazy" onError={e=>{e.currentTarget.style.opacity='.15'}}/>;
}
export function CartoonAvatar({items,mini=false,hair='short',mode='identity',render}:{items:CatalogItem[];mini?:boolean;hair?:EAvatar;mode?:'identity'|'outfit';render?:ERender}){
 const matched=render?.key===renderKey(items.map(p=>p.id),hair)?render:getOutfitRender(items,hair);
 const positions:Record<EAvatar,string>={short:'0% 0%',long:'100% 0%',curly:'0% 100%',pony:'100% 100%'};
 const identity=<div className={'om-avatar e-original '+(mini?'mini':'')} role="img" aria-label={avatarNames[hair]+'，用户原始设计角色参考'} style={{backgroundImage:`url('${assetUrl('/reference/e/identity-sheet.png')}')`,backgroundPosition:positions[hair]}}/>;
 if(mode==='identity'||mini)return identity;
 if(matched)return <figure className="e-render-result"><img src={assetUrl(matched.image)} alt={avatarNames[hair]+'穿着当前商品组合的生成效果'} data-render-key={matched.key}/><figcaption>{matched.status==='reviewed'?'已人工核对的效果样本':'AI 生成效果 · 请核对商品细节'}</figcaption></figure>;
 return <div className="e-pending-preview"><div className="e-reference-side">{identity}<span>E 原角色参考</span><small>参考图中的服饰不代表当前方案</small></div><div className="e-product-board"><strong>本套效果尚未生成</strong><p>先查看本套真实商品原图</p><div>{items.map(p=><div key={p.id}><GarmentImage item={p}/><small>{p.name}</small></div>)}</div><span>效果图必须同时匹配角色与全部商品</span></div></div>;
}
