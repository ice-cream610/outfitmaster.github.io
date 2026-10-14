// Optional local QA: node scripts/verify-browser.mjs <absolute-playwright-module>.
import {mkdirSync,writeFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:'playwright');
mkdirSync('.qa',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8787');await page.getByRole('button',{name:'开始我的搭配'}).waitFor();
 assert.equal(await page.locator('.om-shop-card').count(),90);
 await page.locator('.om-shop-image img').evaluateAll(imgs=>imgs.slice(0,10).forEach(img=>img.loading='eager'));
 await page.waitForFunction(()=>[...document.querySelectorAll('.om-shop-image img')].slice(0,10).every(img=>img.complete&&img.naturalWidth>0));
 await page.screenshot({path:'.qa/shop-desktop.png',fullPage:false});
 await page.getByRole('button',{name:'开始我的搭配'}).click();await page.locator('.om-outfit-options>button').first().waitFor();
 assert.equal(await page.locator('.om-outfit-options>button').count(),3);
 const lockedSnapshot=await page.locator('.om-piece-card .om-product-title').allTextContents();
 await page.locator('.om-piece-label button').nth(2).click();await page.locator('.om-outfit-options>button').nth(1).click();
 assert.deepEqual(await page.locator('.om-piece-card .om-product-title').allTextContents(),lockedSnapshot,'switching alternatives must respect current locks');
 await page.locator('.om-piece-label button').nth(2).click();
 if(await page.getByLabel('关闭提示').count())await page.getByLabel('关闭提示').click();
 await page.locator('.om-outfit-options>button').nth(1).click();
 const before=await page.locator('.om-piece-card .om-product-title').allTextContents();
 await page.getByRole('button',{name:'只换裤子',exact:true}).click();await page.locator('.om-stage-wait').waitFor({state:'hidden'});
 const after=await page.locator('.om-piece-card .om-product-title').allTextContents();assert.equal(before[0],after[0]);assert.equal(before[2],after[2]);assert.notEqual(before[1],after[1]);
 await page.getByRole('textbox',{name:'输入穿搭需求'}).fill('预算改成1元');await page.getByRole('button',{name:'发送需求'}).click();await page.locator('.om-error').waitFor();
 assert.deepEqual(await page.locator('.om-piece-card .om-product-title').allTextContents(),after);
 await page.getByRole('textbox',{name:'输入穿搭需求'}).fill('预算改成900元');await page.getByRole('button',{name:'发送需求'}).click();await page.locator('.om-stage-wait').waitFor({state:'hidden'});await page.locator('.om-error').waitFor({state:'hidden'});
 await page.screenshot({path:'.qa/studio-desktop.png',fullPage:false});
 await page.getByRole('button',{name:'查看执行记录'}).click();assert.equal(await page.locator('.om-trace').count(),7);await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('button',{name:'加入模拟清单'}).click();for(const select of await page.locator('.om-cart-item select').all())await select.selectOption({index:1});await page.getByRole('button',{name:/确认模拟加购/}).click();await page.getByText(/已保存模拟购物清单/).waitFor();await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('button',{name:'收藏当前搭配'}).click();await page.getByRole('button',{name:'查看搭配历史'}).click();await page.locator('.om-saved').first().waitFor();await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.qa/studio-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await page.getByRole('button',{name:'返回发现'}).click();if(await page.getByLabel('关闭提示').count())await page.getByLabel('关闭提示').click();await page.screenshot({path:'.qa/shop-mobile.png',fullPage:false});
 await page.getByLabel('切换演示用户').selectOption('user-4');await page.getByRole('button',{name:'开始我的搭配'}).click();await page.locator('.om-outfit-options>button').first().waitFor();assert(await page.getByText('从你的标签开始探索').count());
 await page.goto('http://127.0.0.1:8787/#legacy');await page.getByText('AI 穿搭灵感工作台',{exact:true}).waitFor();
 const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/api/bootstrap',route=>route.abort());await fallback.goto('http://127.0.0.1:8787');await fallback.getByRole('button',{name:'开始我的搭配'}).click();await fallback.locator('.om-outfit-options>button').first().waitFor();assert.equal(await fallback.locator('.om-outfit-options>button').count(),3);await fallback.close();
 assert.deepEqual(errors,[]);writeFileSync('.qa/browser-report.json',JSON.stringify({passed:true,errors,checks:['shop','three alternatives','local replacement','budget failure and recovery','trace','cart','save','mobile overflow','cold start','legacy','static offline fallback']},null,2));
 console.log('Browser QA passed: storefront, recommendation, replacement, budget recovery, cart, trace, mobile, cold start, legacy.');
}finally{await browser.close()}
