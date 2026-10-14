import {scenes,styles} from './types.ts';
import type {IntentPatch,SessionState,Slot} from './types.ts';
const slotTerms:Record<Slot,RegExp>={top:/上衣|衬衫|短袖|针织|内搭/,bottom:/裤|裙子|下装|半裙/,dress:/连衣裙|礼服/,outer:/外套|西装|夹克/,shoes:/鞋/,bag:/包/};
const colorTerms=['白','黑','蓝','粉','红','绿','灰','棕','燕麦','奶油'];
export function parseOffline(message:string,state:SessionState):IntentPatch {
 const patch:IntentPatch={};let recognized=false;
 for(const scene of scenes)if(message.includes(scene)){patch.scene=scene;recognized=true}
 if(/上班|通勤|商务|面试/.test(message)){patch.scene='职业商务';recognized=true}
 if(/周末|逛街|休闲|日常/.test(message)){patch.scene='日常休闲';recognized=true}
 if(/拍照|出片|约会/.test(message)){patch.scene='拍照出片';recognized=true}
 if(/晚宴|婚礼|正式礼服/.test(message)){patch.scene='正式礼服';recognized=true}
 for(const style of styles)if(message.includes(style)){patch.style=style;recognized=true}
 const aliases:[RegExp,typeof styles[number]][]=[[/简约|简单|大气/,'简约大气'],[/甜美|可爱/,'甜美可爱'],[/优雅|知性/,'优雅知性'],[/中性|酷一点|冷酷/,'冷酷中性'],[/设计感|创意|个性/,'创意设计']];
 for(const [re,style] of aliases)if(re.test(message)){patch.style=style;recognized=true}
 const amount=message.match(/(?:预算|控制在|不超过|不超|最多|降到|改成|以内|上限)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/)||message.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/)||message.match(/(\d+(?:\.\d{1,2})?)\s*元/);
 if(amount){patch.budgetCents=Math.round(Number(amount[1])*100);recognized=true}
 if(/便宜|省钱|降价|低一点/.test(message)){patch.cheaper=true;recognized=true}
 if(/不要.{0,3}(裙|连衣裙)|不穿裙/.test(message)){patch.excludeKinds=[...new Set([...state.constraints.excludeKinds,'skirt','dress'])];recognized=true}
 if(/可以穿裙|允许裙|取消.{0,3}(裙.*限制|禁裙)/.test(message)){patch.excludeKinds=state.constraints.excludeKinds.filter(k=>!['skirt','dress'].includes(k));recognized=true}
 const colors=colorTerms.filter(c=>new RegExp(`(?:不要|不喜欢|避开)[^，。；]{0,3}${c}`).test(message));
 if(colors.length){patch.excludeColors=[...new Set([...state.constraints.excludeColors,...colors])];recognized=true}
 const prefer=colorTerms.filter(c=>new RegExp(`(?:喜欢|想要|换成|偏爱|试试)[^，。；]{0,3}${c}`).test(message));
 if(prefer.length){patch.preferColors=prefer;recognized=true}
 if(/宽松|阔腿/.test(message)){patch.preferFit='loose';recognized=true}
 if(/修身|贴身/.test(message)){patch.preferFit='slim';recognized=true}
 const swap=message.match(/(?:只换|仅换|换掉|换一|换个|换条|换双|换件|换成|替换)([^，。；]{0,8})/);
 if(swap){
  const found=(Object.keys(slotTerms) as Slot[]).filter(slot=>slotTerms[slot].test(swap[1]));
  if(found.length===1){patch.replaceSlot=found[0];recognized=true}
  else if(/只换|仅换/.test(message)){patch.clarification='请说明只替换上衣、下装、鞋履、外套还是包袋。';recognized=true}
 }
 const lock=message.match(/(?:保留|锁定|别动|不换)([^，。；]{0,12})/);
 if(lock){patch.lockSlots=(Object.keys(slotTerms) as Slot[]).filter(slot=>slotTerms[slot].test(lock[1]));recognized ||= patch.lockSlots.length>0}
 const unlock=message.match(/解锁([^，。；]{0,12})/);
 if(unlock){patch.unlockSlots=(Object.keys(slotTerms) as Slot[]).filter(slot=>slotTerms[slot].test(unlock[1]));recognized ||= patch.unlockSlots.length>0}
 if(/加.{0,3}(包|配饰)|带个包/.test(message)){patch.includeAccessories=true;recognized=true}
 if(/不要包|去掉包/.test(message)){patch.includeAccessories=false;recognized=true}
 if(!recognized)patch.clarification='离线模式暂不能准确理解这句话。可试「只换裤子」「预算改成 500 元」「不要裙子」；配置语言模型后可理解更多表达。';
 return patch;
}
