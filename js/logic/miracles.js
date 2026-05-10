// ==========================================
// Logic/Miracles: 奇迹阶段、材料提交与结局收藏
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

function checkEndingUnlocks(silent = false) {
    let changed = false;
    for (const [id, ending] of Object.entries(ENDING_CONFIG)) {
        if (!endingState.unlocked[id] && ending.condition()) {
            endingState.unlocked[id] = true;
            changed = true;
            if (!silent) {
                effectText = `${ending.icon} 解锁结局：${ending.title}`;
                effectAlpha = 1.0;
            }
        }
    }
    return changed;
}

window.markEndingRead = function(id) {
    if (!endingState.unlocked[id]) return;
    endingState.read[id] = true;
    saveGame();
};
