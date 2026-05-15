// ==========================================
// UI/Canvas bridge: shared UI state and world input helpers
// ==========================================
// The visible interface now lives in js/ui/bitcn-dom-ui.js. This file keeps the
// small shared surface that input, story popups, and the DOM shell still use.

let uiState = {
    activePanel: null,
    activeTabs: { journal: 'codex', build: 'ranch', codex: 'crops' },
    scroll: { journal: 0, seeds: 0, build: 0, orders: 0, market: 0 },
    mouseX: 0,
    mouseY: 0,
    buttons: [],
    marketAmounts: {},
    activeMarketInput: null,
    marketDraft: '',
    processingRecipeIndex: {},
    orderDockScroll: 0,
    activeStoryLetter: null,
    storyListPage: 0,
    activeVisitor: null,
    visitorDialog: null,
    npcArrivalPopup: null,
    storyPopupQueue: [],
    activeStoryPopup: null,
    activeEnding: null,
    tileTip: null,
    settingsOpen: false
};

window.uiState = uiState;

function drawCanvasUI() {
    uiState.buttons = [];
}

function hasAnyPlantedOrMatureCrop() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const state = gridData[r]?.[c]?.state;
            if (state === 1 || state === 2) return true;
        }
    }
    return false;
}

function getTutorialStep() {
    if (uiState.activePanel === 'journal') {
        markTutorialJournalOpened();
        return null;
    }
    const planted = hasAnyPlantedOrMatureCrop();
    const harvested = Object.values(stats.harvests || {}).reduce((sum, value) => sum + value, 0);
    if (!planted && harvested === 0) {
        return {
            index: 1,
            title: '先种一块胡萝卜',
            body: '打开种子，选择胡萝卜后点击农田空地。每块地只能种一种作物，成熟前不用反复点击。',
            actionLabel: '打开种子',
            action: () => { uiState.activePanel = 'seeds'; uiState.settingsOpen = false; }
        };
    }
    if (harvested === 0) {
        return {
            index: 2,
            title: '等待成熟并收获',
            body: '作物成熟后会发亮，点击成熟地块即可收获。前期成长很快，收获会给金币、经验和图鉴进度。'
        };
    }
    if ((stats.ordersCompleted || 0) === 0) {
        return {
            index: 3,
            title: '完成第一张订单',
            body: '右侧订单看板每五分钟刷新一批。库存全部够了才能交付。',
            actionLabel: '看订单',
            action: () => { uiState.activePanel = 'orders'; uiState.settingsOpen = false; }
        };
    }
    if (!Object.values(ranchBuildings || {}).some(level => level > 0)) {
        return {
            index: 4,
            title: '建造第一个棚屋',
            body: '在建造的养殖页建鸡舍，为动物产出做准备。',
            actionLabel: '去建造',
            action: () => { uiState.activePanel = 'build'; uiState.activeTabs.build = 'ranch'; uiState.settingsOpen = false; }
        };
    }
    if (!tutorialState.journalOpened) {
        return {
            index: 5,
            title: '打开手札看看进度',
            body: '手札里能查看图鉴奖励、爷爷的信、天赋、自动化、访客、奇迹和结局。',
            actionLabel: '看手札',
            action: openTutorialJournal
        };
    }
    return null;
}

function queueStoryPopup(letter) {
    if (!letter || uiState.storyPopupQueue.some(item => item.id === letter.id) || uiState.activeStoryPopup?.id === letter.id) return;
    uiState.storyPopupQueue.push(letter);
    if (!uiState.activeStoryPopup) uiState.activeStoryPopup = uiState.storyPopupQueue.shift();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
}

function closeStoryPopup(markRead = false) {
    if (markRead && uiState.activeStoryPopup && typeof markStoryRead === 'function') {
        markStoryRead(uiState.activeStoryPopup.id);
        saveGame();
    }
    uiState.activeStoryPopup = null;
    if (uiState.storyPopupQueue.length > 0) uiState.activeStoryPopup = uiState.storyPopupQueue.shift();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
}

function getCodexTitle() {
    const percent = typeof getCodexPercent === 'function' ? getCodexPercent() : 0;
    if (percent >= 100) return '阿尔伯特的继承者';
    if (percent >= 75) return '接近完整';
    if (percent >= 50) return '半满手札';
    if (percent >= 25) return '新手农夫';
    return '刚翻开第一页';
}

function getCodexKindName(itemId) {
    if (CROP_CONFIG[itemId]?.seedPrice !== undefined) return '作物';
    if (CROP_CONFIG[itemId]?.price !== undefined) return '动物';
    return '产物';
}

function getCodexFoundDetail(itemId, amount) {
    const config = CROP_CONFIG[itemId];
    if (!config) return '';
    if (config.seedPrice !== undefined) {
        const mins = Math.max(1, Math.round(getActualGrowTime(itemId) / 60000));
        const processed = config.processedTo ? ` / 加工:${CROP_CONFIG[config.processedTo]?.name || config.processedTo}` : '';
        const special = config.special ? ` / ${config.special}` : config.rarity ? ` / ${config.rarity}` : '';
        return `${config.id} ${config.category} / ${mins}min / ${config.stages || 4}阶段 / ${config.basePrice}币${processed}${special}`;
    }
    if (config.price !== undefined) {
        return `饲养${getAnimalCount(itemId)} / 产物${CROP_CONFIG[getAnimalProductType(itemId)]?.name || '未知'}`;
    }
    return `库存${inventory[itemId] || 0} / 累计${amount}`;
}

function getCodexHint(itemId) {
    const config = CROP_CONFIG[itemId];
    if (!config) return '继续探索';
    if (config.unlockHint && !isItemUnlocked(itemId)) return config.unlockHint;
    if (config.seedPrice !== undefined && isItemUnlocked(itemId)) return '已解锁，等待收获';
    if (config.price !== undefined && isItemUnlocked(itemId)) return '已解锁，等待放置';
    if (config.reqLevel) return `Lv.${config.reqLevel}`;
    const recipe = Object.values(RECIPE_CONFIG).find(item => item.output === itemId);
    if (recipe) return PROCESSING_BUILDING_CONFIG[recipe.building].name;
    const animal = Object.values(RANCH_BUILDING_CONFIG).find(item => item.product === itemId);
    if (animal) return animal.name;
    return '继续探索';
}

function formatRewardText(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins}币`);
    if (reward.exp) parts.push(`${reward.exp}EXP`);
    if (reward.talentPoints) parts.push(`天赋点x${reward.talentPoints}`);
    if (reward.unlockSeed) parts.push(`种子:${CROP_CONFIG[reward.unlockSeed]?.name || reward.unlockSeed}`);
    if (reward.unlockVariant) parts.push('变异线索');
    if (reward.variantBonus) parts.push('变异概率提升');
    if (reward.buildingDiscount) parts.push('建筑折扣');
    if (reward.miracleDiscount) parts.push('奇迹材料折扣');
    if (reward.codexNote) parts.push(reward.codexNote);
    if (reward.endingClue) parts.push('结局线索');
    return parts.length ? parts.join(' + ') : '剧情推进';
}

function handleCanvasUIClick() {
    return !!(uiState.activePanel || uiState.settingsOpen || uiState.activeStoryPopup || uiState.npcArrivalPopup);
}

function handleCanvasUIWheel() {
    return false;
}

function handleCanvasUIKeyDown() {
    return false;
}

function setCanvasUIMouse(x, y) {
    uiState.mouseX = x;
    uiState.mouseY = y;
}

function screenToWorldPoint(screenX, screenY) {
    const zoom = camera.zoom || 1;
    return {
        x: (screenX - canvas.width / 2) / zoom + canvas.width / 2 - camera.x,
        y: (screenY - canvas.height / 2) / zoom + canvas.height / 2 - camera.y
    };
}

function zoomCamera(factor, anchorX = canvas.width / 2, anchorY = canvas.height / 2) {
    const before = screenToWorldPoint(anchorX, anchorY);
    camera.zoom = Math.max(0.45, Math.min(1.8, (camera.zoom || 1) * factor));
    const after = screenToWorldPoint(anchorX, anchorY);
    camera.x += after.x - before.x;
    camera.y += after.y - before.y;
    if (typeof window.clampCameraToView === 'function') window.clampCameraToView();
}

function resetCameraZoom() {
    zoomCamera(1 / (camera.zoom || 1));
}

function toggleSettings(force) {
    uiState.settingsOpen = force === undefined ? !uiState.settingsOpen : !!force;
    if (uiState.settingsOpen) {
        uiState.activePanel = null;
        uiState.activeStoryPopup = null;
    }
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
}

function togglePanel(id) {
    uiState.activePanel = uiState.activePanel === id ? null : id;
    if (uiState.activePanel) {
        uiState.settingsOpen = false;
        uiState.activeStoryPopup = null;
    }
    if (id === 'journal' && uiState.activePanel === 'journal') {
        markTutorialJournalOpened();
        const activeLetterIndex = STORY_LETTERS.findIndex(letter => letter.id === uiState.activeStoryLetter);
        if (activeLetterIndex >= 0) uiState.storyListPage = Math.floor(activeLetterIndex / 6);
    }
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
}

function openTutorialJournal() {
    uiState.activePanel = 'journal';
    uiState.activeTabs.journal = 'codex';
    uiState.settingsOpen = false;
    markTutorialJournalOpened();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
}

function markTutorialJournalOpened() {
    if (tutorialState.journalOpened) return;
    tutorialState.journalOpened = true;
    saveGame();
}

function closePanel() {
    uiState.activePanel = null;
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
}

function showTileInfo(screenX, screenY, worldX, worldY) {
    const target = typeof getFarmCellAtWorld === 'function' ? getFarmCellAtWorld(worldX, worldY) : null;
    if (!target) return false;
    const col = target.col;
    const row = target.row;
    const cell = gridData[row]?.[col];
    if (!cell) return false;

    let title = `地块 (${row + 1}, ${col + 1})`;
    let line1 = '状态: 可种植';
    let line2 = `当前工具: ${getToolLabel(currentSelectedTool)}`;
    if (cell.state === -1) {
        line1 = `状态: 未开垦，需要 ${UNLOCK_PRICE} 币`;
        line2 = '点击可解锁周围土地';
    } else if (cell.state === 1) {
        const config = CROP_CONFIG[cell.cropType];
        const left = Math.max(0, Math.ceil((getActualGrowTime(cell.cropType) / getGrowthMultiplier() - (Date.now() - cell.timer)) / 1000));
        line1 = `作物: ${config.icon} ${config.name}`;
        line2 = `阶段: 生长中，约 ${left}s 后成熟`;
    } else if (cell.state === 2) {
        const config = CROP_CONFIG[cell.cropType];
        line1 = `作物: ${config.icon} ${config.name}`;
        line2 = '阶段: 成熟，点击可收割';
    } else if (cell.state === 4) {
        const parent = gridData[cell.parentRow]?.[cell.parentCol];
        const config = CROP_CONFIG[cell.cropType];
        const mature = parent?.state === 2;
        line1 = `作物: ${config.icon} ${config.name} 的占位地块`;
        line2 = mature ? '点击任意占位格可收获整株' : '生长中，占据 2x2 地块';
    }
    uiState.tileTip = { x: screenX + 12, y: screenY + 12, title, line1, line2, until: Date.now() + 3200 };
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi(true);
    return true;
}

function getToolLabel(id) {
    if (CROP_CONFIG[id]) return CROP_CONFIG[id].name;
    return id || '-';
}

function isPointInRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

Object.assign(window, {
    uiState,
    drawCanvasUI,
    getTutorialStep,
    queueStoryPopup,
    closeStoryPopup,
    getCodexTitle,
    getCodexKindName,
    getCodexFoundDetail,
    getCodexHint,
    formatRewardText,
    handleCanvasUIClick,
    handleCanvasUIWheel,
    handleCanvasUIKeyDown,
    setCanvasUIMouse,
    screenToWorldPoint,
    zoomCamera,
    resetCameraZoom,
    toggleSettings,
    togglePanel,
    openTutorialJournal,
    markTutorialJournalOpened,
    closePanel,
    showTileInfo,
    getToolLabel,
    isPointInRect
});
