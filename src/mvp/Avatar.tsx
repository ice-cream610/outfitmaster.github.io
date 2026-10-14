import {useId} from 'react';
import type {CatalogItem,Slot} from '../agent/types.ts';
export const assetUrl=(url:string)=>url.startsWith('/')?'.'+url:url;
export function GarmentImage({item,className=''}:{item:CatalogItem;className?:string}){
 return <img className={'om-garment '+className} src={assetUrl(item.cutout||item.images[0])} alt={item.name} loading="lazy" onError={e=>{e.currentTarget.style.opacity='.15'}}/>;
}
export function CartoonAvatar({items,mini=false,hair='short'}:{items:CatalogItem[];mini?:boolean;hair?:'short'|'long'}){
 const id=useId().replaceAll(':','');
 const find=(slot:Slot)=>items.find(p=>p.slot===slot);
 function layer(slot:Slot){const p=find(slot);if(!p)return null;
  const photo=p.source==='dummyjson';
  const boxes:Record<Slot,number[]>={top:photo?[114,181,132,153]:[65,143,230,224],bottom:photo?[120,317,120,209]:[76,277,208,292],dress:photo?[107,179,145,326]:[60,143,240,367],outer:[60,140,240,238],shoes:photo?[111,510,62,36]:[80,463,105,100],bag:photo?[229,308,74,100]:[205,293,125,148]};
  const [x,y,width,height]=boxes[slot];
  return <g key={p.id} data-garment={p.id}><image href={assetUrl(p.cutout||p.images[0])} x={x} y={y} width={width} height={height} preserveAspectRatio={photo?'xMidYMid meet':'none'}/>{slot==='shoes'&&<image href={assetUrl(p.cutout||p.images[0])} x={360-x-width} y={y} width={width} height={height} preserveAspectRatio={photo?'xMidYMid meet':'none'} transform={`translate(${2*(360-x-width)+width} 0) scale(-1 1)`}/>}</g>;
 }
 return <svg className={'om-avatar '+(mini?'mini':'')} viewBox="0 0 360 580" role="img" aria-label={'卡通二维搭配示意：'+items.map(p=>p.name).join('、')}>
  <defs><linearGradient id={'skin'+id} x2="1" y2="1"><stop stopColor="#f6dac3"/><stop offset="1" stopColor="#eac1a5"/></linearGradient></defs>
  <ellipse cx="180" cy="551" rx="83" ry="12" fill="#5b4a3a" opacity=".09"/>
  <path d="M153 306L148 412L149 530Q163 540 175 529L180 408L185 529Q199 540 212 530L212 412L207 306Z" fill={'url(#skin'+id+')'}/>
  <path d="M141 182Q180 163 219 182L229 320Q180 340 131 320Z" fill={find('top')||find('dress')?'none':'#e5d9cc'}/>
  <path d="M142 189Q124 201 117 241L101 333Q100 350 110 351Q119 350 123 336L149 239Z" fill={'url(#skin'+id+')'}/>
  <path d="M218 189Q236 201 243 241L259 333Q260 350 250 351Q241 350 237 336L211 239Z" fill={'url(#skin'+id+')'}/>
  <path d="M165 142V178Q180 191 195 178V142" fill={'url(#skin'+id+')'}/>
  {hair==='long'&&<path d="M136 86Q132 42 180 42Q234 41 229 99L240 224Q218 239 209 189L146 198Q119 178 130 150Z" fill="#49352d"/>}
  <ellipse cx="180" cy="109" rx="43" ry="48" fill={'url(#skin'+id+')'}/>
  <path d="M138 113Q126 71 150 54Q172 38 201 51Q231 57 224 109L213 91Q180 98 156 71Q158 93 138 113Z" fill="#49352d"/>
  <path d="M155 110Q161 105 167 110M192 110Q198 105 204 110" fill="none" stroke="#4e3b32" strokeWidth="2.5" strokeLinecap="round"/>
  <ellipse cx="161" cy="116" rx="2.8" ry="4" fill="#403830"/><ellipse cx="198" cy="116" rx="2.8" ry="4" fill="#403830"/>
  <path d="M176 132Q181 135 185 131M169 142Q181 149 191 141" fill="none" stroke="#b87867" strokeWidth="2" strokeLinecap="round"/>
  <ellipse cx="151" cy="130" rx="7" ry="4" fill="#e6a59a" opacity=".5"/><ellipse cx="207" cy="130" rx="7" ry="4" fill="#e6a59a" opacity=".5"/>
  {layer('bottom')}{layer('dress')}{layer('top')}{layer('outer')}{layer('shoes')}{layer('bag')}
 </svg>;
}
