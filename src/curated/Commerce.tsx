import {useEffect,useState} from 'react';
import {Shirt,Sparkles,ChevronRight,ArrowLeft,Heart,ShoppingBag,Check} from '../icons';
import {CuratedStudio} from './App';
import {products,product,renders,makeInitial} from './data';
import {ProductGallery,ProductImage,Preview} from './components';
import type {RealProduct} from './data';
import {unitPrice} from './domain';
import {Wardrobe} from './Wardrobe';

function readRoute(){const [kind,id,origin]=location.hash.slice(1).split('/');return {kind:kind==='shop'&&id==='catalog'?'wardrobe':['product','outfit','wardrobe','set'].includes(kind)?kind:'shop',id:id??'',origin:origin??''}}
export function Commerce(){
 const [route,setRoute]=useState(readRoute),[query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[toast,setToast]=useState('');
 useEffect(()=>{const update=()=>{setRoute(readRoute());window.scrollTo(0,0)};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update)},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t)},[toast]);
 const navigate=(kind:string,id='',origin='')=>{const hash='#'+kind+(id?'/'+id:'')+(origin?'/'+origin:'');if(location.hash===hash)window.scrollTo(0,0);else location.hash=hash};
 const inWardrobe=route.kind==='wardrobe'||route.kind==='set'||!!route.origin;
 const selected=products.find(p=>p.id===route.id);
 if(route.kind==='outfit'&&selected)return <CuratedStudio key={selected.id} entryId={selected.id} onBack={()=>navigate('product',selected.id,route.origin)}/>;
 const shown=products.filter(p=>(category==='全部'||p.category===category)&&(!query||[p.name,p.merchant.name,p.color,p.merchant.description].join(' ').toLowerCase().includes(query.toLowerCase())));
 return <div className="om curated-commerce">
  <header className="om-header"><button className="om-brand" onClick={()=>navigate('shop')}><span className="om-logo"><Shirt size={25}/></span><span>Outfit<span className="om-brand-light">Master</span><small>穿搭灵感研究所</small></span></button><nav aria-label="商城导航"><button className={!inWardrobe?'active':''} aria-current={!inWardrobe?'page':undefined} onClick={()=>navigate('shop')}>发现好物</button><button className={inWardrobe?'active':''} aria-current={inWardrobe?'page':undefined} onClick={()=>navigate('wardrobe')}>精选衣橱</button></nav><div className="om-header-right"><span className="om-mode">精选搭配体验</span><span className="om-user">你</span></div></header>
  {route.kind==='wardrobe'||route.kind==='set'?<Wardrobe setId={route.kind==='set'?route.id:undefined} onOpen={id=>navigate(id?'set':'wardrobe',id)} onProduct={id=>navigate('product',id,route.kind==='set'?route.id:'')}/>:route.kind==='shop'?<main className="om-shop">
   <section className="om-hero"><div className="om-hero-copy"><span className="om-eyebrow">A LITTLE INSPIRATION, A WHOLE NEW LOOK</span><h1>一件心动，<br/>一整套<span>刚刚好。</span></h1><p>从喜欢的单品开始，<br/>看见属于你的整套搭配。</p><button className="om-primary" onClick={()=>navigate('product',products[0].id)}><Sparkles size={17}/> 挑选我的第一件 <ChevronRight size={16}/></button><div className="om-hero-note"><span/> 先看商品，再试试整套穿搭</div></div><div className="om-hero-art"><span className="om-hero-orbit"/><Preview outfit={makeInitial()}/><div className="om-float-card"><Sparkles size={18}/><div>喜欢它，也喜欢这一身<small>真实商品 · 完整搭配灵感</small></div></div></div></section>
   <section className="om-catalog-controls" id="curated-catalog" tabIndex={-1} aria-label="发现好物商品区"><div className="om-categories">{['全部','外套','内搭','裤装','裙装','鞋履'].map(c=><button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="om-search"><span aria-hidden="true">⌕</span><input aria-label="搜索商品" placeholder="搜索西装、牛仔裤、奶油白…" value={query} onChange={e=>setQuery(e.target.value)}/></div></section>
   <div className="om-shop-grid">{shown.map(p=><article className="om-shop-card" key={p.id} data-product={p.id}><button className="om-shop-image" onClick={()=>navigate('product',p.id)}><ProductImage item={p}/><span className="om-product-tag">{p.merchant.merchant}</span></button><div className="om-product-meta"><span>{p.category} · {p.color}</span><button aria-label={'收藏'+p.name} onClick={()=>setToast('已记录你的喜欢')}><Heart size={16}/></button></div><button className="om-product-title" onClick={()=>navigate('product',p.id)}>{p.name}</button><div className="om-price-row"><strong><small>约¥</small>{p.price.toLocaleString('zh-CN')}</strong><span>{p.merchant.originalCurrency} {p.merchant.originalPrice}</span></div><button className="om-match-button" onClick={()=>navigate('outfit',p.id)}>看看怎么搭 <ChevronRight size={13}/></button></article>)}</div>
   {!shown.length&&<div className="om-empty">没有找到匹配单品，试试其他关键词。</div>}
  </main>:selected?<ProductDetail key={selected.id} item={selected} backLabel={route.origin?'返回套装详情':'返回发现好物'} onBack={()=>navigate(route.origin?'set':'shop',route.origin)} onStart={()=>navigate('outfit',selected.id,route.origin)}/>:<main className="om-empty"><p>这件商品不在当前精选衣橱中。</p><button onClick={()=>navigate('shop')}>返回商城</button></main>}
  <footer className="om-footer"><span>OutfitMaster / 每一种风格，都值得被看见</span><span>商家资料与原图来自 <a href="https://thefrankieshop.com/" target="_blank" rel="noreferrer">The Frankie Shop</a> · 从 92 件商品快照中精选 {products.length} 件 · 购买为模拟操作</span></footer>
  {toast&&<div className="om-toast" role="status"><Check size={16}/>{toast}</div>}
 </div>;
}
function ProductDetail({item:p,onBack,onStart,backLabel}:{item:RealProduct;onBack:()=>void;onStart:()=>void;backLabel:string}){
 const [size,setSize]=useState(''),[notice,setNotice]=useState('');const m=p.merchant;
 const options=renders.filter(r=>r.avatar==='long'&&r.productIds.includes(p.id));
 return <main className="merchant-detail"><div className="detail-breadcrumb"><button onClick={onBack}><ArrowLeft size={14}/> {backLabel}</button><span>/ {p.category} / 商品详情</span></div><div className="merchant-detail-grid">
  <ProductGallery id={p.id}/><section className="merchant-product-info"><span className="om-eyebrow">{m.merchant} / ORIGINAL PRODUCT</span><h1>{p.name}</h1><p className="original-title">{m.name}</p><div className="merchant-price"><strong>约¥{(size?unitPrice(p.id,size):p.price).toLocaleString('zh-CN')}</strong><span>官网 {m.originalCurrency} {size?m.variants?.find(v=>v.size===size&&v.available)?.price:m.originalPrice}</span></div><p className="om-note">人民币按 1 USD = 7.20 估算，商家售价以原商品页为准。</p><dl><div><dt>商品类别</dt><dd>{m.merchantCategory||p.category}</dd></div><div><dt>颜色</dt><dd>{p.color}</dd></div><div><dt>面料</dt><dd>{m.materials?.join(' / ')}</dd></div></dl><fieldset className="merchant-sizes"><legend>选择尺码</legend><div>{p.sizes.map(s=><button className={size===s?'chosen':''} onClick={()=>{setSize(s);setNotice('')}} key={s}>{s}</button>)}</div></fieldset>
   <div className="merchant-buy"><button className="om-secondary" onClick={()=>setNotice(size?'已加入模拟购物袋 · 未创建商家订单':'请先选择尺码')}><ShoppingBag size={16}/> 加入模拟购物袋</button><a href={m.sourceUrl} target="_blank" rel="noreferrer">查看商家原商品 ↗</a></div>{notice&&<p role="status" className="om-note">{notice}</p>}
   <div className="merchant-ai-entry"><div><Sparkles size={22}/><span>喜欢这件，怎么搭一整套？<small>已经准备好 {options.length} 套不同组合，点开即可体验。</small></span></div><button className="om-primary" onClick={onStart}><Sparkles size={17}/> AI 穿搭 · 用这件搭一套 <ChevronRight size={16}/></button><p>保留这件单品，从搭配效果中找到灵感。</p></div>
  </section></div><section className="merchant-story"><div><span className="om-eyebrow">DETAILS THAT MATTER</span><h2>关于这件单品</h2><p className="curated-description">{m.description}</p></div><div><h3>商家资料</h3><p>来源：{m.merchant}</p><p>商品编号：{m.merchantProductId}</p><p>资料时间：{m.capturedAt?.slice(0,10)}</p><p>可售状态以抓取时的尺码快照为依据，库存件数未公开。</p><a href={m.sourceUrl} target="_blank" rel="noreferrer">核对商品、价格与库存 ↗</a></div></section>
 </main>;
}
