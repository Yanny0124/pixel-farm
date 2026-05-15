// ==========================================
// 全局状态变量 (State)
// ==========================================
let coins = 1000; 
let playerLevel = 1;
let playerExp = 0;
let currentSelectedTool = 'wheat';

let inventory = { wheat: 0, carrot: 0, watermelon: 0, egg: 0, wool: 0, milk: 0, honey: 0, truffle: 0 };
let marketState = { wheat: { price: 10, trend: 0 }, carrot: { price: 25, trend: 0 }, watermelon: { price: 60, trend: 0 }, egg: { price: 15, trend: 0 }, wool: { price: 25, trend: 0 }, milk: { price: 40, trend: 0 }, honey: { price: 80, trend: 0 }, truffle: { price: 120, trend: 0 } };
let skills = { sow: { name: '🌱 播种', level: 1, lastUsed: 0 }, rain: { name: '🌧️ 求雨', level: 1, lastUsed: 0 }, harvest: { name: '⚡ 收割', level: 1, lastUsed: 0 } };

let gridData = []; 
let animals = []; 
let workers = []; 
let tasks = [];

// 临时状态
let effectText = ""; 
let effectAlpha = 0;
let camera = { x: - (farmStartX - 50), y: - (farmStartY - 50) };

// ==========================================
// 核心逻辑函数
// ==========================================
function getMaxExp() { return playerLevel * 500; }

function addExp(amount) {
    playerExp += amount;
    let levelsGained = 0;
    while (playerExp >= getMaxExp()) {
        playerExp -= getMaxExp(); 
        playerLevel++;
        levelsGained++;
        coins += 500 * playerLevel; 
    }
    if (levelsGained > 0) {
        effectText = levelsGained === 1 ? `🎉 升级啦！当前等级 Lv.${playerLevel}！` : `🚀 经验爆发！连升 ${levelsGained} 级，直达 Lv.${playerLevel}！`;
        effectAlpha = 1.0;
        for (let i=0; i<3; i++) tasks[i] = generateTask(); // 刷新高级任务
    }
    if (typeof updateUI === 'function') updateUI();
}

function initGrid() {
    gridData = [];
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            let isCenter = (r >= 6 && r <= 9 && c >= 6 && c <= 9);
            row.push({ state: isCenter ? 0 : -1, timer: 0, cropType: null });
        }
        gridData.push(row);
    }
}

function saveGame() {
    localStorage.setItem('tinyPixelFarmSave', JSON.stringify({ coins, playerLevel, playerExp, grid: gridData, inventory, marketState, animals, skills, tasks, workers, camX: camera.x, camY: camera.y }));
}

function loadGame() {
    const saveStr = localStorage.getItem('tinyPixelFarmSave');
    if (saveStr) {
        const saveData = JSON.parse(saveStr);
        coins = saveData.coins; playerLevel = saveData.playerLevel || 1; playerExp = saveData.playerExp || 0;
        if (saveData.grid && saveData.grid.length === ROWS && saveData.grid[0].length === COLS) gridData = saveData.grid; else initGrid();
        inventory = Object.assign({ wheat: 0, carrot: 0, watermelon: 0, egg: 0, wool: 0, milk: 0, honey: 0, truffle: 0 }, saveData.inventory);
        marketState = Object.assign(marketState, saveData.marketState); 
        animals = saveData.animals || [];
        if (saveData.skills) {
            skills.sow.lastUsed = saveData.skills.sow.lastUsed || 0; skills.sow.level = saveData.skills.sow.level || 1;
            skills.rain.lastUsed = saveData.skills.rain.lastUsed || 0; skills.rain.level = saveData.skills.rain.level || 1;
            skills.harvest.lastUsed = saveData.skills.harvest.lastUsed || 0; skills.harvest.level = saveData.skills.harvest.level || 1;
        }
        tasks = saveData.tasks || []; workers = saveData.workers || [];
        if(saveData.camX !== undefined) { camera.x = saveData.camX; camera.y = saveData.camY; }
        if (playerExp >= getMaxExp()) addExp(0); 
    } else { initGrid(); }
    if (tasks.length < 3) initTasks(); 
    if (typeof updateUI === 'function') updateUI();
}

window.resetGame = function() { if (confirm("确定要重置世界吗？")) { localStorage.removeItem('tinyPixelFarmSave'); location.reload(); } };