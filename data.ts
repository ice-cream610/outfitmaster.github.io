import type {Product,Outfit} from './types.ts';
export const products:Product[]=[
 {id:'jacket',name:'复古棕色皮质夹克',category:'外套',price:399,source:'商品池',cell:0,color:'复古棕',sizes:['S','M','L'],stock:12,description:'微宽松短款轮廓，为整套搭配保留利落比例。来自入口商品，默认锁定。'},
 {id:'knit',name:'奶油白罗纹针织衫',category:'内搭',price:159,source:'已购',cell:1,color:'奶油白',sizes:['S','M','L'],stock:8,description:'已有衣物参与搭配，默认不加入购买清单。柔和浅色平衡深色外套。'},
 {id:'denim',name:'水洗蓝直筒牛仔裤',category:'裤装',price:229,source:'购物车',cell:2,color:'水洗蓝',sizes:['S','M','L'],stock:10,description:'自然水洗色与直筒版型，适合日常与轻松通勤。'},
 {id:'loafers',name:'酒红色乐福鞋',category:'鞋履',price:269,source:'商品池',cell:3,color:'酒红',sizes:['36','37','38','39'],stock:5,description:'用低饱和酒红呼应棕色皮衣，让整套搭配更完整。'},
 {id:'gray',name:'炭灰垂感西装裤',category:'裤装',price:199,source:'商品池',cell:4,color:'炭灰',sizes:['S','M','L'],stock:7,description:'保留宽松轮廓，以炭灰替换牛仔蓝；比原裤装少 ¥30。'},
 {id:'sand',name:'沙色棉质直筒裤',category:'裤装',price:179,source:'商品池',cell:5,color:'沙色',sizes:['S','M','L'],stock:0,description:'柔和大地色的候选思路。当前演示库存为 0，可查看，不可替换或购买。'}
,{"id": "blazer", "name": "炭灰休闲西装外套", "category": "外套", "price": 329, "color": "炭灰", "source": "商品池", "cell": 0, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "shirt", "name": "浅蓝牛津纺衬衫", "category": "内搭", "price": 139, "color": "浅蓝", "source": "商品池", "cell": 1, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "beige", "name": "沙色高腰直筒裤", "category": "裤装", "price": 179, "color": "沙色", "source": "商品池", "cell": 2, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "brown-shoes", "name": "深棕皮质乐福鞋", "category": "鞋履", "price": 249, "color": "深棕", "source": "商品池", "cell": 3, "sheet": "expanded", "sizes": ["36", "37", "38", "39"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "cardigan", "name": "鼠尾草绿麻花开衫", "category": "外套", "price": 229, "color": "鼠尾草绿", "source": "商品池", "cell": 4, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "tee", "name": "奶油白圆领 T 恤", "category": "内搭", "price": 89, "color": "奶油白", "source": "商品池", "cell": 5, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "skirt", "name": "靛蓝 A 字牛仔裙", "category": "裙装", "price": 199, "color": "靛蓝", "source": "商品池", "cell": 6, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "canvas", "name": "米白低帮帆布鞋", "category": "鞋履", "price": 159, "color": "米白", "source": "商品池", "cell": 7, "sheet": "expanded", "sizes": ["36", "37", "38", "39"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "windbreaker", "name": "钴蓝连帽轻薄外套", "category": "外套", "price": 259, "color": "钴蓝", "source": "商品池", "cell": 8, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "gray-tee", "name": "花灰圆领 T 恤", "category": "内搭", "price": 99, "color": "花灰", "source": "商品池", "cell": 9, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "cargo", "name": "炭灰宽松工装裤", "category": "裤装", "price": 239, "color": "炭灰", "source": "商品池", "cell": 10, "sheet": "expanded", "sizes": ["S", "M", "L"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"},{"id": "runners", "name": "银灰复古运动鞋", "category": "鞋履", "price": 279, "color": "银灰", "source": "商品池", "cell": 11, "sheet": "expanded", "sizes": ["36", "37", "38", "39"], "stock": 12, "description": "可参与整套搭配或单件替换；商品、价格和库存均为演示数据。"}
];
export const product=(id:string)=>{const p=products.find(p=>p.id===id);if(!p)throw new Error('商品不存在');return p};
export const initialOutfit:Outfit={id:'initial',name:'复古日常 · 刚刚好的松弛',productIds:['jacket','knit','denim','loafers'],lockedIds:['jacket'],selectedIds:['jacket','denim','loafers'],avatar:'short',conditions:{scene:'日常通勤',style:'复古休闲',budget:1000,sources:['商品池','购物车','已购']},imageTaskId:'preset-denim-short',createdAt:0,reason:'用棕色皮衣作为主角，浅色针织与蓝色牛仔平衡厚重感，酒红鞋履轻轻呼应。'};

export const avatarLabels:Record<import('./types').Avatar,string>={short:'短发 · 轻松自然',long:'长发方框 · 知性通勤',curly:'卷发圆框 · 俏皮一点',pony:'高马尾 · 活力街头'};
export const looks=[
 {id:'retro',label:'复古日常',name:'复古日常 · 刚刚好的松弛',avatar:'short',productIds:['jacket','knit','denim','loafers'],cell:0,scene:'日常通勤'},
 {id:'office',label:'知性通勤',name:'知性通勤 · 干练不拘谨',avatar:'long',productIds:['blazer','shirt','beige','brown-shoes'],cell:1,scene:'日常通勤'},
 {id:'campus',label:'温柔学院',name:'温柔学院 · 自在的周末',avatar:'curly',productIds:['cardigan','tee','skirt','canvas'],cell:2,scene:'休闲周末'},
 {id:'sport',label:'活力街头',name:'活力街头 · 轻装去探索',avatar:'pony',productIds:['windbreaker','gray-tee','cargo','runners'],cell:3,scene:'休闲周末'}
] satisfies {id:string;label:string;name:string;avatar:import('./types').Avatar;productIds:string[];cell:number;scene:string}[];
export const avatarExample=(avatar:import('./types').Avatar):Outfit=>({...initialOutfit,avatar,productIds:looks.find(l=>l.avatar===avatar)!.productIds});

// Curated single-item transitions: only combinations with a matching full-body render are offered.
export const renderedVariants:{avatar:import('./types').Avatar;productIds:string[];cell:number}[]=[
 {avatar:'short',productIds:['jacket','knit','beige','loafers'],cell:20},
 {avatar:'short',productIds:['jacket','tee','denim','loafers'],cell:21},
 {avatar:'short',productIds:['cardigan','knit','denim','loafers'],cell:22},
 {avatar:'long',productIds:['blazer','shirt','gray','brown-shoes'],cell:23},
 {avatar:'long',productIds:['blazer','knit','beige','brown-shoes'],cell:24},
 {avatar:'long',productIds:['jacket','shirt','beige','brown-shoes'],cell:25},
 {avatar:'curly',productIds:['cardigan','tee','denim','canvas'],cell:30},
 {avatar:'curly',productIds:['cardigan','knit','skirt','canvas'],cell:31},
 {avatar:'curly',productIds:['windbreaker','tee','skirt','canvas'],cell:32},
 {avatar:'pony',productIds:['windbreaker','gray-tee','denim','runners'],cell:33},
 {avatar:'pony',productIds:['windbreaker','tee','cargo','runners'],cell:34},
 {avatar:'pony',productIds:['blazer','gray-tee','cargo','runners'],cell:35}
];
