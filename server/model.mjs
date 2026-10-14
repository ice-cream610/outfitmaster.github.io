import {readFileSync} from 'node:fs';
import {scenes,styles} from '../src/agent/types.ts';
const system=readFileSync(new URL('./prompts/intent.md',import.meta.url),'utf8');
const allowedSlots=['top','bottom','dress','outer','shoes','bag'];
const keys=['scene','style','budgetCents','excludeSlots','excludeKinds','excludeColors','preferColors','preferFit','includeAccessories','replaceSlot','cheaper','lockSlots','unlockSlots','clarification'];
export function validatePatch(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('模型输出必须为对象');
 for(const key of Object.keys(value))if(!keys.includes(key))throw new Error('模型返回未知字段');
 if(value.scene!==undefined&&!scenes.includes(value.scene))throw new Error('无效场景');
 if(value.style!==undefined&&!['自动',...styles].includes(value.style))throw new Error('无效风格');
 if(value.budgetCents!==undefined&&(!Number.isSafeInteger(value.budgetCents)||value.budgetCents<0||value.budgetCents>100000000))throw new Error('无效预算');
 for(const key of ['excludeSlots','lockSlots','unlockSlots'])if(value[key]!==undefined&&(!Array.isArray(value[key])||value[key].some(s=>!allowedSlots.includes(s))))throw new Error('无效品类列表');
 for(const key of ['excludeKinds','excludeColors','preferColors'])if(value[key]!==undefined&&(!Array.isArray(value[key])||value[key].length>20||value[key].some(s=>typeof s!=='string'||s.length>30)))throw new Error('无效条件列表');
 if(value.replaceSlot!==undefined&&!allowedSlots.includes(value.replaceSlot))throw new Error('无效替换品类');
 if(value.preferFit!==undefined&&!['','slim','regular','loose'].includes(value.preferFit))throw new Error('无效版型');
 for(const key of ['cheaper','includeAccessories'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw new Error('无效布尔字段');
 if(value.clarification!==undefined&&(typeof value.clarification!=='string'||value.clarification.length>400))throw new Error('无效追问');
 return value;
}
export function createProvider(){
 if(!process.env.MODEL_API_KEY)return undefined;
 const base=process.env.MODEL_BASE_URL;if(!base)throw new Error('请设置 MODEL_BASE_URL');
 const url=new URL(base.replace(/\/$/,'')+'/chat/completions');
 if(url.protocol!=='https:'&&url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')throw new Error('模型接口需要 HTTPS');
 return {mode:'llm',async parse(message,state,signal){
  let error;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const timeout=AbortSignal.timeout(25000);
    const response=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${process.env.MODEL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.MODEL_NAME||'qwen-plus',temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({message,state,repair:attempt?'上一轮结果结构不合法，请严格按规则输出 JSON':undefined})}]}),signal:signal?AbortSignal.any([signal,timeout]):timeout});
    if(!response.ok)throw new Error(`模型服务 HTTP ${response.status}`);
    const raw=await response.json();const text=raw.choices?.[0]?.message?.content;
    if(typeof text!=='string')throw new Error('模型未返回有效内容');
    return validatePatch(JSON.parse(text));
   }catch(e){signal?.throwIfAborted();error=e;if(/HTTP (401|403|429)/.test(e.message))break}
  }
  throw new Error(`需求解析失败：${error?.message??'未知错误'}。当前方案已保留，可重试。`);
 }};
}
