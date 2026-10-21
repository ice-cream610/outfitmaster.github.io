# 首页体验模块与角色素材

- 快速体验固定推荐真实商品 Newark 灰色细条纹西装；按钮直接进入该 SKU 的搭配页。
- 自由体验的推荐列表包含全部 18 件商品。购物车与已购各有 6 件演示商品，并合并现有本地模拟购物袋、订单里的商品；不会向订单记录写入虚构购买。搜索与来源筛选取交集。
- 商品详情中的加入模拟购物袋会保存到现有 shoppingKey；回到首页即可在购物车来源中找到。
- 桌面按商品、对话框、角色排列；手机把商品移到上方，仍保留左侧对话框、右侧角色。角色仅使用轻微 CSS 摇摆，系统减少动态设置下停止。

## 角色图片

文件：`public/curated/e-curious.png`。使用内置 imagegen，参考 `public/reference/e/identity-sheet.png` 中右上角长直发角色生成。透明背景，人工查看页面确认无底色和裁切；该图为邀请角色，不冒充实际试穿结果。

提示词：

Edit/identity-preserve. Create ONE transparent PNG mascot asset for an existing website, using ONLY the top-right long straight chocolate-brown-haired E character with rectangular dark glasses from the supplied identity sheet as the exact identity reference. Keep her square-round peach face, wide-set half-lidded eyes, small triangle nose, full cheeks, 3.5–4 head compact body proportions, long straight brown hair, clear rectangular glasses, realistic textured dark gray blazer, light blue shirt, beige wide trousers and brown loafers. Change expression to visibly curious and puzzled: one brow slightly raised, small thoughtful pursed mouth, head gently tilted toward viewer LEFT, one hand at chin, other hand slightly open questioning. Full body head and both shoes entirely visible, three-quarter facing slightly left, isolated on genuinely transparent background, soft studio illumination. This is a mascot invitation, not a product try-on image. Preserve the original identity closely; do not redesign or produce realistic human. No text, no E1/E2 labels, no question marks, no speech bubble, no props, no background, no panels. Only one character.
