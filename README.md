# OutfitMaster · 穿搭推荐 Agent MVP

从一件商品出发，根据场景、风格、待购预算和模拟用户行为推荐完整搭配，支持对话调整，并以固定卡通形象的二维服饰图层呈现。基于原React＋TypeScript前端扩展，原工作台仍可通过 `/#legacy` 查看。

## 快速开始

需要 Node.js 24或更高版本。

```sh
npm ci
npm run dev
```

打开 `http://127.0.0.1:5176`。该命令同时启动前端与本地后端；后端默认8787。停止时按Ctrl+C。

生产构建预览：

```sh
npm run build
npm start
```

打开 `http://127.0.0.1:8787`。仅静态托管 `dist/` 时，自动切换到浏览器存储和离线规则模式，不能调用服务端模型。

## 当前实现

- 模拟电商商城、商品搜索、分类、详情、多图查看与搭配入口。
- 4类场景、5类风格、自动偏好模式、待购预算和可选包袋。
- 90件商品：60件原创可控素材＋30件DummyJSON公开服饰演示样本。
- 5个模拟用户、96条初始购买/收藏/浏览记录，以及页面新增模拟行为。
- 固定工作流：偏好推断→需求解析→候选筛选→整套束搜索→多维评分→硬约束校验→卡通合成。
- 最多3套差异搭配、入口固定、锁定、局部替换、预算冲突处理。
- 可展开的执行记录：实际条件、候选ID、分项评分、校验和耗时。
- 卡通长短发、透明SVG和公开商品抠图的稳定图层合成。
- 收藏、历史、尺码校验与模拟购物清单；购买勾选不改变形象。
- 本地HTTP API、SQLite持久化、版本冲突与会话并发保护。
- 原前端回归测试、新工作流与接口测试、GitHub Actions。

## 模型与模式

无需密钥即可使用明确标注的**离线规则模式**，支持“只换裤子”“不要裙子”“预算改成500元”“更优雅一点”等常用修改。无法理解的表达会追问，不伪装成任意自然语言理解。

连接真实语言模型：复制 `.env.example` 为 `.env`，设置 `MODEL_API_KEY`、`MODEL_BASE_URL`、`MODEL_NAME`，重启后端。接口兼容千问或DeepSeek的Chat Completions JSON输出；百炼地址以对应地域/工作空间控制台为准，DeepSeek可设置 `MODEL_BASE_URL=https://api.deepseek.com`、`MODEL_NAME=deepseek-chat`。

模型负责对话需求解析；首轮标签推荐和整套评分不依赖模型。未配置真实凭证时，仅测试适配器结构与模拟模型响应，不声称完成真实模型效果评测。密钥只在服务端，`.env`不进入Git。

## 学习与改进

|入口|内容|
|---|---|
|[Harness学习地图](docs/agent-harness.md)|逐步调用链、工具、状态、提示词和实验|
|[审美研究与来源](docs/fashion-research.md)|主要论文、设计依据、数据许可与局限|
|[验收说明](docs/mvp-acceptance.md)|手动路径与自动验证|
|`src/agent/workflow.ts`|推荐主流程、偏好、搜索、整套评分、校验|
|`data/styling-knowledge.json`|实际读取的评分权重与研究公式|
|`server/prompts/intent.md`|可直接修改的系统提示词|
|`server/model.mjs`|模型请求、有限重试、输出校验|
|`src/mvp/Avatar.tsx`|固定卡通形象及服饰层位置|
|`scripts/import-public-data.py`|公开商品导入、主图缓存与白底抠图|

推荐分数是工程启发式，不是购买概率；没有训练审美模型。二维图层不会随机重绘商品，但不模拟布料、真实合身或任意姿态。公开样本的属性是粗标，需要人工校正。这是完整核心流程的学习MVP，不是全面真实货盘或生产电商系统。

## 数据与检查

```sh
npm test
npm run build
```

数据快照和素材已包含，运行不需要重新下载。重建原创素材：`npm run data:seed`。更新公开商品：`npm run data:import`，需要Python＋Pillow及网络。研究图片：`python scripts/import-fashion-references.py`；各图片来源、作者和许可见 `data/sources/fashion-references.json`。

SQLite自动保存在 `.runtime/outfit.sqlite`，仅监听本机。演示用户可切换，不属于生产登录与鉴权。收藏在本浏览器；无真实支付或商家订单。

## Git与GitHub

本地Git已初始化，原前端作为基线提交保留。提交中排除了依赖、密钥、数据库、构建和截图。GitHub上建立空仓库后执行：

```sh
git remote add origin https://github.com/YOUR_ACCOUNT/outfit-master.git
git push -u origin main
```

仓库尚未推送，不需要重新 `git init`。本地数据目录包含公开演示数据和每图署名说明；大规模真实货盘导入后应单独管理资源。

## 界面与验证

[验证记录](docs/validation-report.md)

![模拟商城](docs/screenshots/shop.png)

![穿搭推荐工作台](docs/screenshots/studio.png)
