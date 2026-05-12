// ==========================================
// Logic/Visitors: 访客任务链与入驻状态
// ==========================================
function ensureVisitorState(id) {
    if (!visitorState[id]) {
        visitorState[id] = { step: 0, resident: false, arrived: false, lastTalkIndex: 0 };
    }
    if (!stats.visitorArrival) stats.visitorArrival = {};
    if (!stats.visitorArrival[id]) stats.visitorArrival[id] = { eligibleSeconds: 0, checks: 0, lastChance: 0 };
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

function hasVisitorArrivedBySchedule(id) {
    const state = ensureVisitorState(id);
    return !!(state.arrived || state.resident);
}

function getVisitorArrivalInfo(id) {
    ensureVisitorState(id);
    return stats.visitorArrival?.[id] || { eligibleSeconds: 0, checks: 0, lastChance: 0 };
}

function getAmirArrivalChance() {
    const info = getVisitorArrivalInfo('amir');
    const eligibleMinutes = Math.floor((info.eligibleSeconds || 0) / 60);
    if (eligibleMinutes >= 30) return 1;
    return Math.min(0.8, 0.25 + Math.floor(eligibleMinutes / 5) * 0.1);
}

function arriveVisitor(id, reason = '') {
    const state = ensureVisitorState(id);
    if (state.arrived || state.resident) return false;
    state.arrived = true;
    const config = VISITOR_CONFIG[id];
    if (config) {
        effectText = `${config.icon} ${config.name} 到访了农场`;
        effectAlpha = 1.0;
        recordDiary(`${config.name}到访农场${reason ? `：${reason}` : ''}`, true);
        playSound('talk');
    }
    if (window.refreshBitcnDomUi) window.refreshBitcnDomUi();
    saveGame();
    return true;
}

function updateVisitorArrivals(deltaSeconds) {
    ensureVisitorState('amir');
    const amirState = visitorState.amir;
    if (amirState.arrived || amirState.resident) return;
    if ((stats.totalPlaySeconds || 0) < 90 * 60) return;

    const info = stats.visitorArrival.amir;
    if (!info.migratedLegacy && (stats.totalPlaySeconds || 0) >= 120 * 60) {
        info.eligibleSeconds = Math.max(info.eligibleSeconds || 0, 30 * 60);
        info.migratedLegacy = true;
    }
    info.eligibleSeconds = (info.eligibleSeconds || 0) + deltaSeconds;
    info.rollTimer = (info.rollTimer || 0) + deltaSeconds;
    if (info.eligibleSeconds >= 30 * 60) {
        info.lastChance = 1;
        arriveVisitor('amir', '90分钟后等待满30分钟保底');
        return;
    }
    if (info.rollTimer < 60) return;
    info.rollTimer = 0;
    info.checks = (info.checks || 0) + 1;
    const chance = getAmirArrivalChance();
    info.lastChance = chance;
    if (Math.random() < chance) {
        arriveVisitor('amir', `第${info.checks}次路过判定成功`);
    }
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
    if (id === 'amir' && !hasVisitorArrivedBySchedule('amir')) {
        const played = stats.totalPlaySeconds || 0;
        if (played < 90 * 60) return `还需在线 ${Math.ceil((90 * 60 - played) / 60)} 分钟后开始到访判定`;
        const info = getVisitorArrivalInfo('amir');
        const waited = Math.floor((info.eligibleSeconds || 0) / 60);
        const chance = Math.round(getAmirArrivalChance() * 100);
        return `正在路过判定：已等待 ${waited}/30 分钟，当前每分钟 ${chance}%`;
    }
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
