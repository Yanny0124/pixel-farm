// ==========================================
// 地图与物理常量
// ==========================================
const TILE_SIZE = 34; 
const ROWS = 16; const COLS = 16;

const farmStartX = 170; const farmStartY = 150;
const gridWidth = COLS * TILE_SIZE; const gridHeight = ROWS * TILE_SIZE; 

const ranchStartX = farmStartX + gridWidth + 150; const ranchStartY = 150;
const ranchWidth = 520; const ranchHeight = 520;

const crossroadX = farmStartX + gridWidth + 100; 
const crossroadY = farmStartY + gridHeight / 2;

const UNLOCK_PRICE = 50; 
const SAVE_VERSION = 4;
const WEATHER_CHANGE_INTERVAL = 60 * 60 * 1000;
const RAIN_SKILL_DURATION = 15 * 60 * 1000;
const RAIN_SKILL_BASE_CD = 2 * 60 * 60 * 1000;
const CROP_GROW_TIME_SCALE = 0.05;

const WORKER_LIMITS = { human: 5, drone: 1 };
const DRONE_UPGRADE_CONFIG = {
    speed: { name: '巡航引擎', maxLevel: 5, baseCost: 900, costStep: 650, bonusPerLevel: 0.35 },
    efficiency: { name: '作业模块', maxLevel: 5, baseCost: 1100, costStep: 800, cooldownReduction: 24 },
    cargo: { name: '收纳挂架', maxLevel: 3, baseCost: 1400, costStep: 1000, offlinePower: 8 }
};
const FARM_PLOTS = [
    { id: 'northWest', name: '西北田', row: 0, col: 0, rows: 8, cols: 8, color: 'rgba(107, 142, 83, 0.50)' },
    { id: 'northEast', name: '东北田', row: 0, col: 8, rows: 8, cols: 8, color: 'rgba(84, 126, 152, 0.46)' },
    { id: 'southWest', name: '西南田', row: 8, col: 0, rows: 8, cols: 8, color: 'rgba(173, 124, 57, 0.44)' },
    { id: 'southEast', name: '东南田', row: 8, col: 8, rows: 8, cols: 8, color: 'rgba(142, 94, 132, 0.42)' }
];

// ==========================================
// 游戏配置字典 (核心数值策划都在这里)
// ==========================================
const CROP_CONFIG = {
    carrot: { id: 'C01', name: '胡萝卜', icon: '🥕', category: '根茎类', reqLevel: 1, growTime: 8 * 60 * 1000, seedColor: '#ffcc80', matureColor: '#e65100', basePrice: 5, seedPrice: 2, exp: 8, stages: 3, unlockHint: '初始作物' },
    tomato: { id: 'C02', name: '番茄', icon: '🍅', category: '水果类', reqLevel: 3, growTime: 12 * 60 * 1000, seedColor: '#ef9a9a', matureColor: '#c0392b', basePrice: 9, seedPrice: 3, exp: 12, stages: 5, processedTo: 'ketchup', unlockCondition: () => playerLevel >= 3, unlockHint: 'Lv3 解锁' },
    wheat: { id: 'C03', name: '小麦', icon: '🌾', category: '谷物类', reqLevel: 5, growTime: 10 * 60 * 1000, seedColor: '#fbc02d', matureColor: '#f57f17', basePrice: 6, seedPrice: 2, exp: 10, stages: 4, processedTo: 'flour', special: '磨粉后价值×2', unlockCondition: () => playerLevel >= 5, unlockHint: 'Lv5 解锁' },
    corn: { id: 'C04', name: '玉米', icon: '🌽', category: '谷物类', reqLevel: 8, growTime: 15 * 60 * 1000, seedColor: '#9cad42', matureColor: '#f1c40f', basePrice: 15, seedPrice: 5, exp: 18, stages: 4, processedTo: 'popcorn', unlockCondition: () => playerLevel >= 8, unlockHint: 'Lv8 解锁' },
    potato: { id: 'C06', name: '土豆', icon: '🥔', category: '根茎类', reqLevel: 12, growTime: 20 * 60 * 1000, seedColor: '#c9a66b', matureColor: '#8d6e4b', basePrice: 12, seedPrice: 4, exp: 22, stages: 4, processedTo: 'fries', unlockCondition: () => playerLevel >= 12, unlockHint: 'Lv12 解锁' },
    sunflower: { id: 'C07', name: '向日葵', icon: '🌻', category: '油料类', reqLevel: 15, growTime: 18 * 60 * 1000, seedColor: '#d4ac0d', matureColor: '#f1c40f', basePrice: 22, seedPrice: 7, exp: 26, stages: 4, processedTo: 'sunflowerOil', special: '同时产出种子和油料', unlockCondition: () => playerLevel >= 15, unlockHint: 'Lv15 解锁' },
    pumpkin: { id: 'C08', name: '南瓜', icon: '🎃', category: '藤蔓类', reqLevel: 18, growTime: 30 * 60 * 1000, seedColor: '#d8a24a', matureColor: '#e67e22', basePrice: 45, seedPrice: 15, exp: 44, stages: 5, processedTo: 'pumpkinPie', special: '成熟时占据2×2地块', unlockCondition: () => playerLevel >= 18, unlockHint: 'Lv18 解锁' },
    sugarcane: { id: 'C09', name: '甘蔗', icon: '🎋', category: '经济类', reqLevel: 22, growTime: 22 * 60 * 1000, seedColor: '#a9dfbf', matureColor: '#229954', basePrice: 10, seedPrice: 4, exp: 28, stages: 4, processedTo: 'sugar', special: '加工糖价值×3', unlockCondition: () => playerLevel >= 22, unlockHint: 'Lv22 解锁' },
    cotton: { id: 'C10', name: '棉花', icon: '☁️', category: '经济类', reqLevel: 25, growTime: 20 * 60 * 1000, seedColor: '#d6eaf8', matureColor: '#fdfefe', basePrice: 16, seedPrice: 6, exp: 30, stages: 5, processedTo: 'cloth', special: '非食用，用于奇迹建设/交易', unlockCondition: () => playerLevel >= 25, unlockHint: 'Lv25 解锁' },
    purpleCarrot: { id: 'C11', name: '紫色胡萝卜', icon: '🥕', category: '根茎类', reqLevel: 1, growTime: 10 * 60 * 1000, seedColor: '#b56bd6', matureColor: '#6c3483', basePrice: 18, seedPrice: 6, exp: 20, stages: 3, variantOf: 'carrot', rarity: '★★', unlockCondition: () => isVariantUnlocked('carrot', 'purpleCarrot'), unlockHint: '收割胡萝卜50次后，胡萝卜5%概率变异' },
    blackTomato: { id: 'C12', name: '黑番茄', icon: '🍅', category: '水果类', reqLevel: 1, growTime: 14 * 60 * 1000, seedColor: '#5d3a3a', matureColor: '#2c1b1b', basePrice: 28, seedPrice: 9, exp: 28, stages: 5, variantOf: 'tomato', rarity: '★★', unlockCondition: () => isVariantUnlocked('tomato', 'blackTomato'), unlockHint: '莉亚任务 LIA-4 后，番茄7%概率变异' },
    goldenWheat: { id: 'C13', name: '金色小麦', icon: '🌾', category: '谷物类', reqLevel: 1, growTime: 12 * 60 * 1000, seedColor: '#f9e79f', matureColor: '#f1c40f', basePrice: 60, seedPrice: 6, exp: 48, stages: 4, variantOf: 'wheat', rarity: '★★★', unlockCondition: () => isVariantUnlocked('wheat', 'goldenWheat'), unlockHint: '收割小麦200次后，小麦1%概率变异' },
    blueCorn: { id: 'C14', name: '蓝玉米', icon: '🌽', category: '谷物类', reqLevel: 1, growTime: 18 * 60 * 1000, seedColor: '#85c1e9', matureColor: '#2e86c1', basePrice: 35, seedPrice: 15, exp: 36, stages: 4, variantOf: 'corn', rarity: '★★', unlockCondition: () => isVariantUnlocked('corn', 'blueCorn'), unlockHint: '收割玉米80次后，玉米4%概率变异' },
    whiteStrawberry: { id: 'C15', name: '白草莓', icon: '🍓', category: '水果类', reqLevel: 1, growTime: 28 * 60 * 1000, seedColor: '#fdebd0', matureColor: '#f8f9f9', basePrice: 65, seedPrice: 30, exp: 52, stages: 5, variantOf: 'strawberry', rarity: '★★', unlockCondition: () => isVariantUnlocked('strawberry', 'whiteStrawberry'), unlockHint: '收割草莓60次后，草莓3%概率变异' },
    strawberry: { id: 'C16', name: '草莓', icon: '🍓', category: '水果类', reqLevel: 1, growTime: 25 * 60 * 1000, seedColor: '#f8a5c2', matureColor: '#c0392b', basePrice: 30, seedPrice: 10, exp: 36, stages: 5, unlockCondition: () => visitorState.leo?.step >= 1, unlockHint: '雷欧任务 LEO-1 解锁' },
    chili: { id: 'C17', name: '辣椒', icon: '🌶️', category: '蔬菜类', reqLevel: 1, growTime: 15 * 60 * 1000, seedColor: '#f1948a', matureColor: '#c0392b', basePrice: 20, seedPrice: 7, exp: 24, stages: 4, unlockCondition: () => visitorState.leo?.resident && (stats.leoRandomTalks || 0) >= 3, unlockHint: '雷欧入驻后第3次随机对话' },
    lavender: { id: 'C18', name: '薰衣草', icon: '🪻', category: '花卉类', reqLevel: 1, growTime: 35 * 60 * 1000, seedColor: '#c39bd3', matureColor: '#8e44ad', basePrice: 40, seedPrice: 14, exp: 46, stages: 5, unlockCondition: () => visitorState.lia?.step >= 3, unlockHint: '莉亚任务 LIA-3 解锁' },
    pine: { id: 'C19', name: '松树', icon: '🌲', category: '木材类', reqLevel: 1, growTime: 60 * 60 * 1000, seedColor: '#7dcea0', matureColor: '#145a32', basePrice: 0, seedPrice: 20, exp: 60, stages: 5, produces: 'wood', produceAmount: 5, noSell: true, unlockCondition: () => visitorState.bruno?.step >= 2, unlockHint: '布鲁诺任务 BRU-2 解锁' },
    saffron: { id: 'C20', name: '藏红花', icon: '🌷', category: '经济类', reqLevel: 1, growTime: 40 * 60 * 1000, seedColor: '#b56bd6', matureColor: '#8e44ad', basePrice: 120, seedPrice: 40, exp: 80, stages: 3, unlockCondition: () => visitorState.amir?.step >= 3, unlockHint: '阿米尔交易5次解锁' },
    rice: { id: 'C21', name: '水稻', icon: '🌾', category: '谷物类', reqLevel: 1, growTime: 20 * 60 * 1000, seedColor: '#a8d08d', matureColor: '#d6c35a', basePrice: 14, seedPrice: 5, exp: 26, stages: 4, unlockCondition: () => getMiracleStageIndex('irrigation') >= 4, unlockHint: '灌溉渠第4段解锁' },
    lotusRoot: { id: 'C22', name: '莲藕', icon: '🪷', category: '根茎类', reqLevel: 1, growTime: 35 * 60 * 1000, seedColor: '#f5cba7', matureColor: '#d7b899', basePrice: 38, seedPrice: 12, exp: 44, stages: 5, unlockCondition: () => miracleState.irrigation?.completed, unlockHint: '灌溉渠全部完成解锁' },
    oak: { id: 'C23', name: '橡树', icon: '🌳', category: '木材类', reqLevel: 1, growTime: 90 * 60 * 1000, seedColor: '#82e0aa', matureColor: '#196f3d', basePrice: 0, seedPrice: 30, exp: 90, stages: 5, produces: 'hardwood', produceAmount: 4, noSell: true, unlockCondition: () => getMiracleStageIndex('barn') >= 2, unlockHint: '谷仓第2阶段解锁' },
    rainWheat: { id: 'C24', name: '雨小麦', icon: '🌧️', category: '谷物类', reqLevel: 1, growTime: 6 * 60 * 1000, seedColor: '#85c1e9', matureColor: '#5dade2', basePrice: 80, seedPrice: 24, exp: 70, stages: 4, hidden: true, unlockCondition: () => isVariantUnlocked('wheat', 'rainWheat'), unlockHint: '雨天连续种植小麦100次' },
    moonflower: { id: 'C25', name: '月光花', icon: '🌙', category: '花卉类', reqLevel: 1, growTime: 45 * 60 * 1000, seedColor: '#d6eaf8', matureColor: '#f8f9f9', basePrice: 100, seedPrice: 30, exp: 90, stages: 5, hidden: true, unlockCondition: () => isVariantUnlocked('lavender', 'moonflower'), unlockHint: '深夜收割薰衣草20次' },
    chicken: { name: '小鸡', icon: '🐔', reqLevel: 2, price: 50 },
    sheep: { name: '绵羊', icon: '🐑', reqLevel: 3, price: 100 },
    cow: { name: '奶牛', icon: '🐮', reqLevel: 4, price: 150 },
    bee: { name: '蜜蜂', icon: '🐝', reqLevel: 5, price: 200 },
    pig: { name: '小猪', icon: '🐷', reqLevel: 6, price: 300 },
    egg: { name: '鸡蛋', icon: '🥚', basePrice: 15 }, 
    wool: { name: '羊毛', icon: '🧶', basePrice: 25 }, 
    milk: { name: '牛奶', icon: '🥛', basePrice: 40 }, 
    honey: { name: '蜂蜜', icon: '🍯', basePrice: 80 },
    truffle: { name: '松露', icon: '🍄', basePrice: 120 },
    goldenEgg: { name: '金色鸡蛋', icon: '🥚', basePrice: 80 },
    goldenWool: { name: '金羊毛', icon: '🧶', basePrice: 120 },
    goldenMilk: { name: '金奶', icon: '🥛', basePrice: 180 },
    royalHoney: { name: '皇家蜂蜜', icon: '🍯', basePrice: 260 },
    blackTruffle: { name: '黑松露', icon: '🍄', basePrice: 360 },
    wood: { name: '木材', icon: '🪵', basePrice: 10 },
    hardwood: { name: '硬木', icon: '🪵', basePrice: 18 },
    flour: { name: '面粉', icon: '🌫️', basePrice: 28 },
    ketchup: { name: '番茄酱', icon: '🥫', basePrice: 150 },
    popcorn: { name: '爆米花', icon: '🍿', basePrice: 30 },
    fries: { name: '薯条', icon: '🍟', basePrice: 24 },
    sunflowerSeed: { name: '葵花籽', icon: '🌻', basePrice: 28 },
    sunflowerOil: { name: '葵花油', icon: '🛢️', basePrice: 70 },
    pumpkinPie: { name: '南瓜派', icon: '🥧', basePrice: 90 },
    sugar: { name: '糖', icon: '🧂', basePrice: 30 },
    cloth: { name: '棉布', icon: '🧵', basePrice: 48 },
    bread: { name: '面包', icon: '🍞', basePrice: 95 },
    cheese: { name: '奶酪', icon: '🧀', basePrice: 125 }
};

const WEATHER_CONFIG = {
    sunny: { name: '晴天', icon: '☀️', growth: 1, weight: 60, tint: 'rgba(255, 244, 189, 0.08)' },
    rain: { name: '雨天', icon: '🌧️', growth: 1.3, weight: 25, tint: 'rgba(52, 152, 219, 0.16)' },
    drought: { name: '干旱', icon: '☀️', growth: 0.5, weight: 15, tint: 'rgba(211, 84, 0, 0.14)' }
};

const TALENT_CONFIG = {
    agriculture: {
        name: '农业大师',
        icon: '🌿',
        color: '#27ae60',
        effects: ['生长速度 +5%', '祈雨技能', '共振概率 +15%', '雨天额外 +15%', '双倍收获 10%']
    },
    husbandry: {
        name: '畜牧大亨',
        icon: '🐔',
        color: '#e67e22',
        effects: ['动物产出间隔 -10%', '小鸡购买成本 -30%', '概率产出金色产品', '动物心情阈值提升', '绵羊精通']
    },
    industry: {
        name: '工业领袖',
        icon: '⚙️',
        color: '#2980b9',
        effects: ['收集范围 +1', '自动播种机 + 共振概率 +15%', '离线收益 +25%', '无人机收动物品', '建筑费用 -20%']
    }
};

const RANCH_BUILDING_CONFIG = {
    coop: {
        name: '鸡舍',
        icon: '🐔',
        animal: 'chicken',
        product: 'egg',
        reqLevel: 2,
        baseCost: 260,
        maxLevel: 4,
        capacityPerLevel: 4,
        bonusPerLevel: 0.08,
        x: ranchStartX + 34,
        y: ranchStartY + 44,
        w: 128,
        h: 92,
        color: '#e9c46a'
    },
    sheepfold: {
        name: '羊圈',
        icon: '🐑',
        animal: 'sheep',
        product: 'wool',
        reqLevel: 3,
        baseCost: 420,
        maxLevel: 4,
        capacityPerLevel: 4,
        bonusPerLevel: 0.08,
        x: ranchStartX + 192,
        y: ranchStartY + 44,
        w: 132,
        h: 92,
        color: '#d8e2dc'
    },
    cowshed: {
        name: '牛棚',
        icon: '🐄',
        animal: 'cow',
        product: 'milk',
        reqLevel: 4,
        baseCost: 620,
        maxLevel: 4,
        capacityPerLevel: 3,
        bonusPerLevel: 0.09,
        x: ranchStartX + 348,
        y: ranchStartY + 44,
        w: 142,
        h: 96,
        color: '#f4f1de'
    },
    apiary: {
        name: '蜂箱',
        icon: '🐝',
        animal: 'bee',
        product: 'honey',
        reqLevel: 5,
        baseCost: 780,
        maxLevel: 3,
        capacityPerLevel: 3,
        bonusPerLevel: 0.1,
        x: ranchStartX + 56,
        y: ranchStartY + 352,
        w: 110,
        h: 82,
        color: '#f1c40f'
    },
    pigpen: {
        name: '猪圈',
        icon: '🐖',
        animal: 'pig',
        product: 'truffle',
        reqLevel: 6,
        baseCost: 980,
        maxLevel: 3,
        capacityPerLevel: 3,
        bonusPerLevel: 0.1,
        x: ranchStartX + 342,
        y: ranchStartY + 344,
        w: 132,
        h: 92,
        color: '#f5b7c8'
    }
};

const PROCESSING_BUILDING_CONFIG = {
    mill: {
        name: '磨坊',
        icon: '🌾',
        reqLevel: 3,
        unlockCondition: () => playerLevel >= 5 && (stats.harvests?.wheat || 0) >= 20,
        unlockHint: 'Lv.5 且累计收获小麦 20',
        baseCost: 520,
        maxLevel: 4,
        speedBonusPerLevel: 0.08,
        recipes: ['flour', 'popcorn', 'sugar'],
        x: farmStartX + 58,
        y: farmStartY + gridHeight + 46,
        w: 172,
        h: 132,
        color: '#d8b26e'
    },
    ketchupFactory: {
        name: '番茄酱工坊',
        icon: '🥫',
        reqLevel: 4,
        unlockCondition: () => playerLevel >= 4 && isCollected('tomato'),
        unlockHint: 'Lv.4 且收获番茄',
        baseCost: 860,
        maxLevel: 4,
        speedBonusPerLevel: 0.08,
        recipes: ['ketchup', 'fries', 'sunflowerSeed', 'sunflowerOil', 'cloth'],
        x: farmStartX + 286,
        y: farmStartY + gridHeight + 46,
        w: 172,
        h: 132,
        color: '#d76a62'
    },
    bakery: {
        name: '面包房',
        icon: '🍞',
        reqLevel: 5,
        unlockCondition: () => playerLevel >= 5 && getProcessingBuildingLevel('mill') > 0 && isCollected('egg'),
        unlockHint: 'Lv.5 且拥有磨坊并收集鸡蛋',
        baseCost: 980,
        maxLevel: 4,
        speedBonusPerLevel: 0.08,
        recipes: ['bread', 'pumpkinPie'],
        x: farmStartX + 514,
        y: farmStartY + gridHeight + 46,
        w: 172,
        h: 132,
        color: '#e9c46a'
    },
    dairy: {
        name: '奶酪坊',
        icon: '🧀',
        reqLevel: 5,
        unlockCondition: () => playerLevel >= 5 && isCollected('milk'),
        unlockHint: 'Lv.5 且收集牛奶',
        baseCost: 1120,
        maxLevel: 4,
        speedBonusPerLevel: 0.08,
        recipes: ['cheese'],
        x: farmStartX + 742,
        y: farmStartY + gridHeight + 46,
        w: 172,
        h: 132,
        color: '#f4d35e'
    }
};

const RECIPE_CONFIG = {
    flour: {
        name: '研磨面粉',
        building: 'mill',
        output: 'flour',
        outputAmount: 2,
        inputs: { wheat: 3 },
        exp: 18,
        processTime: 12000
    },
    ketchup: {
        name: '熬制番茄酱',
        building: 'ketchupFactory',
        output: 'ketchup',
        outputAmount: 1,
        inputs: { tomato: 3 },
        exp: 32,
        processTime: 18000
    },
    popcorn: {
        name: '烘爆玉米',
        building: 'mill',
        output: 'popcorn',
        outputAmount: 2,
        inputs: { corn: 2 },
        exp: 24,
        processTime: 15000
    },
    fries: {
        name: '炸薯条',
        building: 'ketchupFactory',
        output: 'fries',
        outputAmount: 2,
        inputs: { potato: 2 },
        exp: 26,
        processTime: 16000
    },
    sunflowerSeed: {
        name: '筛葵花籽',
        building: 'ketchupFactory',
        output: 'sunflowerSeed',
        outputAmount: 2,
        inputs: { sunflower: 1 },
        exp: 24,
        processTime: 14000
    },
    sunflowerOil: {
        name: '压榨葵花油',
        building: 'ketchupFactory',
        output: 'sunflowerOil',
        outputAmount: 1,
        inputs: { sunflower: 2 },
        exp: 34,
        processTime: 20000
    },
    pumpkinPie: {
        name: '烤南瓜派',
        building: 'bakery',
        output: 'pumpkinPie',
        outputAmount: 1,
        inputs: { pumpkin: 1, flour: 1 },
        exp: 46,
        processTime: 26000
    },
    sugar: {
        name: '熬糖',
        building: 'mill',
        output: 'sugar',
        outputAmount: 3,
        inputs: { sugarcane: 2 },
        exp: 28,
        processTime: 18000
    },
    cloth: {
        name: '纺棉布',
        building: 'ketchupFactory',
        output: 'cloth',
        outputAmount: 1,
        inputs: { cotton: 3 },
        exp: 36,
        processTime: 22000
    },
    bread: {
        name: '烘焙面包',
        building: 'bakery',
        output: 'bread',
        outputAmount: 1,
        inputs: { flour: 2, egg: 1 },
        exp: 42,
        processTime: 22000
    },
    cheese: {
        name: '发酵奶酪',
        building: 'dairy',
        output: 'cheese',
        outputAmount: 1,
        inputs: { milk: 2 },
        exp: 38,
        processTime: 24000
    }
};

const CODEX_GROUPS = {
    crops: {
        name: '作物',
        items: ['carrot', 'tomato', 'wheat', 'corn', 'potato', 'sunflower', 'pumpkin', 'sugarcane', 'cotton', 'purpleCarrot', 'blackTomato', 'goldenWheat', 'blueCorn', 'whiteStrawberry', 'strawberry', 'chili', 'lavender', 'pine', 'saffron', 'rice', 'lotusRoot', 'oak', 'rainWheat', 'moonflower']
    },
    animals: {
        name: '动物',
        items: ['chicken', 'sheep', 'cow', 'bee', 'pig']
    },
    products: {
        name: '产物',
        items: ['egg', 'wool', 'milk', 'honey', 'truffle', 'goldenEgg', 'goldenWool', 'goldenMilk', 'royalHoney', 'blackTruffle', 'wood', 'hardwood', 'flour', 'ketchup', 'popcorn', 'fries', 'sunflowerSeed', 'sunflowerOil', 'pumpkinPie', 'sugar', 'cloth', 'bread', 'cheese']
    }
};

const CODEX_REWARDS = [
    { id: 'codex25', percent: 25, label: '永久生长速度 +5%', coins: 300, exp: 120, bonus: 'growth5' },
    { id: 'codex50', percent: 50, label: '怀表：离线收益上限 +2小时', coins: 900, exp: 320, bonus: 'watch' },
    { id: 'codex75', percent: 75, label: '共振概率 +10%', coins: 1800, exp: 700, bonus: 'resonance' },
    { id: 'codex100', percent: 100, label: '黄金洒水壶皮肤', coins: 3200, exp: 1200, bonus: 'goldenWateringCan' }
];

const CODEX_SET_REWARDS = [
    { id: 'rootSet', category: '根茎类', label: '根茎收藏', bonusLabel: '根茎类成熟时间 -10%', effect: { type: 'categoryGrowth', value: 0.9 }, coins: 500, exp: 160 },
    { id: 'grainSet', category: '谷物类', label: '谷物收藏', bonusLabel: '谷物类成熟时间 -10%', effect: { type: 'categoryGrowth', value: 0.9 }, coins: 700, exp: 220 },
    { id: 'fruitSet', category: '水果类', label: '果实收藏', bonusLabel: '水果类售价 +10%', effect: { type: 'categoryPrice', value: 1.1 }, coins: 900, exp: 280 },
    { id: 'flowerSet', category: '花草类', label: '花草收藏', bonusLabel: '变异发现概率 +3%', effect: { type: 'variantChance', value: 0.03 }, coins: 1200, exp: 360 },
    { id: 'economySet', category: '经济类', label: '经济作物收藏', bonusLabel: '经济类售价 +10%', effect: { type: 'categoryPrice', value: 1.1 }, coins: 1500, exp: 460 },
    { id: 'woodSet', category: '木材类', label: '木材收藏', bonusLabel: '木材类成熟时间 -15%', effect: { type: 'categoryGrowth', value: 0.85 }, coins: 1600, exp: 520 }
];

const VARIANT_CONFIG = {
    carrot: [{ id: 'purpleCarrot', cropId: 'purpleCarrot', name: '紫色胡萝卜', minHarvest: 50, chance: 0.05, hint: '收割胡萝卜50次后，胡萝卜5%概率变异' }],
    tomato: [{ id: 'blackTomato', cropId: 'blackTomato', name: '黑番茄', required: () => visitorState.lia?.step >= 4, chance: 0.07, hint: '莉亚任务 LIA-4 后，番茄7%概率变异' }],
    wheat: [
        { id: 'goldenWheat', cropId: 'goldenWheat', name: '金色小麦', minHarvest: 200, chance: 0.01, hint: '收割小麦200次后，小麦1%概率变异' },
        { id: 'rainWheat', cropId: 'rainWheat', name: '雨小麦', required: () => (stats.rainWheatPlantStreak || 0) >= 100, chance: 1, hidden: true, hint: '雨天连续种植小麦100次' }
    ],
    corn: [{ id: 'blueCorn', cropId: 'blueCorn', name: '蓝玉米', minHarvest: 80, chance: 0.04, hint: '收割玉米80次后，玉米4%概率变异' }],
    strawberry: [{ id: 'whiteStrawberry', cropId: 'whiteStrawberry', name: '白草莓', minHarvest: 60, chance: 0.03, hint: '收割草莓60次后，草莓3%概率变异' }],
    lavender: [{ id: 'moonflower', cropId: 'moonflower', name: '月光花', required: () => (stats.nightLavenderHarvests || 0) >= 20, chance: 1, hidden: true, hint: '深夜收割薰衣草20次' }]
};

const STORY_LETTERS = [
    {
        id: 'H00',
        title: '初始页',
        condition: () => true,
        body: ['孩子，', '这把铲子是我用了四十年的。手柄上的凹痕，是每一季春种时我的手握出来的。', '农场现在看起来破败，但它曾经喂饱过半个镇子。我没能守住它，但泥土记得一切。', '翻开下一页，当你准备好了。', '——阿尔伯特']
    },
    {
        id: 'H01',
        title: '第一株作物',
        condition: () => tutorialState.journalOpened,
        body: ['你种下了第一颗种子，对吗？', '我年轻时第一次种的是胡萝卜。那天晚上紧张得睡不着，怕它不发芽。第二天早上去看，土面裂了一条小缝，一星绿色顶了出来。', '那时我就知道，这片土地是活的。']
    },
    {
        id: 'H02',
        title: '第一次收获',
        condition: () => Object.values(stats.harvests || {}).reduce((sum, value) => sum + value, 0) >= 1,
        body: ['收割的感觉如何？', '有人说种田是为了吃。我不这么看。种田是为了把东西从无到有地变出来。你刚刚当了一回造物主，哪怕只是变出了一根胡萝卜。']
    },
    {
        id: 'H03',
        title: '关于玉米的回忆',
        condition: () => isItemUnlocked('corn'),
        body: ['哦，玉米！', '我年轻时种了整整三亩玉米，秋天收成的时候，整个农场都是金灿灿的。你奶奶会煮一大锅，掰下来一粒粒喂你爸爸。你爸爸那时候才三岁，坐在门槛上，吃得满脸都是。', '那些玉米喂饱了整个镇子的秋天。']
    },
    {
        id: 'H04',
        title: '发现新作物',
        condition: () => getCollectedCropCount() >= 4,
        body: ['新品种！你的手札上又多了一页。', '我当年每发现一种能在这片地上长好的作物，都会激动得在笔记本上写一整页。你奶奶笑我像个孩子。', '某种意义上，种田的人永远是孩子。每颗种子都是一个惊喜。']
    },
    {
        id: 'H05',
        title: '奶奶的故事',
        condition: () => playerLevel >= 6,
        body: ['说到你奶奶——', '她是比我能干十倍的人。她会把收下来的番茄熬成酱，装进玻璃瓶，一排排码在地窖里。她说，夏天的味道封住了，冬天就不冷。', '后来地窖塌了，番茄酱的瓶子碎了一地。她没说一句话，默默扫了三天。', '我想让你知道，这座农场上不只有我的影子。']
    },
    {
        id: 'H06',
        title: '作物会唱歌',
        condition: () => (stats.resonances || 0) >= 1,
        body: ['作物们会唱歌，你听见了吗？', '这不是疯话。同一种作物种在一起，它们的根会在土下牵手。我没有科学依据，但我知道这是真的。因为成片收割的时候，声音不一样——那是一种整齐的、满足的叹息。', '它们喜欢挨在一起。']
    },
    {
        id: 'H07',
        title: '雨水',
        condition: () => stats.weatherSeen?.rain,
        body: ['下雨了。', '有人说雨天是农夫的假日。不对。雨天是农夫最忙的时候——忙着看。看雨水怎么顺着叶子滑下来，看泥土怎么慢慢变深颜色，看蚯蚓怎么从土里探出头。', '但忙得开心。因为雨水不花钱，却比什么都贵。']
    },
    {
        id: 'H08',
        title: '干渴',
        condition: () => stats.weatherSeen?.drought,
        body: ['这块地裂口的样子，我太熟了。', '你小时候问过我，为什么地会裂开。我说它在口渴。你说，那给它喝水呀。', '要是那么简单就好了。', '有时候一整个夏天不落一滴雨，我站在地头看着，什么都做不了。那种滋味，比地还干。']
    },
    {
        id: 'H09',
        title: '祈雨之后',
        condition: () => stats.rainSkillUsed,
        body: ['你祈雨了。有没有用我不知道，但你做了。', '我试过各种方法：烧稻草、敲盆、对着云喊。你奶奶说我魔怔了。但每次我用尽全力之后，不知为何，心里就踏实了。', '也许祈雨不是为了让天下雨，是为了让自己不放弃。']
    },
    {
        id: 'H10',
        title: '小鸡',
        condition: () => getRanchBuildingLevel('coop') > 0,
        body: ['养鸡了？', '鸡是农场最划算的生意。吃剩饭，产蛋，还会翻土找虫吃。但它们也是最操心的——天天想往外面跑，追都追不回来。', '随它们去吧。晚上它们自己知道回家。']
    },
    {
        id: 'H11',
        title: '奶牛',
        condition: () => getRanchBuildingLevel('cowshed') > 0,
        body: ['奶牛啊。', '体面、安静、从不抱怨。每天早晚挤一次奶，它就站在那里，尾巴慢慢甩，嘴里嚼着反刍的草。你在它旁边坐一会儿，整个人都会慢下来。', '这年头，能让你慢下来的东西不多了。']
    },
    {
        id: 'H12',
        title: '加工',
        condition: () => Object.values(processingBuildings || {}).some(level => level > 0),
        body: ['你开始加工了。这让我想起你奶奶的番茄酱。', '加工是农场的进阶玩法——把田里的东西变成更值钱的东西。但我得提醒你：机器是好的，但别让机器替你做决定。', '机器不会尝味道。你会。']
    },
    {
        id: 'H13',
        title: '老水阀',
        condition: () => getMiracleStageIndex('irrigation') >= 1,
        body: ['挖到这里的时候，你会发现一个旧水阀。', '把手是铸铁的，已经锈了。上面刻着我名字的首字母——A。', '修好它。干旱就不怕了。']
    },
    {
        id: 'H14',
        title: '水渠终章',
        condition: () => miracleState.irrigation?.completed,
        body: ['水渠通了。', '今天早上我去看了，水车在转，把整片地都唱醒了。', '你看那些胡萝卜的叶子从土里冒出来，又绿又挺。我坐在渠边的石头上，坐了很久。', '老骨头没干成的事，你干成了。我把这把水阀的钥匙留给你——不是什么值钱东西，但每次转动它，你都能听见我的声音：', '干得好。']
    },
    {
        id: 'H15',
        title: '新谷仓',
        condition: () => getMiracleStageIndex('barn') >= 1,
        body: ['新谷仓开始建了。', '旧的那个在你出生前一年被一场大雪压塌了。那时候我已经没有力气重建，只能把剩下的粮食存进屋里，跟人挤在一起。', '谷仓不只是放粮食的地方。它是农场的心跳。心跳停了，农场就只是块地。', '谢谢你让它重新开始跳动。']
    },
    {
        id: 'H16',
        title: '谷仓终章',
        condition: () => miracleState.barn?.completed,
        body: ['谷仓完工那天，我在屋顶上插了一根风向标。是只铁皮公鸡，风一吹就嘎嘎转。你奶奶说太丑了，但我觉得威风。', '满仓的粮食，满圈的牲口，风车在转，烟囱在冒烟——这就是我梦里的农场。', '你把它还给我了。']
    },
    {
        id: 'H17',
        title: '四分之一的发现',
        condition: () => getCodexPercent() >= 25,
        body: ['手札填了四分之一了。', '这上头的每一页，都是这片土地教给我的。我当时以为已经够多了，现在看来，只是开了个头。', '继续。还有很多你不知道的。']
    },
    {
        id: 'H18',
        title: '半满的手札',
        condition: () => getCodexPercent() >= 50,
        body: ['手札过半了。你发现的作物和动物，比我多。', '我留给你的是一个空壳子，你还给我的是一座满满的粮仓。', '（你摸到这一页纸张略厚，夹层里有一块老式怀表。）']
    },
    {
        id: 'H19',
        title: '接近完整',
        condition: () => getCodexPercent() >= 75,
        body: ['就差一点了。你几乎找到了这片土地能长出的一切。', '但我得说一句：不是所有东西都能被"找到"的。有些东西，你种着种着，它就自己来了。不在图鉴里，不在计划里，在你没注意的时候，从土里偷偷看着你。']
    },
    {
        id: 'H20',
        title: '完整手札',
        condition: () => getCodexPercent() >= 100,
        body: ['手札满了。', '这本本子，我写了大半辈子。最后一页我一直空着，不知道该写什么。', '现在我知道了。这最后一页是留给你来写的。你让这座农场比我最狂野的梦里还要繁荣。', '谢谢你，孩子。我把怀表和农场都交给你了。它们是同一件东西——时间的见证。']
    },
    {
        id: 'H21',
        title: '终章之一',
        condition: () => Object.keys(endingState.unlocked || {}).length >= 1,
        body: ['（此页自动记录触发该结局时的手写文本。）', '页面边缘印有该结局的印章图案。']
    },
    {
        id: 'H22',
        title: '扉页旁注',
        condition: () => Object.keys(endingState.unlocked || {}).length >= 4,
        body: ['（手札扉页原本只有"阿尔伯特的农场手札"字样，现在下方多出一行，像是后来补写的：）', '你把我看不懂的未来，活成了我能想象的最好模样。']
    },
    {
        id: 'H23',
        title: '日常记录',
        condition: () => (stats.visitorTalks || 0) >= 1,
        body: ['今天有人来农场了。', '以前也总有人来：借农具的、问路的、想用鸡蛋换面粉的。你奶奶总说我太爱跟人聊天，耽误干活。但我觉得，农场不只是种东西的地方，也是人来人往的地方。', '好好招待客人。他们会记得的。']
    },
    {
        id: 'H24',
        title: '时光',
        condition: () => (stats.totalPlaySeconds || 0) >= 24 * 60 * 60,
        body: ['你在农场待了整整一天一夜了。', '我想说"别太累"，但我知道你享受它。种田是一种病，得了就不想好。', '明天太阳升起来的时候，地还是那片地，种子还在长，鸡还在下蛋。不急。']
    }
];

const VISITOR_CONFIG = {
    leo: {
        portrait: 'assets/npc/leo.png',
        name: '雷欧',
        icon: '👨‍🍳',
        role: '流浪厨师',
        unlockHint: 'Lv.4 且在线满30分钟后到访',
        unlock: () => playerLevel >= 4 && (stats.totalPlaySeconds || 0) >= 30 * 60,
        daily: ['今天切了五十个番茄。手上全是番茄味。幸福。', '要不要尝尝我新研究的菜？用你的胡萝卜做的蛋糕。', '你看那只鸡，它在看我。我觉得它想吃我的面包屑。'],
        chain: [
            { title: '熟透番茄', need: { tomato: 8 }, reward: { unlockSeed: 'strawberry', coins: 120, exp: 80 }, text: '嘿，你就是阿尔伯特的孙子/孙女？我以前在镇上开餐馆。很久没闻到好番茄的味道了。' },
            { title: '厨房的灵魂', need: { ketchup: 3 }, reward: { coins: 200, exp: 120 }, text: '番茄太好了！但生吃浪费。我需要一瓶好酱来确认那张老菜谱。' },
            { title: '本地面粉', need: { flour: 5 }, reward: { talentPoints: 1, exp: 160 }, text: '披萨面团要用本地小麦现磨的面粉，那股麦香是超市货比不了的。' },
            { title: '早上的奶', need: { milk: 4, coins: 100 }, reward: { coins: 160, exp: 180 }, text: '差奶酪了。早上挤的奶做出来的东西，城里叫什么都不重要。' },
            { title: '像素小餐馆', need: { coins: 500, hardwood: 10 }, reward: { coins: 300, exp: 220 }, text: '面粉、酱汁、奶酪都有了，就差一个能烤的地方。' },
            { title: '餐馆开张', need: {}, reward: { coins: 500, exp: 280 }, text: '谢谢你。倒闭的餐馆还有机会重生，我不走了。' }
        ]
    },
    lia: {
        portrait: 'assets/npc/lia.png',
        name: '莉亚',
        icon: '👩‍🔬',
        role: '植物学家',
        unlockHint: 'Lv.6 且收割胡萝卜30次后到访',
        unlock: () => playerLevel >= 6 && (stats.harvests?.carrot || 0) >= 30,
        daily: ['今天在显微镜下看到花粉了。像是金色的小气球。', '这片地真的有魔力。', '我不太会种地。但我很会看。'],
        chain: [
            { title: '胡萝卜样本', need: { carrot: 10 }, reward: { coins: 100, exp: 90 }, text: '抱歉打扰！你们的胡萝卜颜色特别鲜，我能要几根做样本吗？' },
            { title: '湿润土壤实验', need: { carrot: 20 }, reward: { exp: 160 }, text: '这种土壤在特定条件下会产生天然变异。多种一些胡萝卜，观察有没有不一样的颜色。' },
            { title: '温室地基', need: { coins: 300, wood: 8 }, reward: { coins: 120, exp: 180 }, text: '你真的种出来了！我得留下来继续研究。我们需要一个温室。' },
            { title: '番茄变量', need: { tomato: 15 }, reward: { unlockVariant: 'tomato:blackTomato', exp: 220 }, text: '温室好了！我怀疑番茄在特定条件下也会变色。' },
            { title: '小实验室', need: {}, reward: { variantBonus: 0.05, coins: 300, exp: 260 }, text: '让我做你农场的植物学家。这间温室就是我们的小实验室。' }
        ]
    },
    bruno: {
        portrait: 'assets/npc/bruno.png',
        name: '布鲁诺',
        icon: '👷',
        role: '建筑匠人',
        unlockHint: 'Lv.8 且灌溉渠开始后到访',
        unlock: () => playerLevel >= 8 && getMiracleStageIndex('irrigation') >= 1,
        daily: ['好建筑要先看动线，再看外观。', '棚屋升级比乱买动物更稳。', '加工区最好保持在农田和牧场中间。'],
        chain: [
            { title: '旧渠木桩', need: { carrot: 12, coins: 120 }, reward: { miracleDiscount: 'irrigationWood', exp: 120 }, text: '四十年前，我和你爷爷一起挖了灌溉渠的第一段。那条渠可不简单。' },
            { title: '旧谷仓木料', need: { tomato: 10, coins: 220 }, reward: { unlockSeed: 'pine', miracleDiscount: 'barnWood', exp: 180 }, text: '旧谷仓被雪压塌那天，你爷爷在废墟前站了一个下午。我带来几颗松树种子，木材得从地里长出来。' },
            { title: '谷仓结构图', need: { coins: 300 }, reward: { buildingDiscount: 0.1, exp: 220 }, text: '我有旧谷仓的结构图，夹在工具箱底层。图纸背面写着很多字。' },
            { title: '屋顶快好了', need: {}, reward: { buildingDiscount: 0.15, coins: 300, exp: 260 }, text: '我老了，但我的手艺还行。有需要修的，叫我就行。' }
        ]
    },
    amir: {
        portrait: 'assets/npc/amir.png',
        name: '阿米尔',
        icon: '🧳',
        role: '旅行商人',
        unlockHint: '在线90分钟后开始随机到访，最多再等30分钟保底',
        unlock: () => hasVisitorArrivedBySchedule('amir'),
        daily: ['价格会说话，只是说得不一定诚实。', '我喜欢加工品，也喜欢稀缺的动物产物。', '手里留一点现金，机会来时才抓得住。'],
        chain: [
            { title: '第一次以物易物', need: { strawberry: 5, milk: 3 }, reward: { codexNote: '远方之种', exp: 160 }, text: '我从山谷那边来。那边的土是红色的。种茶，不种麦。' },
            { title: '第三次交易', need: { bread: 3, honey: 2 }, reward: { coins: 500, exp: 220 }, text: '我的包袱里有一半是这辈子用不上的东西。但舍不得丢。' },
            { title: '第五次交易', need: { truffle: 2, cheese: 2 }, reward: { unlockSeed: 'saffron', exp: 320 }, text: '这是藏红花种子，远方才有。你这里也许能种活。' },
            { title: '第八次交易', need: { saffron: 3, ketchup: 3 }, reward: { endingClue: 'amirRoad', coins: 800, exp: 420 }, text: '我走了很多地方，但只有在你这里，我觉得自己不是经过。是到了。' }
        ]
    }
};

const MIRACLE_CONFIG = {
    irrigation: {
        name: '先祖灌溉渠',
        icon: '🏞️',
        stages: [
            { title: '清理旧渠', need: { coins: 1200, carrot: 20, egg: 6 } },
            { title: '铺设木槽', need: { coins: 2200, wood: 12, egg: 8 } },
            { title: '引入山泉', need: { coins: 3600, tomato: 12, honey: 2 } },
            { title: '刻写水纹', need: { coins: 5200, flour: 8, wool: 8 } },
            { title: '修复闸门', need: { coins: 7000, ketchup: 4, milk: 8 } },
            { title: '灌注共振', need: { coins: 9000, bread: 5, cheese: 3 } },
            { title: '奇迹落成', need: { coins: 12000, truffle: 2, honey: 6 } }
        ],
        effect: '干旱不再降低生长，全部作物额外 +20% 生长速度。'
    },
    barn: {
        name: '永恒谷仓',
        icon: '🏛️',
        stages: [
            { title: '扩建地基', need: { coins: 1800, wood: 16, egg: 6 } },
            { title: '原木骨架', need: { coins: 3600, wood: 36, wool: 8 } },
            { title: '经典红墙', need: { coins: 6200, flour: 10, milk: 8 } },
            { title: '保鲜核心', need: { coins: 9200, bread: 6, cheese: 4 } },
            { title: '永恒封存', need: { coins: 14000, truffle: 3, ketchup: 5 } }
        ],
        effect: '动物产出间隔额外 -10%，加工时间额外 -15%。'
    }
};

const ENDING_CONFIG = {
    harvestHome: {
        title: '丰收之乡',
        icon: '🌾',
        condition: () => miracleState.irrigation?.completed && getCollectedUniqueCount() >= 12,
        text: ['水渠重新流动，田地不再怕旱。', '这里终于又成了能养活许多人的丰收之乡。'],
        longTitle: '丰收之乡',
        longText: [
            '水渠重新流动的那天，农场没有立刻变得喧闹。它只是安静地亮了一会儿，像一只从旧梦里醒来的眼睛。',
            '第一道水流越过碎石，经过胡萝卜叶、麦秆和番茄架，最后停在田埂边的低洼处。泥土吸水的声音很轻，但你听见了。那声音像在说：这里还能继续。',
            '镇上的人后来开始把这里叫作丰收之乡。这个名字听起来有点夸张，甚至有点像集市上卖种子的广告词。可当旱季过去，田地仍旧绿着的时候，没人再笑。',
            '你站在水渠边，看见许多曾经只存在于计划表里的东西真的留下来了：作物、脚印、来帮忙的人，还有那些被你写进手札的普通日子。',
            '这不是一个宏大的胜利。它只是证明，一片土地被认真照看时，确实会慢慢回答你。'
        ],
        epilogueTitle: '水渠后的清晨',
        epilogue: [
            '结局之后，农场没有停止运转。水渠每天清晨都会发出很轻的水声，像有人在地底翻动旧日历。',
            '雨后的第一束光落在渠水上时，田地边会闪一下蓝色。你很难说那是不是奇迹，但作物长得确实更有底气了。'
        ],
        continueHint: '继续经营后，丰收之乡会成为后日谈记录的一部分。你可以继续补完作物、订单和奇迹周边目标。',
        reward: { coins: 2400, exp: 900, talentPoints: 1 }
    },
    warmInn: {
        title: '温暖旅店',
        icon: '🏡',
        condition: () => getVisitorIds().every(id => getVisitorProgress(id).finished),
        text: ['访客们不再只是路过。', '他们把故事、手艺和日常都留在了农场。'],
        longTitle: '温暖旅店',
        longText: [
            '最后一位访客决定留下时，农场的傍晚变得比以前更长。并不是太阳真的慢了下来，而是有人开始在门口停步，愿意把今天没说完的话留到明天。',
            '雷欧把旧木箱修成了长凳，莉亚在窗边摆了一排番茄苗，布鲁诺坚持说厨房里的锅应该按大小排队，阿米尔则把一本你没见过的书塞进了手札架最上层。',
            '他们都不是被农场拯救的人。更准确地说，他们只是路过这里，然后发现自己可以不用继续赶路。',
            '某天夜里下雨，屋檐滴水，桌上的灯晃了一下。你听见有人在笑，有人在抱怨汤太淡，有人在问明天要不要多种一块麦子。',
            '你忽然明白，所谓温暖并不是没有风雨，而是风雨来的时候，屋里有人给你留了位置。'
        ],
        epilogueTitle: '留下的人',
        epilogue: [
            '结局之后，餐桌旁多了几把椅子。有人带来远方的盐，有人修补旧篱笆，有人在雨天讲笑话。',
            '农场不再只是你继承的地方，它变成了别人愿意回来的地方。'
        ],
        continueHint: '继续经营后，访客对话和后日谈目标会继续推进。多和入驻访客说话，别把人家当会走路的任务板，虽然游戏确实经常这么干。',
        reward: { coins: 1800, exp: 700, talentPoints: 2 }
    },
    guildFarm: {
        title: '农场工坊',
        icon: '⚙️',
        condition: () => miracleState.barn?.completed && Object.values(processingBuildings || {}).every(level => level > 0),
        text: ['谷仓与工坊连成了一条稳定的加工线。', '这座农场开始向整个镇子供应可靠的产品。'],
        longTitle: '农场工坊',
        longText: [
            '永恒谷仓落成之后，农场的夜晚第一次没有完全安静下来。磨坊低声转着，烤炉里余温未散，奶酪桶在角落慢慢发酵，番茄酱锅偶尔冒出一个很有主见的泡。',
            '你曾经以为工坊会让农场变得冰冷，像某种只会计算产量的机器。后来你发现不是这样。机器声也可以像心跳，只要它不是为了吞掉生活，而是为了让生活更稳一点。',
            '镇上的订单越来越远。有人订面包，有人订奶酪，有人坚持认为你的番茄酱有“故乡的味道”，尽管他本人从没来过这里。人类的评价系统一如既往地离谱，但金币是真的。',
            '你把最后一批货装好，回头看见谷仓灯光落在田地边。这里仍然有泥土、鸡叫、坏天气和做不完的活。只是现在，它们被一条更可靠的生产线连了起来。',
            '农场没有变成工厂。它只是终于学会，把辛苦变成可以分享的东西。'
        ],
        epilogueTitle: '不熄的炉火',
        epilogue: [
            '结局之后，工坊的灯总是最晚熄灭。磨坊、烤炉、奶酪桶和番茄酱锅像四个固执的小太阳。',
            '你开始收到更远地方的订单。农场仍然是农场，但也成了一座小小的工会。'
        ],
        continueHint: '继续经营后，加工链和订单仍可扩展。把所有建筑升到更高等级，会让这座农场更像一台温柔但高效的怪物。',
        reward: { coins: 3200, exp: 1000, talentPoints: 1 }
    },
    completeJournal: {
        title: '手札圆满',
        icon: '📖',
        condition: () => getCollectedUniqueCount() >= getCodexTotalCount() && Object.keys(endingState.unlocked || {}).length >= 3,
        text: ['你终于把这片土地的大多数秘密都写进了手札。', '但圆满不是结束，只是下一轮经营的底气。'],
        longTitle: '手札圆满',
        longText: [
            '你写下最后一个条目的时候，手札没有发光，也没有从天而降一只负责颁奖的鸽子。它只是变重了一点。',
            '每一种作物、每一种产物、每一段访客留下的话、每一次奇迹推进时的材料清单，都被你用并不总是工整的字记了下来。',
            '这本手札最开始像任务表，后来像账本，再后来像一本不肯承认自己是日记的日记。它记录了收获，也记录了等待；记录了成功，也记录了很多次金币不足。伟大农业史里当然少不了贫穷，这很现实，烦人，但现实。',
            '当你合上它时，封皮边缘已经被磨软。你以为圆满意味着写完，结果发现圆满只是让你知道：还有很多东西可以继续写。',
            '阿尔伯特留下的字迹停在过去，而你的记录继续向前。手札没有结束，它只是终于把这片土地交还给明天。'
        ],
        epilogueTitle: '最后一页之后',
        epilogue: [
            '结局之后，手札没有合上。空白页反而更多了，像这本书终于承认自己永远写不完。',
            '你已经知道这片土地的大多数秘密。剩下的，就只能靠下一天继续长出来。'
        ],
        continueHint: '继续经营后，手札圆满会成为永久归档。全结局收集后，会出现最后的年轮结局。',
        reward: { coins: 5000, exp: 1500, talentPoints: 3 }
    },
    newRing: {
        title: '新的年轮',
        icon: '🕰️',
        condition: () => ['harvestHome', 'warmInn', 'guildFarm', 'completeJournal'].every(id => endingState.unlocked?.[id]),
        text: ['四种未来都已经在农场里留下痕迹。', '你没有选定一个结局，而是让它们一起成为新的日常。'],
        longTitle: '新的年轮',
        longText: [
            '当最后一个结局被写进手札，农场反而显得异常普通。田地里仍有作物等着收，市场仍旧涨涨跌跌，鸡还是会在完全不合适的时候叫。',
            '你曾经以为结局会像一道门，走过去以后，身后的世界就会合上。可这里的结局更像树的年轮。它不是停止，而是说明这棵树又活过了一季。',
            '丰收之乡、温暖旅店、农场工坊、手札圆满。每一种未来都没有取代另一种，它们叠在一起，变成这片土地更厚的一层记忆。',
            '你可以继续留在这里，把后日谈写得更长。也可以在某个清晨收拾行囊，开启新的年轮。到那时，农场会重新变小，金币会重新紧张，地块会重新等待开垦。生活真会挑时间装作第一次见面。',
            '但这一次，你不是空手开始。土地会记得你，手札会记得你，而下一次春天，也会比第一次更加温柔。'
        ],
        epilogueTitle: '没有落幕',
        epilogue: [
            '结局之后，清晨照常到来。鸡叫得很吵，订单来得很急，田地里又有一块作物熟了。',
            '你忽然明白，最好的终章不是停在某一页，而是让下一天看起来仍然值得开始。'
        ],
        continueHint: '全结局已经归档。你可以继续经营当前农场，也可以开启新的年轮，重置主要进度并继承年轮祝福。',
        reward: { coins: 10000, exp: 2500, talentPoints: 5 }
    }
};

const POST_ENDING_GOALS = {
    archiveAllEndings: {
        title: '终章归档',
        icon: '🏆',
        condition: () => Object.keys(ENDING_CONFIG).every(id => endingState.unlocked?.[id]),
        progressText: () => `本轮结局 ${Object.keys(ENDING_CONFIG).filter(id => endingState.unlocked?.[id]).length}/${Object.keys(ENDING_CONFIG).length}`,
        reward: { coins: 12000, exp: 3000, talentPoints: 3 },
        text: '把所有结局收入手札后，农场获得完整终章归档。'
    },
    generousHost: {
        title: '不打烊的餐桌',
        icon: '🍲',
        condition: () => (stats.visitorTalks || 0) >= 30,
        progressText: () => `访客对话 ${stats.visitorTalks || 0}/30`,
        reward: { coins: 3600, exp: 1200, talentPoints: 1 },
        text: '结局之后仍有人来，也仍有人愿意坐下说话。'
    },
    oldFieldMaster: {
        title: '旧田新季',
        icon: '🌱',
        condition: () => Object.values(stats.harvests || {}).reduce((sum, value) => sum + value, 0) >= 1000,
        progressText: () => `总收获 ${Object.values(stats.harvests || {}).reduce((sum, value) => sum + value, 0)}/1000`,
        reward: { coins: 6000, exp: 2000, talentPoints: 2 },
        text: '无论出现多少结局，田还是要种。这很荒谬，也很可靠。'
    }
};

const YEAR_RING_CONFIG = {
    maxStacks: 5,
    perStack: {
        growth: 0.05,
        price: 0.05,
        exp: 0.08,
        processing: 0.08,
        startingCoins: 300
    },
    summary: '新的年轮会重置主要经营进度，但永久归档会保留，并获得可叠加的年轮祝福。'
};
