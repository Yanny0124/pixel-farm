// ==========================================
// Logic/Visitors: 访客任务链与入驻状态
// ==========================================
function ensureVisitorState(id) {
    if (!visitorState[id]) {
        visitorState[id] = { step: 0, resident: false, arrived: false, lastTalkIndex: 0 };
    }
    return visitorState[id];
}

function getVisitorIds() {
    return Object.keys(VISITOR_CONFIG);
}

function isVisitorUnlocked(id) {
    const config = VISITOR_CONFIG[id];
    const state = ensureVisitorState(id);
    if (!config) return false;
    if (state.arrived || state.resident) return true;
    if (config.unlock()) {
        state.arrived = true;
        return true;
    }
    return false;
}

function getVisitorProgress(id) {
    const config = VISITOR_CONFIG[id];
    const state = ensureVisitorState(id);
    if (!config) return { state, task: null, finished: false };
    const finished = state.resident || state.step >= config.chain.length;
    return { state, task: finished ? null : config.chain[state.step], finished };
}

function formatVisitorNeed(need) {
    return Object.entries(need).map(([itemId, amount]) => {
        if (itemId === 'coins') return `金币 ${coins}/${amount}`;
        const config = CROP_CONFIG[itemId];
        return `${config?.icon || '□'}${config?.name || itemId} ${inventory[itemId] || 0}/${amount}`;
    }).join('  ');
}

function canDeliverVisitorTask(id) {
    if (!isVisitorUnlocked(id)) return false;
    const progress = getVisitorProgress(id);
    if (progress.finished || !progress.task) return false;
    return Object.entries(progress.task.need).every(([itemId, amount]) => itemId === 'coins' ? coins >= amount : (inventory[itemId] || 0) >= amount);
}

function getVisitorStatusText(id) {
    const config = VISITOR_CONFIG[id];
    if (!isVisitorUnlocked(id)) return config.unlockHint;
    const progress = getVisitorProgress(id);
    if (progress.finished) return '已入驻农场';
    return `${progress.task.title}：${formatVisitorNeed(progress.task.need)}`;
}

function getVisitorTalkLine(id) {
    const config = VISITOR_CONFIG[id];
    const progress = getVisitorProgress(id);
    if (!isVisitorUnlocked(id)) return config.unlockHint;
    if (!progress.finished && progress.task) return progress.task.text;
    progress.state.lastTalkIndex++;
    return config.daily[Math.floor(Math.random() * config.daily.length)];
}

window.deliverVisitorTask = function(id) {
    if (!canDeliverVisitorTask(id)) return;
    const config = VISITOR_CONFIG[id];
    const progress = getVisitorProgress(id);
    const task = progress.task;
    for (const [itemId, amount] of Object.entries(task.need)) {
        if (itemId === 'coins') coins -= amount;
        else inventory[itemId] -= amount;
    }
    applyVisitorReward(task.reward || {});
    progress.state.step++;
    const becameResident = progress.state.step >= config.chain.length;
    if (becameResident) progress.state.resident = true;
    effectText = becameResident ? `${config.icon} ${config.name} 入驻农场！` : `${config.icon} 完成访客委托：${task.title}`;
    effectAlpha = 1.0;
    playSound(becameResident ? 'miracle' : 'order');
    recordDiary(becameResident ? `${config.name}完成任务链并入驻农场` : `交付访客委托：${config.name} - ${task.title}`);
    checkSeedUnlocks(false);
    updateUI();
    saveGame();
};

function applyVisitorReward(reward) {
    if (reward.coins) coins += reward.coins;
    if (reward.exp) addExp(reward.exp);
    if (reward.talentPoints) talentPoints += reward.talentPoints;
    if (reward.unlockSeed) {
        effectText = `${CROP_CONFIG[reward.unlockSeed].icon} 获得新种子：${CROP_CONFIG[reward.unlockSeed].name}`;
    }
    if (reward.unlockVariant) {
        const [cropType, variantId] = reward.unlockVariant.split(':');
        markVariantCollected(cropType, variantId);
    }
    if (reward.variantBonus) collectionBonuses.variantChance = Math.max(collectionBonuses.variantChance || 0, reward.variantBonus);
    if (reward.buildingDiscount) collectionBonuses.buildingDiscount = Math.max(collectionBonuses.buildingDiscount || 0, reward.buildingDiscount);
    if (reward.miracleDiscount) collectionBonuses[reward.miracleDiscount] = true;
    if (reward.codexNote) recordDiary(`阿米尔提到：${reward.codexNote}`);
    if (reward.endingClue) endingState[reward.endingClue] = true;
}

window.talkVisitor = function(id) {
    if (!isVisitorUnlocked(id)) return;
    const config = VISITOR_CONFIG[id];
    const progress = getVisitorProgress(id);
    effectText = `${config.icon} ${config.name}：${getVisitorTalkLine(id)}`;
    effectAlpha = 1.0;
    stats.visitorTalks = (stats.visitorTalks || 0) + 1;
    if (id === 'leo' && progress.finished) stats.leoRandomTalks = (stats.leoRandomTalks || 0) + 1;
    checkStoryUnlocks(false);
    checkSeedUnlocks(false);
    saveGame();
};
