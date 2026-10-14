import {useEffect,useRef,useId} from 'react';
import type {ReactNode} from 'react';
import {X} from './icons';
import type {Product,Outfit} from './types.ts';
import {product,avatarLabels} from './data.ts';
import {previewCell} from './domain.ts';
export function ProductImage({item}:{item:Product}){return <div role="img" aria-label={item.name+' · 演示商品图'} className={"product-image "+(item.sheet==='expanded'?'expanded-product':'')} style={{backgroundPosition:item.sheet==='expanded'?`${item.cell%4*100/3}% ${Math.floor(item.cell/4)*50}%`:`${item.cell%3*50}% ${Math.floor(item.cell/3)*100}%`}}/>}
export function Preview({outfit}:{outfit:Outfit}){
 const cell=previewCell(outfit);
 if(cell===null)throw new Error('Unregistered outfit reached preview');
 const isA=cell>=20&&cell<30,isB=cell>=30,isLook=cell>=10&&cell<20;
 const tile=isA?cell-20:isB?cell-30:cell-10;
 const className='avatar-image '+(isA?'variants-a':isB?'variants-b':isLook?'lookbook-image':'');
 const backgroundPosition=isA||isB?`${tile%3*50}% ${Math.floor(tile/3)*100}%`:isLook?`${tile%2*100}% ${Math.floor(tile/2)*100}%`:`${cell*50}% center`;
 return <div className={className} role="img" aria-label={avatarLabels[outfit.avatar]+' E 的搭配效果：'+outfit.productIds.map(id=>product(id).name).join('、')} style={{backgroundPosition}}/>;
}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useRef<HTMLDialogElement>(null),id=useId();useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus()}},[]);return <dialog ref={ref} className="modal" aria-labelledby={id} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><header><h2 id={id}>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={20}/></button></header>{children}</dialog>}
