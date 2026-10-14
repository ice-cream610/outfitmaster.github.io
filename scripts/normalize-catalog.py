"""Review corrections for publicly imported category shortcuts; reproducible, no network."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
path=root/'data'/'external-catalog.json';items=json.loads(path.read_text(encoding='utf-8-sig'))
for p in items:
 name=p['name'].lower()
 if p['slot']=='top' and any(word in name for word in ['frock','dress']):p.update(slot='dress',kind='dress',formality=3,styles=['甜美可爱','优雅知性'],scenes=['日常休闲','拍照出片'])
 if any(word in name for word in ['floral','polka','pattern']):p['pattern']='print'
 for english,chinese in [('black','黑'),('white','白'),('blue','蓝'),('red','红'),('green','绿'),('brown','棕'),('pink','粉'),('gray','灰'),('grey','灰')]:
  if english in name:p['color']=chinese+'色';break
 note=' 说明：风格与场景为演示粗标，不是经过专业标注的事实。'
 if note not in p['description']:p['description']+=note
path.write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf8')
print('Reviewed external category, pattern and color labels')
