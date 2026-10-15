// Local-only verification of the restored, approved design and pre-render flow.
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const base=process.argv[3]||'http://127.0.0.1:5176';
const browser=await chromium.launch({channel:'msedge',headless:true});
mkdirSync('.qa/curated',{recursive:true});
const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#shop');await page.locator('.om-shop-card').first().waitFor();
 assert.equal(await page.locator('.om-shop-card').count(),18);
 assert.equal(await page.locator('.om-hero-art [data-avatar]').getAttribute('data-avatar'),'long');
 assert.equal(await page.getByRole('button',{name:'用这件搭一套',exact:true}).count(),0);
 await page.locator('.om-shop-image').first().click();await page.locator('.merchant-detail').waitFor();
 assert(page.url().includes('#product/tfs-15621033951392'));
 const first=await page.locator('.curated-gallery>img').getAttribute('src');
 await page.getByRole('button',{name:'查看商品照片 2',exact:true}).click();assert.notEqual(await page.locator('.curated-gallery>img').getAttribute('src'),first);
 await page.locator('.merchant-sizes button').first().click();await page.getByRole('button',{name:'加入模拟购物袋',exact:true}).click();await page.getByRole('status').waitFor();
 await page.screenshot({path:'.qa/curated/product-desktop.png',fullPage:true});checks.push('shop → real multi-photo product detail → studio only through detail CTA');
 await page.getByRole('button',{name:'AI 穿搭 · 用这件搭一套'}).click();await page.locator('.curated-studio .workspace').waitFor();
 const stage=page.locator('.stage>.curated-avatar');
 async function loaded(){await page.evaluate(async()=>{const urls=[...document.querySelectorAll('.curated-avatar,.look-thumb')].map(e=>getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean);await Promise.all([...new Set(urls)].map(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=url})))})}
 const ids=()=>page.locator('.products-panel .product-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.product));
 await loaded();assert.equal(await stage.getAttribute('data-avatar'),'long');assert.equal(await stage.getAttribute('data-render-id'),'office-0');
 assert.equal(await page.locator('.om-workspace,.om-hair,.e-pending-preview').count(),0);
 assert.equal(await page.locator('.look-shelf>button').count(),4);
 const original=await ids();await page.screenshot({path:'.qa/curated/studio-desktop.png',fullPage:false});
 await page.locator('[data-product="tfs-15621034115232"]').getByRole('button',{name:'找替换'}).click();
 await page.locator('[data-product="tfs-7567394209952"]').getByRole('button',{name:'替换上身'}).click();
 await page.waitForFunction(()=>document.querySelector('.stage>.curated-avatar')?.dataset.renderId==='office-1');
 assert.deepEqual((await ids()).filter(id=>id!=='tfs-7567394209952'),original.filter(id=>id!=='tfs-15621034115232'));
 assert.equal(await page.locator('[data-product="tfs-7567394209952"] input').isChecked(),false);
 await page.locator('[data-product="tfs-7567394209952"] input').check();assert.equal(await stage.getAttribute('data-render-id'),'office-1');checks.push('single SKU replacement swaps only that garment and its matching image; purchase selection is independent');
 await page.getByRole('button',{name:'撤销，回到上一套'}).click();
 await page.getByRole('button',{name:'调整 E',exact:true}).click();await page.getByRole('dialog',{name:'调整 E 的模样'}).waitFor();
 assert.equal(await page.locator('.avatar-options>button:not(:disabled)').count(),4);
 await page.screenshot({path:'.qa/curated/avatar-options.png',fullPage:false});
 await page.locator('.avatar-options>button').filter({hasText:'齐肩卷发'}).click();await page.getByRole('button',{name:'保存形象'}).click();
 await page.waitForFunction(()=>document.querySelector('.stage>.curated-avatar')?.dataset.avatar==='curly');assert.deepEqual(await ids(),original);
 await page.getByRole('button',{name:'调整 E',exact:true}).click();await page.locator('.avatar-options>button').filter({hasText:'长直发'}).click();await page.getByRole('button',{name:'保存形象'}).click();
 await page.waitForFunction(()=>document.querySelector('.stage>.curated-avatar')?.dataset.avatar==='long');checks.push('original appearance panel restored; change hair/glasses without changing clothing');
 await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByRole('button',{name:/已存搭配/}).click();assert.equal(await page.locator('.saved-row').count(),1);await page.locator('.saved-row').first().click();
 await page.getByRole('button',{name:'加购',exact:true}).click();
 for(const select of await page.locator('.sku-fields select').all()){const value=await select.locator('option').nth(1).getAttribute('value')||await select.locator('option').nth(1).textContent();await select.selectOption(value)}
 await page.getByRole('button',{name:'确认模拟加购'}).click();await page.getByRole('heading',{name:'体验完成'}).waitFor();await page.getByRole('button',{name:'继续搭配'}).click();checks.push('saved full outfit and simulated SKU checkout');
 for(const label of ['松弛日常','温柔秋日','轻装周末','知性通勤']){
  await page.getByRole('button',{name:'体验'+label+'整套搭配',exact:true}).click();
  if(await page.getByRole('button',{name:'确认解锁并切换整套'}).count())await page.getByRole('button',{name:'确认解锁并切换整套'}).click();
  await page.waitForFunction(()=>!document.querySelector('.generation-overlay'));await loaded();
  assert.equal(await stage.getAttribute('data-avatar'),'long');assert(!(await page.locator('body').innerText()).includes('本套效果尚未生成'));
  await page.screenshot({path:'.qa/curated/look-'+label+'.png',fullPage:false});
 }
 checks.push('four style families all show ready effects and preserve long-hair selection');
 await page.getByRole('button',{name:'调整搭配条件',exact:true}).click();await page.locator('input[type=range]').fill('1000');await page.getByRole('button',{name:'应用并推荐'}).click();await page.getByRole('alert').waitFor();assert.equal(await stage.getAttribute('data-render-id'),'office-0');checks.push('impossible budget preserves previous valid look');
 await page.getByRole('link',{name:'返回商品详情'}).click();await page.locator('.merchant-detail').waitFor();await page.reload();await page.locator('.merchant-detail').waitFor();
 await page.getByRole('button',{name:'返回发现好物'}).click();await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'.qa/curated/shop-mobile.png',fullPage:true});
 await page.locator('.om-shop-image').first().click();await page.screenshot({path:'.qa/curated/product-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'AI 穿搭 · 用这件搭一套'}).click();await loaded();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'.qa/curated/studio-mobile.png',fullPage:true});checks.push('390px mobile details/studio; refresh-safe product URLs');
 await page.setViewportSize({width:1440,height:1050});await page.goto(base+'/#legacy');await page.locator('.workspace').waitFor();await page.screenshot({path:'.qa/curated/approved-original.png',fullPage:false});
 assert.deepEqual(errors,[]);writeFileSync('.qa/curated/report.json',JSON.stringify({passed:true,errors,checks},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}finally{await browser.close()}
