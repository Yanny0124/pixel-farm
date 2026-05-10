// ==========================================
// 地图与物理常量
// ==========================================
const TILE_SIZE = 45; 
const ROWS = 16; const COLS = 16;

const farmStartX = 100; const farmStartY = 150;
const gridWidth = COLS * TILE_SIZE; const gridHeight = ROWS * TILE_SIZE; 

const ranchStartX = farmStartX + gridWidth + 200; const ranchStartY = 150;
const ranchWidth = 600; const ranchHeight = 600;

const crossroadX = farmStartX + gridWidth + 100; 
const crossroadY = farmStartY + gridHeight / 2;

const UNLOCK_PRICE = 50; 

// ==========================================
// 游戏配置字典 (核心数值策划都在这里)
// ==========================================
const CROP_CONFIG = {
    wheat: { name: '小麦', icon: '🌾', reqLevel: 1, growTime: 3000, seedColor: '#fbc02d', matureColor: '#f57f17', basePrice: 10, seedPrice: 2, exp: 5 },
    carrot: { name: '胡萝卜', icon: '🥕', reqLevel: 2, growTime: 6000, seedColor: '#ffcc80', matureColor: '#e65100', basePrice: 25, seedPrice: 5, exp: 12 },
    watermelon: { name: '西瓜', icon: '🍉', reqLevel: 3, growTime: 12000, seedColor: '#81c784', matureColor: '#1b5e20', basePrice: 60, seedPrice: 15, exp: 30 },
    chicken: { name: '小鸡', icon: '🐔', reqLevel: 2, price: 50 },
    sheep: { name: '绵羊', icon: '🐑', reqLevel: 3, price: 100 },
    cow: { name: '奶牛', icon: '🐮', reqLevel: 4, price: 150 },
    bee: { name: '蜜蜂', icon: '🐝', reqLevel: 5, price: 200 },
    pig: { name: '小猪', icon: '🐷', reqLevel: 6, price: 300 },
    egg: { name: '鸡蛋', icon: '🥚', basePrice: 15 }, 
    wool: { name: '羊毛', icon: '🧶', basePrice: 25 }, 
    milk: { name: '牛奶', icon: '🥛', basePrice: 40 }, 
    honey: { name: '蜂蜜', icon: '🍯', basePrice: 80 },
    truffle: { name: '松露', icon: '🍄', basePrice: 120 }
};