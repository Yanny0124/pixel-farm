// ==========================================
// Logic/Miracles: 奇迹阶段、材料提交、结局后日谈与新的年轮
// ==========================================
function ensureMiracleState(id) {
    if (!miracleState[id]) miracleState[id] = { stage: 0, completed: false };
    return miracleState[id];
}

function syncMiracleBonuses() {
    miracleBonuses.irrigation = !!miracleState.irrigation?.completed;
    miracleBonuses.barn = !!miracleState.barn?.completed;
}

function getMiracleIds() {
    return Object.keys(MIRACLE_CONFIG);
}

function getMiracleStage(id) {
    const config = MIRACLE_CONFIG[id];
    const state = ensureMiracleState(id);
    if (!config) return null;
    return state.completed ? null : config.stages[state.stage];
}

function getMiracleStageIndex(id) {
    const state = ensureMiracleState(id);
    return state.completed ? (MIRACLE_CONFIG[id]?.stages.length || state.stage) : state.stage;
}

function formatNeed(need) {
    return Object.entries(need).map(([itemId, amount]) => {
        const needAmount = getMiracleNeedAmount(itemId, amount);
        if (itemId === 'coins') return `金币 ${coins}/${needAmount}`;
        const config = CROP_CONFIG[itemId];
        return `${config.icon}${config.name} ${inventory[itemId] || 0}/${needAmount}`;
    }).join('  ');
}

function hasNeed(need) {
    return Object.entries(need).every(([itemId, amount]) => {
        const needAmount = getMiracleNeedAmount(itemId, amount);
        if (itemId === 'coins') return coins >= needAmount;
        return (inventory[itemId] || 0) >= needAmount;
    });
}

function consumeNeed(need) {
    for (const [itemId, amount] of Object.entries(need)) {
        const needAmount = getMiracleNeedAmount(itemId, amount);
        if (itemId === 'coins') coins -= needAmount;
        else inventory[itemId] -= needAmount;
    }
}

function getMiracleNeedAmount(itemId, amount) {
    if (itemId === 'wood' && collectionBonuses.irrigationWood) return Math.ceil(amount * 0.8);
    if (itemId === 'hardwood' && collectionBonuses.barnWood) return Math.ceil(amount * 0.7);
    return amount;
}

function getMiracleProgressText(id) {
    const config = MIRACLE_CONFIG[id];
    const state = ensureMiracleState(id);
    if (state.completed) return `已完成：${config.effect}`;
    const stage = config.stages[state.stage];
    return `阶段 ${state.stage + 1}/${config.stages.length}：${stage.title}`;
}

window.submitMiracleStage = function(id) {
    const config = MIRACLE_CONFIG[id];
    if (!config) return;
    const state = ensureMiracleState(id);
    if (state.completed) return;
    const stage = config.stages[state.stage];
    if (!hasNeed(stage.need)) return;
    consumeNeed(stage.need);
    state.stage++;
    const completed = state.stage >= config.stages.length;
    if (completed) state.completed = true;
    syncMiracleBonuses();
    effectText = completed ? `${config.icon} ${config.name} 完成！` : `${config.icon} ${config.name} 推进到阶段 ${state.stage + 1}`;
    effectAlpha = 1.0;
    playSound(completed ? 'miracle' : 'build');
    recordDiary(completed ? `奇迹完成：${config.name}` : `奇迹建设：${config.name} - ${stage.title}`);
    checkEndingUnlocks();
    updateUI();
    saveGame();
};

function clonePlain(value, fallback) {
    try {
        return JSON.parse(JSON.stringify(value ?? fallback));
    } catch (error) {
        return fallback;
    }
}

function ensureEndingStateShape() {
    if (!endingState) endingState = { unlocked: {}, read: {} };
    endingState.unlocked = Object.assign({}, endingState.unlocked);
    endingState.read = Object.assign({}, endingState.read);
    endingState.unlockedAt = Object.assign({}, endingState.unlockedAt);
    endingState.claimedRewards = Object.assign({}, endingState.claimedRewards);
    endingState.claimedPostGoals = Object.assign({}, endingState.claimedPostGoals);
    endingState.archive = Object.assign({}, endingState.archive, endingState.unlocked);
    endingState.archiveRead = Object.assign({}, endingState.archiveRead, endingState.read);
    endingState.afterEnding = Object.assign({ active: false, currentEndingId: null, startedAt: 0 }, endingState.afterEnding);
    endingState.yearRing = Object.assign({ count: 0, history: [] }, endingState.yearRing);
    endingState.yearRing.history = Array.isArray(endingState.yearRing.history) ? endingState.yearRing.history : [];
    return endingState;
}

function getEndingIds() {
    return Object.keys(ENDING_CONFIG || {});
}

function getUnlockedEndingIds() {
    ensureEndingStateShape();
    return getEndingIds().filter(id => !!endingState.unlocked[id]);
}

function getArchivedEndingIds() {
    ensureEndingStateShape();
    return getEndingIds().filter(id => !!endingState.archive[id]);
}

function getUnlockedEndingCount() {
    return getUnlockedEndingIds().length;
}

function getArchivedEndingCount() {
    return getArchivedEndingIds().length;
}

function getEndingCount() {
    return getEndingIds().length;
}

function areAllCurrentEndingsUnlocked() {
    return getEndingIds().every(id => !!endingState.unlocked?.[id]);
}

function checkEndingUnlocks(silent = false) {
    ensureEndingStateShape();
    let changed = false;
    for (const [id, ending] of Object.entries(ENDING_CONFIG)) {
        if (!endingState.unlocked[id] && ending.condition()) {
            endingState.unlocked[id] = true;
            endingState.archive[id] = true;
            endingState.unlockedAt[id] = Date.now();
            changed = true;
            recordDiary?.(`解锁结局：${ending.title}`, true);
            if (!silent) {
                effectText = `${ending.icon} 解锁结局：${ending.title}`;
                effectAlpha = 1.0;
                playSound?.('miracle');
            }
        }
    }
    return changed;
}

function grantReward(reward = {}) {
    if (reward.coins) coins += reward.coins;
    if (reward.exp) addExp(reward.exp);
    if (reward.talentPoints) talentPoints += reward.talentPoints;
}

function formatReward(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins}币`);
    if (reward.exp) parts.push(`${reward.exp}EXP`);
    if (reward.talentPoints) parts.push(`天赋点x${reward.talentPoints}`);
    return parts.length ? parts.join(' + ') : '无奖励';
}

function getEndingRewardText(id) {
    return formatReward(ENDING_CONFIG[id]?.reward || {});
}

function canClaimEndingReward(id) {
    ensureEndingStateShape();
    return !!endingState.unlocked[id] && !!ENDING_CONFIG[id]?.reward && !endingState.claimedRewards[id];
}

window.claimEndingReward = function(id) {
    ensureEndingStateShape();
    if (!canClaimEndingReward(id)) return;
    const ending = ENDING_CONFIG[id];
    endingState.claimedRewards[id] = true;
    grantReward(ending.reward);
    effectText = `${ending.icon} 终章奖励：${formatReward(ending.reward)}`;
    effectAlpha = 1.0;
    recordDiary?.(`领取结局奖励：${ending.title}`);
    checkEndingUnlocks(true);
    updateUI?.();
    window.refreshBitcnDomUi?.(true);
    saveGame();
};

window.markEndingRead = function(id) {
    ensureEndingStateShape();
    if (!endingState.unlocked[id] && !endingState.archive[id]) return;
    endingState.read[id] = true;
    endingState.archiveRead[id] = true;
    saveGame();
};

window.continueAfterEnding = function(id) {
    ensureEndingStateShape();
    if (!endingState.unlocked[id]) return;
    endingState.afterEnding = {
        active: true,
        currentEndingId: id,
        startedAt: Date.now()
    };
    endingState.read[id] = true;
    endingState.archiveRead[id] = true;
    effectText = `${ENDING_CONFIG[id].icon} 后日谈开始：继续经营这片土地`;
    effectAlpha = 1.0;
    recordDiary?.(`进入后日谈：${ENDING_CONFIG[id].title}`, true);
    saveGame();
    updateUI?.();
    window.refreshBitcnDomUi?.(true);
};

function getPostEndingGoalIds() {
    return Object.keys(typeof POST_ENDING_GOALS !== 'undefined' ? POST_ENDING_GOALS : {});
}

function isPostEndingGoalUnlocked(id) {
    const goal = POST_ENDING_GOALS?.[id];
    if (!goal) return false;
    return !!goal.condition();
}

function canClaimPostEndingGoal(id) {
    ensureEndingStateShape();
    return isPostEndingGoalUnlocked(id) && !endingState.claimedPostGoals[id];
}

function getPostEndingGoalProgressText(id) {
    const goal = POST_ENDING_GOALS?.[id];
    if (!goal) return '';
    return typeof goal.progressText === 'function' ? goal.progressText() : '';
}

window.claimPostEndingGoal = function(id) {
    ensureEndingStateShape();
    const goal = POST_ENDING_GOALS?.[id];
    if (!goal || !canClaimPostEndingGoal(id)) return;
    endingState.claimedPostGoals[id] = true;
    grantReward(goal.reward);
    effectText = `${goal.icon} 终章目标完成：${goal.title}`;
    effectAlpha = 1.0;
    recordDiary?.(`完成终章目标：${goal.title}`);
    checkEndingUnlocks(true);
    updateUI?.();
    window.refreshBitcnDomUi?.(true);
    saveGame();
};

function getYearRingCount() {
    ensureEndingStateShape();
    return Math.max(0, Number(endingState.yearRing?.count || 0));
}

function getYearRingStacks() {
    const maxStacks = YEAR_RING_CONFIG?.maxStacks || 5;
    return Math.min(maxStacks, getYearRingCount());
}

function getYearRingBonus(key) {
    const stacks = getYearRingStacks();
    const perStack = YEAR_RING_CONFIG?.perStack?.[key] || 0;
    return stacks * perStack;
}

function getYearRingBlessingSummary() {
    const stacks = getYearRingStacks();
    if (stacks <= 0) return '暂无年轮祝福。全结局后可开启新的年轮。';
    const growth = Math.round(getYearRingBonus('growth') * 100);
    const price = Math.round(getYearRingBonus('price') * 100);
    const exp = Math.round(getYearRingBonus('exp') * 100);
    const processing = Math.round(getYearRingBonus('processing') * 100);
    const startingCoins = getYearRingBonus('startingCoins');
    return `第 ${getYearRingCount()} 个年轮：作物生长 +${growth}%｜售价 +${price}%｜经验 +${exp}%｜加工速度 +${processing}%｜初始金币 +${startingCoins}`;
}

function canStartNewYearCycle() {
    ensureEndingStateShape();
    return areAllCurrentEndingsUnlocked();
}

function getNewYearCycleRequirementText() {
    if (canStartNewYearCycle()) return '已满足：本轮全部结局已归档。';
    return `还需完成本轮结局 ${getUnlockedEndingCount()}/${getEndingCount()}。`;
}

window.startNewYearCycle = function() {
    ensureEndingStateShape();
    if (!canStartNewYearCycle()) {
        effectText = getNewYearCycleRequirementText();
        effectAlpha = 1.0;
        return;
    }
    const nextCount = Math.min((YEAR_RING_CONFIG?.maxStacks || 5), getYearRingCount() + 1);
    const confirmed = confirm(`开启新的年轮？\n\n主要经营进度会重置，永久归档、已读信件、图鉴记录和年轮祝福会保留。\n\n下一轮祝福：${getYearRingBlessingSummary()}\n\n这不是撤销按钮，人类总爱点错，所以我多问一句。`);
    if (!confirmed) return;

    const preservedEnding = ensureEndingStateShape();
    const archive = Object.assign({}, preservedEnding.archive, preservedEnding.unlocked);
    const archiveRead = Object.assign({}, preservedEnding.archiveRead, preservedEnding.read);
    const claimedPostGoals = Object.assign({}, preservedEnding.claimedPostGoals);
    const history = Array.isArray(preservedEnding.yearRing.history) ? preservedEnding.yearRing.history.slice(-12) : [];
    history.push({ at: Date.now(), fromEndings: getUnlockedEndingIds() });

    const preservedCollection = clonePlain(collection, { items: {}, variants: {}, claimedRewards: {}, claimedSetRewards: {} });
    const preservedCollectionBonuses = clonePlain(collectionBonuses, createDefaultCollectionBonuses());
    const preservedStoryState = clonePlain(storyState, { unlocked: {}, read: {} });
    const preservedTutorialState = clonePlain(tutorialState, { journalOpened: true });
    const preservedDiaryEntries = Array.isArray(farmDiary?.entries) ? farmDiary.entries.slice(-24) : [];

    resetRuntimeState();

    collection = preservedCollection;
    collection.items = Object.assign({}, collection.items);
    collection.variants = Object.assign({}, collection.variants);
    collection.claimedRewards = Object.assign({}, collection.claimedRewards);
    collection.claimedSetRewards = Object.assign({}, collection.claimedSetRewards);
    collectionBonuses = Object.assign(createDefaultCollectionBonuses(), preservedCollectionBonuses);
    storyState = Object.assign({ unlocked: {}, read: {} }, preservedStoryState);
    tutorialState = Object.assign({ journalOpened: true }, preservedTutorialState);
    farmDiary.entries = preservedDiaryEntries;

    endingState = {
        unlocked: {},
        read: {},
        unlockedAt: {},
        claimedRewards: {},
        claimedPostGoals,
        archive,
        archiveRead,
        afterEnding: { active: false, currentEndingId: null, startedAt: 0 },
        yearRing: {
            count: nextCount,
            history,
            lastStartedAt: Date.now()
        }
    };

    coins = 1000 + getYearRingBonus('startingCoins');
    effectText = `🕰️ 新的年轮开始：${getYearRingBlessingSummary()}`;
    effectAlpha = 1.0;
    recordDiary?.(`开启新的年轮：第 ${nextCount} 轮。${getYearRingBlessingSummary()}`, true);
    checkSeedUnlocks(true);
    checkStoryUnlocks(true);
    checkEndingUnlocks(true);
    updateUI?.();
    window.refreshBitcnDomUi?.(true);
    saveGame();
};

function installYearRingBlessingPatches() {
    if (window.__yearRingBlessingPatchesInstalled) return;
    window.__yearRingBlessingPatchesInstalled = true;

    const baseGetGrowthMultiplier = window.getGrowthMultiplier || getGrowthMultiplier;
    const wrappedGrowth = function getGrowthMultiplierWithYearRing() {
        return baseGetGrowthMultiplier() * (1 + getYearRingBonus('growth'));
    };
    try { getGrowthMultiplier = window.getGrowthMultiplier = wrappedGrowth; } catch (error) { window.getGrowthMultiplier = wrappedGrowth; }

    const baseGetCategoryPriceMultiplier = window.getCategoryPriceMultiplier || getCategoryPriceMultiplier;
    const wrappedPrice = function getCategoryPriceMultiplierWithYearRing(itemId) {
        return baseGetCategoryPriceMultiplier(itemId) * (1 + getYearRingBonus('price'));
    };
    try { getCategoryPriceMultiplier = window.getCategoryPriceMultiplier = wrappedPrice; } catch (error) { window.getCategoryPriceMultiplier = wrappedPrice; }

    const baseAddExp = window.addExp || addExp;
    const wrappedAddExp = function addExpWithYearRing(amount) {
        const bonusAmount = Math.max(0, Math.round((amount || 0) * (1 + getYearRingBonus('exp'))));
        return baseAddExp(bonusAmount);
    };
    try { addExp = window.addExp = wrappedAddExp; } catch (error) { window.addExp = wrappedAddExp; }

    if (typeof getRecipeDuration === 'function') {
        const baseGetRecipeDuration = window.getRecipeDuration || getRecipeDuration;
        const wrappedDuration = function getRecipeDurationWithYearRing(recipeId, amount = 1) {
            const base = baseGetRecipeDuration(recipeId, amount);
            return Math.max(2500, Math.round(base * (1 - Math.min(0.45, getYearRingBonus('processing')))));
        };
        try { getRecipeDuration = window.getRecipeDuration = wrappedDuration; } catch (error) { window.getRecipeDuration = wrappedDuration; }
    }
}

installYearRingBlessingPatches();
