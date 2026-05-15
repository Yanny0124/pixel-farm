// ==========================================
// State: 全局状态、存档、基础派生值
// ==========================================
let coins = 1000;
let playerLevel = 1;
let playerExp = 0;
let currentSelectedTool = 'carrot';

let inventory = createDefaultInventory();
let marketState = createDefaultMarketState();
let skills = createDefaultSkills();
let weather = { type: 'sunny', changedAt: Date.now(), forcedUntil: 0 };
let talentPoints = 0;
let talents = { agriculture: 0, husbandry: 0, industry: 0 };
let stats = { harvests: {}, resonances: 0, totalOfflineSeconds: 0, totalPlaySeconds: 0, ordersCompleted: 0, weatherSeen: {}, rainSkillUsed: false, visitorTalks: 0, visitorArrival: {} };
let miracleBonuses = { irrigation: false, barn: false };
let collectionBonuses = createDefaultCollectionBonuses();
let collection = { items: {}, variants: {}, claimedRewards: {}, claimedSetRewards: {} };
let storyState = { unlocked: {}, read: {} };
let tutorialState = { journalOpened: false };
let farmDiary = { dayKey: '', entries: [] };
let seedUnlockState = { seen: { carrot: true }, animals: {} };
let mutationState = { pending: {} };
let visitorState = {};
let affectionState = {};
let miracleState = { irrigation: { stage: 0, completed: false }, barn: { stage: 0, completed: false } };
let endingState = { unlocked: {}, read: {} };

let gridData = [];
let animals = [];
let ranchBuildings = { coop: 0, sheepfold: 0, cowshed: 0, apiary: 0, pigpen: 0 };
let processingBuildings = { mill: 0, ketchupFactory: 0, bakery: 0, dairy: 0 };
let processingJobs = {};
let processingAuto = { mill: false, ketchupFactory: false, bakery: false, dairy: false };
let workers = [];
let droneUpgrades = createDefaultDroneUpgrades();
let tasks = [];
let orderState = { nextRefreshAt: 0 };

let effectText = "";
let effectAlpha = 0;
let particles = [];
let floatingTexts = [];
let resonanceBursts = [];
let offlineReturnFx = null;
let screenShake = { until: 0, power: 0 };
let uiPreferences = { screenShake: true, autoSowEnabled: true, lastSeedTool: 'carrot' };
let lastSaveTimestamp = Date.now();
let camera = { x: -(farmStartX - 50), y: -(farmStartY - 50), zoom: 1 };

function createDefaultSkills() {
    return {
        sow: { name: '🌱 播种', level: 1, lastUsed: 0 },
        rain: { name: '🌧️ 求雨', level: 1, lastUsed: 0 },
        harvest: { name: '⚡ 收割', level: 1, lastUsed: 0 }
    };
}

function createDefaultCollectionBonuses() {
    return {
        growth5: false,
        watch: false,
        resonance: false,
        goldenWateringCan: false,
        variantChance: 0,
        buildingDiscount: 0,
        irrigationWood: false,
        barnWood: false,
        categoryGrowth: {},
        categoryPrice: {}
    };
}

function resetRuntimeState() {
    coins = 1000;
    playerLevel = 1;
    playerExp = 0;
    currentSelectedTool = 'carrot';
    inventory = createDefaultInventory();
    marketState = createDefaultMarketState();
    skills = createDefaultSkills();
    weather = { type: 'sunny', changedAt: Date.now(), forcedUntil: 0 };
    talentPoints = 0;
    talents = { agriculture: 0, husbandry: 0, industry: 0 };
    stats = { harvests: {}, resonances: 0, totalOfflineSeconds: 0, totalPlaySeconds: 0, ordersCompleted: 0, weatherSeen: {}, rainSkillUsed: false, visitorTalks: 0, visitorArrival: {} };
    miracleBonuses = { irrigation: false, barn: false };
    collectionBonuses = createDefaultCollectionBonuses();
    collection = { items: {}, variants: {}, claimedRewards: {}, claimedSetRewards: {} };
    storyState = { unlocked: {}, read: {} };
    tutorialState = { journalOpened: false };
    farmDiary = { dayKey: '', entries: [] };
    seedUnlockState = { seen: { carrot: true }, animals: {} };
    mutationState = { pending: {} };
    visitorState = {};
    affectionState = {};
    miracleState = { irrigation: { stage: 0, completed: false }, barn: { stage: 0, completed: false } };
    endingState = { unlocked: {}, read: {} };
    animals = [];
    ranchBuildings = { coop: 0, sheepfold: 0, cowshed: 0, apiary: 0, pigpen: 0 };
    processingBuildings = { mill: 0, ketchupFactory: 0, bakery: 0, dairy: 0 };
    processingJobs = {};
    processingAuto = { mill: false, ketchupFactory: false, bakery: false, dairy: false };
    workers = [];
    droneUpgrades = createDefaultDroneUpgrades();
    tasks = [];
    orderState = { nextRefreshAt: 0 };
    effectText = "";
    effectAlpha = 0;
    particles = [];
    floatingTexts = [];
    resonanceBursts = [];
    offlineReturnFx = null;
    screenShake = { until: 0, power: 0 };
    uiPreferences = { screenShake: true, autoSowEnabled: true, lastSeedTool: 'carrot' };
    camera = { x: -(farmStartX - 50), y: -(farmStartY - 50), zoom: 1 };
    lastSaveTimestamp = Date.now();
    initGrid();
    ensureDiaryDay();
    recordDiary('重新接手农场，第一天开始了。');
    if (typeof syncMiracleBonuses === 'function') syncMiracleBonuses();
    checkSeedUnlocks(true);
    checkStoryUnlocks(false);
    initTasks();
}

function getCropIds() {
    return Object.keys(CROP_CONFIG).filter(id => CROP_CONFIG[id].seedPrice !== undefined);
}

function getAnimalIds() {
    return Object.keys(CROP_CONFIG).filter(id => CROP_CONFIG[id].price !== undefined);
}

function getMarketItemIds() {
    return Object.keys(CROP_CONFIG).filter(id => CROP_CONFIG[id].basePrice !== undefined && !CROP_CONFIG[id].noSell);
}

function getInventoryItemIds() {
    return Object.keys(CROP_CONFIG).filter(id => CROP_CONFIG[id].basePrice !== undefined);
}

function createDefaultInventory() {
    return Object.fromEntries(getInventoryItemIds().map(id => [id, 0]));
}

function createDefaultMarketState() {
    return Object.fromEntries(getMarketItemIds().map(id => [id, { price: CROP_CONFIG[id].basePrice, trend: 0, history: [CROP_CONFIG[id].basePrice] }]));
}

function createDefaultDroneUpgrades() {
    return { speed: 0, efficiency: 0, cargo: 0 };
}

function normalizeDroneUpgrades(source) {
    const upgrades = Object.assign(createDefaultDroneUpgrades(), source || {});
    for (const [id, config] of Object.entries(DRONE_UPGRADE_CONFIG)) {
        upgrades[id] = Math.max(0, Math.min(config.maxLevel, Number(upgrades[id]) || 0));
    }
    return upgrades;
}

function getDroneUpgradeLevel(id) {
    return Number(droneUpgrades?.[id]) || 0;
}

function getDroneUpgradeCost(id) {
    const config = DRONE_UPGRADE_CONFIG[id];
    if (!config) return Infinity;
    const level = getDroneUpgradeLevel(id);
    if (level >= config.maxLevel) return Infinity;
    return config.baseCost + level * config.costStep;
}

function upgradeDrone(id) {
    const config = DRONE_UPGRADE_CONFIG[id];
    if (!config) return false;
    const level = getDroneUpgradeLevel(id);
    if (level >= config.maxLevel) return false;
    if (!(workers || []).some(worker => worker.type === 'drone')) {
        alert('需要先部署一台无人机。');
        return false;
    }
    const cost = getDroneUpgradeCost(id);
    if (coins < cost) {
        alert('金币不足。');
        return false;
    }
    coins -= cost;
    droneUpgrades[id] = level + 1;
    effectText = `${config.name} Lv.${droneUpgrades[id]}`;
    effectAlpha = 1.0;
    recordDiary(`升级无人机：${config.name} Lv.${droneUpgrades[id]}`);
    updateUI();
    saveGame();
    return true;
}

function getDroneActionCooldown() {
    return Math.max(80, 260 - getDroneUpgradeLevel('efficiency') * DRONE_UPGRADE_CONFIG.efficiency.cooldownReduction);
}

function getDroneMoveSpeed() {
    return 3.0 + getDroneUpgradeLevel('speed') * DRONE_UPGRADE_CONFIG.speed.bonusPerLevel;
}

function getDroneOfflinePower() {
    return 18 + getDroneUpgradeLevel('cargo') * DRONE_UPGRADE_CONFIG.cargo.offlinePower;
}

function normalizeMarketStateHistory() {
    for (const id of getMarketItemIds()) {
        const config = CROP_CONFIG[id];
        const base = config?.basePrice || 1;
        const state = marketState[id] || (marketState[id] = { price: base, trend: 0, history: [base] });
        if (!Number.isFinite(state.price) || state.price <= 0) state.price = base;
        if (!Number.isFinite(state.trend)) state.trend = 0;
        const normalized = Array.isArray(state.history)
            ? state.history.map(point => typeof point === 'number' ? point : point?.price).filter(price => Number.isFinite(price) && price > 0)
            : [];
        if (!normalized.length) normalized.push(state.price);
        state.history = normalized.slice(-48);
    }
}

function isItemUnlocked(itemId) {
    const config = CROP_CONFIG[itemId];
    if (!config) return false;
    if (config.unlockCondition) return !!config.unlockCondition();
    if (config.reqLevel) return playerLevel >= config.reqLevel;
    return true;
}

function isVariantUnlocked(baseCrop, variantId) {
    return !!collection.variants?.[baseCrop]?.[variantId];
}

function checkSeedUnlocks(silent = false) {
    let changed = false;
    const unlockedNames = [];
    for (const id of getCropIds()) {
        if (!isItemUnlocked(id) || seedUnlockState.seen[id]) continue;
        seedUnlockState.seen[id] = true;
        changed = true;
        unlockedNames.push(`${CROP_CONFIG[id].icon} ${CROP_CONFIG[id].name}`);
    }
    for (const id of getAnimalIds()) {
        if (!isItemUnlocked(id) || seedUnlockState.animals?.[id]) continue;
        if (!seedUnlockState.animals) seedUnlockState.animals = {};
        seedUnlockState.animals[id] = true;
        changed = true;
        unlockedNames.push(`${CROP_CONFIG[id].icon} ${CROP_CONFIG[id].name}`);
    }
    if (!silent && unlockedNames.length > 0) {
        const label = unlockedNames.length === 1 ? unlockedNames[0] : `${unlockedNames.slice(0, 3).join('、')}${unlockedNames.length > 3 ? ' 等' : ''}`;
        effectText = `✨ 新内容可用：${label}`;
        effectAlpha = 1.0;
        playSound('talk');
        recordDiary(`新内容可用：${unlockedNames.join('、')}`, true);
    }
    return changed;
}

function getMaxExp() {
    return playerLevel * 500;
}

function formatCompactNumber(value) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);
    const units = [
        [1_000_000_000_000, 'T'],
        [1_000_000_000, 'B'],
        [1_000_000, 'M'],
        [1_000, 'K']
    ];
    for (const [size, suffix] of units) {
        if (abs >= size) {
            const next = number / size;
            return `${next >= 10 ? next.toFixed(1) : next.toFixed(2)}`.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1') + suffix;
        }
    }
    return String(Math.floor(number));
}

function formatCoins(value) {
    return `${formatCompactNumber(value)}币`;
}

function getTalentLevel(id) {
    return talents[id] || 0;
}

function getGrowthMultiplier() {
    let multiplier = miracleBonuses.irrigation && weather.type === 'drought' ? 1 : WEATHER_CONFIG[weather.type].growth;
    multiplier *= 1 + getTalentLevel('agriculture') * 0.05;
    if (collectionBonuses.growth5) multiplier *= 1.05;
    if (weather.type === 'rain' && getTalentLevel('agriculture') >= 4) multiplier += 0.15;
    if (miracleBonuses.irrigation) multiplier += 0.2;
    return multiplier;
}

function getResonanceChance() {
    let chance = 0.35;
    if (getTalentLevel('agriculture') >= 3) chance += 0.15;
    if (getTalentLevel('industry') >= 2) chance += 0.15;
    if (collectionBonuses.resonance) chance += 0.1;
    return Math.min(0.75, chance);
}

function markCollected(itemId, amount = 1) {
    if (!itemId || !CROP_CONFIG[itemId]) return;
    collection.items[itemId] = (collection.items[itemId] || 0) + amount;
}

function setCollectedAtLeast(itemId, amount = 1) {
    if (!itemId || !CROP_CONFIG[itemId]) return;
    collection.items[itemId] = Math.max(collection.items[itemId] || 0, amount);
}

function getCollectedAmount(itemId) {
    return collection.items[itemId] || 0;
}

function isCollected(itemId) {
    return getCollectedAmount(itemId) > 0;
}

function markVariantCollected(cropType, variantId) {
    if (!cropType || !variantId) return false;
    if (!collection.variants[cropType]) collection.variants[cropType] = {};
    if (collection.variants[cropType][variantId]) return false;
    collection.variants[cropType][variantId] = true;
    return true;
}

function getVariantProgress(cropType) {
    const variants = VARIANT_CONFIG[cropType] || [];
    const foundMap = collection.variants[cropType] || {};
    return {
        found: variants.filter(variant => foundMap[variant.id]).length,
        total: variants.length,
        variants
    };
}

function getCodexItemIds() {
    return Object.values(CODEX_GROUPS).flatMap(group => group.items);
}

function getCodexDisplayItems(group) {
    return group.items.filter(itemId => !CROP_CONFIG[itemId]?.hidden || isCollected(itemId));
}

function getCollectedUniqueCount() {
    return getCodexItemIds().filter(isCollected).length;
}

function getCollectedCropCount() {
    return CODEX_GROUPS.crops.items.filter(isCollected).length;
}

function getCodexTotalCount() {
    return getCodexItemIds().length;
}

function getCodexPercent() {
    const total = getCodexTotalCount();
    return total <= 0 ? 0 : Math.floor((getCollectedUniqueCount() / total) * 100);
}

function getCropCategoryIds(category) {
    return getCropIds().filter(itemId => CROP_CONFIG[itemId]?.category === category);
}

function getCollectedCategoryCount(category) {
    return getCropCategoryIds(category).filter(isCollected).length;
}

function isCodexSetRewardReady(reward) {
    const ids = getCropCategoryIds(reward.category);
    return ids.length > 0 && ids.every(isCollected);
}

function applyCodexSetRewardEffect(reward) {
    if (!reward?.effect) return;
    const effect = reward.effect;
    if (effect.type === 'categoryGrowth') {
        collectionBonuses.categoryGrowth[reward.category] = Math.min(collectionBonuses.categoryGrowth[reward.category] || 1, effect.value);
    }
    if (effect.type === 'categoryPrice') {
        collectionBonuses.categoryPrice[reward.category] = Math.max(collectionBonuses.categoryPrice[reward.category] || 1, effect.value);
    }
    if (effect.type === 'variantChance') {
        collectionBonuses.variantChance = Math.max(collectionBonuses.variantChance || 0, effect.value);
    }
}

function getCategoryGrowTimeScale(cropType) {
    const category = CROP_CONFIG[cropType]?.category;
    if (!category) return 1;
    return collectionBonuses.categoryGrowth?.[category] || 1;
}

function getCategoryPriceMultiplier(itemId) {
    const category = CROP_CONFIG[itemId]?.category;
    if (!category) return 1;
    return collectionBonuses.categoryPrice?.[category] || 1;
}

function syncCollectionFromExistingState() {
    for (const itemId of Object.keys(inventory)) {
        if ((inventory[itemId] || 0) > 0) setCollectedAtLeast(itemId, inventory[itemId]);
    }
    for (const animal of animals) {
        setCollectedAtLeast(animal.type, getAnimalCount(animal.type));
    }
    for (const [itemId, amount] of Object.entries(stats.harvests || {})) {
        setCollectedAtLeast(itemId, amount);
    }
}

function sanitizeInventory(rawInventory = {}) {
    const next = createDefaultInventory();
    for (const id of getInventoryItemIds()) {
        const amount = Number(rawInventory[id] || 0);
        next[id] = Number.isFinite(amount) && amount > 0 ? amount : 0;
    }
    return next;
}

function sanitizeTasks(rawTasks = []) {
    const slots = Array.isArray(rawTasks) ? rawTasks.slice(0, 3) : [];
    return slots.map(task => {
        if (!task) return null;
        const sourceItems = Array.isArray(task.items) && task.items.length
            ? task.items
            : [{ item: task.item, amount: task.amount }];
        const items = sourceItems.map(entry => ({
            item: entry.item,
            amount: Math.max(1, Math.floor(Number(entry.amount) || 1))
        })).filter(entry => {
            const config = CROP_CONFIG[entry.item];
            return config && config.basePrice !== undefined && !config.noSell && entry.amount > 0;
        }).slice(0, 3);
        if (!items.length) return null;
        const primary = items[0];
        return {
            id: task.id || Math.random().toString(36).substr(2, 9),
            item: primary.item,
            amount: primary.amount,
            items,
            reward: Math.max(1, Math.floor(Number(task.reward) || items.reduce((sum, entry) => sum + CROP_CONFIG[entry.item].basePrice * entry.amount, 0) * 2)),
            exp: Math.max(1, Math.floor(Number(task.exp) || items.reduce((sum, entry) => sum + CROP_CONFIG[entry.item].basePrice * entry.amount, 0)))
        };
    });
}

function normalizeGridCells() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = gridData[r]?.[c];
            if (!cell) continue;
            if (![ -1, 0, 1, 2, 4 ].includes(cell.state)) cell.state = 0;
            if ((cell.state === 1 || cell.state === 2 || cell.state === 4) && !CROP_CONFIG[cell.cropType]) {
                cell.state = 0;
                cell.cropType = null;
            }
            if (cell.state === 4) {
                const parent = gridData[cell.parentRow]?.[cell.parentCol];
                if (!parent || parent.cropType !== cell.cropType || ![1, 2].includes(parent.state)) {
                    cell.state = 0;
                    cell.cropType = null;
                    delete cell.parentRow;
                    delete cell.parentCol;
                }
            }
        }
    }
}

function rebuildCollectionFromProgress(saveData = {}) {
    const rebuilt = {
        items: {},
        variants: {},
        claimedRewards: Object.assign({}, saveData.collection?.claimedRewards),
        claimedSetRewards: Object.assign({}, saveData.collection?.claimedSetRewards)
    };
    for (const [itemId, amount] of Object.entries(inventory)) {
        if ((amount || 0) > 0) rebuilt.items[itemId] = amount;
    }
    for (const animal of animals) {
        if (animal?.type && CROP_CONFIG[animal.type]) rebuilt.items[animal.type] = Math.max(rebuilt.items[animal.type] || 0, getAnimalCount(animal.type));
    }
    for (const [itemId, amount] of Object.entries(stats.harvests || {})) {
        if (CROP_CONFIG[itemId] && amount > 0) rebuilt.items[itemId] = Math.max(rebuilt.items[itemId] || 0, amount);
    }
    const oldVariants = saveData.collection?.variants || {};
    for (const [baseCrop, variants] of Object.entries(oldVariants)) {
        const validIds = new Set((VARIANT_CONFIG[baseCrop] || []).map(item => item.id));
        for (const variantId of Object.keys(variants || {})) {
            if (!validIds.has(variantId)) continue;
            if (!rebuilt.variants[baseCrop]) rebuilt.variants[baseCrop] = {};
            rebuilt.variants[baseCrop][variantId] = true;
        }
    }
    return rebuilt;
}

function normalizeSeedUnlockState() {
    const seen = { carrot: true };
    const animalsSeen = {};
    for (const id of getCropIds()) {
        if (id === 'carrot') continue;
        if (isItemUnlocked(id)) seen[id] = true;
    }
    for (const id of getAnimalIds()) {
        if (isItemUnlocked(id)) animalsSeen[id] = true;
    }
    seedUnlockState = { seen, animals: animalsSeen };
}

function normalizeCodexRewardClaims() {
    const percent = getCodexPercent();
    for (const reward of CODEX_REWARDS) {
        if (percent >= reward.percent && collection.claimedRewards[reward.id]) continue;
        delete collection.claimedRewards[reward.id];
        if (reward.bonus) collectionBonuses[reward.bonus] = false;
    }
    for (const reward of CODEX_SET_REWARDS) {
        if (isCodexSetRewardReady(reward) && collection.claimedSetRewards?.[reward.id]) continue;
        if (collection.claimedSetRewards) delete collection.claimedSetRewards[reward.id];
    }
}

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function ensureDiaryDay() {
    const key = getTodayKey();
    if (farmDiary.dayKey !== key) {
        farmDiary.dayKey = key;
        farmDiary.entries = [];
    }
}

function recordDiary(text, skipChecks = false) {
    ensureDiaryDay();
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    farmDiary.entries.unshift({ time, text });
    farmDiary.entries = farmDiary.entries.slice(0, 18);
    if (skipChecks) return;
    checkStoryUnlocks();
    checkSeedUnlocks();
}

function unlockStoryLetter(id, silent = false) {
    if (storyState.unlocked[id]) return false;
    storyState.unlocked[id] = true;
    if (!silent) {
        const letter = STORY_LETTERS.find(item => item.id === id);
        effectText = `📬 新信件：${letter?.title || id}`;
        effectAlpha = 1.0;
        if (typeof queueStoryPopup === 'function' && letter) queueStoryPopup(letter);
        playSound('talk');
    }
    return true;
}

function checkStoryUnlocks(silent = false) {
    let changed = false;
    for (const letter of STORY_LETTERS) {
        if (!storyState.unlocked[letter.id] && letter.condition()) {
            changed = unlockStoryLetter(letter.id, silent) || changed;
        }
    }
    if (typeof checkEndingUnlocks === 'function') checkEndingUnlocks(silent);
    return changed;
}

function markStoryRead(id) {
    storyState.read[id] = true;
}

window.claimCodexReward = function(rewardId) {
    const reward = CODEX_REWARDS.find(item => item.id === rewardId);
    if (!reward || collection.claimedRewards[rewardId]) return;
    if (getCodexPercent() < reward.percent) return;
    collection.claimedRewards[rewardId] = true;
    if (reward.bonus) collectionBonuses[reward.bonus] = true;
    coins += reward.coins;
    addExp(reward.exp);
    effectText = `📖 图鉴奖励：${reward.label} +${reward.coins}币`;
    effectAlpha = 1.0;
    updateUI();
    saveGame();
};

window.claimCodexSetReward = function(rewardId) {
    const reward = CODEX_SET_REWARDS.find(item => item.id === rewardId);
    if (!reward) return;
    if (!collection.claimedSetRewards) collection.claimedSetRewards = {};
    if (collection.claimedSetRewards[rewardId] || !isCodexSetRewardReady(reward)) return;
    collection.claimedSetRewards[rewardId] = true;
    applyCodexSetRewardEffect(reward);
    coins += reward.coins;
    addExp(reward.exp);
    effectText = `图鉴套组奖励：${reward.bonusLabel}`;
    effectAlpha = 1.0;
    updateUI();
    saveGame();
};

function addExp(amount) {
    playerExp += amount;
    let levelsGained = 0;
    while (playerExp >= getMaxExp()) {
        playerExp -= getMaxExp();
        playerLevel++;
        talentPoints++;
        levelsGained++;
        coins += 500 * playerLevel;
    }
    if (levelsGained > 0) {
        effectText = levelsGained === 1 ? `🎉 升级啦！当前等级 Lv.${playerLevel}！` : `🚀 经验爆发！连升 ${levelsGained} 级，直达 Lv.${playerLevel}！`;
        effectAlpha = 1.0;
        if (typeof refreshOrderBoard === 'function') refreshOrderBoard(true);
        else for (let i = 0; i < 3; i++) tasks[i] = generateTask();
    }
    checkStoryUnlocks();
    checkSeedUnlocks();
    if (typeof updateUI === 'function') updateUI();
}

function initGrid() {
    gridData = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const isCenter = r >= 6 && r <= 9 && c >= 6 && c <= 9;
            row.push({ state: isCenter ? 0 : -1, timer: 0, cropType: null });
        }
        gridData.push(row);
    }
}

function saveGame() {
    lastSaveTimestamp = Date.now();
    localStorage.setItem('tinyPixelFarmSave', JSON.stringify({
        version: SAVE_VERSION,
        coins,
        playerLevel,
        playerExp,
        grid: gridData,
        inventory,
        marketState,
        animals,
        ranchBuildings,
        processingBuildings,
        processingJobs,
        processingAuto,
        skills,
        tasks,
        orderState,
        workers,
        droneUpgrades,
        weather,
        talents,
        talentPoints,
        stats,
        miracleBonuses,
        collectionBonuses,
        collection,
        storyState,
        tutorialState,
        farmDiary,
        seedUnlockState,
        mutationState,
        visitorState,
        affectionState,
        miracleState,
        endingState,
        audioEnabled,
        uiPreferences,
        lastSaveTimestamp,
        camX: camera.x,
        camY: camera.y,
        camZoom: camera.zoom
    }));
}

function applyOfflineProgress(saveData) {
    if (!saveData.lastSaveTimestamp) return;
    const now = Date.now();
    const offlineCapHours = collectionBonuses.watch ? 10 : 8;
    const offlineMs = Math.min(now - saveData.lastSaveTimestamp, offlineCapHours * 60 * 60 * 1000);
    if (offlineMs < 60000) return;
    const offlineMultiplier = 1 + (getTalentLevel('industry') >= 3 ? 0.25 : 0);
    let cropReady = 0;
    let cropAutoHarvested = 0;
    let animalItems = 0;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = gridData[r][c];
            if (cell.state !== 1 || !cell.cropType) continue;
            const growTime = getActualGrowTime(cell.cropType) / getGrowthMultiplier();
            if (now - cell.timer + offlineMs * offlineMultiplier >= growTime) {
                cell.state = 2;
                cropReady++;
            }
        }
    }

    const humanWorkers = (workers || []).filter(worker => worker.type === 'human').length;
    const droneWorkers = (workers || []).filter(worker => worker.type === 'drone').length;
    const autoHarvestPower = humanWorkers * 8 + droneWorkers * getDroneOfflinePower();
    const autoHarvestLimit = Math.min(cropReady, Math.floor(offlineMs / 60000) * autoHarvestPower);
    if (autoHarvestLimit > 0) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (cropAutoHarvested >= autoHarvestLimit) break;
                const cell = gridData[r][c];
                if (cell.state !== 2 || !cell.cropType) continue;
                cropAutoHarvested += harvestCell(r, c, false, { quiet: true });
            }
            if (cropAutoHarvested >= autoHarvestLimit) break;
        }
    }

    for (const animal of animals) {
        const pTime = getAnimalProduceTime(animal.type, animal);
        const produced = Math.floor((now - animal.timer + offlineMs * offlineMultiplier) / pTime);
        if (produced > 0) {
            const result = addAnimalProducts(animal.type, produced);
            animalItems += result.baseAmount + result.rareAmount;
            animal.timer = now;
        }
    }

    stats.totalOfflineSeconds = (stats.totalOfflineSeconds || 0) + Math.floor(offlineMs / 1000);
    effectText = `⏱️ 离线 ${Math.floor(offlineMs / 60000)} 分钟：${cropReady} 块作物成熟${cropAutoHarvested > 0 ? `，自动收割 ${cropAutoHarvested} 块` : ''}，动物产出 ${animalItems} 件`;
    effectAlpha = 1.0;
    if (cropReady > 0 || animalItems > 0) {
        offlineReturnFx = {
            cropReady,
            cropAutoHarvested,
            animalItems,
            minutes: Math.floor(offlineMs / 60000),
            life: 180,
            maxLife: 180
        };
    }
}

function loadGame() {
    const saveStr = localStorage.getItem('tinyPixelFarmSave');
    if (saveStr) {
        const saveData = JSON.parse(saveStr);
        coins = saveData.coins;
        playerLevel = saveData.playerLevel || 1;
        playerExp = saveData.playerExp || 0;
        if (saveData.grid && saveData.grid.length === ROWS && saveData.grid[0].length === COLS) gridData = saveData.grid;
        else initGrid();
        normalizeGridCells();
        inventory = sanitizeInventory(saveData.inventory);
        marketState = Object.assign(createDefaultMarketState(), saveData.marketState);
        normalizeMarketStateHistory();
        animals = saveData.animals || [];
        ranchBuildings = Object.assign({ coop: 0, sheepfold: 0, cowshed: 0, apiary: 0, pigpen: 0 }, saveData.ranchBuildings);
        processingBuildings = Object.assign({ mill: 0, ketchupFactory: 0, bakery: 0, dairy: 0 }, saveData.processingBuildings);
        processingJobs = Object.assign({}, saveData.processingJobs);
        processingAuto = Object.assign({ mill: false, ketchupFactory: false, bakery: false, dairy: false }, saveData.processingAuto);
        weather = Object.assign({ type: 'sunny', changedAt: Date.now(), forcedUntil: 0 }, saveData.weather);
        talents = Object.assign({ agriculture: 0, husbandry: 0, industry: 0 }, saveData.talents);
        talentPoints = saveData.talentPoints || 0;
        stats = Object.assign({ harvests: {}, resonances: 0, totalOfflineSeconds: 0, totalPlaySeconds: 0, ordersCompleted: 0, weatherSeen: {}, rainSkillUsed: false, visitorTalks: 0, visitorArrival: {} }, saveData.stats);
        stats.weatherSeen = Object.assign({}, stats.weatherSeen);
        stats.visitorArrival = Object.assign({}, stats.visitorArrival);
        miracleBonuses = Object.assign({ irrigation: false, barn: false }, saveData.miracleBonuses);
        collectionBonuses = Object.assign(createDefaultCollectionBonuses(), saveData.collectionBonuses);
        collectionBonuses.categoryGrowth = Object.assign({}, collectionBonuses.categoryGrowth);
        collectionBonuses.categoryPrice = Object.assign({}, collectionBonuses.categoryPrice);
        collection = Object.assign({ items: {}, variants: {}, claimedRewards: {}, claimedSetRewards: {} }, saveData.collection);
        collection.items = Object.assign({}, collection.items);
        collection.variants = Object.assign({}, collection.variants);
        collection.claimedRewards = Object.assign({}, collection.claimedRewards);
        collection.claimedSetRewards = Object.assign({}, collection.claimedSetRewards);
        for (const reward of CODEX_SET_REWARDS) {
            if (collection.claimedSetRewards[reward.id]) applyCodexSetRewardEffect(reward);
        }
        storyState = Object.assign({ unlocked: {}, read: {} }, saveData.storyState);
        storyState.unlocked = Object.assign({}, storyState.unlocked);
        storyState.read = Object.assign({}, storyState.read);
        tutorialState = Object.assign({ journalOpened: false }, saveData.tutorialState);
        if (!saveData.tutorialState && Object.keys(storyState.read || {}).length > 0) tutorialState.journalOpened = true;
        farmDiary = Object.assign({ dayKey: '', entries: [] }, saveData.farmDiary);
        seedUnlockState = Object.assign({ seen: { carrot: true }, animals: {} }, saveData.seedUnlockState);
        seedUnlockState.seen = Object.assign({ carrot: true }, seedUnlockState.seen);
        seedUnlockState.animals = Object.assign({}, seedUnlockState.animals);
        mutationState = Object.assign({ pending: {} }, saveData.mutationState);
        mutationState.pending = Object.assign({}, mutationState.pending);
        visitorState = Object.assign({}, saveData.visitorState);
        affectionState = Object.assign({}, saveData.affectionState);
        miracleState = Object.assign({ irrigation: { stage: 0, completed: false }, barn: { stage: 0, completed: false } }, saveData.miracleState);
        miracleState.irrigation = Object.assign({ stage: 0, completed: false }, miracleState.irrigation);
        miracleState.barn = Object.assign({ stage: 0, completed: false }, miracleState.barn);
        endingState = Object.assign({ unlocked: {}, read: {} }, saveData.endingState);
        endingState.unlocked = Object.assign({}, endingState.unlocked);
        endingState.read = Object.assign({}, endingState.read);
        if (saveData.audioEnabled !== undefined) audioEnabled = saveData.audioEnabled;
        uiPreferences = Object.assign({ screenShake: true, autoSowEnabled: true, lastSeedTool: 'carrot' }, saveData.uiPreferences);
        if (saveData.skills) {
            skills.sow.lastUsed = saveData.skills.sow.lastUsed || 0;
            skills.sow.level = saveData.skills.sow.level || 1;
            skills.rain.lastUsed = saveData.skills.rain.lastUsed || 0;
            skills.rain.level = saveData.skills.rain.level || 1;
            skills.harvest.lastUsed = saveData.skills.harvest.lastUsed || 0;
            skills.harvest.level = saveData.skills.harvest.level || 1;
        }
        tasks = sanitizeTasks(saveData.tasks);
        orderState = Object.assign({ nextRefreshAt: 0 }, saveData.orderState);
        workers = saveData.workers || [];
        workers = workers.filter((worker, index, list) => {
            const limit = WORKER_LIMITS[worker.type] ?? Infinity;
            return list.slice(0, index).filter(item => item.type === worker.type).length < limit;
        });
        droneUpgrades = normalizeDroneUpgrades(saveData.droneUpgrades);
        if (saveData.camX !== undefined) {
            camera.x = saveData.camX;
            camera.y = saveData.camY;
            camera.zoom = saveData.camZoom || 1;
        }
        if ((saveData.version || 0) < SAVE_VERSION) {
            collection = rebuildCollectionFromProgress(saveData);
            normalizeSeedUnlockState();
            normalizeCodexRewardClaims();
        }
        applyOfflineProgress(saveData);
        syncCollectionFromExistingState();
        ensureDiaryDay();
        if (typeof syncMiracleBonuses === 'function') syncMiracleBonuses();
        checkSeedUnlocks(true);
        checkStoryUnlocks(true);
        if (playerExp >= getMaxExp()) addExp(0);
    } else {
        initGrid();
        ensureDiaryDay();
        if (typeof syncMiracleBonuses === 'function') syncMiracleBonuses();
        recordDiary('重新接手农场，第一天开始了。');
        checkSeedUnlocks(true);
        checkStoryUnlocks(false);
    }
    if (tasks.length < 3) initTasks();
    if (typeof updateUI === 'function') updateUI();
}

window.resetGame = function() {
    if (confirm("确定要重置世界吗？")) {
        localStorage.removeItem('tinyPixelFarmSave');
        if (typeof uiState !== 'undefined') {
            uiState.storyPopupQueue = [];
            uiState.activeStoryPopup = null;
        }
        resetRuntimeState();
        if (typeof uiState !== 'undefined') {
            uiState.activePanel = null;
            uiState.activeTabs = { journal: 'codex', build: 'ranch', codex: 'crops' };
            uiState.settingsOpen = false;
            uiState.scroll = { journal: 0, seeds: 0, build: 0, orders: 0, market: 0 };
            uiState.marketAmounts = {};
            uiState.activeMarketInput = null;
            uiState.marketDraft = '';
            uiState.processingRecipeIndex = {};
            uiState.orderDockScroll = 0;
            uiState.activeStoryLetter = null;
            uiState.storyListPage = 0;
            uiState.activeVisitor = null;
            uiState.visitorDialog = null;
            uiState.npcArrivalPopup = null;
            uiState.tileTip = null;
        }
        saveGame();
        if (typeof updateUI === 'function') updateUI();
    }
};

window.toggleScreenShake = function(force) {
    uiPreferences.screenShake = force === undefined ? !uiPreferences.screenShake : !!force;
    effectText = uiPreferences.screenShake ? '震动反馈已开启' : '震动反馈已关闭';
    effectAlpha = 1.0;
    saveGame();
};

window.toggleAutoSow = function(force) {
    uiPreferences.autoSowEnabled = force === undefined ? uiPreferences.autoSowEnabled === false : !!force;
    effectText = uiPreferences.autoSowEnabled === false ? '自动播种已关闭' : '自动播种已开启';
    effectAlpha = 1.0;
    saveGame();
};
