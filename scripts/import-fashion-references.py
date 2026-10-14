"""Small CC-licensed street-fashion research reference set from Wikimedia Commons.
Not used to train or claim a learned compatibility model. Attribution travels with every image.
"""
import urllib.request, urllib.parse, json, pathlib, re
root=pathlib.Path(__file__).resolve().parent.parent
params={'action':'query','generator':'search','gsrsearch':'intitle:"street style" filetype:bitmap','gsrnamespace':6,'gsrlimit':20,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':500,'format':'json'}
url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)
headers={'User-Agent':'OutfitMasterEducationalPrototype/0.2 (local research and attribution)'}
def read(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=40) as response:return response.read()
data=json.loads(read(url));items=[];errors=[]
folder=root/'public'/'references';folder.mkdir(exist_ok=True,parents=True)
plain=lambda s:re.sub('<[^>]+>','',s)
for page in data.get('query',{}).get('pages',{}).values():
 if len(items)>=6:break
 info=page.get('imageinfo',[{}])[0];meta=info.get('extmetadata',{});license=meta.get('LicenseShortName',{}).get('value','')
 if not (license.startswith('CC BY') or license in ['CC0','Public domain']):continue
 if not info.get('thumburl'):continue
 if not page['title'].lower().endswith(('.jpg','.jpeg','.png')):continue
 try:
  raw=read(info['thumburl']);name=f'commons-{page["pageid"]}.jpg';(folder/name).write_bytes(raw)
  items.append({'title':page['title'],'image':'/references/'+name,'author':plain(meta.get('Artist',{}).get('value','Unknown')),'license':license,'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'sourceUrl':info.get('descriptionurl'),'description':plain(meta.get('ImageDescription',{}).get('value','')),'usage':'研究参考；未训练模型；未自动推定该图片为用户偏好或搭配真值'})
 except Exception as e:errors.append(str(e))
(root/'data'/'sources'/'fashion-references.json').write_text(json.dumps({'source':url,'items':items,'errors':errors},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'references':len(items),'errors':errors},ensure_ascii=False))
