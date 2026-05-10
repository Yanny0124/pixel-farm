// ==========================================
// Logic/Economy: 市场与订单
// ==========================================
function updateMarket() {
    for (const key in marketState) {
        const config = CROP_CONFIG[key];
        if (!config) continue;
        const base = config.basePrice;
        if (!base) continue;
        const state = marketState[key] || (marketState[key] = { price: base, trend: 0 });
        const oldPrice = state.price;
        if (!Number.isFinite(state.price) || state.price <= 0) state.price = base;
        if (!Number.isFinite(state.trend)) state.trend = 0;
        state.trend += (Math.random() - 0.5) * 1.5;
        state.trend -= ((state.price - base) / base) * 2.0;
        state.trend = Math.max(-3, Math.min(3, state.trend));
        let newPrice = Math.round(state.price + state.trend + (Math.random() - 0.5));
        newPrice = Math.max(Math.max(1, Math.floor(base * 0.2)), Math.min(Math.ceil(base * 3.0), newPrice));
        state.price = newPrice;

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
        const unitPrice = Math.max(1, Math.floor((marketState[itemId]?.price || config.basePrice || 0) * getCategoryPriceMultiplier(itemId)));
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
    const unitPrice = Math.max(1, Math.floor((marketState[itemId]?.price || config.basePrice || 0) * getCategoryPriceMultiplier(itemId)));
    coins += sellAmount * unitPrice;
    inventory[itemId] -= sellAmount;
    effectText = `📈 卖出 ${config.name} x${sellAmount}，获得 ${sellAmount * unitPrice} 币`;
    effectAlpha = 1.0;
    playSound('sell');
    updateUI();
    saveGame();
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
        if (RECIPE_CONFIG[key]) return getProcessingBuildingLevel(RECIPE_CONFIG[key].building) > 0 && isCollected(key);
        if (config.reqLevel && playerLevel + 2 < config.reqLevel) return false;
        return true;
    });
    if (unlockedItems.length === 0) unlockedItems.push('carrot');
    const item = unlockedItems[Math.floor(Math.random() * unlockedItems.length)];
    const processed = RECIPE_CONFIG[item];
    const stock = inventory[item] || 0;
    const baseAmount = processed ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 6) + 3;
    const amount = Math.max(1, Math.min(baseAmount + Math.floor(playerLevel / 4), Math.max(baseAmount, stock + 6)));
    const premium = 1.8 + Math.random() * 0.7;
    const reward = Math.floor(amount * CROP_CONFIG[item].basePrice * premium);
    return { id: Math.random().toString(36).substr(2, 9), item, amount, reward, exp: Math.floor(reward / 2) };
}

function initTasks() {
    while (tasks.length < 3) tasks.push(generateTask());
}

window.deliverTask = function(index) {
    const task = tasks[index];
    if (!task || !CROP_CONFIG[task.item]) {
        tasks[index] = generateTask();
        saveGame();
        return;
    }
    if (inventory[task.item] >= task.amount) {
        inventory[task.item] -= task.amount;
        coins += task.reward;
        effectText = `✅ 完成订单！赚取 ${task.reward} 币！`;
        effectAlpha = 1.0;
        playSound('order');
        stats.ordersCompleted = (stats.ordersCompleted || 0) + 1;
        recordDiary(`完成订单：${CROP_CONFIG[task.item].name} x${task.amount}，收入 ${task.reward}币`);
        addExp(task.exp);
        tasks[index] = generateTask();
        updateUI();
        saveGame();
    }
};
