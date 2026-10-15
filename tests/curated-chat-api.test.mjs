import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {makeInitial} from '../src/curated/data.ts';

test('curated HTTP endpoint forwards images, protects origin, keeps secrets server-side and reports missing configuration',async(t)=>{
 const calls=[];
 const upstream=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  calls.push({authorization:req.headers.authorization,body:JSON.parse(body)});
  const value=calls.length%2===1?{action:'recommend',reply:'只换下装',requirements:['牛仔裤'],excludedIds:[],keepIds:[],changeSlots:['下装'],budget:null,scene:null,style:null,cheaper:false}:{renderId:'office-1',reply:'保留西装和衬衫，换成水洗蓝牛仔裤。',checks:[{requirement:'牛仔裤',met:true,evidence:'Isabella 水洗蓝牛仔裤'}]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}));
 });
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>upstream.close());
 const port=22000+process.pid%1000;
 async function start(env){
  const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),OUTFIT_DB_PATH:':memory:',MODEL_API_KEY:'',IMAGE_API_KEY:'',DASHSCOPE_API_KEY:'',QWEN_API_KEY:'',QWEN_BASE_URL:'',...env},stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());let stderr='';child.stderr.on('data',d=>stderr+=d);
  await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error(stderr)}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('server timeout')),10000);timer.unref()})]);return child;
 }
 const url=`http://127.0.0.1:${port}`;
 const input={base:makeInitial(),message:'只换成牛仔裤',history:[]};
 const post=(value,origin='http://127.0.0.1:5176')=>fetch(url+'/api/curated/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(value)});
 const first=await start({DASHSCOPE_API_KEY:'fixture-secret',QWEN_BASE_URL:`http://127.0.0.1:${upstream.address().port}/compatible-mode/v1`});
 const status=await(await fetch(url+'/api/curated/chat/status')).json();assert.equal(status.configured,true);assert(!JSON.stringify(status).includes('fixture-secret'));
 assert.equal((await post(input,'https://foreign.example')).status,403);
 assert.equal((await post({...input,base:{...input.base,productIds:['invented']}})).status,400);assert.equal(calls.length,0);
 const res=await post(input),result=await res.json();assert.equal(res.status,200);assert.equal(result.outfit.imageTaskId,'office-1');assert.equal(result.baseId,input.base.id);
 assert.equal(calls.length,2);assert.equal(calls[0].authorization,'Bearer fixture-secret');assert(calls[1].body.messages[1].content.some(c=>c.type==='image_url'&&c.image_url.url.startsWith('data:image/')));assert(!JSON.stringify(result).includes('fixture-secret'));
 const exited=once(first,'exit');first.kill();await exited;
 await start({});assert.equal((await(await fetch(url+'/api/curated/chat/status')).json()).configured,false);const noKey=await post(input);assert.equal(noKey.status,503);assert.match((await noKey.json()).error,/DASHSCOPE_API_KEY/);assert.equal(calls.length,2);
});
