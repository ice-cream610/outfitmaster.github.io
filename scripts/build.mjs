import {build} from 'esbuild';
import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const outputDirectory=path.resolve(root,'dist');
if(path.dirname(outputDirectory)!==root||path.basename(outputDirectory)!=='dist')throw new Error('Invalid build output directory');
rmSync(outputDirectory,{recursive:true,force:true});
// Keep production bundling explicit and independent of the dev server.
const result=await build({entryPoints:{app:'src/main.tsx'},bundle:true,outdir:'dist/assets',format:'esm',splitting:true,minify:true,target:['es2022'],jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},loader:{'.png':'file'},entryNames:'[name]-[hash]',assetNames:'[name]-[hash]',metafile:true,logLevel:'info'});
const entry=Object.entries(result.metafile.outputs).find(([,v])=>v.entryPoint==='src/main.tsx');
if(!entry)throw new Error('Missing app entry');
const js='./'+path.relative('dist',entry[0]).replaceAll('\\','/');
const css=entry[1].cssBundle?'./'+path.relative('dist',entry[1].cssBundle).replaceAll('\\','/'):null;
mkdirSync('dist',{recursive:true});
writeFileSync('dist/index.html',`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#fbf7f2"/><meta name="description" content="Outfit Master 电商 AI 穿搭交互演示：从一件喜欢的单品，找到整套搭配。"/><title>Outfit Master · AI 穿搭工作台</title>${css?`<link rel="stylesheet" href="${css}"/>`:''}</head><body><div id="root"></div><script type="module" src="${js}"></script></body></html>`);
console.log('Production demo ready in dist/');
