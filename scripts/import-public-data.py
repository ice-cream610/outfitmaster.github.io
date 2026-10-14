"""Download public demo fashion records and small Polyvore research samples.
Run explicitly; application never downloads datasets on startup.
"""
import json, pathlib, urllib.request, concurrent.futures, re, datetime, hashlib, io
from PIL import Image
root=pathlib.Path(__file__).resolve().parent.parent
root.joinpath('data','sources').mkdir(parents=True,exist_ok=True)
root.joinpath('public','catalog','external').mkdir(parents=True,exist_ok=True)
categories={'tops':('top','tee'),'mens-shirts':('top','shirt'),'womens-dresses':('dress','dress'),'womens-shoes':('shoes','heel'),'mens-shoes':('shoes','sneaker'),'womens-bags':('bag','bag')}
def read(url):
 req=urllib.request.Request(url,headers={'User-Agent':'OutfitMaster-learning-MVP/0.2'})
 with urllib.request.urlopen(req,timeout=35) as response: return response.read()
def extract(raw, path):
 """Conservative edge-connected near-white background removal for product packshots only."""
 im=Image.open(io.BytesIO(raw)).convert('RGBA');im.thumbnail((700,700));w,h=im.size
 pixels=im.load(); seen=set(); stack=[(x,0) for x in range(w)]+[(x,h-1) for x in range(w)]+[(0,y) for y in range(h)]+[(w-1,y) for y in range(h)]
 while stack:
  x,y=stack.pop()
  if x<0 or y<0 or x>=w or y>=h or (x,y) in seen:continue
  seen.add((x,y));r,g,b,a=pixels[x,y]
  if a<20 or (min(r,g,b)>238 and max(r,g,b)-min(r,g,b)<15):
   pixels[x,y]=(r,g,b,0);stack.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 box=im.getbbox()
 if box:im=im.crop(box)
 im.save(path)
 opaque=[(r,g,b) for r,g,b,a in im.resize((30,30)).getdata() if a>128 and max(r,g,b)-min(r,g,b)>18]
 if not opaque:opaque=[(r,g,b) for r,g,b,a in im.resize((30,30)).getdata() if a>128]
 import colorsys
 avg=tuple(sum(p[i] for p in opaque)//len(opaque) for i in range(3)) if opaque else (128,128,128)
 hue,light,sat=colorsys.rgb_to_hls(*(v/255 for v in avg))
 return '#%02x%02x%02x'%avg,hue*360,sat,light
def load_category(category):
 raw=json.loads(read(f'https://dummyjson.com/products/category/{category}'))
 (root/'data'/'sources'/f'dummyjson-{category}.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf8')
 return category,raw['products']
rows=[]; errors=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for future in concurrent.futures.as_completed([pool.submit(load_category,c) for c in categories]):
  try:
   cat,products=future.result()
   for p in products:
    slot,kind=categories[cat]; id=f'dj-{p["id"]}'; image=p.get('thumbnail') or p['images'][0]
    target=root/'public'/'catalog'/'external'/f'{id}.png'
    try:hexv,hue,sat,light=extract(read(image),target);cutout=f'/catalog/external/{id}.png'
    except Exception as e:errors.append(f'{id}: image unavailable: {type(e).__name__}');hexv,hue,sat,light='#888888',0,0,.5;cutout=None
    formal=4 if slot=='dress' else (3 if kind in ['shirt','heel','bag'] else 1)
    style=['优雅知性','甜美可爱'] if formal==4 else (['简约大气','优雅知性'] if formal==3 else ['冷酷中性','创意设计'])
    scene=['正式礼服','拍照出片'] if formal==4 else (['职业商务','拍照出片'] if formal==3 else ['日常休闲','拍照出片'])
    price=int(round(p['price']*7.2))*100
    rows.append(dict(id=id,name=p['title'],slot=slot,kind=kind,priceCents=price,stock=p['stock'],color='图片提取色',hex=hexv,hue=hue,saturation=sat,lightness=light,styles=style,scenes=scene,formality=formal,fit='regular',pattern='solid',seasons=['春','夏','秋'],images=p['images'],cutout=cutout,source='dummyjson',sourceTitle=p['title'],sourceUrl=f'https://dummyjson.com/products/{p["id"]}',description=p['description'],sizes=['36','37','38','39'] if slot=='shoes' else ['S','M','L'],currency='CNY',priceNote='公开演示数据；人民币价格按 USD×7.2 固定模拟，非实时汇率或真实报价'))
  except Exception as e:errors.append('category import: '+str(e))
rows.sort(key=lambda p:p['id'])
(root/'data'/'external-catalog.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
# Stream only a bounded prefix; do not download the full research dataset.
outfits=[]
for filename in ['train_no_dup.json','train.json']:
 try:
  url=f'https://raw.githubusercontent.com/xthan/polyvore-dataset/master/data/{filename}'
  with urllib.request.urlopen(url,timeout=30) as r: prefix=r.read(500000).decode('utf8')
  decoder=json.JSONDecoder(); offset=prefix.index('[')+1
  while len(outfits)<24:
   while prefix[offset] in ' \n\r\t,':offset+=1
   item,length=decoder.raw_decode(prefix[offset:]);outfits.append(item);offset+=length
  break
 except Exception as e:errors.append(f'Polyvore {filename}: {type(e).__name__}')
(root/'data'/'sources'/'polyvore-outfit-samples.json').write_text(json.dumps(outfits,ensure_ascii=False,indent=2),encoding='utf8')
manifest={'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'https://dummyjson.com/docs/products','productCount':len(rows),'polyvoreSampleCount':len(outfits),'notes':['DummyJSON is placeholder data, not a live merchant catalog.','External style/scene labels are coarse importer heuristics, not verified fashion annotations.','Polyvore samples are research references; no training was performed.','No external fashion photos are redistributed beyond public demo product packshots.'],'errors':errors}
(root/'data'/'sources'/'import-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'products':len(rows),'polyvoreSamples':len(outfits),'errors':errors},ensure_ascii=False))
import runpy
runpy.run_path(str(root/'scripts'/'normalize-catalog.py'),run_name='__main__')
