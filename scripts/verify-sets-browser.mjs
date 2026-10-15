import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
mkdirSync('.qa/sets',{recursive:true});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 async function loaded(){await page.evaluate(async()=>{const urls=[...document.querySelectorAll('.curated-avatar')].map(e=>getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean);await Promise.all([...new Set(urls)].map(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=url})))})}
 await page.goto('http://127.0.0.1:5176/#shop');await page.getByRole('button',{name:'精选衣橱',exact:true}).click();await page.waitForURL('**/#wardrobe');await page.locator('.set-card').first().waitFor();
 assert.equal(await page.locator('.set-card').count(),12);assert.equal(await page.locator('.om-shop-grid').count(),0);assert.equal(await page.locator('.set-card [data-avatar=long]').count(),12);await loaded();
 await page.screenshot({path:'.qa/sets/collection-desktop.png',fullPage:true});await page.screenshot({path:'.qa/sets/collection-preview.png'});checks.push('distinct whole-outfit tab with 12 long-hair covers');
 await page.getByLabel('穿搭场景',{exact:true}).selectOption('职业商务');assert.equal(await page.locator('.set-card').count(),3);
 await page.getByLabel('风格偏好',{exact:true}).selectOption('优雅知性');await page.reload();await page.locator('.set-card').first().waitFor();assert.equal(await page.getByLabel('穿搭场景',{exact:true}).inputValue(),'职业商务');assert.equal(await page.locator('.set-card').count(),3);
 await page.getByLabel('整套预算上限',{exact:true}).fill('1');assert.equal(await page.locator('.set-card').count(),0);await page.getByRole('button',{name:'查看全部套装',exact:true}).click();assert.equal(await page.locator('.set-card').count(),12);checks.push('combined preferences persist and strict whole-set budget gives recoverable empty state');
 await page.locator('[data-set-id="office-0"]').click();await page.waitForURL('**/#set/office-0');await page.locator('.set-purchase-item').first().waitFor();
 assert.equal(await page.locator('.set-purchase-item').count(),4);assert.equal(await page.locator('.set-thumbnails button').count(),4);await loaded();
 const initial=await page.locator('.set-main-image [data-render-id]').getAttribute('data-render-id');
 await page.getByRole('button',{name:'上身细节',exact:true}).click();assert(await page.locator('.set-main-image').evaluate(el=>el.classList.contains('view-upper')));assert.equal(await page.locator('.set-main-image [data-render-id]').getAttribute('data-render-id'),initial);await page.getByRole('button',{name:'全身搭配',exact:true}).click();
 await page.getByRole('button',{name:'立即购买',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('dialog').count(),0);
 await page.locator('.set-purchase-item input[type=checkbox]').first().uncheck();assert.equal(await page.locator('.set-main-image [data-render-id]').getAttribute('data-render-id'),initial);
 const rows=page.locator('.set-purchase-item');let expectedTotal=0;
 for(let i=1;i<4;i++){const row=rows.nth(i),select=row.locator('select');const size=await select.locator('option').nth(1).getAttribute('value')||await select.locator('option').nth(1).textContent();await select.selectOption(size);expectedTotal+=Number((await row.locator('strong').textContent()).replace(/[^\d.]/g,''))}
 await page.getByRole('button',{name:'加入购物袋',exact:true}).click();await page.getByRole('status').waitFor();
 await page.getByRole('button',{name:'购物袋 3',exact:true}).click();assert.equal(await page.locator('dialog .set-receipt-items>div').count(),3);await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('button',{name:'立即购买',exact:true}).click();const total=await page.locator('dialog .set-modal-total').textContent();assert(total.includes(expectedTotal.toLocaleString('zh-CN')));
 await page.getByRole('button',{name:'确认模拟下单',exact:true}).click();await page.getByRole('heading',{name:'模拟下单成功',exact:true}).waitFor();await page.getByRole('button',{name:'继续逛逛',exact:true}).click();
 await page.getByRole('button',{name:'查看形象效果：齐肩卷发 · 圆框眼镜'}).click();assert.equal(await page.locator('.set-main-image [data-avatar]').getAttribute('data-avatar'),'curly');assert.equal(await page.locator('.set-purchase-item input:checked').count(),3);
 await page.screenshot({path:'.qa/sets/detail-desktop.png',fullPage:true});checks.push('same-outfit gallery, unchecked piece stays in preview, selected SKU checkout, persisted cart and confirmed order');
 await page.reload();await page.getByRole('button',{name:'模拟订单 1',exact:true}).click();assert.equal(await page.locator('dialog .set-order').count(),1);assert.equal(await page.locator('dialog .set-receipt-items>div').count(),3);await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.locator('.set-product-photo').first().click();await page.locator('.merchant-detail').waitFor();await page.getByRole('button',{name:'返回套装详情',exact:true}).click();await page.locator('.set-main-image').waitFor();
 await page.goto('http://127.0.0.1:5176/#set/office-1');await page.locator('.set-main-image [data-render-id=office-1]').waitFor();assert.equal(await page.locator('.set-thumbnails button').count(),1);assert.equal(await page.locator('.set-main-image [data-render-id]').getAttribute('data-render-id'),'office-1');checks.push('detail refresh, product return path and exact variant image coverage');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'精选衣橱',exact:true}).click();await page.locator('.set-card').first().waitFor();await loaded();
 assert(await page.getByRole('button',{name:'精选衣橱',exact:true}).isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.qa/sets/collection-mobile.png',fullPage:true});
 await page.locator('[data-set-id="office-0"]').click();await page.locator('.set-main-image').waitFor();await loaded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.qa/sets/detail-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'发现好物',exact:true}).click();await page.locator('.om-shop-card').first().waitFor();assert.equal(await page.locator('.om-shop-card').count(),18);await page.locator('.om-shop-image').first().click();await page.getByRole('button',{name:'AI 穿搭 · 用这件搭一套'}).click();await page.locator('.curated-studio .workspace').waitFor();checks.push('390px mobile navigation and layouts; individual-product studio flow preserved');
 assert.deepEqual(errors,[]);writeFileSync('.qa/sets/report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}catch(error){console.error('Page errors:',errors);throw error}finally{await browser.close()}
