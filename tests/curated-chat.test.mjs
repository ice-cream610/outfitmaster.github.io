import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInitial,idFor,findRender,products} from '../src/curated/data.ts';
import {replenishment,buildOutfit} from '../src/curated/domain.ts';
import {runCuratedChat,validateChatInput,validateIntent,selectCandidates,createProductImageLoader} from '../server/curated-chat.mjs';
import {createQwenProvider} from '../server/qwen.mjs';

const intent=(patch={})=>({action:'recommend',reply:'只换裤子',requirements:['只把裤子换成灯芯绒裤'],excludedIds:[],keepIds:[],changeSlots:['下装'],budget:null,scene:null,style:null,cheaper:false,...patch});
const request=(base=makeInitial())=>({base,message:'只把裤子换成灯芯绒裤，其他不动',history:[]});
function setup(patch={},decision={renderId:'berry-1',reply:'已换成灯芯绒裤，保留针织衫、马甲和平底鞋。',checks:[{requirement:'灯芯绒裤',met:true,evidence:'芥末黄灯芯绒阔腿裤'}]}){
 const calls=[],traces=[];
 return {calls,traces,options:{provider:{status:{configured:true,model:'test-qwen'},async complete(stage,data,images,signal){signal?.throwIfAborted();calls.push({stage,data,images});return {value:stage==='intent'?intent(patch):decision,usage:{total_tokens:42}}}},loadImage:id=>({id,url:'data:image/jpeg;base64,dGVzdA=='}),onTrace:trace=>traces.push(trace)}};
}
test('chat adjusts only trousers, sends actual candidate image inputs and retains locked items, appearance, purchase exclusions',async()=>{
 const base=makeInitial();base.selectedIds=base.selectedIds.filter(id=>id!==idFor('rose-vest'));
 const s=setup(),result=await runCuratedChat(request(base),s.options);
 assert.equal(findRender(result.outfit).id,'berry-1');assert.deepEqual(result.outfit.lockedIds,base.lockedIds);assert.equal(result.outfit.avatar,base.avatar);
 assert.deepEqual(result.outfit.productIds.filter(id=>id!==idFor('mustard-pants')),base.productIds.filter(id=>id!==idFor('plum-skirt')));
 assert(!result.outfit.selectedIds.includes(idFor('mustard-pants')));assert(!result.outfit.selectedIds.includes(idFor('rose-vest')));
 assert.equal(s.calls.length,2);assert(s.calls[1].images.some(i=>i.id===idFor('mustard-pants')));assert.equal(s.traces[0].steps.length,4);assert.equal(base.imageTaskId,'berry-0');
});
test('budget, source, availability, exclusions, locks, scope and cheaper are program constraints',()=>{
 const base=makeInitial();const valid=selectCandidates(base,intent());assert.deepEqual(valid.map(r=>r.id),['berry-0','berry-1']);
 assert.equal(selectCandidates(base,intent({budget:1})).length,0);
 assert.equal(selectCandidates({...base,conditions:{...base.conditions,sources:[]}},intent()).length,0);
 assert.equal(selectCandidates(base,intent({excludedIds:[idFor('berry-knit')]})).length,0);
 assert.deepEqual(selectCandidates({...base,lockedIds:[...base.lockedIds,idFor('plum-skirt')]},intent()).map(r=>r.id),['berry-0']);
 assert(selectCandidates(base,intent({cheaper:true})).every(r=>replenishment({...base,productIds:r.productIds})<replenishment(base)));
 assert.equal(selectCandidates(base,intent({scene:'正式礼服'})).length,0);
 const p=products.find(p=>p.id===idFor('mustard-pants')),stock=p.stock;try{p.stock=0;assert(!selectCandidates(base,intent()).some(r=>r.id==='berry-1'))}finally{p.stock=stock}
});
test('no feasible outfit never invokes image review or changes the current version',async()=>{
 const s=setup({budget:1}),result=await runCuratedChat(request(),s.options);
 assert.equal(result.outfit,null);assert.match(result.reply,/没有符合/);assert.equal(s.calls.length,1);
});
test('hallucinated or out-of-scope render and failing visual check cannot be applied',async()=>{
 for(const decision of [{renderId:'invented',reply:'假结果',checks:[{requirement:'x',met:true,evidence:'x'}]},{renderId:'berry-2',reply:'错误换上衣',checks:[{requirement:'x',met:true,evidence:'x'}]},{renderId:'berry-1',reply:'不符合',checks:[{requirement:'x',met:false,evidence:'x'}]}]){
  const s=setup({},decision);await assert.rejects(runCuratedChat(request(),s.options),/校验/);assert.equal(s.traces[0].steps.at(-1).stage,'未应用');
 }
});
test('visual reviewer may reject all candidates without silently relaxing a request',async()=>{
 const s=setup({}, {renderId:null,reply:'当前没有合适的浅色牛仔效果，请保留原搭配。',checks:[{requirement:'浅色',met:false,evidence:'现有款不匹配'}]});
 const r=await runCuratedChat(request(),s.options);assert.equal(r.outfit,null);assert.equal(r.action,'reply');
});
test('multi-turn context is bounded and preferences survive with the chosen outfit',async()=>{
 const base=makeInitial();base.chatPreferences={requirements:['不要红色'],excludedIds:[idFor('blue-culottes')],scene:null,style:null};
 const input=request(base);input.history=[{role:'user',text:'不要红色'},{role:'assistant',text:'保留偏好'}];
 const s=setup({requirements:['不要红色','裤子换成牛仔'],excludedIds:[idFor('blue-culottes')]});const r=await runCuratedChat(input,s.options);
 assert.deepEqual(s.calls[0].data.memory,base.chatPreferences);assert.deepEqual(s.calls[0].data.history,input.history);assert(r.outfit.chatPreferences.excludedIds.includes(idFor('blue-culottes')));
 assert.throws(()=>validateChatInput({...input,history:Array(13).fill(input.history[0])}),/历史/);
 assert.throws(()=>validateChatInput({...input,message:'x'.repeat(2001)}),/2000/);
 assert.throws(()=>validateIntent(intent({unlockIds:[idFor('berry-knit')]})),/结构/);
 assert.throws(()=>validateChatInput({...input,base:{...base,lockedIds:['invented']}}),/状态/);
});
test('appearance instructions open the existing panel; locked items are never auto-unlocked',async()=>{
 const s=setup({action:'appearance',reply:'可以在形象面板选择长直发。'});const r=await runCuratedChat(request(),s.options);assert.equal(r.action,'appearance');assert.equal(r.outfit,null);assert.equal(s.calls.length,1);
});
test('manual preference/set changes supersede saved chat constraints; appearance preserves them',()=>{
 const base=makeInitial();base.chatPreferences={requirements:['通勤'],excludedIds:[],scene:'职业商务',style:'优雅知性'};
 assert.deepEqual(buildOutfit({base,avatar:'curly'}).chatPreferences,base.chatPreferences);
 assert.equal(buildOutfit({base,conditions:{...base.conditions,budget:18000}}).chatPreferences,undefined);
 assert.equal(buildOutfit({base,lookId:'mint',confirmUnlock:true}).chatPreferences,undefined);
});
test('cancelled work does not invoke the model or produce a new outfit',async()=>{
 const s=setup(),c=new AbortController();c.abort();await assert.rejects(runCuratedChat(request(),s.options,c.signal),{name:'AbortError'});assert.equal(s.calls.length,0);
});

test('optional budget survives API validation and a whole-style change can select its exact series avatar',async()=>{
 const base={...makeInitial(),lockedIds:[]};assert.equal(validateChatInput(request(base)).base.conditions.budget,null);
 const i=intent({changeSlots:null,scene:'拍照出片',style:'甜美可爱'});
 assert(selectCandidates(base,i).some(r=>r.id==='sweet-0'));
 const s=setup(i,{renderId:'sweet-0',reply:'用奶油衬衫和轻纱裙换成甜美风。',checks:[{requirement:'甜美',met:true,evidence:'轻纱、蝴蝶结与双带鞋'}]});
 const result=await runCuratedChat(request(base),s.options);assert.equal(result.outfit.avatar,'pony');assert.equal(findRender(result.outfit).id,'sweet-0');assert.equal(result.outfit.conditions.budget,null);
 for(const budget of [-1,Infinity,''])assert.throws(()=>validateChatInput(request({...base,conditions:{...base.conditions,budget}})),/条件/);
});
test('all product vision inputs use bounded transport copies instead of full-size originals',async()=>{
 const load=createProductImageLoader(process.cwd());
 const images=await Promise.all(products.map(p=>load(p.id)));
 let bytes=0;for(const image of images){assert(image.url.startsWith('data:image/jpeg;base64,'));const length=Buffer.from(image.url.split(',')[1],'base64').length;assert(length<200000);bytes+=length}
 assert(bytes<8*1024*1024);assert.equal((await load(products[0].id)).id,products[0].id);
});
test('Qwen adapter uses server-only authentication, non-thinking JSON and image inputs',async()=>{
 let captured;
 const provider=createQwenProvider({env:{DASHSCOPE_API_KEY:'test-secret',QWEN_BASE_URL:'https://example.com/compatible-mode/v1'},fetchImpl:async(url,options)=>{captured={url,options};return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"ok":true}',reasoning_content:'not exposed'}}],usage:{total_tokens:50}}))}});
 const r=await provider.complete('rank',{hello:'world'},[{id:'p',url:'data:image/jpeg;base64,dGVzdA=='}]);
 assert.equal(captured.options.headers.Authorization,'Bearer test-secret');const body=JSON.parse(captured.options.body);assert.equal(body.model,'qwen3.8-flash');assert.equal(body.enable_thinking,false);assert.equal(body.preserve_thinking,false);assert.equal(body.response_format.type,'json_object');assert.equal(body.messages[1].content[2].type,'image_url');assert.deepEqual(r,{value:{ok:true},usage:{total_tokens:50}});assert(!JSON.stringify(provider.status).includes('test-secret'));
});
test('missing config, unauthorized upstream, malformed or truncated outputs fail explicitly without secrets',async()=>{
 const env={DASHSCOPE_API_KEY:'test-secret',QWEN_BASE_URL:'https://example.com/compatible-mode/v1'};
 const missing=createQwenProvider({env:{}});assert.equal(missing.status.configured,false);await assert.rejects(missing.complete('intent',{}),/DASHSCOPE_API_KEY/);
 for(const [response,pattern] of [[new Response('test-secret',{status:401}),/鉴权/],[new Response('test-secret'),/响应失败/],[new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]})),/完整/]]){
  const p=createQwenProvider({env,fetchImpl:async()=>response});await assert.rejects(p.complete('intent',{}),e=>pattern.test(e.message)&&!e.message.includes('test-secret'));
 }
});
