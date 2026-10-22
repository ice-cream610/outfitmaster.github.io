import {useState,useRef,useEffect} from 'react';
import {ArrowUpRight,ArrowUp,ArrowLeft,ChevronLeft,ChevronRight,SlidersHorizontal,LockKeyhole,LockKeyholeOpen,Heart,ShoppingBag,Sparkles,History,RotateCcw,Check,Shirt,MessageCircle,Bookmark,Settings2} from '../icons';
import type {Outfit,Product,Message,GenerationRequest,Conditions,Specification,Avatar,Source} from '../types';
import {makeInitial,products,product,looks,renders,findRender,avatarLabels,avatarExample} from './data';
import {subtotal,replenishment,previewCell,recommendations,slot,supportedAvatars,unitPrice} from './domain';
import {demoService,readSaved,writeSaved,track,chatStatus,requestChat} from './services';
import type {SavedSession,ChatRequest,ChatStatus} from './services';
import {Modal,ProductImage,Preview,ProductGallery,renderStyle,preloadOutfit} from './components';

import {readShopping,mergeBag,shoppingKey,sets,familyFor} from './sets';

type Panel='filters'|'avatar'|'saved'|'history'|'purchase'|'detail'|'unlock'|'look-switch'|null;
export function CuratedStudio({entryId,onBack,startingOutfit}:{entryId:string;onBack:()=>void;startingOutfit?:Outfit}){
 const [initialOutfit]=useState(()=>startingOutfit?structuredClone(startingOutfit):makeInitial(entryId));

 const [versions,setVersions]=useState<Outfit[]>([structuredClone(initialOutfit)]),[index,setIndex]=useState(0);
 const current=versions[index];
 const [category,setCategory]=useState('整套搭配推荐');
 const [tryBase,setTryBase]=useState<Outfit|null>(null);
 const [cartItem,setCartItem]=useState<Product|null>(null),[cartSize,setCartSize]=useState('');
 const [pendingLook,setPendingLook]=useState('');
 function chooseLook(id:string){setPendingLook(id);const look=looks.find(l=>l.id===id)!;if(current.lockedIds.some(p=>!look.productIds.includes(p))){setPanel('look-switch')}else{generate({base:current,lookId:id})}}
 const [messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState('');
 const [view,setView]=useState<'outfit'|'recommend'>('outfit'),[replacement,setReplacement]=useState<string|null>(null);
 const [panel,setPanel]=useState<Panel>(null),[detail,setDetail]=useState<Product>(products[0]);
 const [draft,setDraft]=useState<Conditions>(structuredClone(initialOutfit.conditions)),[avatarDraft,setAvatarDraft]=useState<Avatar>('long');
 const [saved,setSaved]=useState<SavedSession[]>(readSaved),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [purchaseMode,setPurchaseMode]=useState<'cart'|'buy'>('cart'),[specs,setSpecs]=useState<Record<string,Specification>>({}),[purchaseError,setPurchaseError]=useState(''),[receipt,setReceipt]=useState('');
 const pending=useRef<AbortController|null>(null),retry=useRef<(()=>void)|null>(null),chatEnd=useRef<HTMLDivElement>(null);
 const [connection,setConnection]=useState<ChatStatus|null>(null),[chatBusy,setChatBusy]=useState(false);
 useEffect(()=>{const c=new AbortController();chatStatus(c.signal).then(setConnection).catch(()=>{if(!c.signal.aborted)setConnection({configured:false,model:'Qwen3.8-Flash',message:'对话服务未连接，请启动或重启后端'})});return()=>c.abort()},[]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3800);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{const el=chatEnd.current;el?.parentElement?.scrollTo({top:el.parentElement.scrollHeight,behavior:'smooth'})},[messages]);
 const notify=(text:string)=>setToast(text);
 const say=(text:string,role:'assistant'|'user'='assistant',outfitId=current.id)=>setMessages(m=>[...m,{id:crypto.randomUUID(),role,text,outfitId}]);
 const update=(fn:(o:Outfit)=>Outfit)=>setVersions(v=>v.map((o,i)=>i===index?fn(o):o));
 function cancel(){pending.current?.abort();pending.current=null;setBusy(false);setChatBusy(false)}
 async function generate(request:GenerationRequest){
  if(request.conditions)setTryBase(null);
  cancel();const controller=new AbortController();pending.current=controller;retry.current=()=>generate(request);setBusy(true);setError('');setPanel(null);
  try{const result=await demoService.generate(request,controller.signal);await preloadOutfit(result);if(pending.current!==controller)return;
   setVersions(v=>[...v.slice(0,index+1),result]);setIndex(index+1);setSpecs({});setView('outfit');setReplacement(null);
   track('outfit_updated',result.id);
  }catch(e){if(pending.current===controller&&(e as Error).name!=='AbortError')setError((e as Error).message)}finally{if(pending.current===controller){pending.current=null;setBusy(false)}}
 }
 function navigate(to:number){cancel();setError('');setIndex(to);setSpecs({});setView('outfit');setReplacement(null);track('history_restored',versions[to].id)}
 function toggleLock(id:string){update(o=>({...o,lockedIds:o.lockedIds.includes(id)?o.lockedIds.filter(x=>x!==id):[...o.lockedIds,id]}))}
 function findReplacement(id:string){setReplacement(id);if(current.lockedIds.includes(id)){setPanel('unlock');return}setView('recommend')}
 function replace(nextId:string){if(!replacement)return;generate({base:structuredClone(current),replaceId:replacement,nextId})}
 function save(){const next=[{outfit:structuredClone(current),messages:structuredClone(messages)},...saved.filter(s=>s.outfit.id!==current.id)].slice(0,20);try{writeSaved(next);setSaved(next);notify('已保存这套搭配，可以在「已存搭配」恢复');track('outfit_saved',current.id)}catch{notify('浏览器未允许保存，请检查存储设置')}}
 function restore(session:SavedSession){if(previewCell(session.outfit)===null){notify('这套历史搭配已更新，请从上方风格卡重新选择');return}cancel();const restored=structuredClone(session.outfit);setVersions(v=>[...v,restored]);setIndex(versions.length);setMessages(session.messages);setPanel(null);setSpecs({});setError('');setView('outfit');notify('已恢复商品、锁定项、形象和关联对话')}
 function send(text=input){if(!text.trim()||busy||pending.current)return;
  const validVersions=new Set(versions.slice(0,index+1).map(v=>v.id));
  const history=messages.filter(m=>!m.outfitId||validVersions.has(m.outfitId)).slice(-12).map(({role,text})=>({role,text:text.slice(0,2000)}));
  setInput('');say(text.trim(),'user');void runChat({base:structuredClone(current),message:text.trim(),history});
 }
 async function runChat(request:ChatRequest){
  cancel();const controller=new AbortController();pending.current=controller;retry.current=()=>void runChat(request);setBusy(true);setChatBusy(true);setError('');setPanel(null);
  try{
   const result=await requestChat(request,controller.signal);
   if(result.outfit)await preloadOutfit(result.outfit);
   if(pending.current!==controller)return;
   setConnection({configured:true,model:result.model,message:'本轮模型调用成功'});
   if(result.outfit){setTryBase(null);const next=result.outfit;setVersions(v=>[...v.slice(0,index+1),next]);setIndex(index+1);setSpecs({});setView('outfit');setReplacement(null);say(result.reply,'assistant',next.id);track('ai_outfit_updated',next.id)}
   else{say(result.reply);if(result.action==='appearance'){setAvatarDraft(current.avatar);setPanel('avatar')}}
  }catch(e){if(pending.current===controller&&!controller.signal.aborted){const message=(e as Error).message;setError(message);}}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);setChatBusy(false)}}
 }
 function purchase(mode:'cart'|'buy'){setPurchaseMode(mode);setPurchaseError('');setReceipt('');setPanel('purchase')}
 async function confirmPurchase(){try{const items=await demoService.checkout(current,specs);if(purchaseMode==='cart'){const shopping=readShopping();shopping.bag=mergeBag(shopping.bag,items);localStorage.setItem(shoppingKey,JSON.stringify(shopping))}const total=Math.round(items.reduce((s,i)=>s+i.unitPrice*i.quantity*100,0))/100;setReceipt(`${items.reduce((s,i)=>s+i.quantity,0)} 件商品 · ¥${total}。${purchaseMode==='cart'?'已完成模拟加购':'已完成订单交接演示'}，未创建真实订单，也不会扣款。`);track(purchaseMode==='cart'?'demo_add_to_cart':'demo_checkout_handoff',current.id)}catch(e){setPurchaseError((e as Error).message)}}
 const slotItems=current.productIds.map(product).filter(p=>p.category===category);
 const shown=[...new Map(slotItems.flatMap(p=>[p,...recommendations({...current,lockedIds:current.lockedIds.filter(id=>id!==p.id)},p.id)]).map(p=>[p.id,p])).values()];
 const completeLooks=sets.filter(r=>(!!startingOutfit||r.productIds.includes(entryId))&&r.productIds.reduce((sum,id)=>sum+product(id).price,0)<=(current.conditions.budget??Infinity));
 async function applyExact(next:Outfit){cancel();setBusy(true);setError('');try{await preloadOutfit(next);setVersions(v=>[...v.slice(0,index+1),next]);setIndex(index+1);setSpecs({})}catch{setError('效果加载失败，请重试')}finally{setBusy(false)}}
 function selectSet(r:typeof sets[number]){const f=familyFor(r);setTryBase(null);void applyExact({...current,id:crypto.randomUUID(),avatar:r.avatar,productIds:[...r.productIds],selectedIds:[...r.productIds],lockedIds:startingOutfit?[]:[entryId],conditions:{...current.conditions,scene:f.scene,style:f.style},chatPreferences:undefined,imageTaskId:r.id,name:r.name,createdAt:Date.now()})}
 function tryProduct(p:Product){if(current.productIds.includes(p.id)){if(tryBase&&!tryBase.productIds.includes(p.id)){const restored={...tryBase,avatar:current.avatar,id:crypto.randomUUID()};setTryBase(null);void applyExact(restored)}return}const slotItem=slotItems.find(old=>findRender({...current,productIds:current.productIds.map(id=>id===old.id?p.id:id)}));if(!slotItem)return;if(!tryBase)setTryBase(structuredClone(current));generate({base:{...current,lockedIds:current.lockedIds.filter(id=>id!==slotItem.id)},replaceId:slotItem.id,nextId:p.id})}
 function addItem(){if(!cartItem||!cartSize)return;try{const shopping=readShopping();shopping.bag=mergeBag(shopping.bag,[{productId:cartItem.id,size:cartSize,color:cartItem.color,quantity:1,unitPrice:unitPrice(cartItem.id,cartSize)}]);localStorage.setItem(shoppingKey,JSON.stringify(shopping));setCartItem(null);notify('已加入购物车')}catch{notify('购物车保存失败，请重试')}}
 const selected=current.selectedIds.map(product);
 return <div className="app curated-studio">
  <header className="topbar"><a className="brand" href="#shop" onClick={e=>{e.preventDefault();onBack()}}><span><Shirt size={23}/></span><div>Outfit Master<small>AI 穿搭灵感工作台</small></div></a><nav><a className="return-link" href={'#product/'+entryId} onClick={e=>{e.preventDefault();onBack()}}><ArrowLeft size={14}/> {startingOutfit?'返回精选搭配':'返回商品详情'}</a></nav></header>
  <main className="workspace">
   <section className="products-panel" aria-label="搭配商品">
    <div className="wardrobe-tools"><button disabled={busy} onClick={()=>{setDraft(structuredClone(current.conditions));setPanel('filters')}}><SlidersHorizontal size={16}/>搭配偏好</button><button disabled={busy} onClick={()=>{setAvatarDraft(current.avatar);setPanel('avatar')}}><Settings2 size={16}/>形象调整</button></div>
    <div className="wardrobe-browser"><nav className="garment-nav" aria-label="服饰分类">{['整套搭配推荐','外套','内搭','裤装','裙装','连衣裙','鞋履','帽饰','包袋'].map(c=><button key={c} className={category===c?'active':''} disabled={busy} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</nav>
    <div className="product-scroll"><div className="product-grid">{category==='整套搭配推荐'?completeLooks.map(r=><button key={r.id} className={'outfit-choice '+(findRender(current)?.id===r.id?'active':'')} disabled={busy} aria-label={r.name} onClick={()=>selectSet(r)}><Preview outfit={{...current,avatar:r.avatar,productIds:r.productIds}}/></button>):shown.map(p=><article className="product-card" key={p.id} data-product={p.id}><button className="image-button" aria-label={'查看'+p.name} onClick={()=>{setDetail(p);setPanel('detail')}}><ProductImage item={p}/></button><button className="product-name" onClick={()=>{setDetail(p);setPanel('detail')}}>{p.name}</button><div className="product-price"><strong>¥{p.price}</strong></div><div className="try-actions"><button disabled={busy||(current.productIds.includes(p.id)&&(!tryBase||tryBase.productIds.includes(p.id)))} onClick={()=>tryProduct(p)}>{current.productIds.includes(p.id)&&tryBase&&!tryBase.productIds.includes(p.id)?'还原':'替换上身'}</button><button disabled={busy} onClick={()=>{setCartItem(p);setCartSize('')}}>加入购物车</button></div></article>)}</div></div></div>
   </section>
   <section className="stage-panel" aria-label="搭配效果">
    <div className="stage"><Preview outfit={current}/><button className="look-arrow prev" disabled={index===0||busy} aria-label="上一套" onClick={()=>{setTryBase(null);navigate(index-1)}}><ChevronLeft/></button><button className="look-arrow next" disabled={index===versions.length-1||busy} aria-label="下一套" onClick={()=>{setTryBase(null);navigate(index+1)}}><ChevronRight/></button>{busy&&<div className="generation-overlay" role="status"><span className="spinner"/><strong>{chatBusy?'正在理解需求并比较搭配…':'正在更新搭配…'}</strong></div>}</div>
    {error&&<div className="error" role="alert">{error}<button onClick={()=>retry.current?.()}>重试</button><button onClick={()=>setError('')}>继续挑选</button></div>}
    <div className="purchase-bar"><div className="save-actions"><button onClick={()=>setPanel('saved')}><Bookmark size={17}/>已存搭配 <small>{saved.length}</small></button><button onClick={save}><Heart size={17}/>保存</button></div><div className="purchase-summary"><small>已选 {selected.length} 件 · 商品小计</small><strong data-testid="subtotal">¥{subtotal(current)}</strong></div><div className="purchase-actions"><button disabled={!selected.length||busy} className="secondary" onClick={()=>purchase('cart')}><ShoppingBag size={16}/>加购</button><button disabled={!selected.length||busy} className="primary" onClick={()=>purchase('buy')}>立即购买 <ArrowUpRight size={16}/></button></div></div>
   </section>
   <aside className="chat-panel" aria-label="穿搭对话"><div className="chat-heading"><div className="assistant-avatar"><Sparkles size={19}/></div><div><h2>一起找到你的风格</h2><small>{connection?.configured?'Qwen3.8-Flash · 穿搭搭子':connection?'穿搭搭子 · 待连接':'正在检查对话服务…'}</small></div><button className="icon-button" aria-label="历史对话与方案" onClick={()=>setPanel('history')}><History size={19}/></button></div>
    <div className="chat-scroll">{messages.map(m=><div className={'message '+m.role} key={m.id}>{m.role==='assistant'&&<span className="message-label">✧ OUTFIT ASSISTANT</span>}<p>{m.text}</p>{m.role==='assistant'&&m.outfitId&&versions.some(v=>v.id===m.outfitId)&&m.outfitId!==current.id&&<button onClick={()=>navigate(versions.findIndex(v=>v.id===m.outfitId))}>恢复这套搭配 ↗</button>}</div>)}<div ref={chatEnd}/></div>
    <div className="chat-input-area"><div className="suggestions">{['只给我推荐200元以下的裤子','要更日常百搭的风格'].map(t=><button key={t} disabled={busy} onClick={()=>send(t)}>{t} ↗</button>)}</div>{index>0&&<button className="undo" disabled={busy} onClick={()=>navigate(index-1)}><RotateCcw size={12}/> 撤销，回到上一套</button>}<form onSubmit={e=>{e.preventDefault();send()}}><textarea aria-label="告诉我你的穿搭需求" placeholder="告诉我，你想怎么调整？" value={input} maxLength={2000} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/><button className="send-button" aria-label="发送需求" disabled={busy||!input.trim()}><ArrowUp size={19}/></button></form></div>
   </aside>
  </main>
  {cartItem&&<Modal title="加入购物车" onClose={()=>setCartItem(null)}><h3>{cartItem.name}</h3><p>¥{cartItem.price}</p><div className="choices">{cartItem.sizes.map(size=><button key={size} className={cartSize===size?'chosen':''} onClick={()=>setCartSize(size)}>{size}</button>)}</div><button className="primary full" disabled={!cartSize} onClick={addItem}>确认加入购物车</button></Modal>}
  {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
  {panel==='look-switch'&&<Modal title="切换整套搭配" onClose={()=>setPanel(null)}><p className="modal-intro">你将体验「{looks.find(l=>l.id===pendingLook)?.label}」。这会更换整套服饰，并解锁不属于新搭配的商品；保留当前人物形象。原方案会保留在历史中，可随时返回。</p><button className="primary full" onClick={()=>generate({base:current,lookId:pendingLook,confirmUnlock:true})}>确认解锁并切换整套</button></Modal>}
  {panel==='filters' &&<Modal title="搭配条件" onClose={()=>setPanel(null)}><p className="modal-intro">保留锁定项，按你的需要寻找候选。待购预算不包含已购衣物。</p><fieldset><legend>候选来源</legend><div className="choices">{(['商品池','购物车','已购'] as Source[]).map(s=><label key={s}><input type="checkbox" checked={draft.sources.includes(s)} onChange={()=>setDraft(d=>({...d,sources:d.sources.includes(s)?d.sources.filter(x=>x!==s):[...d.sources,s]}))}/>{s}</label>)}</div></fieldset><fieldset><legend>使用场景</legend><div className="choices">{['日常休闲','职业商务','拍照出片','正式礼服'].map(s=><button className={draft.scene===s?'chosen':''} onClick={()=>setDraft(d=>({...d,scene:s}))} key={s}>{s}</button>)}</div></fieldset><fieldset><legend>风格</legend><div className="choices">{['简约大气','甜美可爱','优雅知性','冷酷中性','创意设计'].map(s=><button className={draft.style===s?'chosen':''} onClick={()=>setDraft(d=>({...d,style:s}))} key={s}>{s}</button>)}</div></fieldset><label className="field-label budget-field">待购预算（元，可选）<input type="number" inputMode="decimal" min="0" max="1000000" step="any" placeholder="不限预算" aria-label="待购预算（元，可选）" value={draft.budget??''} onChange={e=>setDraft(d=>({...d,budget:e.target.value===''?null:Number(e.target.value)}))}/></label><button className="primary full" disabled={draft.budget!==null&&(!Number.isFinite(draft.budget)||draft.budget<0||draft.budget>1000000)} onClick={()=>generate({base:current,conditions:draft})}>应用并推荐</button></Modal>}
  {panel==='avatar'&&<Modal title="调整 E 的模样" onClose={()=>setPanel(null)}><p className="modal-intro">保存仅调整人物，不改变服饰和购买勾选。仅显示当前服饰组合已提供的形象。</p><div className="avatar-options">{supportedAvatars(current).map(a=><button className={a===avatarDraft?'chosen':''} key={a} disabled={!supportedAvatars(current).includes(a)} onClick={()=>setAvatarDraft(a)}><Preview outfit={supportedAvatars(current).includes(a)?{...current,avatar:a}:avatarExample(a)}/>{!supportedAvatars(current).includes(a)&&<small>此组合暂未开放</small>}<strong>{avatarLabels[a]}</strong></button>)}</div><button className="primary full" onClick={()=>generate({base:current,avatar:avatarDraft})}>保存形象</button></Modal>}
  {panel==='unlock'&&<Modal title="先确认解锁" onClose={()=>setPanel(null)}><p className="modal-intro">「{replacement&&product(replacement).name}」已锁定。替换前需要你的确认，其余锁定项不会改变。</p><button className="primary full" onClick={()=>{if(replacement)toggleLock(replacement);setPanel(null);setView('recommend')}}>确认解锁，查看候选</button></Modal>}
  {panel==='detail'&&<Modal title="商品详情" onClose={()=>setPanel(null)}><ProductGallery id={detail.id}/><h3>{detail.name}</h3><p className="muted">{product(detail.id).merchant.name}</p><p>¥{detail.price} · 模拟价格</p><p className="curated-description">{detail.description}</p><a className="quiet" href={product(detail.id).merchant.sourceUrl} target="_blank" rel="noreferrer">查看模拟商品详情 ↗</a><p className="muted">参考穿搭图制作的模拟商品，仅供搭配体验。</p></Modal>}
  {(panel==='saved'||panel==='history')&&<Modal title={panel==='saved'?'已存搭配':'历史对话与方案'} onClose={()=>setPanel(null)}><p className="modal-intro">{panel==='saved'?'保存在当前浏览器，可恢复完整方案及关联对话。':'浏览本次体验中已完成的方案，不会重新生成。'}</p>{panel==='saved'&&!saved.length&&<div className="empty"><Heart/><p>还没有保存的搭配，遇到喜欢的就点一下「保存」。</p></div>}{(panel==='saved'?saved:versions.map(outfit=>({outfit,messages:messages.filter(m=>m.outfitId===outfit.id)}))).map((s,i)=><button className="saved-row" key={s.outfit.id+'-'+i} onClick={()=>panel==='saved'?restore(s):(navigate(i),setPanel(null))}><div><Preview outfit={s.outfit}/></div><span><strong>{s.outfit.name}</strong><small>{s.outfit.conditions.scene} · 待购 ¥{replenishment(s.outfit)}</small></span><ChevronRight size={19}/></button>)}</Modal>}
  {panel==='purchase'&&<Modal title={purchaseMode==='cart'?'确认加购商品':'确认购买清单'} onClose={()=>setPanel(null)}>{receipt?<div className="receipt" role="status"><Check size={40}/><h3>体验完成</h3><p>{receipt}</p><button className="primary" onClick={()=>setPanel(null)}>继续搭配</button></div>:<><p className="modal-intro">仅包含你勾选的商品。选择规格后体验交接流程，不会跳转真实收银台。每款限选 1 件。</p>{selected.map(p=><div className="sku-row" key={p.id}><ProductImage item={p}/><div><strong>{p.name}</strong><small>{p.color} · ¥{p.price}</small><div className="sku-fields"><label>尺码<select aria-label={p.name+'尺码'} value={specs[p.id]?.size||''} onChange={e=>setSpecs(s=>({...s,[p.id]:{size:e.target.value,quantity:s[p.id]?.quantity||1}}))}><option value="">请选择</option>{p.sizes.map(s=><option key={s}>{s}</option>)}</select></label><label>数量<input type="number" min="1" max="1" aria-label={p.name+'数量'} value={specs[p.id]?.quantity??1} onChange={e=>setSpecs(s=>({...s,[p.id]:{size:s[p.id]?.size||'',quantity:Number(e.target.value)}}))}/></label></div></div><button className="quiet" aria-label={'取消购买'+p.name} onClick={()=>update(o=>({...o,selectedIds:o.selectedIds.filter(id=>id!==p.id)}))}>移除</button></div>)}{purchaseError&&<p className="error" role="alert">{purchaseError}</p>}<p className="checkout-total">商品小计 <strong>¥{Math.round(selected.reduce((sum,p)=>sum+(specs[p.id]?.size?unitPrice(p.id,specs[p.id].size):p.price)*100*(specs[p.id]?.quantity??1),0))/100}</strong></p><button className="primary full" disabled={!selected.length} onClick={confirmPurchase}>{purchaseMode==='cart'?'确认模拟加购':'体验订单确认交接'}</button><p className="muted">正式接入后，服务端须重新校验价格与库存，运费和拆单由平台处理。</p></>}</Modal>}
 </div>
}
