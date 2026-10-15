import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {runCuratedChat} from '../server/curated-chat.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const base=process.argv[3]||'http://127.0.0.1:5176';
const live=process.argv.includes('--live');
const browser=await chromium.launch({channel:'msedge',headless:true});
mkdirSync('.qa/qwen',{recursive:true});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>errors.push(e.message));
 let visit=0;
 const open=async()=>{await page.goto(base+'/?qa='+ ++visit+'#outfit/tfs-15621033951392');await page.locator('.chat-input-area textarea').waitFor();await page.waitForFunction(()=>!document.querySelector('.chat-heading')?.textContent.includes('正在检查'));};
 const stage=page.locator('.stage>.curated-avatar');
 const send=async text=>{await page.getByRole('textbox',{name:'告诉我你的穿搭需求'}).fill(text);await page.getByRole('button',{name:'发送需求',exact:true}).click()};
 if(live){
  await open();assert.match(await page.locator('.chat-heading').innerText(),/Qwen3.8-Flash/);
  await send('只把裤子换成蓝色牛仔裤，西装、衬衫和鞋子都不要改。');
  await page.waitForFunction(()=>document.querySelector('.stage>.curated-avatar')?.dataset.renderId==='office-1',null,{timeout:120000});
  assert.equal(await stage.getAttribute('data-avatar'),'long');assert.equal(await page.locator('[data-product="tfs-7567394209952"] input').isChecked(),false);
  assert(await page.getByRole('button',{name:'解锁Newark 灰色细条纹西装'}).count());
  await page.screenshot({path:'.qa/qwen/live-chat.png',fullPage:true});checks.push('real browser → backend → Qwen text + vision → matching outfit and preserved locks');
  await page.getByRole('button',{name:'撤销，回到上一套'}).click();assert.equal(await stage.getAttribute('data-render-id'),'office-0');checks.push('undo returns matching initial outfit');
 }
 let mode='success',calls=0;
 await page.route('**/api/curated/chat',async route=>{
  calls++;const input=route.request().postDataJSON();
  if(mode==='error'){await route.fulfill({status:503,json:{error:'测试：模型暂时不可用，原搭配已保留'}});return}
  const result=await runCuratedChat(input,{provider:{status:{configured:true,model:'qwen3.8-flash'},async complete(stage){return {value:stage==='intent'?{action:'recommend',reply:'只换下装',requirements:['牛仔裤'],excludedIds:[],keepIds:[],changeSlots:['下装'],budget:null,scene:null,style:null,cheaper:false}:{renderId:'office-1',reply:'测试接口：保留其他单品，换上牛仔裤。',checks:[{requirement:'牛仔裤',met:true,evidence:'商品资料'}]}}}},loadImage:id=>({id,url:'test'})});
  if(mode==='slow')await new Promise(resolve=>setTimeout(resolve,1500));
  try{await route.fulfill({json:result})}catch{/* An aborted browser request must not apply a result. */}
 });
 await open();mode='error';await send('只换裤子');await page.getByRole('alert').filter({hasText:'测试：模型暂时不可用'}).waitFor();assert.equal(await stage.getAttribute('data-render-id'),'office-0');
 assert.equal(await page.locator('.message.user').count(),1);
 mode='success';await page.getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.stage>.curated-avatar')?.dataset.renderId==='office-1');
 assert.equal(await page.locator('.message.user').count(),1);checks.push('failed API keeps outfit; retry succeeds without duplicating the user turn');
 await open();mode='slow';await send('只换裤子');await page.getByRole('button',{name:'取消本次调整'}).click();await page.getByRole('alert').filter({hasText:'已取消'}).waitFor();await page.waitForTimeout(1800);assert.equal(await stage.getAttribute('data-render-id'),'office-0');assert.equal(await page.locator('.generation-overlay').count(),0);checks.push('cancel prevents a late result from replacing the outfit');
 await page.unroute('**/api/curated/chat');
 await page.route('**/api/curated/chat/status',route=>route.fulfill({json:{configured:false,model:'qwen3.8-flash',message:'请配置 DASHSCOPE_API_KEY'}}));
 await page.route('**/api/curated/chat',route=>route.fulfill({status:503,json:{error:'请配置 DASHSCOPE_API_KEY'}}));
 await open();assert.match(await page.locator('.chat-heading').innerText(),/待连接/);await send('只换裤子');await page.getByRole('alert').filter({hasText:'DASHSCOPE_API_KEY'}).waitFor();assert.equal(await stage.getAttribute('data-render-id'),'office-0');checks.push('unconfigured service is explicit and never fakes model success');
 assert.equal(calls,3);assert.deepEqual(errors,[]);
 writeFileSync('.qa/qwen/browser.json',JSON.stringify({live,checks,errors},null,2));console.log(JSON.stringify({live,checks,errors},null,2));
}finally{await browser.close()}
