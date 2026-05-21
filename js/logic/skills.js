// ==========================================
// Logic/Skills: 主动技能与天赋树
// ==========================================
function getSkillCd(id) {
    if (id === 'sow') return Math.max(3000, 20000 - (skills.sow.level - 1) * 3000);
    if (id === 'rain') return Math.max(15 * 60 * 1000, RAIN_SKILL_BASE_CD - (skills.rain.level - 1) * 15 * 60 * 1000);
    if (id === 'harvest') return Math.max(10000, 60000 - (skills.harvest.level - 1) * 5000);
    return 0;
}

function getSkillCost(id) {
    return skills[id].level * 500;
}

window.upgradeSkill = function(id) {
    const cost = getSkillCost(id);
    if (coins >= cost) {
        coins -= cost;
        skills[id].level++;
        effectText = `⬆️ ${skills[id].name} 升至 Lv.${skills[id].level}！`;
        effectAlpha = 1.0;
        updateUI();
        saveGame();
    } else {
        alert('金币不足！');
    }
};

window.useSkill = function(skillId) {
    const now = Date.now();
    const skill = skills[skillId];
    if (now - skill.lastUsed < getSkillCd(skillId)) return;

    if (skillId === 'sow') {
        useSowSkill(now);
    } else if (skillId === 'rain') {
        stats.rainSkillUsed = true;
        setWeather('rain', RAIN_SKILL_DURATION);
        effectText = '🌧️ 祈雨成功！雨天将持续一段时间';
    } else if (skillId === 'harvest') {
        useHarvestSkill();
    }

    updateUI();
    skill.lastUsed = now;
    effectAlpha = 1.0;
    saveGame();
};

function useSowSkill(now) {
    const sowTool = getSowSkillSeedTool();
    if (!sowTool) {
        effectText = '请先选择一种已解锁的种子再播种';
        return;
    }
    if (currentSelectedTool !== sowTool && typeof selectTool === 'function') {
        selectTool(sowTool);
    }
    let plantedCount = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (gridData[r][c].state === 0 && plantCell(gridData[r][c], sowTool, now)) plantedCount++;
        }
    }
    if (plantedCount > 0) effectText = `🌱 播下了 ${plantedCount} 颗种子！`;
}

function getSowSkillSeedTool() {
    const currentIsSeed = typeof isSeedTool === 'function'
        ? isSeedTool(currentSelectedTool)
        : CROP_CONFIG[currentSelectedTool]?.seedPrice !== undefined;
    if (currentIsSeed && isItemUnlocked(currentSelectedTool)) return currentSelectedTool;
    return typeof getAutoSowSeedTool === 'function' ? getAutoSowSeedTool() : null;
}

function useHarvestSkill() {
    let harvestedCount = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (gridData[r][c].state === 2) harvestedCount += harvestCell(r, c, false);
        }
    }
    if (harvestedCount > 0) effectText = `⚡ 收割完毕！共 ${harvestedCount} 株`;
}

window.upgradeTalent = function(id) {
    if (!TALENT_CONFIG[id] || talentPoints <= 0) return;
    const current = getTalentLevel(id);
    if (current >= 5) return alert('该天赋已经满级！');
    talents[id]++;
    talentPoints--;
    effectText = `${TALENT_CONFIG[id].icon} ${TALENT_CONFIG[id].name} 升至 L${talents[id]}！`;
    effectAlpha = 1.0;
    updateUI();
    saveGame();
};
