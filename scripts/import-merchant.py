"""Import a traceable snapshot from a real merchant's public storefront.
Original photos are cached as delivered by the merchant CDN, never replaced with illustrations.
Stock is availability only; quantities are unknown. Style labels are explicit importer heuristics.
"""
import json,pathlib,urllib.request,urllib.parse,concurrent.futures,datetime,re,html,colorsys,hashlib
from decimal import Decimal,ROUND_HALF_UP
root=pathlib.Path(__file__).resolve().parent.parent
source='https://thefrankieshop.com/products.json?limit=250'
snapshot=root/'data'/'merchant-sources'/'frankieshop-products.json'
def download(url):
 req=urllib.request.Request(url,headers={'User-Agent':'OutfitMaster-learning-prototype/0.3'})
 with urllib.request.urlopen(req,timeout=40) as response:return response.read()
if not snapshot.exists():snapshot.write_bytes(download(source))
raw=json.loads(snapshot.read_text(encoding='utf-8-sig'))
mapping={'T-Shirt':('top','tee'),'Shirt':('top','shirt'),'Blouse':('top','shirt'),'Top':('top','tee'),'Polo':('top','shirt'),'Sweater':('top','knit'),'Turtleneck':('top','knit'),'Hoodie':('top','knit'),'Sweatshirt':('top','knit'),'Pants':('bottom','pants'),'Jeans':('bottom','pants'),'Skirt':('bottom','skirt'),'Shorts':('bottom','pants'),'Dress':('dress','dress'),'Coat':('outer','coat'),'Trench':('outer','coat'),'Jacket':('outer','jacket'),'Blazer':('outer','blazer'),'Cardigan':('outer','cardigan'),'Shoes':('shoes','loafer'),'Heels':('shoes','heel'),'Boots':('shoes','boots'),'Bag':('bag','bag')}
limits={'top':24,'bottom':24,'outer':22,'dress':8,'shoes':10,'bag':12};counts={s:0 for s in limits};rows=[];now=datetime.datetime.now(datetime.timezone.utc).isoformat();fx=Decimal('7.20')
colorMap={'black':('黑色','#29292b'),'cream':('奶油白','#ece5d7'),'white':('白色','#f3efe6'),'ivory':('象牙白','#e9e2d1'),'grey':('灰色','#808086'),'gray':('灰色','#808086'),'blue':('蓝色','#8ca6ba'),'navy':('海军蓝','#293e54'),'brown':('棕色','#765443'),'camel':('驼色','#ae8766'),'green':('绿色','#8a9781'),'olive':('橄榄绿','#92927a'),'yellow':('浅黄色','#e6d7a0'),'butter':('奶油黄','#eadcb3'),'pink':('粉色','#d8a7a7'),'red':('红色','#963e44'),'plum':('深梅色','#64424e'),'beige':('米色','#c9baa1'),'sand':('沙色','#cbbda5'),'charcoal':('炭灰','#515156'),'tobacco':('烟草棕','#876448')}
for p in raw['products']:
 if p['product_type'] not in mapping:continue
 tags=p.get('tags',[])
 if 'gender: men' in tags and 'gender: women' not in tags:continue
 slot,kind=mapping[p['product_type']]
 if counts[slot]>=limits[slot] or not p.get('images'):continue
 available=[v for v in p['variants'] if v.get('available')]
 # Keep a few unavailable records as truthful source snapshots, not recommendation candidates.
 if not available:continue
 counts[slot]+=1;variant=min(available,key=lambda v:Decimal(v['price']));price=Decimal(variant['price'])
 details=html.unescape(re.sub('<[^>]+>','\n',p.get('body_html','')));details='\n'.join(line.strip() for line in details.splitlines() if line.strip())
 lower=(p['title']+' '+details).lower();colorSource=next((line.split(':',1)[1].strip() for line in details.splitlines() if line.lower().startswith('color:')),p['title'].split(' - ')[-1])
 color,hexv=next((value for key,value in reversed(list(colorMap.items())) if key in colorSource.lower()),(colorSource,'#98928a'))
 h,l,s=colorsys.rgb_to_hls(*(int(hexv[i:i+2],16)/255 for i in [1,3,5]))
 formal=4 if slot=='dress' else (3 if p['product_type'] in ['Shirt','Blazer','Heels','Pants','Coat','Trench'] else 2)
 fit='loose' if any(w in lower for w in ['oversized','relaxed fit','wide leg','loose fit','balloon']) else ('slim' if any(w in lower for w in ['fitted','slim fit','bodycon']) else 'regular')
 pattern='stripe' if 'stripe' in lower else ('print' if any(w in lower for w in ['print','plaid','check','floral','multi']) else 'solid')
 styles=['简约大气','优雅知性'] if formal>=3 else ['简约大气','冷酷中性']
 if any(w in lower for w in ['sculpt','asymmetric','panelled','cut-out','balloon']):styles=['创意设计',styles[0]]
 if color in ['粉色','奶油黄'] or any(w in lower for w in ['ruffle','bow','pleat']):styles=['甜美可爱',styles[0]]
 scenes=['职业商务','拍照出片'] if formal==3 else (['正式礼服','拍照出片'] if formal==4 else ['日常休闲','拍照出片'])
 imgs=p['images'];packshots=[img for img in imgs if 'packshot' in img['src'].lower()];primary=packshots[0] if packshots else imgs[0]
 chosen=[primary]+[img for img in imgs if img['src']!=primary['src']][:2]
 id=f'tfs-{p["id"]}';sizes=list(dict.fromkeys(v['title'] for v in available))
 materials=[line for line in details.splitlines() if re.search(r'\d+%|leather|suede|denim|wool|cotton|cashmere|nylon|polyester|silk|twill|corduroy',line,re.I)]
 rows.append(dict(id=id,name=p['title'],slot=slot,kind=kind,priceCents=int((price*fx*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP)),stock=1,color=color,hex=hexv,hue=h*360,saturation=s,lightness=l,styles=styles,scenes=scenes,formality=formal,fit=fit,pattern=pattern,seasons=['春','秋','冬'] if slot=='outer' or 'wool' in lower else ['春','夏','秋'],images=[],sourceImages=[img['src'] for img in chosen],source='merchant',sourceUrl=f'https://thefrankieshop.com/products/{p["handle"]}',sourceTitle=p['title'],description=details,sizes=sizes,currency='CNY',priceNote='官网 USD 价格快照；人民币仅按 1 USD=7.20 CNY 估算，不含运费税费，非实时汇率',merchant='The Frankie Shop',merchantProductId=str(p['id']),merchantCategory=p['product_type'],originalCurrency='USD',originalPrice=str(price),originalPriceCents=int(price*100),exchangeRate='7.20',capturedAt=now,availability='available',stockNote='官网有可售规格；库存件数未公开，stock=1 仅为可售标志',materials=materials,attributeSource='品类/介绍/颜色/面料来自官网；风格、场景与色相为可校正的规则标注',variants=[dict(id=str(v['id']),sku=v.get('sku'),size=v['title'],available=v['available'],price=v['price'],currency='USD') for v in p['variants']],imageRole='packshot' if packshots else 'model-or-detail',cacheFiles=[]))
folder=root/'public'/'merchant';folder.mkdir(parents=True,exist_ok=True);errors=[]
def cache(row,index,url):
 parsed=urllib.parse.urlparse(url);query=urllib.parse.parse_qsl(parsed.query);query.append(('width','1000'));cdn=urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query)))
 suffix=pathlib.Path(parsed.path).suffix.lower();suffix=suffix if suffix in ['.jpg','.jpeg','.png','.webp'] else '.jpg';name=f'{row["id"]}-{index}{suffix}';target=folder/name
 if not target.exists():target.write_bytes(download(cdn))
 return row['id'],index,f'/merchant/{name}',hashlib.sha256(target.read_bytes()).hexdigest()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 futures=[pool.submit(cache,row,i,url) for row in rows for i,url in enumerate(row['sourceImages'])];done={}
 for future in concurrent.futures.as_completed(futures):
  try:
   id,index,path,sha=future.result();done[(id,index)]=(path,sha)
  except Exception as e:errors.append(str(e))
 for row in rows:
  row['images']=[done.get((row['id'],i),(url,''))[0] for i,url in enumerate(row['sourceImages'])]
  row['cacheFiles']=[{'url':done[(row['id'],i)][0],'sha256':done[(row['id'],i)][1],'sourceUrl':url} for i,url in enumerate(row['sourceImages']) if (row['id'],i) in done]
(root/'data'/'merchant-catalog.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
seed=json.loads((root/'data'/'users.json').read_text(encoding='utf8'));ids={p['id'] for p in rows}
for ui,user in enumerate(seed):
 user['events']=[]
 if ui==4:continue
 pool=[p for p in rows if ['简约大气','优雅知性','甜美可爱','冷酷中性'][ui] in p['styles']] or rows
 for j in range(24):
  product=pool[(j*7+ui)%len(pool)];user['events'].append(dict(id=f'real-seed-{ui}-{j}',productId=product['id'],type='purchase' if j%9==0 else ('favorite' if j%4==0 else 'view'),at=f'2026-10-{min(13,1+j//2):02d}T09:00:00+08:00',seconds=20+j%50,simulated=True))
(root/'data'/'merchant-users.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2),encoding='utf8')
(root/'data'/'merchant-sources'/'manifest.json').write_text(json.dumps(dict(capturedAt=now,merchant='The Frankie Shop',source=source,sourceCurrency='USD',currencyEvidence='https://thefrankieshop.com/products/laval-sculpted-sleeve-t-shirt-cream',productCount=len(rows),categories=counts,cachedPhotoCount=len(done),errors=errors,notes=['Real merchant storefront snapshot, not DummyJSON or synthetic products.','Images remain merchant photographs; no clothing redraw, background removal or cutout substitution.','Original USD prices retained; CNY is clearly labelled estimate.','Availability snapshots are not inventory quantities or live purchase guarantees.']),ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'products':len(rows),'categories':counts,'cachedPhotos':len(done),'errors':errors},ensure_ascii=False))
