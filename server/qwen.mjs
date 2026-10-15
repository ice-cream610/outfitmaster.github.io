import {readFileSync} from 'node:fs';
const prompts=Object.fromEntries(['intent','rank'].map(name=>[name,readFileSync(new URL(`./prompts/curated-${name}.md`,import.meta.url),'utf8')]));

export function createQwenProvider({env=process.env,fetchImpl=fetch,timeoutMs=45000}={}){
 const key=env.DASHSCOPE_API_KEY||env.QWEN_API_KEY;
 const model=env.QWEN_MODEL||'qwen3.8-flash';
 let url,configurationError='';
 if(!key)configurationError='请在项目 .env 中填写 DASHSCOPE_API_KEY，然后重启后端';
 else if(!env.QWEN_BASE_URL)configurationError='请在项目 .env 中填写同地域/业务空间的 QWEN_BASE_URL，然后重启后端';
 else try{
  url=new URL(env.QWEN_BASE_URL.replace(/\/+$/,'')+'/chat/completions');
  if(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))throw new Error();
  if(url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/compatible-mode/v1/chat/completions'))throw new Error();
 }catch{configurationError='QWEN_BASE_URL 无效，请填写以 /compatible-mode/v1 结尾的 OpenAI 兼容地址'}
 return {
  status:{configured:!configurationError,model,message:configurationError||'已配置；服务可用性将在发送需求时验证'},
  async complete(stage,data,images=[],signal){
   if(configurationError)throw new Error(configurationError);
   signal?.throwIfAborted();
   const content=[{type:'text',text:JSON.stringify(data)},...images.flatMap(i=>[{type:'text',text:`商品图片 productId=${i.id}`},{type:'image_url',image_url:{url:i.url}}])];
   let response,raw;
   try{
    response=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])]),body:JSON.stringify({model,enable_thinking:false,preserve_thinking:false,temperature:0.1,max_tokens:2400,response_format:{type:'json_object'},messages:[{role:'system',content:prompts[stage]},{role:'user',content}]})});
    if(!response.ok){
     const messages={401:'百炼鉴权失败，请检查 API Key',403:'百炼拒绝访问，请检查地域、业务空间和模型权限',429:'模型调用限流或额度不足，请稍后再试'};
     throw new Error(messages[response.status]||`模型服务暂不可用（HTTP ${response.status}）`);
    }
    // Bound malformed upstream output; never return upstream request bodies/keys.
    const text=await response.text();if(text.length>100000)throw new Error('模型响应过大');raw=JSON.parse(text);
   }catch(e){
    signal?.throwIfAborted();
    if(e.name==='TimeoutError')throw new Error('模型响应超时，原搭配已保留，请重试');
    if(response&&!response.ok)throw e;
    throw new Error('模型连接或响应失败，原搭配已保留，请检查网络与接口配置');
   }
   let value;
   try{if(raw.choices?.[0]?.finish_reason!=='stop')throw new Error();value=JSON.parse(raw.choices[0].message.content)}catch{throw new Error('模型没有返回完整的 JSON 结果，原搭配已保留，请重试')}
   const usage={};for(const name of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(raw.usage?.[name]))usage[name]=raw.usage[name];
   return {value,usage};
  }
 };
}
