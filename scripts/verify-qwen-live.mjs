// Explicit opt-in: this script sends real merchant photos and a few test requests
// to the configured paid model. Never prints credentials or request headers.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createQwenProvider} from '../server/qwen.mjs';
import {runCuratedChat,createProductImageLoader} from '../server/curated-chat.mjs';
import {makeInitial,idFor,findRender} from '../src/curated/data.ts';
process.loadEnvFile(new URL('../.env',import.meta.url));
const root=fileURLToPath(new URL('..',import.meta.url));
const traces=[];
const options={provider:createQwenProvider(),loadImage:createProductImageLoader(root),onTrace:t=>traces.push(t)};
assert(options.provider.status.configured,options.provider.status.message);
mkdirSync(new URL('../.qa',import.meta.url),{recursive:true});
try{
 const base=makeInitial(),message='只把裤子换成蓝色牛仔裤，西装、浅蓝衬衫和鞋子保持不变。';
 const first=await runCuratedChat({base,message,history:[]},options);
 assert(first.outfit,'模型应返回可用牛仔裤方案');assert.equal(findRender(first.outfit).id,'office-1');assert.deepEqual(first.outfit.lockedIds,base.lockedIds);assert(!first.outfit.selectedIds.includes(idFor('jeans')));
 console.log(JSON.stringify({case:'single-slot',renderId:first.outfit.imageTaskId,reply:first.reply}));
 const next=await runCuratedChat({base:first.outfit,message:'其他条件不变，但这整套的预算只能是100元。',history:[{role:'user',text:message},{role:'assistant',text:first.reply}]},options);
 assert.equal(next.outfit,null);assert.match(next.reply,/没有符合/);console.log(JSON.stringify({case:'impossible-budget',unchanged:true,reply:next.reply}));
 const third=await runCuratedChat({base:first.outfit,message:'预算恢复16000元，把裤子换回条纹长裤，其他还是保持不变。',history:[{role:'user',text:message},{role:'assistant',text:first.reply},{role:'user',text:'整套预算100元'},{role:'assistant',text:next.reply}]},options);
 assert(third.outfit);assert.equal(findRender(third.outfit).id,'office-0');console.log(JSON.stringify({case:'multi-turn-return',renderId:third.outfit.imageTaskId,reply:third.reply}));
}finally{writeFileSync(new URL('../.qa/qwen-live.json',import.meta.url),JSON.stringify(traces,null,2))}
