"""Reproducible authored catalog and SVG artwork. External records are imported separately."""
import json, pathlib, html
root=pathlib.Path(__file__).resolve().parent.parent
styles=['简约大气','甜美可爱','优雅知性','冷酷中性','创意设计']
scenes=['日常休闲','职业商务','拍照出片','正式礼服']
colors=[('奶油白','#eee9db',45,.12,.91),('墨黑','#303338',220,.05,.19),('雾蓝','#8ca5b8',205,.28,.63),('燕麦','#b7a48c',35,.24,.65),('樱粉','#dca9ad',355,.38,.76),('酒红','#85464f',350,.42,.40),('鼠尾草','#9baa98',105,.18,.62),('炭灰','#777a81',220,.06,.48)]
shapes={
 'tee':'M76 61L108 44Q128 58 148 44L180 61L204 108L175 124L162 101L166 213L90 213L94 101L81 124L52 108Z',
 'shirt':'M76 61L108 44L128 60L148 44L180 61L204 180L176 187L160 102L166 213L90 213L96 102L80 187L52 180Z',
 'knit':'M76 61L108 44Q128 64 148 44L180 61L204 180L176 187L160 102L166 213L90 213L96 102L80 187L52 180Z',
 'blazer':'M76 61L108 44L128 60L148 44L180 61L206 190L177 197L159 103L170 220L86 220L97 103L79 197L50 190Z',
 'pants':'M85 43L171 43L185 217L137 217L128 112L119 217L71 217Z',
 'wide':'M85 43L171 43L195 217L139 217L128 112L117 217L61 217Z',
 'skirt':'M91 47L165 47L199 215Q128 232 57 215Z',
 'dress':'M107 29L149 29L168 52L153 106L192 223Q128 237 64 223L103 106L88 52Z',
 'sneaker':'M60 133L93 116L127 139L184 158L210 177L207 191L52 191L47 173Z',
 'loafer':'M55 142L92 124L132 144L188 159L207 176L205 192L53 192L47 176Z',
 'heel':'M62 132L98 155L155 148L186 173L202 187L144 191L111 174L98 216L82 216L80 173L55 155Z',
 'bag':'M62 102L194 102L207 211Q128 232 49 211Z',
}
def svg(kind,color,pattern='solid',detail=False):
 shape=shapes[kind]; shade='#42403a'; decor=''
 if kind in ['shirt','blazer']: decor+='<path d="M108 44L100 82L128 65L155 82L148 44M128 65V211" fill="none" stroke="#5c5750" stroke-opacity=".45" stroke-width="2"/><circle cx="133" cy="120" r="2" fill="#6a6358"/><circle cx="133" cy="150" r="2" fill="#6a6358"/>'
 if kind in ['pants','wide']: decor+='<path d="M88 57H168M128 57V110M95 61L87 90M161 61L169 90" stroke="#534e46" stroke-opacity=".3" fill="none" stroke-width="2"/>'
 if kind=='bag': decor+='<path d="M89 112V84C89 38 167 38 167 84V112" fill="none" stroke="'+color+'" stroke-width="12"/><path d="M79 135H178V183H79Z" fill="none" stroke="#655647" stroke-opacity=".3"/><rect x="119" y="121" width="18" height="10" rx="2" fill="#c6ab74"/>'
 if kind in ['sneaker','loafer']: decor+='<path d="M51 179H203M111 143L104 161M123 148L118 166M135 153L130 171" fill="none" stroke="#e9e4d8" stroke-width="4"/>'
 if kind=='knit': decor+='<path d="M101 75V205M111 75V205M121 75V205M131 75V205M141 75V205M151 75V205" stroke="#4a463e" stroke-opacity=".09" stroke-width="2"/>'
 texture='<rect width="256" height="256" fill="url(#stripes)"/>' if pattern=='stripe' else ('<rect width="256" height="256" fill="url(#dots)"/>' if pattern=='print' else '')
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256"><defs><linearGradient id="shade"><stop stop-color="white" stop-opacity=".22"/><stop offset=".55" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity=".13"/></linearGradient><pattern id="stripes" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M0 6H13" stroke="#fff" stroke-opacity=".5" stroke-width="4"/></pattern><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3.3" fill="#f8eadb"/></pattern><clipPath id="cloth"><path d="{shape}"/></clipPath></defs><path d="{shape}" fill="{color}" stroke="{shade}" stroke-opacity=".2" stroke-width="1.5"/><g clip-path="url(#cloth)">{texture}<path d="{shape}" fill="url(#shade)"/></g>{decor}</svg>'''
items=[]
specs=[('top','tee','圆领棉感短袖',129,'regular',1),('top','shirt','垂感翻领衬衫',199,'regular',3),('top','knit','细罗纹针织上衣',179,'slim',2),('bottom','pants','高腰直筒长裤',229,'regular',3),('bottom','wide','垂感阔腿长裤',259,'loose',2),('bottom','skirt','高腰伞摆半裙',219,'regular',3),('dress','dress','收腰及踝连衣裙',369,'regular',4),('outer','blazer','廓形翻领西装',329,'loose',3),('shoes','sneaker','轻量日常运动鞋',199,'regular',1),('shoes','loafer','经典圆头乐福鞋',259,'regular',3),('shoes','heel','细带通勤高跟鞋',289,'regular',4),('bag','bag','简洁通勤手提包',239,'regular',3)]
for si,style in enumerate(styles):
 for ki,(slot,kind,title,price,fit,formality) in enumerate(specs):
  color,hexv,hue,sat,light=colors[(si*2+ki)%len(colors)]
  pattern='print' if si==4 and ki in [0,6] else ('stripe' if si==1 and ki==1 else 'solid')
  id=f'studio-{si}-{ki}'
  scene=[scenes[0],scenes[2]] if formality<=2 else ([scenes[1],scenes[2]] if formality==3 else [scenes[3],scenes[1],scenes[2]])
  path=root/'public'/'catalog'/f'{id}.svg'; path.parent.mkdir(parents=True,exist_ok=True); path.write_text(svg(kind,hexv,pattern),encoding='utf8')
  crop='70 112 140 100' if slot=='shoes' else ('75 70 115 140' if slot=='bag' else '74 40 110 145')
  (root/'public'/'catalog'/f'{id}-detail.svg').write_text(svg(kind,hexv,pattern).replace('viewBox="0 0 256 256"',f'viewBox="{crop}"'),encoding='utf8')
  items.append(dict(id=id,name=color+title,slot=slot,kind=kind,priceCents=(price+si*10)*100,stock=0 if si==4 and ki==7 else 10+ki,color=color,hex=hexv,hue=hue,saturation=sat,lightness=light,styles=[style,styles[(si+2)%5]],scenes=scene,formality=formality,fit=fit,pattern=pattern,seasons=['春','秋'] if kind not in ['tee','dress'] else ['春','夏'],images=[f'/catalog/{id}.svg',f'/catalog/{id}-detail.svg'],cutout=f'/catalog/{id}.svg',source='studio',sourceUrl='local:authored-catalog',description='原创示例商品，价格和库存为模拟数据。独立透明矢量服饰用于稳定卡通换装。',sizes=['36','37','38','39'] if slot=='shoes' else ['S','M','L'],currency='CNY',priceNote='模拟人民币价格'))
(root/'data'/'studio-catalog.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf8')
users=[]
for n,(name,subtitle,si) in enumerate([('林小夏','通勤与周末之间',0),('许知意','偏爱柔和与优雅',2),('陈可可','甜美与拍照灵感',1),('周予','中性与设计感',3),('新朋友','没有历史，探索新的自己',4)]):
 events=[]
 if n<4:
  for j in range(24):
   product=items[si*12+(j*5)%12] if j%5 else items[((si+1)%5)*12+j%12]
   events.append(dict(id=f'seed-{n}-{j}',productId=product['id'],type='purchase' if j%9==0 else ('favorite' if j%4==0 else 'view'),at=f'2026-10-{min(13,1+j//2):02d}T09:00:00+08:00',seconds=15+(j*7)%90,simulated=True))
 users.append(dict(id=f'user-{n}',name=name,subtitle=subtitle,events=events))
(root/'data'/'users.json').write_text(json.dumps(users,ensure_ascii=False,indent=2),encoding='utf8')
(root/'data'/'garment-shapes.json').write_text(json.dumps(shapes,indent=2),encoding='utf8')
print(f'Created {len(items)} authored products and {sum(len(u["events"]) for u in users)} simulated events')
