# 审美研究、数据来源与可操作规则

研究用于指导可解释的MVP规则；没有下载大型训练集、训练模型或宣称已获得专业审美能力。商品与用户行为均用于本地演示，不能视作真实交易或当前市场趋势。

## 研究结论与实现关系

|问题|研究依据|本版实现|限制|
|---|---|---|---|
|单件相似是否等于整套好看|Vasileva等，ECCV 2018，区分相似与跨品类兼容|完整模板组合＋全套两两颜色关系和共同风格|没有复现或训练论文模型|
|怎样分析审美|FIT的设计课程强调比例、平衡、颜色与服装结构|独立评分维度，图案焦点与宽松轮廓为软规则|具体阈值为工程假设，不是课程给出的公式|
|如何研究配色|Google Arts & Culture与BoF的Runway Palette对秀场色彩进行组织|读取商品色相、饱和度与亮度；中性色、近似色和低饱和对比加分|没有使用其14万张图库，也不声称代表2026潮流|
|服饰怎样从图中分离|Fashionpedia研究服饰实例分割与属性|先采用适合白底商品图的抠图，保留日后实例分割接口方向|OCR不适合提取服装轮廓|

主要资料：

- [Learning Type-Aware Embeddings for Fashion Compatibility，原论文](https://arxiv.org/abs/1803.09196)
- [Learning Fashion Compatibility with Bidirectional LSTMs，原作者数据说明](https://github.com/xthan/polyvore-dataset)
- [FIT Design Practices](https://www.fitnyc.edu/academics/academic-divisions/ccps/credit/design-practices.php)
- [FIT关于色彩、图案、纹理、比例与功能的教学案例](https://blog.fitnyc.edu/artanddesign/2020/12/23/design-across-the-oceans-with-professor-jerry-dellova/)
- [Runway Palette](https://experiments.withgoogle.com/business-of-fashion)
- [Fashionpedia分类、分割与属性](https://fashionpedia.github.io/home/Fashionpedia_download.html)

## 本地数据清单

- `data/studio-catalog.json`：60件原创商品，覆盖6个槽位、5种风格和4种场景。由种子脚本可重复创建。价格、库存、风格与图像均为示例。
- `data/external-catalog.json`：30件从 [DummyJSON](https://dummyjson.com/docs/products) 导入的服饰演示记录，包含同一商品的多张图、原名称及来源。主图保存在 `public/catalog/external/`，经过白底抠图及缩放。不是淘宝货盘。
- `data/sources/dummyjson-*.json`：原始接口响应快照。人民币价格采用固定 USD×7.2 模拟换算，不代表实时汇率；风格、场景、正式度、版型与图案是粗标，需人工校正。
- `data/users.json`：5个虚构用户，其中4人各24条行为、1人无历史；未包含真实个人信息。用户在页面浏览、喜欢或“模拟已购”会新增模拟事件。
- `data/styling-knowledge.json`：带来源的研究原则和基础场景公式，权重实际被工作流读取。
- `data/sources/fashion-references.json`、`public/references/`：少量Wikimedia Commons街拍参考，保留文件来源、作者及每图许可；只作研究样本，不自动作为“好看”真值，不参与当前评分训练。

公开研究数据不等于可直接销售的商品数据库。原Polyvore部分链接已失效，原作者的新Hugging Face页面说明研究访问条件；本版没有绕过访问条件或把其图片包装成可售商品。下载失败记录在 `data/sources/import-manifest.json`，未导入的样本不计为已完成数据。

## 如何评审与改进

每次对同一核心商品给3套方案，分别记录完整性、颜色关系、轮廓比例、场景一致、用户偏好和新意。用户给“愿意穿/不愿意穿”“愿意购买/不愿意购买”及具体原因。将不同模型、提示词或权重放在相同任务集比较，避免用排序分数本身证明审美有效。

现有测试主要保障约束和状态正确，不证明推荐准确率、商业转化或审美达标。参考样本量小，也不能代表全面服饰市场或最新潮流。后续可通过标准商品导入扩充真实授权货盘，再建立配对偏好评测集。
