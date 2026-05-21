// ==========================================
// Logic/Economy: 市场与订单
// ==========================================
const ORDER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const MARKET_BUY_BLOCKED_ITEMS = new Set([
    'goldenEgg',
    'goldenWool',
    'goldenMilk',
    'royalHoney',
    'blackTruffle',
    'hardwood'
]);

function getNextFixedOrderRefreshAt(now = Date.now()) {
    const interval = ORDER_REFRESH_INTERVAL_MS;
    return (Math.floor(now / interval) + 1) * interval;
}

function isFixedOrderRefreshAt(timestamp) {
    return Number.isFinite(timestamp) && timestamp > 0 && timestamp % ORDER_REFRESH_INTERVAL_MS === 0;
}

function updateMarket() {
    for (const key in marketState) {
        const config = CROP_CONFIG[key];
        if (!config) continue;
        const base = config.basePrice;
        if (!base) continue;
        const state = marketState[key] || (marketState[key] = { price: base, trend: 0 });
        if (!Number.isFinite(state.price) || state.price <= 0) state.price = base;
        if (!Number.isFinite(state.trend)) state.trend = 0;
        if (!Array.isArray(state.history)) state.history = [state.price];
        state.trend += (Math.random() - 0.5) * 1.5;
        state.trend -= ((state.price - base) / base) * 2.0;
        state.trend = Math.max(-3, Math.min(3, state.trend));
        let newPrice = Math.round(state.price + state.trend + (Math.random() - 0.5));
        newPrice = Math.max(Math.max(1, Math.floor(base * 0.2)), Math.min(Math.ceil(base * 3.0), newPrice));
        state.price = newPrice;
        state.history.push(newPrice);
        if (state.history.length > 48) state.history.splice(0, state.history.length - 48);
    }
}

function getProcessingBuildingLevel(id) {
    return processingBuildings[id] || 0;
}

function getProcessingBuildingCost(id) {
    const config = PROCESSING_BUILDING_CONFIG[id];
    const level = getProcessingBuildingLevel(id);
    let cost = Math.round(config.baseCost * Math.pow(1.55, level));
    if (getTalentLevel('industry') >= 5) cost = Math.floor(cost * 0.8);
    if (collectionBonuses.buildingDiscount) cost = Math.floor(cost * (1 - collectionBonuses.buildingDiscount));
    return cost;
}

function isProcessingBuildingUnlocked(id) {
    const config = PROCESSING_BUILDING_CONFIG[id];
    if (!config) return false;
    if (config.unlockCondition) return !!config.unlockCondition();
    return playerLevel >= config.reqLevel;
}

function getMarketUnlockHint(itemId) {
    const config = CROP_CONFIG[itemId];
    if (!config) return '继续探索';
    if (config.seedPrice !== undefined) return isItemUnlocked(itemId) ? '首次收获后进入市场' : (config.unlockHint || `Lv.${config.reqLevel} 解锁`);
    const recipe = Object.values(RECIPE_CONFIG).find(item => item.output === itemId);
    if (recipe) return `${PROCESSING_BUILDING_CONFIG[recipe.building].name}产出后进入市场`;
    const ranch = Object.values(RANCH_BUILDING_CONFIG).find(item => item.product === itemId);
    if (ranch) return `${ranch.name}产出后进入市场`;
    return '收集后进入市场';
}

function isMarketItemUnlocked(itemId) {
    if ((inventory[itemId] || 0) > 0 || isCollected(itemId)) return true;
    return false;
}

function getRecipeMaxCraft(recipeId) {
    const recipe = RECIPE_CONFIG[recipeId];
    if (!recipe) return 0;
    return Math.min(...Object.entries(recipe.inputs).map(([itemId, amount]) => Math.floor((inventory[itemId] || 0) / amount)));
}

function isRecipeDiscovered(recipeId) {
    const recipe = RECIPE_CONFIG[recipeId];
    if (!recipe) return false;
    if (!isProcessingBuildingUnlocked(recipe.building)) return false;
    return Object.keys(recipe.inputs).every(itemId => isCollected(itemId) || (inventory[itemId] || 0) > 0);
}

function getProcessingJob(buildingId) {
    return processingJobs[buildingId] || null;
}

function getRecipeDuration(recipeId, amount = 1) {
    const recipe = RECIPE_CONFIG[recipeId];
    if (!recipe) return 0;
    const level = getProcessingBuildingLevel(recipe.building);
    const bonus = level * PROCESSING_BUILDING_CONFIG[recipe.building].speedBonusPerLevel;
    const miracleMultiplier = miracleBonuses.barn ? 0.85 : 1;
    return Math.max(3000, Math.round(recipe.processTime * amount * (1 - Math.min(0.45, bonus)) * miracleMultiplier));
}

function getRecipeBatchAmount(recipeId) {
    return Math.min(5, getRecipeMaxCraft(recipeId));
}

function canCraftRecipe(recipeId) {
    const recipe = RECIPE_CONFIG[recipeId];
    if (!recipe) return false;
    if (!isRecipeDiscovered(recipeId)) return false;
    if (!isProcessingBuildingUnlocked(recipe.building)) return false;
    if (getProcessingBuildingLevel(recipe.building) <= 0) return false;
    if (getProcessingJob(recipe.building)) return false;
    return getRecipeMaxCraft(recipeId) > 0;
}

window.upgradeProcessingBuilding = function(id) {
    const config = PROCESSING_BUILDING_CONFIG[id];
    if (!config) return;
    const level = getProcessingBuildingLevel(id);
    if (level >= config.maxLevel) return;
    if (!isProcessingBuildingUnlocked(id)) {
        alert(config.unlockHint || `需要 Lv.${config.reqLevel} 解锁${config.name}`);
        return;
    }
    const cost = getProcessingBuildingCost(id);
    if (coins < cost) {
        alert('金币不足！');
        return;
    }
    coins -= cost;
    processingBuildings[id] = level + 1;
    effectText = `${config.icon} ${config.name} 升至 Lv.${processingBuildings[id]}`;
    effectAlpha = 1.0;
    playSound('build');
    recordDiary(`${config.name}升至 Lv.${processingBuildings[id]}`);
    updateUI();
    saveGame();
};

window.startRecipeProcessing = function(recipeId, amount = 1) {
    const recipe = RECIPE_CONFIG[recipeId];
    if (!recipe || getProcessingBuildingLevel(recipe.building) <= 0) return;
    if (!isProcessingBuildingUnlocked(recipe.building)) return;
    if (getProcessingJob(recipe.building)) return;
    const craftAmount = Math.max(1, Math.min(amount, getRecipeMaxCraft(recipeId)));
    if (craftAmount <= 0) return;
    for (const [itemId, inputAmount] of Object.entries(recipe.inputs)) {
        inventory[itemId] -= inputAmount * craftAmount;
    }
    const now = Date.now();
    processingJobs[recipe.building] = {
        recipeId,
        amount: craftAmount,
        startedAt: now,
        duration: getRecipeDuration(recipeId, craftAmount)
    };
    effectText = `${PROCESSING_BUILDING_CONFIG[recipe.building].icon} 已投料：${recipe.name} x${craftAmount}`;
    effectAlpha = 1.0;
    playSound('craftStart');
    recordDiary(`${PROCESSING_BUILDING_CONFIG[recipe.building].name}开始${recipe.name} x${craftAmount}`);
    updateUI();
    saveGame();
};

window.craftRecipe = window.startRecipeProcessing;

function completeProcessingJob(buildingId, job) {
    const recipe = RECIPE_CONFIG[job.recipeId];
    if (!recipe) return;
    const produced = recipe.outputAmount * job.amount;
    inventory[recipe.output] = (inventory[recipe.output] || 0) + produced;
    markCollected(recipe.output, produced);
    delete processingJobs[buildingId];
    effectText = `${CROP_CONFIG[recipe.output].icon} 完成 ${CROP_CONFIG[recipe.output].name} x${produced}`;
    effectAlpha = 1.0;
    playSound('craftDone');
    recordDiary(`加工完成 ${CROP_CONFIG[recipe.output].name} x${produced}`);
    addExp(recipe.exp * job.amount);
    updateUI();
    saveGame();
}

function updateProcessing(now) {
    for (const buildingId of Object.keys(PROCESSING_BUILDING_CONFIG)) {
        const job = getProcessingJob(buildingId);
        if (job && now - job.startedAt >= job.duration) {
            completeProcessingJob(buildingId, job);
        }
        if (!getProcessingJob(buildingId) && processingAuto[buildingId]) {
            const recipeId = PROCESSING_BUILDING_CONFIG[buildingId].recipes.find(canCraftRecipe);
            if (canCraftRecipe(recipeId)) startRecipeProcessing(recipeId, getRecipeBatchAmount(recipeId));
        }
    }
}

window.toggleProcessingAuto = function(buildingId) {
    processingAuto[buildingId] = !processingAuto[buildingId];
    effectText = `${PROCESSING_BUILDING_CONFIG[buildingId].name} 自动加工${processingAuto[buildingId] ? '开启' : '关闭'}`;
    effectAlpha = 1.0;
    saveGame();
};

window.sellItem = function(itemId) {
    const inputElement = document.getElementById(`sell-amt-${itemId}`);
    if (!inputElement) {
        sellItemAmount(itemId, 1);
        return;
    }
    let sellAmount = parseInt(inputElement.value, 10);
    if (isNaN(sellAmount) || sellAmount <= 0) return;
    if (sellAmount > inventory[itemId]) {
        sellAmount = inventory[itemId];
        inputElement.value = sellAmount;
    }
    if (sellAmount > 0) {
        const config = CROP_CONFIG[itemId];
        if (!config) return;
        const unitPrice = getMarketSellUnitPrice(itemId);
        coins += sellAmount * unitPrice;
        inventory[itemId] -= sellAmount;
        updateUI();
        saveGame();
    }
};

function sellItemAmount(itemId, amount) {
    if (!isMarketItemUnlocked(itemId)) return;
    const config = CROP_CONFIG[itemId];
    if (!config) return;
    let sellAmount = parseInt(amount, 10);
    if (isNaN(sellAmount) || sellAmount <= 0) return;
    sellAmount = Math.min(sellAmount, inventory[itemId] || 0);
    if (sellAmount <= 0) return;
    const unitPrice = getMarketSellUnitPrice(itemId);
    coins += sellAmount * unitPrice;
    inventory[itemId] -= sellAmount;
    effectText = `📈 卖出 ${config.name} x${sellAmount}，获得 ${sellAmount * unitPrice} 币`;
    effectAlpha = 1.0;
    playSound('sell');
    updateUI();
    saveGame();
}

function getMarketSellUnitPrice(itemId) {
    const config = CROP_CONFIG[itemId];
    if (!config || !Number.isFinite(config.basePrice) || config.basePrice <= 0) return 0;
    const marketPrice = marketState[itemId]?.price;
    const base = Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : config.basePrice;
    const multiplier = typeof getCategoryPriceMultiplier === 'function' ? getCategoryPriceMultiplier(itemId) : 1;
    return Math.max(1, Math.floor(base * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1)));
}

function isMarketRecipeOutput(itemId) {
    const recipes = typeof RECIPE_CONFIG !== 'undefined' ? RECIPE_CONFIG : {};
    return Object.values(recipes).some(recipe => recipe.output === itemId);
}

function isMarketAnimalProduct(itemId) {
    const buildings = typeof RANCH_BUILDING_CONFIG !== 'undefined' ? RANCH_BUILDING_CONFIG : {};
    return Object.values(buildings).some(building => building.product === itemId);
}

function isMarketItemBuyable(itemId) {
    const config = CROP_CONFIG[itemId];
    if (!config || config.noSell || !Number.isFinite(config.basePrice) || config.basePrice <= 0) return false;
    if (!isMarketItemUnlocked(itemId)) return false;
    if (!isItemUnlocked(itemId)) return false;
    if (MARKET_BUY_BLOCKED_ITEMS.has(itemId)) return false;
    if (config.variantOf || config.rarity || config.hidden) return false;
    return config.seedPrice !== undefined
        || isMarketRecipeOutput(itemId)
        || isMarketAnimalProduct(itemId)
        || itemId === 'wood';
}

function getMarketBuyMultiplier(itemId) {
    if (isMarketRecipeOutput(itemId)) return 6;
    if (isMarketAnimalProduct(itemId) || itemId === 'wood') return 5;
    return 4;
}

function getMarketBuyUnitPrice(itemId) {
    if (!isMarketItemBuyable(itemId)) return 0;
    const sellPrice = getMarketSellUnitPrice(itemId);
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) return 0;
    return Math.max(sellPrice + 1, Math.ceil(sellPrice * getMarketBuyMultiplier(itemId)));
}

function getMarketBuyMaxAffordable(itemId) {
    const unitPrice = getMarketBuyUnitPrice(itemId);
    const balance = Number(coins);
    if (!unitPrice || !Number.isFinite(balance) || balance <= 0) return 0;
    return Math.max(0, Math.floor(balance / unitPrice));
}

function normalizeMarketBuyAmount(itemId, amount) {
    const affordable = getMarketBuyMaxAffordable(itemId);
    if (amount === 'max') return affordable;
    const requested = Math.floor(Number(amount));
    if (!Number.isFinite(requested) || requested <= 0) return 0;
    return requested <= affordable ? requested : 0;
}

function buyItemAmount(itemId, amount) {
    if (!isMarketItemBuyable(itemId)) return false;
    const config = CROP_CONFIG[itemId];
    const unitPrice = getMarketBuyUnitPrice(itemId);
    const buyAmount = normalizeMarketBuyAmount(itemId, amount);
    const currentCoins = Number(coins);
    const currentStock = Number(inventory[itemId]);
    if (!config || !unitPrice || buyAmount <= 0) return false;
    if (!Number.isFinite(currentCoins) || currentCoins < unitPrice * buyAmount) return false;
    if (!Number.isFinite(currentStock) || currentStock < 0) inventory[itemId] = 0;
    coins = currentCoins - unitPrice * buyAmount;
    inventory[itemId] = (Number(inventory[itemId]) || 0) + buyAmount;
    effectText = `市场买入 ${config.name} x${buyAmount}，花费 ${unitPrice * buyAmount} 币`;
    effectAlpha = 1.0;
    playSound('sell');
    recordDiary(`市场买入 ${config.name} x${buyAmount}`);
    updateUI();
    saveGame();
    return true;
}

function getRecipeByOutput(itemId) {
    return Object.values(RECIPE_CONFIG).find(recipe => recipe.output === itemId);
}

function getTaskRequirements(task) {
    if (!task) return [];
    const sourceItems = Array.isArray(task.items) && task.items.length
        ? task.items
        : [{ item: task.item, amount: task.amount }];
    return sourceItems.map(entry => ({
        item: entry.item,
        amount: Math.max(1, Math.floor(Number(entry.amount) || 1))
    })).filter(entry => CROP_CONFIG[entry.item]);
}

function isTaskDeliverable(task) {
    const requirements = getTaskRequirements(task);
    return requirements.length > 0 && requirements.every(entry => (inventory[entry.item] || 0) >= entry.amount);
}

function getTaskRequirementLabel(task, includeStock = true) {
    return getTaskRequirements(task).map(entry => {
        const config = CROP_CONFIG[entry.item];
        const stock = inventory[entry.item] || 0;
        return includeStock ? `${config.icon} ${config.name} ${stock}/${entry.amount}` : `${config.icon} ${config.name} x${entry.amount}`;
    }).join(' + ');
}

function generateTask() {
    const orderPool = [
        ...getCropIds(),
        ...Object.values(RECIPE_CONFIG).map(recipe => recipe.output)
    ];
    const unlockedItems = orderPool.filter(key => {
        const config = CROP_CONFIG[key];
        if (!config) return false;
        if (config.noSell || config.basePrice <= 0) return false;
        if (!isCollected(key)) return false;
        const recipe = getRecipeByOutput(key);
        if (recipe) return getProcessingBuildingLevel(recipe.building) > 0 && isCollected(key);
        if (config.reqLevel && playerLevel + 2 < config.reqLevel) return false;
        return true;
    });
    if (unlockedItems.length === 0) unlockedItems.push('carrot');
    const maxKinds = playerLevel >= 18 ? 3 : playerLevel >= 6 ? 2 : 1;
    const kindCount = Math.min(maxKinds, unlockedItems.length, 1 + Math.floor(Math.random() * maxKinds));
    const shuffled = [...unlockedItems].sort(() => Math.random() - 0.5);
    const items = shuffled.slice(0, kindCount).map(item => {
        const processed = getRecipeByOutput(item);
        const stock = inventory[item] || 0;
        const baseAmount = processed ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 11) + 10;
        const levelBonus = Math.floor(playerLevel / (processed ? 6 : 3));
        const targetAmount = baseAmount + levelBonus + Math.floor(stock * 0.18);
        return { item, amount: Math.max(1, Math.min(targetAmount, Math.max(baseAmount + levelBonus, stock + 12))) };
    });
    const baseValue = items.reduce((sum, entry) => sum + entry.amount * CROP_CONFIG[entry.item].basePrice, 0);
    const premium = 3.4 + kindCount * 0.55 + Math.random() * 1.1;
    const reward = Math.floor(baseValue * premium);
    const primary = items[0];
    return { id: Math.random().toString(36).substr(2, 9), item: primary.item, amount: primary.amount, items, reward, exp: Math.floor(reward / 2) };
}

function normalizeOrderSlots() {
    if (!Array.isArray(tasks)) tasks = [];
    tasks = tasks.slice(0, 3);
    while (tasks.length < 3) tasks.push(null);
    if (!orderState || typeof orderState !== 'object') orderState = { nextRefreshAt: 0 };
}

function fillEmptyOrderSlots() {
    normalizeOrderSlots();
    let changed = false;
    for (let i = 0; i < 3; i++) {
        if (tasks[i]) continue;
        tasks[i] = generateTask();
        changed = true;
    }
    return changed;
}

function getOrderRefreshLeftMs(now = Date.now()) {
    normalizeOrderSlots();
    if (!isFixedOrderRefreshAt(orderState.nextRefreshAt)) orderState.nextRefreshAt = getNextFixedOrderRefreshAt(now);
    return Math.max(0, orderState.nextRefreshAt - now);
}

function formatOrderRefreshTime(ms = getOrderRefreshLeftMs()) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getOrderRefreshClockLabel(now = Date.now()) {
    normalizeOrderSlots();
    if (!isFixedOrderRefreshAt(orderState.nextRefreshAt)) orderState.nextRefreshAt = getNextFixedOrderRefreshAt(now);
    const date = new Date(orderState.nextRefreshAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function refreshOrderBoard(force = false) {
    normalizeOrderSlots();
    const now = Date.now();
    if (!isFixedOrderRefreshAt(orderState.nextRefreshAt)) orderState.nextRefreshAt = getNextFixedOrderRefreshAt(now);
    const hasActiveTask = tasks.some(Boolean);
    if (!force && hasActiveTask && now < (orderState.nextRefreshAt || 0)) return false;
    const changed = fillEmptyOrderSlots();
    orderState.nextRefreshAt = getNextFixedOrderRefreshAt(now);
    return changed;
}

function initTasks() {
    normalizeOrderSlots();
    if (!isFixedOrderRefreshAt(orderState.nextRefreshAt)) orderState.nextRefreshAt = getNextFixedOrderRefreshAt(Date.now());
    fillEmptyOrderSlots();
}

function updateOrderRefresh(now = Date.now()) {
    normalizeOrderSlots();
    if (now >= (orderState.nextRefreshAt || 0)) {
        const changed = fillEmptyOrderSlots();
        orderState.nextRefreshAt = getNextFixedOrderRefreshAt(now);
        if (changed) saveGame();
        if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
    }
}

window.deliverTask = function(index) {
    const task = tasks[index];
    const requirements = getTaskRequirements(task);
    if (!task || !requirements.length) {
        tasks[index] = null;
        saveGame();
        return;
    }
    if (isTaskDeliverable(task)) {
        requirements.forEach(entry => {
            inventory[entry.item] -= entry.amount;
        });
        coins += task.reward;
        effectText = `✅ 完成订单！赚取 ${typeof formatCoins === 'function' ? formatCoins(task.reward) : `${task.reward}币`}！`;
        effectAlpha = 1.0;
        playSound('order');
        stats.ordersCompleted = (stats.ordersCompleted || 0) + 1;
        recordDiary(`完成订单：${getTaskRequirementLabel(task, false)}，收入 ${typeof formatCoins === 'function' ? formatCoins(task.reward) : `${task.reward}币`}`);
        addExp(task.exp);
        tasks[index] = null;
        updateUI();
        saveGame();
    }
};

window.refreshOrderBoardNow = function() {
    normalizeOrderSlots();
    const hasEmptySlot = tasks.some(task => !task);
    if (!hasEmptySlot) {
        effectText = '没有空订单位';
        effectAlpha = 1.0;
        updateUI();
        if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
        return false;
    }
    if (!refreshOrderBoard(false)) return false;
    effectText = '订单看板已补充';
    effectAlpha = 1.0;
    updateUI();
    saveGame();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
    return true;
};
