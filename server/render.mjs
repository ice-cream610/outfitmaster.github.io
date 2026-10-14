import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';import {createHash} from 'node:crypto';
const avatars=['short','long','curly','pony'];
export const renderKey=(ids,avatar)=>'e-original-v1|'+avatar+'|'+[...ids].sort().join('|');
export function extractGeneratedImage(response){
 const direct=response.output_image??response.outputImage;
 if(direct?.data)return direct;
 const parts=[...(response.outputs??[]),...(response.output??[]),...(response.steps??[]).flatMap(s=>s.type==='model_output'?[...(s.content??[]),...(s.outputs??[])]:[])];
 return parts.reverse().find(p=>p.type==='image'&&typeof p.data==='string');
}
export function createRenderManager({root,db,catalog}){
 const prompt=readFileSync(path.join(root,'server/prompts/e-tryon.md'),'utf8');
 const built=JSON.parse(readFileSync(path.join(root,'data/e-render-manifest.json'),'utf8')).renders;
 const configured=!!process.env.IMAGE_API_KEY&&!!process.env.IMAGE_MODEL;
 const folder=path.join(root,'.runtime','renders');mkdirSync(folder,{recursive:true});
 db.exec('CREATE TABLE IF NOT EXISTS render_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,cache_key TEXT NOT NULL,json TEXT NOT NULL)');
 // Interrupted jobs cannot remain eternally pending after a restart.
 for(const row of db.prepare('SELECT * FROM render_jobs').all()){
  const job=JSON.parse(row.json);if(job.status==='running'){job.status='failed';job.error='服务重启中断了生成，可以重新提交';db.prepare('UPDATE render_jobs SET json=? WHERE id=?').run(JSON.stringify(job),job.id)}
 }
 const save=job=>db.prepare('INSERT OR REPLACE INTO render_jobs VALUES (?,?,?,?)').run(job.id,job.userId,job.key,JSON.stringify(job));
 function localImage(url){
  if(!url.startsWith('/merchant/')&&!url.startsWith('/reference/e/'))throw new Error('只允许已入库的商品图片与原角色参考');
  const base=path.join(root,'public'),target=path.resolve(base,'.'+url);if(!target.startsWith(base+path.sep))throw new Error('素材路径无效');
  const ext=path.extname(target).toLowerCase(),mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[ext];if(!mime)throw new Error('不支持的素材格式');
  return {type:'image',mime_type:mime,data:readFileSync(target).toString('base64')};
 }
 async function execute(job,products){
  try{
   const base=process.env.IMAGE_BASE_URL||'https://generativelanguage.googleapis.com/v1beta';const url=new URL(base.replace(/\/$/,'')+'/interactions');
   if(url.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('图像接口需要HTTPS');
   const input=[{type:'text',text:prompt+'\n当前 avatarKey: '+job.avatar+'\n第一张图片为不可变更的E角色身份。后续商品图片按以下清单依次提供，清单外单品不得出现。'},localImage('/reference/e/identity-sheet.png')];
   for(const p of products){input.push({type:'text',text:JSON.stringify({productId:p.id,slot:p.slot,name:p.name,materials:p.materials,description:p.description})});input.push(localImage(p.images[0]));if(p.id===job.anchorId&&p.images[1])input.push(localImage(p.images[1]));}
   const response=await fetch(url,{method:'POST',headers:{'x-goog-api-key':process.env.IMAGE_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.IMAGE_MODEL,input,store:false}),signal:AbortSignal.timeout(180000)});
   if(!response.ok)throw new Error('图像服务 HTTP '+response.status);
   const raw=await response.text();if(raw.length>32000000)throw new Error('图像响应过大');
   const data=JSON.parse(raw),image=extractGeneratedImage(data);if(!image)throw new Error('服务未返回图片，可能被拒绝或模型不支持图像输出');
   const bytes=Buffer.from(image.data,'base64');if(bytes.length<100||bytes.length>24000000)throw new Error('图片大小无效');
   const mime=image.mime_type??image.mimeType;
   const ext=mime==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'.png':mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216?'.jpg':mime==='image/webp'&&bytes.subarray(0,4).toString()==='RIFF'?'.webp':null;
   if(!ext)throw new Error('返回图像格式或签名无效');
   const filename=job.id+ext;writeFileSync(path.join(folder,filename),bytes);
   job.status='generated-unreviewed';job.image='/api/render-assets/'+filename;job.completedAt=new Date().toISOString();job.durationMs=Date.now()-Date.parse(job.createdAt);save(job);
  }catch(e){job.status='failed';job.error=e.message;save(job)}
 }
 function create(input,session){
  if(!avatars.includes(input.avatar))throw new Error('无效的E形象');
  if(session.state.version!==input.version)throw new Error('方案版本已变化，请重新生成当前方案');
  const outfit=session.outfits.find(o=>o.id===input.outfitId);if(!outfit)throw new Error('方案不属于当前会话');
  const key=renderKey(outfit.productIds,input.avatar);const cached=built.find(r=>r.key===key);if(cached)return {...cached,userId:input.userId,id:'builtin-'+createHash('sha256').update(key).digest('hex').slice(0,12),cached:true};
  const previous=db.prepare('SELECT json FROM render_jobs WHERE cache_key=? AND user_id=? ORDER BY rowid DESC').all(key,input.userId).map(row=>JSON.parse(row.json)).find(j=>['running','generated-unreviewed','reviewed'].includes(j.status));if(previous)return {...previous,cached:true};
  if(!configured)throw new Error('当前组合没有已生成的E效果图。请在服务端配置 IMAGE_API_KEY 与 IMAGE_MODEL，启用保留原E的多图编辑；不会用平面贴图替代。');
  if(db.prepare('SELECT json FROM render_jobs WHERE user_id=?').all(input.userId).some(row=>JSON.parse(row.json).status==='running'))throw new Error('已有一张E效果正在生成，请等待完成');
  const job={id:crypto.randomUUID(),userId:input.userId,sessionId:session.state.id,version:session.state.version,anchorId:session.state.anchorId,avatar:input.avatar,productIds:outfit.productIds,key,status:'running',createdAt:new Date().toISOString(),promptVersion:'e-original-v1'};
  save(job);void execute(job,outfit.productIds.map(id=>catalog.find(p=>p.id===id)));return job;
 }
 return {configured,create,get(id,userId){const row=db.prepare('SELECT json FROM render_jobs WHERE id=? AND user_id=?').get(id,userId);return row?JSON.parse(row.json):null},asset(filename){if(!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(filename))return null;return path.join(folder,filename)}};
}
