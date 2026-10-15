import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInitial,idFor,findRender,products} from '../src/curated/data.ts';
import {replenishment,buildOutfit} from '../src/curated/domain.ts';
import {runCuratedChat,validateChatInput,validateIntent,selectCandidates} from '../server/curated-chat.mjs';
import {createQwenProvider} from '../server/qwen.mjs';

const intent=(patch={})=>({action:'recommend',reply:'只换裤子',requirements:['只把裤子换成牛仔裤'],excludedIds:[],keepIds:[],changeSlots:['下装'],budget:null,scene:null,style:null,cheaper:false,...patch});
const request=(base=makeInitial())=>({base,message:'只把裤子换成牛仔裤，其他不动',history:[]});
function setup(patch={},decision={renderId:'office-1',reply:'已换成牛仔裤，保留西装、衬衫和平底鞋。',checks:[{requirement:'牛仔裤',met:true,evidence:'Isabella 水洗蓝牛仔裤'}]}){
 const calls=[],traces=[];
 return {calls,traces,options:{provider:{status:{configured:true,model:'test-qwen'},async complete(stage,data,images,signal){signal?.throwIfAborted();calls.push({stage,data,images});return {value:stage==='intent'?intent(patch):decision,usage:{total_tokens:42}}}},loadImage:id=>({id,url:'data:image/jpeg;base64,dGVzdA=='}),onTrace:trace=>traces.push(trace)}};
}
test('chat adjusts only trousers, sends actual candidate image inputs and retains locked items, appearance, purchase exclusions',async()=>{
 const base=makeInitial();base.selectedIds=base.selectedIds.filter(id=>id!==idFor('shirt'));
 const s=setup(),result=await runCuratedChat(request(base),s.options);
 assert.equal(findRender(result.outfit).id,'office-1');assert.deepEqual(result.outfit.lockedIds,base.lockedIds);assert.equal(result.outfit.avatar,base.avatar);
 assert.deepEqual(result.outfit.productIds.filter(id=>id!==idFor('jeans')),base.productIds.filter(id=>id!==idFor('trousers')));
 assert(!result.outfit.selectedIds.includes(idFor('jeans')));assert(!result.outfit.selectedIds.includes(idFor('shirt')));
 assert.equal(s.calls.length,2);assert(s.calls[1].images.some(i=>i.id===idFor('jeans')));assert.equal(s.traces[0].steps.length,4);assert.equal(base.imageTaskId,'office-0');
});
test('budget, source, availability, exclusions, locks, scope and cheaper are program constraints',()=>{
 const base=makeInitial();const valid=selectCandidates(base,intent());assert.deepEqual(valid.map(r=>r.id),['office-0','office-1']);
 assert.equal(selectCandidates(base,intent({budget:1})).length,0);
 assert.equal(selectCandidates({...base,conditions:{...base.conditions,sources:[]}},intent()).length,0);
 assert.equal(selectCandidates(base,intent({excludedIds:[idFor('blazer')]})).length,0);
 assert.deepEqual(selectCandidates({...base,lockedIds:[...base.lockedIds,idFor('trousers')]},intent()).map(r=>r.id),['office-0']);
 assert(selectCandidates(base,intent({cheaper:true})).every(r=>replenishment({...base,productIds:r.productIds})<replenishment(base)));
 assert.equal(selectCandidates(base,intent({scene:'正式礼服'})).length,0);
 const p=products.find(p=>p.id===idFor('jeans')),stock=p.stock;try{p.stock=0;assert(!selectCandidates(base,intent()).some(r=>r.id==='office-1'))}finally{p.stock=stock}
});
test('no feasible outfit never invokes image review or changes the current version',async()=>{
 const s=setup({budget:1}),result=await runCuratedChat(request(),s.options);
 assert.equal(result.outfit,null);assert.match(result.reply,/没有符合/);assert.equal(s.calls.length,1);
});
test('hallucinated or out-of-scope render and failing visual check cannot be applied',async()=>{
 for(const decision of [{renderId:'invented',reply:'假结果',checks:[{requirement:'x',met:true,evidence:'x'}]},{renderId:'office-2',reply:'错误换上衣',checks:[{requirement:'x',met:true,evidence:'x'}]},{renderId:'office-1',reply:'不符合',checks:[{requirement:'x',met:false,evidence:'x'}]}]){
  const s=setup({},decision);await assert.rejects(runCuratedChat(request(),s.options),/校验/);assert.equal(s.traces[0].steps.at(-1).stage,'未应用');
 }
});
test('visual reviewer may reject all candidates without silently relaxing a request',async()=>{
 const s=setup({}, {renderId:null,reply:'当前没有合适的浅色牛仔效果，请保留原搭配。',checks:[{requirement:'浅色',met:false,evidence:'现有款不匹配'}]});
 const r=await runCuratedChat(request(),s.options);assert.equal(r.outfit,null);assert.equal(r.action,'reply');
});
test('multi-turn context is bounded and preferences survive with the chosen outfit',async()=>{
 const base=makeInitial();base.chatPreferences={requirements:['不要红色'],excludedIds:[idFor('shorts')],scene:null,style:null};
 const input=request(base);input.history=[{role:'user',text:'不要红色'},{role:'assistant',text:'保留偏好'}];
 const s=setup({requirements:['不要红色','裤子换成牛仔'],excludedIds:[idFor('shorts')]});const r=await runCuratedChat(input,s.options);
 assert.deepEqual(s.calls[0].data.memory,base.chatPreferences);assert.deepEqual(s.calls[0].data.history,input.history);assert(r.outfit.chatPreferences.excludedIds.includes(idFor('shorts')));
 assert.throws(()=>validateChatInput({...input,history:Array(13).fill(input.history[0])}),/历史/);
 assert.throws(()=>validateChatInput({...input,message:'x'.repeat(2001)}),/2000/);
 assert.throws(()=>validateIntent(intent({unlockIds:[idFor('blazer')]})),/结构/);
 assert.throws(()=>validateChatInput({...input,base:{...base,lockedIds:['invented']}}),/状态/);
});
test('appearance instructions open the existing panel; locked items are never auto-unlocked',async()=>{
 const s=setup({action:'appearance',reply:'可以在形象面板选择长直发。'});const r=await runCuratedChat(request(),s.options);assert.equal(r.action,'appearance');assert.equal(r.outfit,null);assert.equal(s.calls.length,1);
});
test('manual preference/set changes supersede saved chat constraints; appearance preserves them',()=>{
 const base=makeInitial();base.chatPreferences={requirements:['通勤'],excludedIds:[],scene:'职业商务',style:'优雅知性'};
 assert.deepEqual(buildOutfit({base,avatar:'curly'}).chatPreferences,base.chatPreferences);
 assert.equal(buildOutfit({base,conditions:{...base.conditions,budget:18000}}).chatPreferences,undefined);
 assert.equal(buildOutfit({base,lookId:'casual',confirmUnlock:true}).chatPreferences,undefined);
});
test('cancelled work does not invoke the model or produce a new outfit',async()=>{
 const s=setup(),c=new AbortController();c.abort();await assert.rejects(runCuratedChat(request(),s.options,c.signal),{name:'AbortError'});assert.equal(s.calls.length,0);
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
