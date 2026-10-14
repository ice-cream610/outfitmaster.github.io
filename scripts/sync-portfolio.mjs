import {copyFileSync,readdirSync,readFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const portfolio=path.resolve(process.argv[2]||path.join(project,'../hanxin-portfolio'));
const manifest=JSON.parse(readFileSync(path.join(portfolio,'package.json'),'utf8'));
if(manifest.name!=='hanxin-ai-portfolio')throw new Error('目标必须是韩馨个人网站源码目录');
const dist=path.join(project,'dist');
if(!existsSync(path.join(dist,'index.html')))throw new Error('请先运行 npm run build');
const destination=path.join(portfolio,'public','outfit-demo');
mkdirSync(destination,{recursive:true});
function copyDirectory(source,target){mkdirSync(target,{recursive:true});for(const item of readdirSync(source,{withFileTypes:true})){const from=path.join(source,item.name),to=path.join(target,item.name);if(item.isDirectory())copyDirectory(from,to);else if(item.isFile())copyFileSync(from,to)}}
copyDirectory(dist,destination);
console.log('已同步独立演示到 '+destination+'；接着构建个人网站即可发布。');
