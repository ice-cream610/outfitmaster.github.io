import {useEffect,useState} from 'react';
import {Shirt,Sparkles,ChevronRight,ArrowLeft,Heart,ShoppingBag,Check} from '../icons';
import {CuratedStudio} from './App';
import {products,renders} from './data';
import {ProductGallery,ProductImage} from './components';
import type {RealProduct} from './data';
import {unitPrice} from './domain';
import {Wardrobe} from './Wardrobe';
import {readShopping,mergeBag,shoppingKey,sets,asOutfit} from './sets';
import {discoveryProducts,sourceOptions} from './discovery';
import type {DiscoverySource} from './discovery';

function readRoute(){const [kind,id,origin]=location.hash.slice(1).split('/');return {kind:kind==='shop'&&id==='catalog'?'wardrobe':['product','outfit','wardrobe','set','outfit-set'].includes(kind)?kind:'shop',id:id??'',origin:origin??''}}
export function Commerce(){
 const [route,setRoute]=useState(readRoute),[query,setQuery]=useState(''),[source,setSource]=useState<DiscoverySource>('recommend'),[toast,setToast]=useState('');
 useEffect(()=>{const update=()=>{setRoute(readRoute());window.scrollTo(0,0)};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update)},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t)},[toast]);
 const navigate=(kind:string,id='',origin='')=>{const hash='#'+kind+(id?'/'+id:'')+(origin?'/'+origin:'');if(location.hash===hash)window.scrollTo(0,0);else location.hash=hash};
 const inWardrobe=route.kind==='wardrobe'||route.kind==='set'||!!route.origin;
 const selectedSet=sets.find(r=>r.id===route.id);
 if(route.kind==='outfit-set'&&selectedSet)return <CuratedStudio key={'set-'+selectedSet.id} entryId={selectedSet.productIds[0]} startingOutfit={asOutfit(selectedSet)} onBack={()=>navigate('wardrobe')}/>;
 const selected=products.find(p=>p.id===route.id);
 if(route.kind==='outfit'&&selected)return <CuratedStudio key={selected.id} entryId={selected.id} onBack={()=>navigate('product',selected.id,route.origin)}/>;
 const shown=discoveryProducts(source,query,readShopping());
 const featured=products[0];
 return <div className="om curated-commerce">
  <header className="om-header"><button className="om-brand" onClick={()=>navigate('shop')}><span className="om-logo"><Shirt size={25}/></span><span>Outfit<span className="om-brand-light">Master</span><small>穿搭灵感研究所</small></span></button><nav aria-label="商城导航"><button className={!inWardrobe?'active':''} aria-current={!inWardrobe?'page':undefined} onClick={()=>navigate('shop')}>发现好物</button><button className={inWardrobe?'active':''} aria-current={inWardrobe?'page':undefined} onClick={()=>navigate('wardrobe')}>精选衣橱</button></nav><div className="om-header-right"><span className="om-mode">精选搭配体验</span><span className="om-user">你</span></div></header>
  {route.kind==='wardrobe'||route.kind==='set'?<Wardrobe onStyle={id=>navigate('outfit-set',id)} setId={route.kind==='set'?route.id:undefined} onOpen={id=>navigate(id?'set':'wardrobe',id)} onProduct={id=>navigate('product',id,route.kind==='set'?route.id:'')}/>:route.kind==='shop'?<main className="om-shop">
   <section className="quick-experience" aria-labelledby="quick-title">
    <article className="quick-product"><button className="quick-product-photo" aria-label={'查看'+featured.name} onClick={()=>navigate('product',featured.id)}><img src={'.'+featured.merchant.images[0]} alt={featured.name}/></button><div className="quick-product-info"><button className="quick-product-name" onClick={()=>navigate('product',featured.id)}>{featured.name}</button><p>灰色细条纹 · 通勤叠穿</p><div><strong>¥{featured.price}</strong><span>体验价</span></div></div></article>
    <div className="quick-play"><h1 id="quick-title">快速体验</h1><div className="quick-invitation"><p className="quick-speech">我喜欢这件商品！<br/>来看看怎么搭配？</p><button className="om-primary" onClick={()=>navigate('outfit',featured.id)}>开始搭配 <ChevronRight size={17}/></button></div><div className="quick-mascot"><img src="./curated/e-curious.png" alt="长直发 E 歪头思考，邀请你一起搭配"/></div></div>
   </section>
   <section className="free-experience-intro" aria-labelledby="free-title"><h2 id="free-title">自由体验</h2><p>随意选择一个自己感兴趣的商品，看看可以怎么搭配吧</p></section>
   <section className="om-catalog-controls" id="curated-catalog" tabIndex={-1} aria-label="发现好物商品区"><div className="om-categories source-filters" role="group" aria-label="商品来源">{sourceOptions.map(c=><button className={source===c.id?'active':''} aria-pressed={source===c.id} key={c.id} onClick={()=>setSource(c.id)}><span aria-hidden="true">{c.emoji}</span> {c.label}</button>)}</div><div className="om-search"><span aria-hidden="true">⌕</span><input aria-label="搜索商品" placeholder="搜索西装、牛仔裤、奶油白…" value={query} onChange={e=>setQuery(e.target.value)}/></div></section>
   <div className="om-shop-grid">{shown.map(p=><article className="om-shop-card" key={p.id} data-product={p.id}><button className="om-shop-image" onClick={()=>navigate('product',p.id)}><ProductImage item={p}/><span className="om-product-tag">{p.merchant.merchant}</span></button><div className="om-product-meta"><span>{p.category} · {p.color}</span><button aria-label={'收藏'+p.name} onClick={()=>setToast('已记录你的喜欢')}><Heart size={16}/></button></div><button className="om-product-title" onClick={()=>navigate('product',p.id)}>{p.name}</button><div className="om-price-row"><strong><small>¥</small>{p.price.toLocaleString('zh-CN')}</strong><span>体验价</span></div><button className="om-match-button" onClick={()=>navigate('outfit',p.id)}><span>看看怎么搭</span><ChevronRight size={13}/></button></article>)}</div>
   {!shown.length&&<div className="om-empty">没有找到匹配单品，试试其他关键词。</div>}
  </main>:selected?<ProductDetail key={selected.id} item={selected} backLabel={route.origin?'返回套装详情':'返回发现好物'} onBack={()=>navigate(route.origin?'set':'shop',route.origin)} onStart={()=>navigate('outfit',selected.id,route.origin)}/>:<main className="om-empty"><p>这件商品不在当前精选衣橱中。</p><button onClick={()=>navigate('shop')}>返回商城</button></main>}
  <footer className="om-footer"><span>OutfitMaster / 每一种风格，都值得被看见</span><span>商家资料与原图来自 <a href="https://thefrankieshop.com/" target="_blank" rel="noreferrer">The Frankie Shop</a> · 从 92 件商品快照中精选 {products.length} 件 · 购物车与已购含演示商品 · 购买为模拟操作</span></footer>
  {toast&&<div className="om-toast" role="status"><Check size={16}/>{toast}</div>}
 </div>;
}
function ProductDetail({item:p,onBack,onStart,backLabel}:{item:RealProduct;onBack:()=>void;onStart:()=>void;backLabel:string}){
 const [size,setSize]=useState(''),[notice,setNotice]=useState('');const m=p.merchant;
 const options=renders.filter(r=>r.avatar==='long'&&r.productIds.includes(p.id));
 return <main className="merchant-detail"><div className="detail-breadcrumb"><button onClick={onBack}><ArrowLeft size={14}/> {backLabel}</button><span>/ {p.category} / 商品详情</span></div><div className="merchant-detail-grid">
  <ProductGallery id={p.id}/><section className="merchant-product-info"><span className="om-eyebrow">{m.merchant} / ORIGINAL PRODUCT</span><h1>{p.name}</h1><p className="original-title">{m.name}</p><div className="merchant-price"><strong>¥{(size?unitPrice(p.id,size):p.price).toLocaleString('zh-CN')}</strong><span>官网 {m.originalCurrency} {size?m.variants?.find(v=>v.size===size&&v.available)?.price:m.originalPrice}</span></div><p className="om-note">当前为 Demo 体验价；商家原价仅供来源核对。</p><dl><div><dt>商品类别</dt><dd>{m.merchantCategory||p.category}</dd></div><div><dt>颜色</dt><dd>{p.color}</dd></div><div><dt>面料</dt><dd>{m.materials?.join(' / ')}</dd></div></dl><fieldset className="merchant-sizes"><legend>选择尺码</legend><div>{p.sizes.map(s=><button className={size===s?'chosen':''} onClick={()=>{setSize(s);setNotice('')}} key={s}>{s}</button>)}</div></fieldset>
   <div className="merchant-buy"><button className="om-secondary" onClick={()=>{if(!size){setNotice('请先选择尺码');return}try{const shopping=readShopping();shopping.bag=mergeBag(shopping.bag,[{productId:p.id,size,color:p.color,quantity:1,unitPrice:unitPrice(p.id,size)}]);localStorage.setItem(shoppingKey,JSON.stringify(shopping));setNotice('已加入模拟购物袋 · 未创建商家订单')}catch{setNotice('购物袋暂时无法保存，请重试')}}}><ShoppingBag size={16}/> 加入模拟购物袋</button><a href={m.sourceUrl} target="_blank" rel="noreferrer">查看商家原商品 ↗</a></div>{notice&&<p role="status" className="om-note">{notice}</p>}
   <div className="merchant-ai-entry"><div><Sparkles size={22}/><span>喜欢这件，怎么搭一整套？<small>已经准备好 {options.length} 套不同组合，点开即可体验。</small></span></div><button className="om-primary" onClick={onStart}><Sparkles size={17}/> AI 穿搭 · 用这件搭一套 <ChevronRight size={16}/></button><p>保留这件单品，从搭配效果中找到灵感。</p></div>
  </section></div><section className="merchant-story"><div><span className="om-eyebrow">DETAILS THAT MATTER</span><h2>关于这件单品</h2><p className="curated-description">{m.description}</p></div><div><h3>商家资料</h3><p>来源：{m.merchant}</p><p>商品编号：{m.merchantProductId}</p><p>资料时间：{m.capturedAt?.slice(0,10)}</p><p>可售状态以抓取时的尺码快照为依据，库存件数未公开。</p><a href={m.sourceUrl} target="_blank" rel="noreferrer">核对商品、价格与库存 ↗</a></div></section>
 </main>;
}
