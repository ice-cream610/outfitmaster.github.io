import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,existsSync,statSync,createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runWorkflow,validateOutfit,ownedProducts} from '../src/agent/workflow.ts';
import {createProvider} from './model.mjs';
import {createRenderManager} from './render.mjs';
import {priceForSize} from '../src/agent/prices.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{process.loadEnvFile(path.join(root,'.env'))}catch(e){if(e.code!=='ENOENT')throw e}
const read=(name)=>JSON.parse(readFileSync(path.join(root,'data',name),'utf8').replace(/^\uFEFF/,''));
const catalog=read('merchant-catalog.json');const seeds=read('merchant-users.json');
const provider=createProvider();mkdirSync(path.join(root,'.runtime'),{recursive:true});
const db=new DatabaseSync(process.env.OUTFIT_DB_PATH||path.join(root,'.runtime','outfit.sqlite'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,version INTEGER NOT NULL,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS carts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,json TEXT NOT NULL);');
db.exec("DELETE FROM products WHERE id LIKE 'studio-%' OR id LIKE 'dj-%'");
for(const p of catalog)db.prepare('INSERT OR REPLACE INTO products VALUES (?,?)').run(p.id,JSON.stringify(p));
for(const u of seeds)for(const e of u.events)db.prepare('INSERT OR IGNORE INTO events VALUES (?,?,?)').run(e.id,u.id,JSON.stringify(e));
const activeIds=new Set(catalog.map(p=>p.id));
const renders=createRenderManager({root,db,catalog});
const users=()=>seeds.map(u=>({...u,events:db.prepare('SELECT json FROM events WHERE user_id=? ORDER BY rowid').all(u.id).map(row=>JSON.parse(row.json)).filter(e=>activeIds.has(e.productId))}));
const locks=new Map();
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>65536)throw new Error('请求内容过大')}try{return JSON.parse(text)}catch{throw new Error('请求不是有效 JSON')}}
function requireUser(id){const user=users().find(u=>u.id===id);if(!user)throw new Error('无效演示用户');return user}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&url.pathname==='/api/bootstrap')return send(res,200,{catalog,users:users(),mode:provider?'llm':'offline',storage:'sqlite',modelConfigured:!!provider,renderConfigured:renders.configured});
  if(req.method==='GET'&&url.pathname.startsWith('/api/render-jobs/')){const job=renders.get(url.pathname.split('/').at(-1),url.searchParams.get('userId'));return send(res,job?200:404,job??{error:'任务不存在'});}
  if(req.method==='GET'&&url.pathname.startsWith('/api/render-assets/')){const asset=renders.asset(url.pathname.split('/').at(-1));if(!asset||!existsSync(asset))return send(res,404,{error:'图片不存在'});res.writeHead(200,{'Content-Type':{'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(asset)]});createReadStream(asset).pipe(res);return;}
  if(req.method==='POST'){
   const origin=req.headers.origin;if(origin&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin))return send(res,403,{error:'仅允许本地演示来源'});
   const input=await body(req);
   if(url.pathname==='/api/render-jobs'){
    requireUser(input.userId);const row=db.prepare('SELECT json FROM sessions WHERE id=? AND user_id=?').get(input.sessionId,input.userId);if(!row)throw new Error('会话不存在');
    return send(res,202,renders.create(input,JSON.parse(row.json)));
   }
   if(url.pathname==='/api/events'){
    requireUser(input.userId);
    if(!catalog.some(p=>p.id===input.productId)||!['view','favorite','purchase','dismiss'].includes(input.type))throw new Error('无效行为事件');
    const event={id:crypto.randomUUID(),productId:input.productId,type:input.type,at:new Date().toISOString(),seconds:Math.min(600,Math.max(1,Number(input.seconds)||20)),simulated:true};
    db.prepare('INSERT INTO events VALUES (?,?,?)').run(event.id,input.userId,JSON.stringify(event));return send(res,200,{event});
   }
   if(url.pathname==='/api/recommend'){
    const key=input.state?.id??input.nonce??`${input.userId}:${input.anchorId}`;
    if(locks.has(key))return send(res,409,{error:'该会话正在处理，请稍后再试'});
    const token=crypto.randomUUID();const controller=new AbortController();locks.set(key,token);
    res.on('close',()=>{if(!res.writableEnded){controller.abort();if(locks.get(key)===token)locks.delete(key)}});
    try{
     let previous;
     if(typeof input.message==='string'&&input.message.length>2000)throw new Error('需求请控制在 2000 字以内');
     if(input.state){
      const row=db.prepare('SELECT * FROM sessions WHERE id=? AND user_id=?').get(input.state.id,input.userId);
      if(!row)return send(res,404,{error:'会话不存在，请从商品页重新开始'});
      if(row.version!==input.state.version)return send(res,409,{error:'会话版本已变化，请重新打开搭配'});
      previous=JSON.parse(row.json);
      if(input.currentIds&&!previous.outfits.some(o=>[...o.productIds].sort().join('|')===[...input.currentIds].sort().join('|')))throw new Error('当前搭配不属于上一轮有效方案');
      input.state=previous.state;
     }
     const result=await runWorkflow(input,catalog,users(),provider,controller.signal);
     if(controller.signal.aborted||res.destroyed)return;
     // A failed refinement must not destroy the last valid alternatives or advance its version.
     const stored=!result.outfits.length&&previous?{...previous,trace:result.trace}:result;
     db.prepare('INSERT OR REPLACE INTO sessions VALUES (?,?,?,?)').run(stored.state.id,input.userId,stored.state.version,JSON.stringify(stored));
     return send(res,200,result);
    }finally{if(locks.get(key)===token)locks.delete(key)}
   }
   if(url.pathname==='/api/cart'){
    const user=requireUser(input.userId);const row=db.prepare('SELECT json FROM sessions WHERE id=? AND user_id=?').get(input.sessionId,input.userId);if(!row)throw new Error('会话不存在');
    const session=JSON.parse(row.json);const outfit=session.outfits.find(o=>o.id===input.outfitId);if(!outfit)throw new Error('方案不属于当前会话');
    if(validateOutfit(outfit.productIds,catalog,session.state,ownedProducts(user)).length)throw new Error('搭配已失效，请重新推荐');
    if(!Array.isArray(input.items)||!input.items.length)throw new Error('请选择待购商品');
    if(new Set(input.items.map(i=>i.productId)).size!==input.items.length)throw new Error('购物清单包含重复商品');
    const items=input.items.map(i=>{const p=catalog.find(p=>p.id===i.productId);if(!p||!outfit.productIds.includes(p.id)||!p.sizes.includes(i.size)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>p.stock)throw new Error('请检查商品、尺码和可售快照');return {...i,priceCents:priceForSize(p,i.size)}});
    const cart={id:crypto.randomUUID(),items,totalCents:items.reduce((s,i)=>s+i.priceCents*i.quantity,0),simulated:true,createdAt:new Date().toISOString()};
    db.prepare('INSERT INTO carts VALUES (?,?,?)').run(cart.id,user.id,JSON.stringify(cart));return send(res,200,cart);
   }
   return send(res,404,{error:'接口不存在'});
  }
  if(url.pathname.startsWith('/api/'))return send(res,404,{error:'接口不存在'});
  // Serve the built app for npm start; Vite proxies /api during development.
  const publicRoot=path.join(root,'dist');let file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
  if(file!==publicRoot&&!file.startsWith(publicRoot+path.sep))return send(res,403,{error:'路径无效'});
  if(!existsSync(file)||!statSync(file).isFile())file=path.join(publicRoot,'index.html');
  if(!existsSync(file))return send(res,404,{error:'请先执行 npm run build，或使用 npm run dev'});
  const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'}[path.extname(file)]??'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});createReadStream(file).pipe(res);
 }catch(e){if(!res.destroyed)send(res,400,{error:e.message||'请求失败'})}
});
server.listen(Number(process.env.PORT)||8787,'127.0.0.1',()=>console.log(`OutfitMaster http://127.0.0.1:${Number(process.env.PORT)||8787} · ${provider?'language model enabled':'offline rules'} · SQLite`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
