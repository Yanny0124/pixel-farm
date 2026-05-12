// ==========================================
// UI/Canvas: 五入口快捷栏、弹窗、按钮与滚动
// ==========================================
const UI_BAR_HEIGHT = 72;
const UI_PANEL = {
    get x() { return Math.round(canvas.width * 0.12); },
    get y() { return 82; },
    get w() { return Math.round(canvas.width * 0.76); },
    get h() { return canvas.height - UI_BAR_HEIGHT - 120; }
};
const UI_CONTENT = {
    get x() { return UI_PANEL.x + 28; },
    get y() { return UI_PANEL.y + 112; },
    get w() { return UI_PANEL.w - 56; },
    get h() { return UI_PANEL.h - 136; },
    get bottom() { return this.y + this.h; }
};
const UI_CONTENT_PAD_TOP = 22;
const UI_SETTINGS = {
    get w() { return 360; },
    get h() { return 288; },
    get x() { return canvas.width - this.w - 24; },
    get y() { return 66; }
};
const UI_ORDER_DOCK = {
    get w() { return 292; },
    get h() { return 286; },
    get x() { return canvas.width - this.w - 24; },
    get y() { return 74; }
};
const UI_NAV = [
    { id: 'journal', icon: '📖', label: '手札' },
    { id: 'seeds', icon: '🌱', label: '种子' },
    { id: 'build', icon: '⚒️', label: '建造' },
    { id: 'market', icon: '📈', label: '市场' }
];
const UI_THEME = {
    ink: '#314238',
    text: '#536257',
    muted: '#7b8b7f',
    panel: 'rgba(255, 249, 226, 0.98)',
    panelSoft: 'rgba(246, 239, 207, 0.95)',
    header: '#83a86f',
    headerDark: '#587456',
    border: '#6f8f69',
    borderSoft: '#b7c9a6',
    button: '#78a866',
    buttonHover: '#8aba74',
    buttonDisabled: '#b1b9aa',
    warn: '#e0aa3e',
    danger: '#c96b55',
    blue: '#6b9db0',
    purple: '#9a78ad',
    cream: '#fff7d2',
    card: '#fffdf0',
    shadow: 'rgba(72, 92, 59, 0.24)'
};

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
    storyPopupQueue: [],
    activeStoryPopup: null,
    tileTip: null,
    settingsOpen: false
};

function drawCanvasUI(ctx) {
    uiState.buttons = [];
    drawStatusHUD(ctx);
    drawTileTip(ctx);
    if (uiState.activePanel) drawUIPanel(ctx, uiState.activePanel);
    drawSkillDock(ctx);
    drawZoomDock(ctx);
    if (!uiState.activePanel && !uiState.settingsOpen) drawOrderDock(ctx);
    if (uiState.settingsOpen) drawSettingsPanel(ctx);
    if (!uiState.activePanel && !uiState.settingsOpen && !uiState.activeStoryPopup) drawTutorialGuide(ctx);
    drawBottomNav(ctx);
    drawStoryPopup(ctx);
}

function drawStatusHUD(ctx) {
    drawRoundRect(ctx, 14, 10, canvas.width - 28, 46, 8, UI_THEME.panel, UI_THEME.border);
    ctx.fillStyle = UI_THEME.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`💰 ${coins}`, 32, 39);
    ctx.fillText(`Lv.${playerLevel}`, 146, 39);
    ctx.fillText(`EXP ${playerExp}/${getMaxExp()}`, 226, 39);
    ctx.fillText(`时间 ${getClockLabel()}`, 426, 39);
    ctx.fillText(`${WEATHER_CONFIG[weather.type].icon} ${WEATHER_CONFIG[weather.type].name}`, 570, 39);
    ctx.fillText(`生长 ${Math.round(getGrowthMultiplier() * 100)}%`, 718, 39);
    ctx.fillText(`工具 ${getToolLabel(currentSelectedTool)}`, 868, 39);
    ctx.fillText(`视野 ${Math.round((camera.zoom || 1) * 100)}%`, canvas.width - 360, 39);
    ctx.textAlign = 'right';
    ctx.fillText('滚轮/双指缩放 · Space拖拽', canvas.width - 72, 39);
    drawSmallButton(ctx, 'settings-toggle', canvas.width - 54, 16, 32, 28, '⚙', () => toggleSettings(), '#607d6f');
}

function drawTutorialGuide(ctx) {
    const step = getTutorialStep();
    if (!step) return;
    const x = 176;
    const y = 66;
    const w = 344;
    const h = 128;
    drawRoundRect(ctx, x, y, w, h, 10, UI_THEME.panel, UI_THEME.border);
    ctx.fillStyle = UI_THEME.button;
    ctx.fillRect(x, y, 6, h);
    drawTextLine(ctx, `新手目标 ${step.index}/5`, x + 18, y + 28, '#2c3e50', 'bold 14px Arial');
    drawTextLine(ctx, step.title, x + 18, y + 54, '#263238', 'bold 16px Arial');
    drawWrappedText(ctx, step.body, x + 18, y + 78, w - 36, 20, '#53645c', '13px Arial');
    if (step.action) {
        drawSmallButton(ctx, 'tutorial-action', x + w - 116, y + h - 38, 94, 28, step.actionLabel || '前往', step.action, '#2980b9');
    }
}

function getTutorialStep() {
    if (uiState.activePanel === 'journal') {
        markTutorialJournalOpened();
        return null;
    }
    const planted = gridData.flat().some(cell => cell.state === 1 || cell.state === 2);
    const harvested = Object.values(stats.harvests || {}).reduce((sum, value) => sum + value, 0);
    if (!planted && harvested === 0) {
        return { index: 1, title: '先种一块胡萝卜', body: '先选择胡萝卜，再点击左侧农田空地。', actionLabel: '打开种子', action: () => { uiState.activePanel = 'seeds'; uiState.settingsOpen = false; } };
    }
    if (harvested === 0) {
        return { index: 2, title: '等待成熟并收获', body: '作物成熟后会发亮，点击成熟地块即可收获。' };
    }
    if ((stats.ordersCompleted || 0) === 0) {
        return { index: 3, title: '完成第一张订单', body: '右侧订单看板会显示需求，库存够了就点交付。', actionLabel: '看订单', action: () => { uiState.activePanel = 'orders'; uiState.settingsOpen = false; } };
    }
    if (!Object.values(ranchBuildings || {}).some(level => level > 0)) {
        return { index: 4, title: '建造第一个棚屋', body: '在建造-养殖页建鸡舍，为动物产出做准备。', actionLabel: '去建造', action: () => { uiState.activePanel = 'build'; uiState.activeTabs.build = 'ranch'; uiState.settingsOpen = false; } };
    }
    if (!tutorialState.journalOpened) {
        return { index: 5, title: '打开手札看看进度', body: '查看图鉴、爷爷的信、访客和奇迹目标。', actionLabel: '看手札', action: () => { openTutorialJournal(); } };
    }
    return null;
}

function drawBottomNav(ctx) {
    const y = canvas.height - UI_BAR_HEIGHT + 8;
    const itemW = Math.min(190, Math.max(145, Math.floor((canvas.width - 250) / UI_NAV.length)));
    const gap = 18;
    const startX = (canvas.width - (itemW * UI_NAV.length + gap * (UI_NAV.length - 1))) / 2;
    drawRoundRect(ctx, startX - 18, y - 6, itemW * UI_NAV.length + gap * (UI_NAV.length - 1) + 36, 58, 10, 'rgba(38, 50, 56, 0.9)', '#8fa39a');
    UI_NAV.forEach((item, index) => {
        const x = startX + index * (itemW + gap);
        const active = uiState.activePanel === item.id;
        const hover = isPointInRect(uiState.mouseX, uiState.mouseY, x, y, itemW, 42);
        drawRoundRect(ctx, x, y, itemW, 42, 8, active ? '#f1c40f' : hover ? '#f7f1d5' : '#ecf0f1', active ? '#d35400' : '#607d6f');
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.icon} ${item.label}`, x + itemW / 2, y + 27);
        registerButton(`nav-${item.id}`, x, y, itemW, 42, () => togglePanel(item.id));
    });
}

function drawSkillDock(ctx) {
    const dockW = 132;
    const dockH = 196;
    const x = 20;
    const y = 74;
    drawRoundRect(ctx, x - 8, y - 8, dockW + 16, dockH + 16, 10, 'rgba(38, 50, 56, 0.88)', '#8fa39a');
    const ids = ['sow', 'rain', 'harvest'];
    const labels = { sow: '播种', rain: '求雨', harvest: '收割' };
    ids.forEach((id, index) => {
        const skill = skills[id];
        const btnW = dockW;
        const btnH = 54;
        const bx = x;
        const by = y + index * 64;
        const timeLeft = Math.max(0, Math.ceil((getSkillCd(id) - (Date.now() - skill.lastUsed)) / 1000));
        const ready = timeLeft <= 0;
        const label = ready ? `${skill.name}\n${labels[id]}` : `${skill.name}\n${timeLeft}s`;
        drawMultiLineButton(ctx, `dock-skill-${id}`, bx, by, btnW, btnH, label, () => useSkill(id), ready ? '#8e44ad' : '#95a5a6');
    });
}

function drawZoomDock(ctx) {
    const x = 20;
    const y = 300;
    drawRoundRect(ctx, x - 8, y - 8, 190, 168, 10, 'rgba(38, 50, 56, 0.82)', '#8fa39a');
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('视野缩放', x + 87, y + 18);
    drawSmallButton(ctx, 'zoom-in', x, y + 32, 82, 44, '+', () => zoomCamera(1.18), '#2980b9');
    drawSmallButton(ctx, 'zoom-out', x + 94, y + 32, 82, 44, '-', () => zoomCamera(1 / 1.18), '#2980b9');
    drawSmallButton(ctx, 'zoom-reset', x, y + 90, 176, 42, `${Math.round((camera.zoom || 1) * 100)}%`, () => resetCameraZoom(), '#7f8c8d');
}

function drawSettingsPanel(ctx) {
    const x = UI_SETTINGS.x;
    const y = UI_SETTINGS.y;
    drawRoundRect(ctx, x, y, UI_SETTINGS.w, UI_SETTINGS.h, 10, 'rgba(248, 249, 244, 0.98)', '#34495e');
    drawRoundRect(ctx, x, y, UI_SETTINGS.w, 42, 10, '#34495e', '#34495e');
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⚙ 设置', x + 16, y + 27);
    drawSmallButton(ctx, 'close-settings', x + UI_SETTINGS.w - 42, y + 8, 28, 26, '×', () => toggleSettings(false), '#e74c3c');

    drawTextLine(ctx, `当前时间：${getClockLabel()}`, x + 22, y + 72, '#2c3e50', '15px Arial');
    drawTextLine(ctx, `当前视野：${Math.round((camera.zoom || 1) * 100)}%`, x + 22, y + 98, '#2c3e50', '15px Arial');
    drawSmallButton(ctx, 'setting-save', x + 22, y + 124, 142, 34, '手动保存', () => {
        saveGame();
        effectText = '已保存';
        effectAlpha = 1.0;
    }, '#27ae60');
    drawSmallButton(ctx, 'setting-reset-zoom', x + 184, y + 124, 142, 34, '重置视野', () => resetCameraZoom(), '#2980b9');
    drawSmallButton(ctx, 'setting-audio', x + 22, y + 174, 142, 34, audioEnabled ? '音效 开' : '音效 关', () => toggleAudio(), audioEnabled ? '#27ae60' : '#95a5a6');
    drawSmallButton(ctx, 'setting-shake', x + 184, y + 174, 142, 34, uiPreferences?.screenShake === false ? '震动 关' : '震动 开', () => toggleScreenShake(), uiPreferences?.screenShake === false ? '#95a5a6' : '#27ae60');
    drawTextLine(ctx, '关闭后收割、共振、稀有发现都不会晃动画面。', x + 22, y + 226, '#607d6f', '13px Arial');
    drawSmallButton(ctx, 'setting-reset-game', x + 184, y + 238, 142, 34, '重置世界', () => resetGame(), '#e74c3c');
}

function drawOrderDock(ctx) {
    const x = UI_ORDER_DOCK.x;
    const y = UI_ORDER_DOCK.y;
    drawRoundRect(ctx, x, y, UI_ORDER_DOCK.w, UI_ORDER_DOCK.h, 10, 'rgba(248, 249, 244, 0.94)', '#34495e');
    drawRoundRect(ctx, x, y, UI_ORDER_DOCK.w, 42, 10, '#34495e', '#34495e');
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📦 订单看板', x + 16, y + 27);
    drawSmallButton(ctx, 'order-dock-more', x + UI_ORDER_DOCK.w - 72, y + 8, 50, 26, '详情', () => togglePanel('orders'), '#607d6f');

    const contentX = x + 10;
    const contentY = y + 50;
    const contentW = UI_ORDER_DOCK.w - 20;
    const contentH = UI_ORDER_DOCK.h - 60;
    uiState.orderDockScroll = Math.min(uiState.orderDockScroll, getOrderDockMaxScroll());

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentW, contentH);
    ctx.clip();

    tasks.forEach((task, index) => {
        const config = CROP_CONFIG[task.item];
        if (!config) return;
        const enough = inventory[task.item] >= task.amount;
        const cardY = contentY + 6 + index * 70 - uiState.orderDockScroll;
        if (cardY + 58 < contentY || cardY > contentY + contentH) return;
        drawRoundRect(ctx, x + 14, cardY, UI_ORDER_DOCK.w - 28, 58, 8, enough ? '#f0fff4' : '#ffffff', enough ? '#27ae60' : '#d5ddd8');
        ctx.fillStyle = enough ? '#27ae60' : '#f39c12';
        ctx.fillRect(x + 14, cardY, 5, 58);
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${config.icon} ${config.name} x${task.amount}`, x + 28, cardY + 22);
        ctx.fillStyle = '#53645c';
        ctx.font = '12px Arial';
        ctx.fillText(`${inventory[task.item]}/${task.amount}  奖励 ${task.reward}币`, x + 28, cardY + 44);
        drawSmallButton(ctx, `order-dock-${index}`, x + UI_ORDER_DOCK.w - 84, cardY + 14, 56, 30, enough ? '交付' : '缺货', () => deliverTask(index), enough ? '#27ae60' : '#95a5a6');
    });
    ctx.restore();

    if (tasks.length === 0) {
        drawTextLine(ctx, '暂无订单', x + 24, y + 82, '#53645c', '14px Arial');
    }
    drawOrderDockScrollbar(ctx, contentX + contentW - 6, contentY + 4, contentH - 8);
}

function drawOrderDockScrollbar(ctx, x, y, h) {
    const maxScroll = getOrderDockMaxScroll();
    drawRoundRect(ctx, x, y, 6, h, 3, maxScroll > 0 ? 'rgba(96, 125, 111, 0.28)' : 'rgba(96, 125, 111, 0.12)', null);
    if (maxScroll <= 0) return;
    const thumbH = Math.max(34, h * (h / (h + maxScroll)));
    const thumbY = y + (h - thumbH) * (uiState.orderDockScroll / maxScroll);
    drawRoundRect(ctx, x - 1, thumbY, 8, thumbH, 4, '#34495e', '#607d6f');
}

function drawUIPanel(ctx, panelId) {
    const title = UI_NAV.find(item => item.id === panelId)?.label || (panelId === 'orders' ? '订单' : '');
    drawRoundRect(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 10, 'rgba(248, 249, 244, 0.97)', '#34495e');
    drawRoundRect(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, 44, 10, '#34495e', '#34495e');
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${getPanelIcon(panelId)} ${title}`, UI_PANEL.x + 18, UI_PANEL.y + 29);
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#dce6df';
    ctx.fillText('内容较多时可用滚轮上下翻', UI_PANEL.x + UI_PANEL.w - 58, UI_PANEL.y + 28);
    drawSmallButton(ctx, 'close-panel', UI_PANEL.x + UI_PANEL.w - 42, UI_PANEL.y + 9, 28, 26, '×', () => closePanel(), '#e74c3c');
    drawPanelTabs(ctx, panelId);

    ctx.save();
    ctx.beginPath();
    ctx.rect(UI_CONTENT.x, UI_CONTENT.y, UI_CONTENT.w, UI_CONTENT.h);
    ctx.clip();
    if (panelId === 'journal') drawJournalPanel(ctx);
    if (panelId === 'seeds') drawSeedsPanel(ctx);
    if (panelId === 'build') drawBuildPanel(ctx);
    if (panelId === 'orders') drawOrdersPanel(ctx);
    if (panelId === 'market') drawMarketPanel(ctx);
    ctx.restore();
    drawScrollHint(ctx, panelId);
}

function queueStoryPopup(letter) {
    if (!letter || uiState.storyPopupQueue.some(item => item.id === letter.id) || uiState.activeStoryPopup?.id === letter.id) return;
    uiState.storyPopupQueue.push(letter);
    if (!uiState.activeStoryPopup) uiState.activeStoryPopup = uiState.storyPopupQueue.shift();
}

function drawStoryPopup(ctx) {
    if (!uiState.activeStoryPopup && uiState.storyPopupQueue.length > 0) {
        uiState.activeStoryPopup = uiState.storyPopupQueue.shift();
    }
    const letter = uiState.activeStoryPopup;
    if (!letter) return;
    const w = Math.min(620, Math.round(canvas.width * 0.52));
    const h = Math.min(460, canvas.height - 170);
    const x = Math.round((canvas.width - w) / 2);
    const y = Math.round((canvas.height - h) / 2);
    ctx.fillStyle = 'rgba(26, 32, 38, 0.34)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawRoundRect(ctx, x, y, w, h, 12, '#fffdf2', '#d8caa2');
    drawRoundRect(ctx, x, y, w, 48, 12, '#607d6f', '#607d6f');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`📬 新信件：${letter.title}`, x + 22, y + 31);
    drawRoundRect(ctx, x + 28, y + 72, w - 56, h - 174, 8, '#ffffff', '#eee1bd');
    drawTextLine(ctx, `${letter.id} ${letter.title}`, x + 48, y + 104, '#2c3e50', 'bold 18px Arial');
    let bodyY = y + 140;
    letter.body.forEach(line => {
        bodyY = drawWrappedText(ctx, line, x + 48, bodyY, w - 96, 28, '#3d4f48', '15px Arial');
        bodyY += 6;
    });
    drawTextLine(ctx, '信件已收入手札，可在“爷爷的信”页重新阅读。', x + 34, y + h - 72, '#7f8c8d', '13px Arial');
    drawSmallButton(ctx, 'story-popup-open', x + w - 250, y + h - 54, 104, 34, '打开手札', () => {
        uiState.activeTabs.journal = 'letters';
        uiState.activeStoryLetter = letter.id;
        const letterIndex = STORY_LETTERS.findIndex(item => item.id === letter.id);
        if (letterIndex >= 0) uiState.storyListPage = Math.floor(letterIndex / 6);
        closeStoryPopup(true);
        uiState.activePanel = 'journal';
        markTutorialJournalOpened();
    }, '#2980b9');
    drawSmallButton(ctx, 'story-popup-close', x + w - 128, y + h - 54, 96, 34, '收下', () => closeStoryPopup(true), '#27ae60');
}

function closeStoryPopup(markRead = false) {
    if (markRead && uiState.activeStoryPopup) {
        markStoryRead(uiState.activeStoryPopup.id);
        saveGame();
    }
    uiState.activeStoryPopup = uiState.storyPopupQueue.shift() || null;
}

function drawPanelTabs(ctx, panelId) {
    if (panelId === 'journal') {
        drawTabs(ctx, 'journal', [
            ['codex', '图鉴'],
            ['letters', '爷爷的信'],
            ['talents', '天赋'],
            ['miracle', '奇迹'],
            ['visitors', '访客'],
            ['endings', '结局']
        ], UI_PANEL.x + 18, UI_PANEL.y + 58);
    }
    if (panelId === 'build') {
        drawTabs(ctx, 'build', [
            ['ranch', '养殖'],
            ['processing', '加工'],
            ['miracle', '奇迹']
        ], UI_PANEL.x + 18, UI_PANEL.y + 58);
    }
}

function drawJournalPanel(ctx) {
    const tab = uiState.activeTabs.journal;
    const x = UI_CONTENT.x;
    let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.journal;
    if (tab === 'codex') {
        drawCodexPanel(ctx, x, y);
        return;
    }
    if (tab === 'letters') {
        drawStoryLettersPanel(ctx, x, y);
        return;
    }
    if (tab === 'talents') {
        drawTextLine(ctx, `可用天赋点：${talentPoints}`, x, y, '#2c3e50', 'bold 16px Arial');
        y += 26;
        for (const id of Object.keys(TALENT_CONFIG)) {
            const config = TALENT_CONFIG[id];
            const level = getTalentLevel(id);
            const current = level > 0 ? config.effects[level - 1] : '未加点';
            const next = level < config.effects.length ? config.effects[level] : '已满级';
            const cardW = UI_CONTENT.w - 150;
            drawInfoCard(ctx, x, y, cardW, 76, `${config.icon} ${config.name} L${level}`, `当前：${current}  |  下一：${next}`, config.color);
            drawSmallButton(ctx, `talent-${id}`, x + cardW + 24, y + 17, 96, 34, '加点', () => upgradeTalent(id), talentPoints > 0 && level < 5 ? '#27ae60' : '#95a5a6');
            y += 88;
        }
        y = drawSkillCards(ctx, x, y);
        drawStaffCards(ctx, x, y + 8);
        return;
    }
    if (tab === 'visitors') {
        drawVisitorsPanel(ctx, x, y);
        return;
    }
    if (tab === 'miracle') {
        drawMiracleJournalPanel(ctx, x, y);
        return;
    }
    if (tab === 'endings') {
        drawEndingsPanel(ctx, x, y);
        return;
    }

    const copy = {
        codex: ['图鉴按作物、动物、奇物三页记录。', '未发现项目显示剪影与模糊提示。', '里程碑奖励按 25% / 50% / 75% / 100% 发放。'],
        letters: ['爷爷的信已按玩法优化文档 H00-H24 接入。', '新信件会在触发时主动弹出，也会收入手札。'],
    }[tab] || [];
    copy.forEach(line => {
        drawTextLine(ctx, line, x, y, '#2c3e50', '16px Arial');
        y += 30;
    });
}

function drawCodexPanel(ctx, x, y) {
    const total = getCodexTotalCount();
    const collected = getCollectedUniqueCount();
    const percent = Math.round((collected / total) * 100);
    drawRoundRect(ctx, x, y - 18, UI_CONTENT.w, 68, 8, '#ffffff', '#d5ddd8');
    drawTextLine(ctx, `图鉴称号：${getCodexTitle(collected)}`, x + 18, y + 8, '#2c3e50', 'bold 17px Arial');
    drawTextLine(ctx, `收集率 ${collected}/${total} (${percent}%)`, x + 18, y + 34, '#53645c', '13px Arial');
    drawRoundRect(ctx, x + 210, y + 23, UI_CONTENT.w - 248, 12, 6, '#e3e8e4', null);
    drawRoundRect(ctx, x + 210, y + 23, (UI_CONTENT.w - 248) * (collected / total), 12, 6, '#27ae60', null);
    y += 70;
    drawTabs(ctx, 'codex', [
        ['crops', '作物'],
        ['animals', '动物'],
        ['products', '奇物']
    ], x, y - 6);
    y += 40;
    y = drawCodexRewards(ctx, x, y);
    y = drawCodexSetRewards(ctx, x, y);
    const group = CODEX_GROUPS[uiState.activeTabs.codex] || CODEX_GROUPS.crops;
    drawCodexGroup(ctx, group, x, y + 8);
}

function getCodexTitle(collected) {
    const percent = getCodexPercent();
    if (percent >= 100) return '阿尔伯特的继承者';
    if (percent >= 75) return '接近完整';
    if (percent >= 50) return '半满手札';
    if (percent >= 25) return '新手农夫';
    return '刚翻开第一页';
}

function drawCodexRewards(ctx, x, y) {
    drawTextLine(ctx, '里程碑奖励', x, y, '#2c3e50', 'bold 15px Arial');
    y += 18;
    CODEX_REWARDS.forEach((reward, index) => {
        const rx = x + index * 238;
        const ready = getCodexPercent() >= reward.percent;
        const claimed = collection.claimedRewards[reward.id];
        drawRoundRect(ctx, rx, y, 222, 58, 7, claimed ? '#edf3ef' : ready ? '#fff7d6' : '#ffffff', ready ? '#f39c12' : '#d5ddd8');
        drawTextLine(ctx, `${reward.label}`, rx + 12, y + 22, '#263238', 'bold 13px Arial');
        drawTextLine(ctx, `${reward.percent}%  ${reward.coins}币 + ${reward.exp}EXP`, rx + 12, y + 43, '#53645c', '12px Arial');
        drawSmallButton(ctx, `codex-reward-${reward.id}`, rx + 148, y + 14, 58, 28, claimed ? '已领' : '领取', () => claimCodexReward(reward.id), ready && !claimed ? '#27ae60' : '#95a5a6');
    });
    return y + 72;
}

function drawCodexSetRewards(ctx, x, y) {
    drawTextLine(ctx, '类别收集奖励', x, y, '#2c3e50', 'bold 15px Arial');
    y += 18;
    const cols = Math.max(2, Math.min(3, Math.floor(UI_CONTENT.w / 260)));
    const gap = 12;
    const cardW = Math.floor((UI_CONTENT.w - gap * (cols - 1)) / cols);
    const cardH = 70;
    CODEX_SET_REWARDS.forEach((reward, index) => {
        const ids = getCropCategoryIds(reward.category);
        const got = getCollectedCategoryCount(reward.category);
        const ready = isCodexSetRewardReady(reward);
        const claimed = collection.claimedSetRewards?.[reward.id];
        const col = index % cols;
        const row = Math.floor(index / cols);
        const rx = x + col * (cardW + gap);
        const ry = y + row * (cardH + gap);
        drawRoundRect(ctx, rx, ry, cardW, cardH, 7, claimed ? '#edf3ef' : ready ? '#fff7d6' : '#ffffff', ready ? '#f39c12' : '#d5ddd8');
        drawTextLine(ctx, reward.label, rx + 12, ry + 22, '#263238', 'bold 13px Arial');
        drawTextLine(ctx, `${got}/${ids.length}  ${reward.bonusLabel}`, rx + 12, ry + 44, '#53645c', '12px Arial');
        drawSmallButton(ctx, `codex-set-${reward.id}`, rx + cardW - 70, ry + 20, 54, 28, claimed ? '已领' : '领取', () => claimCodexSetReward(reward.id), ready && !claimed ? '#27ae60' : '#95a5a6');
    });
    return y + Math.ceil(CODEX_SET_REWARDS.length / cols) * (cardH + gap) + 14;
}

function drawCodexGroup(ctx, group, x, y) {
    const items = getCodexDisplayItems(group);
    const got = group.items.filter(isCollected).length;
    drawTextLine(ctx, `${group.name} ${got}/${group.items.length}`, x, y, '#2c3e50', 'bold 15px Arial');
    y += 18;
    const cols = Math.max(3, Math.min(4, Math.floor(UI_CONTENT.w / 210)));
    const gap = 14;
    const cardW = Math.floor((UI_CONTENT.w - gap * (cols - 1)) / cols);
    const cardH = 118;
    items.forEach((itemId, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const px = x + col * (cardW + gap);
        const py = y + row * (cardH + gap);
        drawCodexItemCard(ctx, itemId, px, py, cardW, cardH);
    });
    return y + Math.ceil(items.length / cols) * (cardH + gap) + 8;
}

function drawCodexItemCard(ctx, itemId, x, y, w, h) {
    const config = CROP_CONFIG[itemId];
    const amount = getCollectedAmount(itemId);
    const found = amount > 0;
    const unlocked = isItemUnlocked(itemId);
    drawRoundRect(ctx, x, y, w, h, 8, found ? '#ffffff' : '#d4d8d6', found ? '#95a5a6' : unlocked ? '#9aa59f' : '#b0b8b3');
    if (found) {
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(config.icon, x + 12, y + 30);
    } else {
        drawCodexSilhouette(ctx, x + 23, y + 23, unlocked);
    }
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = found ? '#263238' : '#6b7470';
    ctx.fillText(found ? config.name : `${getCodexKindName(itemId)}剪影`, x + 42, y + 26);
    ctx.font = '12px Arial';
    const detail = found ? getCodexFoundDetail(itemId, amount) : getCodexHint(itemId);
    drawWrappedText(ctx, detail, x + 12, y + 52, w - 20, 14, found ? '#53645c' : '#6b7470', '12px Arial');
    if (VARIANT_CONFIG[itemId]) {
        const variants = getVariantProgress(itemId);
        const line = found ? `变种 ${variants.found}/${variants.total}` : '变种：未发现';
        drawTextLine(ctx, line, x + 12, y + h - 10, found && variants.found > 0 ? '#8e44ad' : '#7f8c8d', '11px Arial');
    }
}

function drawCodexSilhouette(ctx, cx, cy, hinted) {
    ctx.save();
    ctx.fillStyle = hinted ? '#8a8f89' : '#6f7772';
    ctx.globalAlpha = hinted ? 0.9 : 0.65;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 8, cy + 15, 16, 6);
    ctx.restore();
}

function getCodexKindName(itemId) {
    if (CROP_CONFIG[itemId]?.seedPrice !== undefined) return '作物';
    if (CROP_CONFIG[itemId]?.price !== undefined) return '动物';
    return '产物';
}

function getCodexFoundDetail(itemId, amount) {
    const config = CROP_CONFIG[itemId];
    if (config.seedPrice !== undefined) {
        const mins = Math.max(1, Math.round(getActualGrowTime(itemId) / 60000));
        const processed = config.processedTo ? ` / 加工:${CROP_CONFIG[config.processedTo]?.name || config.processedTo}` : '';
        const special = config.special ? ` / ${config.special}` : config.rarity ? ` / ${config.rarity}` : '';
        return `${config.id} ${config.category} / ${mins}min / ${config.stages || 4}阶段 / ${config.basePrice}币${processed}${special}`;
    }
    if (config.price !== undefined) return `饲养${getAnimalCount(itemId)} / 产物${CROP_CONFIG[getAnimalProductType(itemId)]?.name || '未知'}`;
    return `库存${inventory[itemId] || 0} / 累计${amount}`;
}

function getCodexHint(itemId) {
    const config = CROP_CONFIG[itemId];
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

function drawStoryLettersPanel(ctx, x, y) {
    const unlocked = STORY_LETTERS.filter(letter => storyState.unlocked[letter.id]);
    const active = getActiveStoryLetter(unlocked);
    drawTextLine(ctx, `爷爷的信 ${unlocked.length}/${STORY_LETTERS.length}`, x, y, '#2c3e50', 'bold 16px Arial');
    y += 24;

    const listW = 248;
    const detailX = x + listW + 22;
    const detailW = UI_CONTENT.w - listW - 38;
    const detailH = 330;
    drawRoundRect(ctx, detailX, y, detailW, detailH, 8, '#fffdf2', '#d8caa2');
    ctx.fillStyle = '#d8caa2';
    ctx.fillRect(detailX + 18, y + 58, detailW - 36, 1);
    if (active) {
        drawTextLine(ctx, `${active.id} ${active.title}`, detailX + 24, y + 38, '#2c3e50', 'bold 20px Arial');
        let bodyY = y + 86;
        active.body.forEach(line => {
            bodyY = drawWrappedText(ctx, line, detailX + 28, bodyY, detailW - 56, 30, '#3d4f48', '16px Arial');
            bodyY += 12;
        });
    } else {
        drawTextLine(ctx, '还没有信件。先照看农场吧。', detailX + 24, y + 42, '#53645c', '15px Arial');
    }

    drawRoundRect(ctx, x, y, listW, detailH, 8, '#ffffff', '#d5ddd8');
    const visibleRows = 6;
    const rowH = 42;
    const maxPage = Math.max(0, Math.ceil(STORY_LETTERS.length / visibleRows) - 1);
    uiState.storyListPage = Math.max(0, Math.min(maxPage, uiState.storyListPage || 0));
    drawTextLine(ctx, `信件目录 ${uiState.storyListPage + 1}/${maxPage + 1}`, x + 16, y + 28, '#2c3e50', 'bold 15px Arial');
    const startIndex = uiState.storyListPage * visibleRows;
    STORY_LETTERS.slice(startIndex, startIndex + visibleRows).forEach((letter, localIndex) => {
        const index = startIndex + localIndex;
        const unlockedLetter = storyState.unlocked[letter.id];
        const selected = active?.id === letter.id;
        const cardX = x + 12;
        const cardY = y + 46 + localIndex * rowH;
        drawRoundRect(ctx, cardX, cardY, listW - 24, 34, 7, selected ? '#fff7d6' : unlockedLetter ? '#f8faf7' : '#e3e8e4', selected ? '#f39c12' : '#d5ddd8');
        ctx.fillStyle = unlockedLetter ? '#263238' : '#7f8c8d';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        const unread = unlockedLetter && !storyState.read[letter.id] ? ' •' : '';
        ctx.fillText(unlockedLetter ? `${letter.id} ${letter.title}${unread}` : `${letter.id} 未寄达`, cardX + 12, cardY + 22);
        registerButton(`story-letter-${letter.id}`, cardX, cardY, listW - 24, 34, () => {
            if (!unlockedLetter) return;
            uiState.activeStoryLetter = letter.id;
            markStoryRead(letter.id);
            saveGame();
        });
    });
    drawSmallButton(ctx, 'story-page-prev', x + 18, y + detailH - 42, 88, 28, '上一页', () => {
        uiState.storyListPage = Math.max(0, uiState.storyListPage - 1);
    }, uiState.storyListPage > 0 ? '#607d6f' : '#95a5a6');
    drawSmallButton(ctx, 'story-page-next', x + listW - 106, y + detailH - 42, 88, 28, '下一页', () => {
        uiState.storyListPage = Math.min(maxPage, uiState.storyListPage + 1);
    }, uiState.storyListPage < maxPage ? '#607d6f' : '#95a5a6');

    drawDiaryPanel(ctx, detailX, y + detailH + 18, detailW, 196);
}

function getActiveStoryLetter(unlocked) {
    if (uiState.activeStoryLetter && storyState.unlocked[uiState.activeStoryLetter]) {
        return STORY_LETTERS.find(letter => letter.id === uiState.activeStoryLetter);
    }
    return unlocked[unlocked.length - 1] || null;
}

function drawDiaryPanel(ctx, x, y, w, h) {
    ensureDiaryDay();
    drawRoundRect(ctx, x, y, w, h, 8, '#ffffff', '#d5ddd8');
    drawTextLine(ctx, `今日农场日记 ${farmDiary.dayKey}`, x + 18, y + 28, '#2c3e50', 'bold 16px Arial');
    const entries = farmDiary.entries.length > 0 ? farmDiary.entries : [{ time: '--:--', text: '今天还没有新的记录。' }];
    entries.slice(0, 6).forEach((entry, index) => {
        const rowY = y + 58 + index * 24;
        drawTextLine(ctx, entry.time, x + 18, rowY, '#7f8c8d', '12px Arial');
        drawTextLine(ctx, entry.text, x + 72, rowY, '#53645c', '13px Arial');
    });
}

function drawVisitorsPanel(ctx, x, y) {
    const ids = getVisitorIds();
    if (!uiState.activeVisitor || !ids.includes(uiState.activeVisitor)) uiState.activeVisitor = ids[0];
    const activeId = uiState.activeVisitor;
    const activeConfig = VISITOR_CONFIG[activeId];
    const activeUnlocked = isVisitorUnlocked(activeId);
    const activeProgress = getVisitorProgress(activeId);
    const activeReady = canDeliverVisitorTask(activeId);
    const listW = 238;
    const detailX = x + listW + 22;
    const detailW = UI_CONTENT.w - listW - 38;

    drawTextLine(ctx, '访客档案', x, y, '#2c3e50', 'bold 16px Arial');
    y += 26;

    drawRoundRect(ctx, x, y, listW, 342, 8, '#ffffff', '#d5ddd8');
    ids.forEach((id, index) => {
        const config = VISITOR_CONFIG[id];
        const unlocked = isVisitorUnlocked(id);
        const progress = getVisitorProgress(id);
        const ready = canDeliverVisitorTask(id);
        const selected = id === activeId;
        const rowY = y + 16 + index * 78;
        drawRoundRect(ctx, x + 14, rowY, listW - 28, 64, 8, selected ? '#fff7d6' : unlocked ? '#f8faf7' : '#e3e8e4', selected ? '#f39c12' : '#d5ddd8');
        ctx.fillStyle = unlocked ? '#263238' : '#7f8c8d';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(unlocked ? config.icon : '？', x + 28, rowY + 39);
        ctx.font = 'bold 15px Arial';
        ctx.fillText(unlocked ? config.name : '未到访', x + 64, rowY + 25);
        ctx.font = '12px Arial';
        ctx.fillStyle = ready ? '#e67e22' : progress.finished ? '#27ae60' : '#607d6f';
        ctx.fillText(unlocked ? (progress.finished ? '已入驻' : ready ? '可交付' : `委托 ${progress.state.step + 1}/${config.chain.length}`) : config.unlockHint, x + 64, rowY + 48);
        registerButton(`visitor-select-${id}`, x + 14, rowY, listW - 28, 64, () => {
            uiState.activeVisitor = id;
            if (uiState.visitorDialog?.id !== id) uiState.visitorDialog = null;
        });
    });

    drawVisitorDetailCard(ctx, activeId, detailX, y, detailW, 342, activeConfig, activeUnlocked, activeProgress, activeReady);
}

function drawVisitorDetailCard(ctx, id, x, y, w, h, config, unlocked, progress, ready) {
    drawRoundRect(ctx, x, y, w, h, 8, '#fffdf2', '#d8caa2');
    ctx.fillStyle = unlocked ? '#263238' : '#7f8c8d';
    ctx.font = 'bold 34px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(unlocked ? config.icon : '？', x + 24, y + 48);
    ctx.font = 'bold 22px Arial';
    ctx.fillText(unlocked ? config.name : '尚未到访', x + 72, y + 38);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#607d6f';
    ctx.fillText(unlocked ? config.role : config.unlockHint, x + 74, y + 64);
    if (id === 'amir' && !unlocked) {
        drawTextLine(ctx, getVisitorStatusText(id), x + 74, y + 88, '#607d6f', 'bold 13px Arial');
    }
    drawRoundRect(ctx, x + w - 124, y + 22, 96, 28, 14, progress.finished ? '#27ae60' : ready ? '#f39c12' : '#607d6f', null);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(progress.finished ? '已入驻' : ready ? '可交付' : '进行中', x + w - 76, y + 41);

    const dialog = uiState.visitorDialog?.id === id ? uiState.visitorDialog : null;
    if (dialog) {
        drawVisitorDialogueBox(ctx, x + 24, y + 92, w - 48, 184, config, dialog.line);
    } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 15px Arial';
        ctx.fillText('当前委托', x + 24, y + 104);
        if (!unlocked) {
            const statusText = id === 'amir' ? getVisitorStatusText(id) : config.unlockHint;
            drawWrappedText(ctx, statusText, x + 24, y + 136, w - 48, 24, '#53645c', '14px Arial');
        } else if (progress.finished) {
            drawWrappedText(ctx, '任务链已完成。访客已经入驻农场，后续会解锁更多日常对话和特殊事件。', x + 24, y + 136, w - 48, 25, '#53645c', '14px Arial');
        } else {
            ctx.fillStyle = '#263238';
            ctx.font = 'bold 17px Arial';
            ctx.fillText(progress.task.title, x + 24, y + 134);
            drawWrappedText(ctx, progress.task.text, x + 24, y + 164, w - 48, 25, '#53645c', '14px Arial');
            drawVisitorNeedChips(ctx, progress.task.need, x + 24, y + 226, w - 48);
            drawTextLine(ctx, `奖励 ${formatRewardText(progress.task.reward)}`, x + 24, y + 284, '#2c3e50', 'bold 14px Arial');
        }
    }

    drawSmallButton(ctx, `visitor-talk-${id}`, x + w - 220, y + h - 48, 92, 32, progress.finished ? '闲聊' : '对话', () => openVisitorTalk(id), unlocked ? '#2980b9' : '#95a5a6');
    drawSmallButton(ctx, `visitor-deliver-${id}`, x + w - 116, y + h - 48, 92, 32, progress.finished ? '已入驻' : '交付', () => deliverVisitorTask(id), ready ? '#27ae60' : '#95a5a6');
}

function drawVisitorDialogueBox(ctx, x, y, w, h, config, line) {
    drawRoundRect(ctx, x, y, w, h, 8, '#ffffff', '#d8caa2');
    drawRoundRect(ctx, x + 12, y + 12, 52, 52, 26, '#f7f1d5', '#d8caa2');
    ctx.fillStyle = '#263238';
    ctx.font = '26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.icon, x + 38, y + 47);
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${config.name} 说`, x + 78, y + 32);
    drawRoundRect(ctx, x + 78, y + 48, w - 102, 92, 8, '#fffdf2', '#eee1bd');
    drawWrappedText(ctx, line, x + 94, y + 78, w - 134, 25, '#3d4f48', '15px Arial');
    drawTextLine(ctx, '再次点击可切换下一句。', x + 78, y + h - 18, '#7f8c8d', '12px Arial');
}

function drawVisitorNeedChips(ctx, need, x, y, maxW) {
    let cursorX = x;
    let cursorY = y;
    Object.entries(need).forEach(([itemId, amount]) => {
        const config = CROP_CONFIG[itemId];
        const owned = itemId === 'coins' ? coins : (inventory[itemId] || 0);
        const label = itemId === 'coins' ? `金币 ${owned}/${amount}` : `${config.icon} ${config.name} ${owned}/${amount}`;
        const chipW = Math.min(170, 48 + label.length * 12);
        if (cursorX + chipW > x + maxW) {
            cursorX = x;
            cursorY += 34;
        }
        drawRoundRect(ctx, cursorX, cursorY, chipW, 26, 13, owned >= amount ? '#e8f8ef' : '#fff1e8', owned >= amount ? '#27ae60' : '#e67e22');
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, cursorX + chipW / 2, cursorY + 17);
        cursorX += chipW + 10;
    });
}

function formatRewardText(reward = {}) {
    const parts = [];
    if (reward.coins) parts.push(`${reward.coins}币`);
    if (reward.exp) parts.push(`${reward.exp}EXP`);
    if (reward.talentPoints) parts.push(`天赋点x${reward.talentPoints}`);
    if (reward.unlockSeed) parts.push(`种子：${CROP_CONFIG[reward.unlockSeed]?.name || reward.unlockSeed}`);
    if (reward.unlockVariant) parts.push('变异线索');
    if (reward.variantBonus) parts.push('变异概率提升');
    if (reward.buildingDiscount) parts.push('建筑折扣');
    if (reward.miracleDiscount) parts.push('奇迹材料折扣');
    if (reward.codexNote) parts.push(reward.codexNote);
    if (reward.endingClue) parts.push('结局线索');
    return parts.length ? parts.join(' + ') : '剧情推进';
}

function drawMiracleJournalPanel(ctx, x, y) {
    drawTextLine(ctx, '奇迹总览', x, y, '#2c3e50', 'bold 16px Arial');
    y += 26;
    getMiracleIds().forEach(id => {
        const config = MIRACLE_CONFIG[id];
        const state = ensureMiracleState(id);
        const detail = state.completed ? config.effect : getMiracleProgressText(id);
        const cardW = UI_CONTENT.w - 16;
        drawInfoCard(ctx, x, y, cardW, 78, `${config.icon} ${config.name}`, detail, state.completed ? '#27ae60' : '#607d6f');
        y += 92;
    });
    drawTextLine(ctx, '建设入口在“建造-奇迹”页，完成后效果会立即进入全局计算。', x, y + 8, '#53645c', '13px Arial');
}

function drawEndingsPanel(ctx, x, y) {
    checkEndingUnlocks(true);
    const unlockedCount = Object.keys(endingState.unlocked || {}).length;
    drawTextLine(ctx, `结局收藏：${unlockedCount}/${Object.keys(ENDING_CONFIG).length}`, x, y, '#2c3e50', 'bold 16px Arial');
    y += 28;
    Object.entries(ENDING_CONFIG).forEach(([id, ending]) => {
        const unlocked = !!endingState.unlocked[id];
        const unread = unlocked && !endingState.read[id];
        drawRoundRect(ctx, x, y, UI_CONTENT.w - 16, 104, 8, unlocked ? '#ffffff' : '#e3e8e4', unread ? '#f39c12' : '#d5ddd8');
        ctx.fillStyle = unlocked ? '#263238' : '#7f8c8d';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(unlocked ? ending.icon : '？', x + 36, y + 42);
        ctx.textAlign = 'left';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(unlocked ? `${ending.title}${unread ? ' •' : ''}` : '未解锁结局', x + 76, y + 28);
        ctx.font = '13px Arial';
        if (unlocked) {
            ending.text.forEach((line, index) => {
                ctx.fillText(line, x + 76, y + 54 + index * 22);
            });
        } else {
            ctx.fillText('继续推进奇迹、访客、图鉴与加工系统。', x + 76, y + 58);
        }
        registerButton(`ending-read-${id}`, x, y, UI_CONTENT.w - 16, 104, () => markEndingRead(id));
        y += 118;
    });
}

function drawSkillCards(ctx, x, y) {
    drawTextLine(ctx, '主动技能', x, y, '#2c3e50', 'bold 16px Arial');
    y += 24;
    for (const id of Object.keys(skills)) {
        const skill = skills[id];
        const left = Math.max(0, Math.ceil((getSkillCd(id) - (Date.now() - skill.lastUsed)) / 1000));
        const upgradeW = 112;
        const cardW = UI_CONTENT.w - upgradeW - 28;
        drawInfoCard(ctx, x, y, cardW, 62, `${skill.name} Lv.${skill.level}`, `快捷使用在主界面右下角  |  ${left > 0 ? `冷却中：${left}s` : '当前可使用'}`, '#8e44ad');
        drawSmallButton(ctx, `skill-up-${id}`, x + cardW + 24, y + 15, upgradeW, 32, `升级 ${getSkillCost(id)}币`, () => upgradeSkill(id), coins >= getSkillCost(id) ? '#27ae60' : '#95a5a6');
        y += 72;
    }
    return y;
}

function drawStaffCards(ctx, x, y) {
    const humanCount = workers.filter(worker => worker.type === 'human').length;
    const droneCount = workers.filter(worker => worker.type === 'drone').length;
    const humanCost = 600;
    const droneCost = 1800;
    const droneUnlocked = playerLevel >= 5 || getTalentLevel('industry') >= 4;
    drawTextLine(ctx, '员工与无人机', x, y, '#2c3e50', 'bold 16px Arial');
    y += 24;
    const cardW = UI_CONTENT.w - 150;
    drawInfoCard(ctx, x, y, cardW, 68, `👷 农场员工 x${humanCount}`, '自动巡视农田，成熟时收割，空地会播当前选中的种子。', '#f39c12');
    drawSmallButton(ctx, 'hire-human', x + cardW + 18, y + 8, 104, 28, `雇佣 ${humanCost}币`, () => hireWorker('human'), coins >= humanCost ? '#27ae60' : '#95a5a6');
    drawSmallButton(ctx, 'dismiss-human', x + cardW + 18, y + 40, 104, 28, '召回', () => dismissWorker('human'), humanCount > 0 ? '#e74c3c' : '#95a5a6');
    y += 80;
    drawInfoCard(ctx, x, y, cardW, 68, `🚁 无人机 x${droneCount}`, droneUnlocked ? '更快巡视农田；工业 L4 会额外自动收取动物产物。' : 'Lv.5 或工业领袖 L4 后解锁。', '#2980b9');
    drawSmallButton(ctx, 'hire-drone', x + cardW + 18, y + 8, 104, 28, `雇佣 ${droneCost}币`, () => hireWorker('drone'), droneUnlocked && coins >= droneCost ? '#27ae60' : '#95a5a6');
    drawSmallButton(ctx, 'dismiss-drone', x + cardW + 18, y + 40, 104, 28, '召回', () => dismissWorker('drone'), droneCount > 0 ? '#e74c3c' : '#95a5a6');
    y += 80;
    drawTextLine(ctx, getTalentLevel('industry') >= 2 ? '工业 L2 自动播种机：已启用' : '工业 L2 解锁自动播种机', x, y, '#53645c', '13px Arial');
    drawTextLine(ctx, getTalentLevel('industry') >= 4 ? '工业 L4 动物产物无人机：已启用' : '工业 L4 解锁动物产物无人机', x, y + 22, '#53645c', '13px Arial');
    return y + 44;
}

function drawSeedsPanel(ctx) {
    const cropIds = getCropIds().filter(id => !CROP_CONFIG[id].hidden || isItemUnlocked(id));
    const animalIds = getAnimalIds();
    const x = UI_CONTENT.x;
    let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.seeds;
    drawTextLine(ctx, '选择种子后窗口会关闭，点击农田即可种植。动物选择后点击对应区域放置。', x, y, '#53645c', '14px Arial');
    y += 34;
    drawGridItems(ctx, cropIds, x, y, 'crop');
    y += Math.ceil(cropIds.length / 4) * 86 + 28;
    drawTextLine(ctx, '动物与辅助', x, y, '#2c3e50', 'bold 16px Arial');
    drawGridItems(ctx, animalIds, x, y + 18, 'animal');
}

function drawBuildPanel(ctx) {
    const tab = uiState.activeTabs.build;
    if (tab === 'ranch') {
        let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.build;
        Object.keys(RANCH_BUILDING_CONFIG).forEach(id => {
            const config = RANCH_BUILDING_CONFIG[id];
            const level = getRanchBuildingLevel(id);
            const maxed = level >= config.maxLevel;
            const unlocked = playerLevel >= config.reqLevel;
            const cost = getRanchBuildingCost(id);
            const capacity = getAnimalCapacity(config.animal);
            const owned = getAnimalCount(config.animal);
            const fed = getFedAnimalCount(config.animal);
            const bonus = Math.round(getAnimalBuildingBonus(config.animal) * 100);
            drawRanchBuildingCard(ctx, id, UI_CONTENT.x, y, UI_CONTENT.w, {
                config,
                level,
                maxed,
                unlocked,
                cost,
                capacity,
                owned,
                fed,
                bonus
            });
            y += 104;
        });
        return;
    }
    if (tab === 'processing') {
        let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.build;
        Object.keys(PROCESSING_BUILDING_CONFIG).forEach(id => {
            const config = PROCESSING_BUILDING_CONFIG[id];
            const level = getProcessingBuildingLevel(id);
            const maxed = level >= config.maxLevel;
            const unlocked = isProcessingBuildingUnlocked(id);
            const cost = getProcessingBuildingCost(id);
            drawProcessingBuildingCard(ctx, id, UI_CONTENT.x, y, UI_CONTENT.w, { config, level, maxed, unlocked, cost });
            y += 148;
        });
        return;
    }
    if (tab === 'miracle') {
        let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.build;
        getMiracleIds().forEach(id => {
            drawMiracleBuildCard(ctx, id, UI_CONTENT.x, y, UI_CONTENT.w);
            y += 166;
        });
    }
}

function drawMiracleBuildCard(ctx, id, x, y, w) {
    const config = MIRACLE_CONFIG[id];
    const state = ensureMiracleState(id);
    const stage = getMiracleStage(id);
    const ready = stage && hasNeed(stage.need);
    const h = 150;
    drawRoundRect(ctx, x, y, w, h, 8, state.completed ? '#f0fff4' : '#ffffff', state.completed ? '#27ae60' : '#d5ddd8');
    ctx.fillStyle = state.completed ? '#27ae60' : '#607d6f';
    ctx.fillRect(x, y, 8, h);
    drawRoundRect(ctx, x + 18, y + 18, 78, 78, 8, '#f7f1d5', '#95a5a6');
    ctx.fillStyle = '#263238';
    ctx.font = 'bold 34px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.icon, x + 57, y + 66);
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(config.name, x + 116, y + 30);
    drawRoundRect(ctx, x + 116, y + 42, 108, 24, 12, state.completed ? '#27ae60' : '#607d6f', null);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.completed ? '已完成' : `阶段 ${state.stage + 1}/${config.stages.length}`, x + 170, y + 59);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#53645c';
    ctx.font = '13px Arial';
    drawWrappedText(ctx, state.completed ? config.effect : stage.title, x + 116, y + 86, w - 300, 20, '#53645c', '13px Arial');

    const materialsX = x + Math.max(360, Math.floor(w * 0.48));
    const materialsW = w - (materialsX - x) - 160;
    drawTextLine(ctx, state.completed ? '奇迹效果' : '所需材料', materialsX, y + 30, '#2c3e50', 'bold 14px Arial');
    if (state.completed) {
        drawWrappedText(ctx, config.effect, materialsX, y + 58, materialsW, 21, '#53645c', '13px Arial');
    } else {
        drawNeedChips(ctx, stage.need, materialsX, y + 48, materialsW);
    }

    const barX = x + 116;
    const barY = y + h - 34;
    const barW = Math.min(430, w - 420);
    drawRoundRect(ctx, barX, barY, barW, 12, 6, '#e3e8e4', null);
    drawRoundRect(ctx, barX, barY, barW * (state.stage / config.stages.length), 12, 6, state.completed ? '#27ae60' : '#f39c12', null);
    drawTextLine(ctx, `${Math.round((state.stage / config.stages.length) * 100)}%`, barX + barW + 12, barY + 11, '#53645c', '12px Arial');

    const btnX = x + w - 138;
    drawSmallButton(ctx, `miracle-submit-${id}`, btnX, y + 52, 108, 36, state.completed ? '已完成' : '提交材料', () => submitMiracleStage(id), ready ? '#27ae60' : '#95a5a6');
    ctx.fillStyle = state.completed ? '#27ae60' : ready ? '#27ae60' : '#e74c3c';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.completed ? '效果已生效' : ready ? '材料齐全' : '材料不足', btnX + 54, y + 112);
}

function drawNeedChips(ctx, need, x, y, maxW) {
    let cursorX = x;
    let cursorY = y;
    Object.entries(need).forEach(([itemId, amount]) => {
        const owned = itemId === 'coins' ? coins : inventory[itemId] || 0;
        const label = itemId === 'coins' ? `金币 ${owned}/${amount}` : `${CROP_CONFIG[itemId].icon} ${CROP_CONFIG[itemId].name} ${owned}/${amount}`;
        const chipW = Math.min(170, 52 + label.length * 11);
        if (cursorX + chipW > x + maxW) {
            cursorX = x;
            cursorY += 32;
        }
        drawRoundRect(ctx, cursorX, cursorY, chipW, 25, 13, owned >= amount ? '#e8f8ef' : '#fff1e8', owned >= amount ? '#27ae60' : '#e67e22');
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, cursorX + chipW / 2, cursorY + 17);
        cursorX += chipW + 8;
    });
}

function drawRanchBuildingCard(ctx, id, x, y, w, data) {
    const { config, level, maxed, unlocked, cost, capacity, owned, fed, bonus } = data;
    const fill = unlocked ? '#ffffff' : '#eef1ef';
    const stroke = unlocked ? '#d5ddd8' : '#c6cfca';
    drawRoundRect(ctx, x, y, w, 92, 8, fill, stroke);
    ctx.fillStyle = config.color;
    ctx.fillRect(x, y, 8, 92);

    drawRoundRect(ctx, x + 18, y + 14, 62, 62, 8, unlocked ? '#f7f1d5' : '#d4d8d6', '#95a5a6');
    ctx.fillStyle = unlocked ? '#263238' : '#7f8c8d';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.icon, x + 49, y + 54);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#263238';
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`${config.name} Lv.${level}/${config.maxLevel}`, x + 96, y + 28);
    drawRoundRect(ctx, x + 222, y + 10, 82, 24, 12, level > 0 ? '#34495e' : '#95a5a6', null);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(level > 0 ? '已建造' : `Lv.${config.reqLevel}`, x + 263, y + 27);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#53645c';
    ctx.font = '13px Arial';
    const product = CROP_CONFIG[config.product].name;
    const feedNames = getAnimalFeedOptions(config.animal).map(id => CROP_CONFIG[id]?.name).filter(Boolean).join('/');
    ctx.fillText(unlocked ? `${CROP_CONFIG[config.animal].name} -> ${product}  饱腹${fed}/${owned}  饲料:${feedNames || '无'}  间隔-${bonus}%` : `达到 Lv.${config.reqLevel} 后解锁，可提升${product}产出`, x + 96, y + 52);

    const barX = x + 96;
    const barY = y + 64;
    const barW = Math.min(270, w - 420);
    drawRoundRect(ctx, barX, barY, barW, 12, 6, '#e3e8e4', null);
    const ratio = Math.max(0, Math.min(1, owned / Math.max(1, capacity)));
    if (ratio > 0) drawRoundRect(ctx, barX, barY, barW * ratio, 12, 6, ratio >= 1 ? '#e74c3c' : '#27ae60', null);
    ctx.fillStyle = '#53645c';
    ctx.font = '12px Arial';
    ctx.fillText(`容量 ${owned}/${capacity}`, barX + barW + 12, barY + 11);

    const btnX = x + w - 230;
    drawSmallButton(ctx, `ranch-up-${id}`, btnX, y + 14, 98, 32, maxed ? '满级' : level === 0 ? '建造' : '升级', () => upgradeRanchBuilding(id), unlocked && !maxed && coins >= cost ? '#27ae60' : '#95a5a6');
    drawSmallButton(ctx, `ranch-select-${id}`, btnX + 112, y + 14, 104, 32, '放置动物', () => { selectTool(config.animal); closePanel(); }, unlocked ? '#2980b9' : '#95a5a6');
    ctx.fillStyle = maxed ? '#53645c' : coins >= cost ? '#2c3e50' : '#e74c3c';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(maxed ? '已达到最高等级' : `费用 ${cost}币`, btnX + 49, y + 68);
}

function drawProcessingBuildingCard(ctx, id, x, y, w, data) {
    const { config, level, maxed, unlocked, cost } = data;
    const job = getProcessingJob(id);
    const recipeIndex = Math.max(0, Math.min(config.recipes.length - 1, uiState.processingRecipeIndex[id] || 0));
    uiState.processingRecipeIndex[id] = recipeIndex;
    const recipeId = config.recipes[recipeIndex];
    const recipe = RECIPE_CONFIG[recipeId];
    const recipeDiscovered = isRecipeDiscovered(recipeId);
    drawRoundRect(ctx, x, y, w, 136, 8, unlocked ? '#ffffff' : '#eef1ef', unlocked ? '#d5ddd8' : '#c6cfca');
    ctx.fillStyle = unlocked ? config.color : '#9da8a2';
    ctx.fillRect(x, y, 8, 136);

    drawRoundRect(ctx, x + 18, y + 14, 62, 62, 8, unlocked ? '#f7f1d5' : '#d4d8d6', '#95a5a6');
    ctx.fillStyle = unlocked ? '#263238' : '#7f8c8d';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(unlocked ? config.icon : '●', x + 49, y + 54);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#263238';
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`${config.name} Lv.${level}/${config.maxLevel}`, x + 96, y + 28);
    ctx.fillStyle = '#53645c';
    ctx.font = '13px Arial';
    const speed = Math.round(level * config.speedBonusPerLevel * 100);
    ctx.fillText(unlocked ? `配方 ${recipeIndex + 1}/${config.recipes.length}  加工效率 +${speed}%  ${recipeDiscovered ? `单批 ${Math.ceil(getRecipeDuration(recipeId, 1) / 1000)} 秒` : '配方未发现'}` : (config.unlockHint || `达到 Lv.${config.reqLevel} 后解锁`), x + 96, y + 52);

    const recipeX = x + 96;
    const inputText = Object.entries(recipe.inputs).map(([itemId, amount]) => `${CROP_CONFIG[itemId].name}x${amount}`).join(' + ');
    drawRoundRect(ctx, recipeX, y + 66, 330, 30, 6, unlocked && recipeDiscovered ? '#f8faf7' : '#eef1ef', canCraftRecipe(recipeId) ? '#27ae60' : '#d5ddd8');
    ctx.fillStyle = '#53645c';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(unlocked && recipeDiscovered ? `${inputText} -> ${CROP_CONFIG[recipe.output].name}x${recipe.outputAmount}` : '配方剪影：先收集对应原料后显示', recipeX + 10, y + 86);

    const progressX = recipeX;
    const progressY = y + 108;
    const progressW = Math.min(380, w - 450);
    drawRoundRect(ctx, progressX, progressY, progressW, 12, 6, '#e3e8e4', null);
    if (job) {
        const progress = Math.max(0, Math.min(1, (Date.now() - job.startedAt) / job.duration));
        drawRoundRect(ctx, progressX, progressY, progressW * progress, 12, 6, '#f39c12', null);
        const left = Math.max(0, Math.ceil((job.duration - (Date.now() - job.startedAt)) / 1000));
        ctx.fillStyle = '#53645c';
        ctx.font = '12px Arial';
        ctx.fillText(`加工中：${RECIPE_CONFIG[job.recipeId].name} x${job.amount}，剩余 ${left}s`, progressX + progressW + 12, progressY + 11);
    } else {
        ctx.fillStyle = '#53645c';
        ctx.font = '12px Arial';
        ctx.fillText(processingAuto[id] ? '自动等待材料' : '空闲', progressX + progressW + 12, progressY + 11);
    }

    const btnX = x + w - 230;
    drawSmallButton(ctx, `process-up-${id}`, btnX, y + 14, 98, 32, maxed ? '满级' : level === 0 ? '建造' : '升级', () => upgradeProcessingBuilding(id), unlocked && !maxed && coins >= cost ? '#27ae60' : '#95a5a6');
    drawSmallButton(ctx, `recipe-prev-${id}`, btnX, y + 92, 44, 28, '<', () => cycleProcessingRecipe(id, -1), unlocked && config.recipes.length > 1 ? '#7f8c8d' : '#95a5a6');
    drawSmallButton(ctx, `recipe-next-${id}`, btnX + 54, y + 92, 44, 28, '>', () => cycleProcessingRecipe(id, 1), unlocked && config.recipes.length > 1 ? '#7f8c8d' : '#95a5a6');
    drawSmallButton(ctx, `craft-${recipeId}`, btnX, y + 54, 98, 30, job ? '加工中' : '投料', () => startRecipeProcessing(recipeId, 1), canCraftRecipe(recipeId) ? '#27ae60' : '#95a5a6');
    drawSmallButton(ctx, `craft-max-${recipeId}`, btnX + 112, y + 54, 98, 30, job ? '等待' : '投一批', () => startRecipeProcessing(recipeId, getRecipeBatchAmount(recipeId)), canCraftRecipe(recipeId) ? '#2980b9' : '#95a5a6');
    drawSmallButton(ctx, `process-auto-${id}`, btnX + 112, y + 14, 98, 32, processingAuto[id] ? '自动开' : '自动关', () => toggleProcessingAuto(id), processingAuto[id] ? '#f39c12' : '#7f8c8d');
    ctx.fillStyle = maxed ? '#53645c' : coins >= cost ? '#2c3e50' : '#e74c3c';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(maxed ? '已达到最高等级' : `费用 ${cost}币`, btnX + 49, y + 128);
}

function cycleProcessingRecipe(buildingId, delta) {
    const recipes = PROCESSING_BUILDING_CONFIG[buildingId]?.recipes || [];
    if (recipes.length <= 1) return;
    const current = uiState.processingRecipeIndex[buildingId] || 0;
    uiState.processingRecipeIndex[buildingId] = (current + delta + recipes.length) % recipes.length;
}

function drawOrdersPanel(ctx) {
    const x = UI_CONTENT.x;
    let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.orders;
    drawTextLine(ctx, '普通订单看板', x, y, '#2c3e50', 'bold 16px Arial');
    y += 28;
    tasks.forEach((task, index) => {
        const config = CROP_CONFIG[task.item];
        if (!config) return;
        const enough = inventory[task.item] >= task.amount;
        const cardW = UI_CONTENT.w - 160;
        drawInfoCard(ctx, x, y, cardW, 78, `${config.icon} ${config.name} x${task.amount}`, `进度 ${inventory[task.item]}/${task.amount}  奖励 ${task.reward}币 + ${task.exp}EXP`, enough ? '#27ae60' : '#f39c12');
        drawSmallButton(ctx, `order-${index}`, x + cardW + 28, y + 22, 100, 32, enough ? '交付' : '未达标', () => deliverTask(index), enough ? '#27ae60' : '#95a5a6');
        y += 90;
    });
    y += 12;
    drawTextLine(ctx, '访客委托', x, y, '#2c3e50', 'bold 16px Arial');
    y += 28;
    const visitorTasks = getVisitorIds().filter(id => isVisitorUnlocked(id) && !getVisitorProgress(id).finished);
    if (visitorTasks.length === 0) {
        drawTextLine(ctx, '暂无可交付访客委托，继续提升农场进度。', x, y, '#53645c', '14px Arial');
        return;
    }
    visitorTasks.forEach(id => {
        const config = VISITOR_CONFIG[id];
        const progress = getVisitorProgress(id);
        const ready = canDeliverVisitorTask(id);
        const cardW = UI_CONTENT.w - 160;
        drawInfoCard(ctx, x, y, cardW, 78, `${config.icon} ${config.name}：${progress.task.title}`, `${formatVisitorNeed(progress.task.need)}  奖励 ${formatRewardText(progress.task.reward)}`, ready ? '#27ae60' : '#f39c12');
        drawSmallButton(ctx, `order-visitor-${id}`, x + cardW + 28, y + 22, 100, 32, ready ? '交付' : '未达标', () => deliverVisitorTask(id), ready ? '#27ae60' : '#95a5a6');
        y += 90;
    });
}

function drawMarketPanel(ctx) {
    const ids = getMarketItemIds().filter(isMarketItemUnlocked);
    const x = UI_CONTENT.x;
    let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.market;
    drawTextLine(ctx, '像素交易所：价格每 10 秒波动一次。', x, y, '#53645c', '14px Arial');
    y += 30;
    if (ids.length === 0) {
        drawTextLine(ctx, '市场会在首次收获或获得产物后逐步上架。', x, y, '#53645c', '15px Arial');
        return;
    }
    ids.forEach(id => {
        if (uiState.marketAmounts[id] === undefined) uiState.marketAmounts[id] = 1;
        const config = CROP_CONFIG[id];
        const amount = Math.min(Math.max(1, uiState.marketAmounts[id]), Math.max(1, inventory[id] || 0));
        uiState.marketAmounts[id] = amount;
        const market = marketState[id] || { price: config.basePrice, trend: 0 };
        const price = Math.max(1, Math.floor((market.price || config.basePrice || 1) * getCategoryPriceMultiplier(id)));
        const trend = market.trend > 0.2 ? '↑' : market.trend < -0.2 ? '↓' : '-';
        const cardW = UI_CONTENT.w - 332;
        drawInfoCard(ctx, x, y, cardW, 62, `${config.icon} ${config.name}  库存 ${inventory[id]}`, `当前价 ${price}币 ${trend}  本次 ${amount} 个 = ${amount * price}币`, '#2980b9');
        drawSmallButton(ctx, `market-minus-${id}`, x + cardW + 24, y + 15, 36, 30, '-', () => { if (uiState.activeMarketInput === id) commitMarketInput(); changeMarketAmount(id, -1); }, '#7f8c8d');
        drawMarketAmountInput(ctx, id, x + cardW + 66, y + 15, 74, 30, amount);
        drawSmallButton(ctx, `market-plus-${id}`, x + cardW + 148, y + 15, 36, 30, '+', () => { if (uiState.activeMarketInput === id) commitMarketInput(); changeMarketAmount(id, 1); }, '#7f8c8d');
        drawSmallButton(ctx, `market-max-${id}`, x + cardW + 192, y + 15, 48, 30, '全选', () => setMarketAmount(id, inventory[id]), '#7f8c8d');
        drawSmallButton(ctx, `market-sell-${id}`, x + cardW + 248, y + 15, 76, 30, '卖出', () => { if (uiState.activeMarketInput === id) commitMarketInput(); sellItemAmount(id, uiState.marketAmounts[id]); }, inventory[id] > 0 ? '#f39c12' : '#95a5a6');
        y += 72;
    });
}

function drawMarketAmountInput(ctx, id, x, y, w, h, amount) {
    const active = uiState.activeMarketInput === id;
    const hover = isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    drawRoundRect(ctx, x, y, w, h, 6, active ? '#fff7d6' : hover ? '#f7f1d5' : '#ffffff', active ? '#e74c3c' : '#95a5a6');
    ctx.fillStyle = '#263238';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    const label = active ? (uiState.marketDraft || '|') : String(amount);
    ctx.fillText(label, x + w / 2, y + 20);
    registerButton(`market-input-${id}`, x, y, w, h, () => beginMarketInput(id));
}

function drawGridItems(ctx, ids, x, y, type) {
    const cardW = 178;
    const cardH = 72;
    ids.forEach((id, index) => {
        const config = CROP_CONFIG[id];
        const col = index % 4;
        const row = Math.floor(index / 4);
        const px = x + col * (cardW + 14);
        const py = y + row * (cardH + 14);
        const unlocked = isItemUnlocked(id);
        const selected = currentSelectedTool === id;
        drawRoundRect(ctx, px, py, cardW, cardH, 8, selected ? '#fff7d6' : unlocked ? '#ffffff' : '#d4d8d6', selected ? '#e74c3c' : '#95a5a6');
        ctx.fillStyle = unlocked ? '#263238' : '#7f8c8d';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(unlocked ? `${config.icon} ${config.name}` : `？？？`, px + 12, py + 28);
        ctx.font = '12px Arial';
        const detail = type === 'crop'
            ? (unlocked ? `${config.seedPrice}币 / Lv.${config.reqLevel}` : (config.unlockHint || `Lv.${config.reqLevel} 解锁`))
            : (unlocked ? `${config.price}币 / Lv.${config.reqLevel}` : (config.unlockHint || `Lv.${config.reqLevel} 解锁`));
        ctx.fillText(detail, px + 12, py + 54);
        registerButton(`select-${id}`, px, py, cardW, cardH, () => {
            if (!unlocked) return;
            selectTool(id);
            closePanel();
        });
    });
}

function drawTileTip(ctx) {
    if (!uiState.tileTip || Date.now() > uiState.tileTip.until) {
        uiState.tileTip = null;
        return;
    }
    const tip = uiState.tileTip;
    const x = Math.min(canvas.width - 240, Math.max(16, tip.x));
    const y = Math.min(canvas.height - UI_BAR_HEIGHT - 112, Math.max(58, tip.y));
    drawRoundRect(ctx, x, y, 224, 92, 8, 'rgba(248, 249, 244, 0.96)', '#607d6f');
    drawTextLine(ctx, tip.title, x + 14, y + 26, '#263238', 'bold 15px Arial');
    drawTextLine(ctx, tip.line1, x + 14, y + 52, '#53645c', '13px Arial');
    drawTextLine(ctx, tip.line2, x + 14, y + 74, '#53645c', '13px Arial');
}

function drawTabs(ctx, panelId, tabs, x, y) {
    let cursorX = x;
    tabs.forEach(([id, label]) => {
        const active = uiState.activeTabs[panelId] === id;
        const width = Math.max(70, label.length * 16 + 26);
        drawRoundRect(ctx, cursorX, y, width, 30, 7, active ? '#f1c40f' : '#e8ece8', active ? '#d35400' : '#95a5a6');
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, cursorX + width / 2, y + 20);
        registerButton(`tab-${panelId}-${id}`, cursorX, y, width, 30, () => {
            uiState.activeTabs[panelId] = id;
            if (panelId === 'codex') uiState.scroll.journal = 0;
            else uiState.scroll[panelId] = 0;
        });
        cursorX += width + 8;
    });
}

function drawInfoCard(ctx, x, y, w, h, title, body, accent) {
    drawRoundRect(ctx, x, y, w, h, 7, '#ffffff', '#d5ddd8');
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 4, h);
    drawTextLine(ctx, title, x + 14, y + 25, '#263238', 'bold 15px Arial');
    drawTextLine(ctx, body, x + 14, y + 50, '#53645c', '13px Arial');
}

function drawSmallButton(ctx, id, x, y, w, h, label, action, color = '#27ae60') {
    if (isClippedContentControl(id, y, h)) return;
    const disabled = !action || color === '#95a5a6';
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    drawRoundRect(ctx, x, y, w, h, 6, disabled ? '#95a5a6' : hover ? lightenColor(color) : color, '#607d6f');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawMultiLineButton(ctx, id, x, y, w, h, label, action, color = '#27ae60') {
    const disabled = !action || color === '#95a5a6';
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    drawRoundRect(ctx, x, y, w, h, 8, disabled ? '#95a5a6' : hover ? lightenColor(color) : color, '#607d6f');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    const lines = label.split('\n');
    lines.forEach((line, index) => ctx.fillText(line, x + w / 2, y + 21 + index * 19));
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawTextLine(ctx, text, x, y, color, font) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
}

function drawWrappedText(ctx, text, x, y, maxW, lineH, color, font) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'left';
    let line = '';
    for (const char of String(text)) {
        const testLine = line + char;
        if (ctx.measureText(testLine).width > maxW && line) {
            ctx.fillText(line, x, y);
            line = char;
            y += lineH;
        } else {
            line = testLine;
        }
    }
    if (line) {
        ctx.fillText(line, x, y);
        y += lineH;
    }
    return y;
}

function drawRoundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function registerButton(id, x, y, w, h, action) {
    uiState.buttons.push({ id, x, y, w, h, action });
}

function handleCanvasUIClick(x, y) {
    if (window.__bitcnDomMode) {
        return !!(uiState.activeStoryPopup || uiState.settingsOpen);
    }
    if (uiState.activeStoryPopup) {
        for (let i = uiState.buttons.length - 1; i >= 0; i--) {
            const button = uiState.buttons[i];
            if (!button.id.startsWith('story-popup-')) continue;
            if (!isPointInRect(x, y, button.x, button.y, button.w, button.h)) continue;
            if (button.action) button.action();
            return true;
        }
        return true;
    }
    if (uiState.settingsOpen) {
        for (let i = uiState.buttons.length - 1; i >= 0; i--) {
            const button = uiState.buttons[i];
            if (!isSettingsButtonId(button.id)) continue;
            if (!isPointInRect(x, y, button.x, button.y, button.w, button.h)) continue;
            if (button.action) button.action();
            return true;
        }
        if (isPointInRect(x, y, UI_SETTINGS.x, UI_SETTINGS.y, UI_SETTINGS.w, UI_SETTINGS.h)) return true;
        return true;
    }
    for (let i = uiState.buttons.length - 1; i >= 0; i--) {
        const button = uiState.buttons[i];
        if (!isPointInRect(x, y, button.x, button.y, button.w, button.h)) continue;
        if (button.action) button.action();
        return true;
    }
    if (uiState.activeMarketInput) commitMarketInput();
    if (uiState.activePanel && isPointInRect(x, y, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h)) return true;
    return false;
}

function isSettingsButtonId(id) {
    return id === 'close-settings' || id.startsWith('setting-');
}

function handleCanvasUIWheel(x, y, deltaY) {
    if (window.__bitcnDomMode) return false;
    if (uiState.activeStoryPopup) return true;
    if (uiState.settingsOpen) return true;
    if (!uiState.activePanel && !uiState.settingsOpen && isPointInRect(x, y, UI_ORDER_DOCK.x, UI_ORDER_DOCK.y, UI_ORDER_DOCK.w, UI_ORDER_DOCK.h)) {
        const maxScroll = getOrderDockMaxScroll();
        uiState.orderDockScroll = Math.max(0, Math.min(maxScroll, uiState.orderDockScroll + Math.sign(deltaY) * 32));
        return true;
    }
    if (!uiState.activePanel || !isPointInRect(x, y, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h)) return false;
    const key = uiState.activePanel;
    const maxScroll = getPanelMaxScroll(key);
    uiState.scroll[key] = Math.max(0, Math.min(maxScroll, uiState.scroll[key] + Math.sign(deltaY) * 28));
    return true;
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
}

function resetCameraZoom() {
    zoomCamera(1 / (camera.zoom || 1));
}

function toggleSettings(force) {
    uiState.settingsOpen = force === undefined ? !uiState.settingsOpen : force;
}

function togglePanel(id) {
    uiState.activePanel = uiState.activePanel === id ? null : id;
    if (uiState.activePanel) uiState.settingsOpen = false;
    if (id === 'journal' && uiState.activePanel === 'journal') {
        markTutorialJournalOpened();
        const activeLetterIndex = STORY_LETTERS.findIndex(letter => letter.id === uiState.activeStoryLetter);
        if (activeLetterIndex >= 0) uiState.storyListPage = Math.floor(activeLetterIndex / 6);
    }
}

function openTutorialJournal() {
    uiState.activePanel = 'journal';
    uiState.activeTabs.journal = 'codex';
    uiState.settingsOpen = false;
    markTutorialJournalOpened();
}

function markTutorialJournalOpened() {
    if (tutorialState.journalOpened) return;
    tutorialState.journalOpened = true;
    saveGame();
}

function closePanel() {
    uiState.activePanel = null;
}

window.togglePanel = togglePanel;
window.closePanel = closePanel;

function changeMarketAmount(id, delta) {
    const max = Math.max(1, inventory[id] || 0);
    uiState.marketAmounts[id] = Math.max(1, Math.min(max, (uiState.marketAmounts[id] || 1) + delta));
    if (uiState.activeMarketInput === id) uiState.marketDraft = String(uiState.marketAmounts[id]);
}

function setMarketAmount(id, amount) {
    const max = Math.max(1, inventory[id] || 0);
    const next = parseInt(amount, 10);
    uiState.marketAmounts[id] = Math.max(1, Math.min(max, isNaN(next) ? 1 : next));
    if (uiState.activeMarketInput === id) uiState.marketDraft = String(uiState.marketAmounts[id]);
}

function beginMarketInput(id) {
    uiState.activeMarketInput = id;
    uiState.marketDraft = '';
}

function commitMarketInput() {
    if (!uiState.activeMarketInput) return;
    setMarketAmount(uiState.activeMarketInput, uiState.marketDraft || 1);
    uiState.activeMarketInput = null;
    uiState.marketDraft = '';
}

function cancelMarketInput() {
    uiState.activeMarketInput = null;
    uiState.marketDraft = '';
}

function openVisitorTalk(id) {
    if (!isVisitorUnlocked(id)) return;
    uiState.activeVisitor = id;
    const config = VISITOR_CONFIG[id];
    const progress = getVisitorProgress(id);
    const line = getVisitorTalkLine(id);
    uiState.visitorDialog = { id, line };
    stats.visitorTalks = (stats.visitorTalks || 0) + 1;
    if (id === 'leo' && progress.finished) {
        stats.leoRandomTalks = Math.min(3, (stats.leoRandomTalks || 0) + 1);
    }
    checkStoryUnlocks(false);
    checkSeedUnlocks(false);
    const leoHint = id === 'leo' && progress.finished && (stats.leoRandomTalks || 0) < 3
        ? ` ${stats.leoRandomTalks}/3`
        : '';
    effectText = `${config.icon} ${config.name}正在聊天${leoHint}`;
    effectAlpha = 0.8;
    playSound('talk');
    saveGame();
}

function handleCanvasUIKeyDown(e) {
    if (window.__bitcnDomMode) return false;
    if (!uiState.activeMarketInput) return false;
    if (/^\d$/.test(e.key)) {
        uiState.marketDraft = (uiState.marketDraft + e.key).replace(/^0+(\d)/, '$1').slice(0, 4);
        return true;
    }
    if (e.key === 'Backspace') {
        uiState.marketDraft = uiState.marketDraft.slice(0, -1);
        return true;
    }
    if (e.key === 'Enter') {
        commitMarketInput();
        return true;
    }
    if (e.key === 'Escape') {
        cancelMarketInput();
        return true;
    }
    if (e.key === 'ArrowUp') {
        changeMarketAmount(uiState.activeMarketInput, 1);
        return true;
    }
    if (e.key === 'ArrowDown') {
        changeMarketAmount(uiState.activeMarketInput, -1);
        return true;
    }
    return false;
}

function showTileInfo(screenX, screenY, worldX, worldY) {
    if (worldX < farmStartX || worldX > farmStartX + gridWidth || worldY < farmStartY || worldY > farmStartY + gridHeight) return false;
    const col = Math.floor((worldX - farmStartX) / TILE_SIZE);
    const row = Math.floor((worldY - farmStartY) / TILE_SIZE);
    const cell = gridData[row]?.[col];
    if (!cell) return false;
    let title = `地块 (${row + 1}, ${col + 1})`;
    let line1 = '状态：可种植';
    let line2 = `当前工具：${getToolLabel(currentSelectedTool)}`;
    if (cell.state === -1) {
        line1 = `状态：未开垦，需要 ${UNLOCK_PRICE} 币`;
        line2 = '左键可解锁';
    } else if (cell.state === 1) {
        const config = CROP_CONFIG[cell.cropType];
        const left = Math.max(0, Math.ceil((getActualGrowTime(cell.cropType) / getGrowthMultiplier() - (Date.now() - cell.timer)) / 1000));
        line1 = `作物：${config.icon} ${config.name}`;
        line2 = `阶段：生长中，约 ${left}s 后成熟`;
    } else if (cell.state === 2) {
        const config = CROP_CONFIG[cell.cropType];
        line1 = `作物：${config.icon} ${config.name}`;
        line2 = '阶段：成熟，左键收割';
    } else if (cell.state === 4) {
        const parent = gridData[cell.parentRow]?.[cell.parentCol];
        const config = CROP_CONFIG[cell.cropType];
        const mature = parent?.state === 2;
        line1 = `作物：${config.icon} ${config.name} 的占位地块`;
        line2 = mature ? '左键任意占位格可收获整株南瓜' : '南瓜生长中，占据 2x2 地块';
    }
    uiState.tileTip = { x: screenX + 12, y: screenY + 12, title, line1, line2, until: Date.now() + 2800 };
    return true;
}

function getPanelIcon(id) {
    if (id === 'orders') return '📦';
    return UI_NAV.find(item => item.id === id)?.icon || '';
}

function getToolLabel(id) {
    const config = CROP_CONFIG[id];
    return config ? `${config.icon} ${config.name}` : id;
}

function isPointInRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function isClippedContentControl(id, y, h) {
    if (id.startsWith('nav-') || id.startsWith('tab-') || id.startsWith('zoom-') || id.startsWith('setting-') || id.startsWith('order-dock-') || id === 'settings-toggle' || id === 'close-settings' || id === 'close-panel') return false;
    return uiState.activePanel && (y + h < UI_CONTENT.y || y > UI_CONTENT.bottom);
}

function drawScrollHint(ctx, panelId) {
    const maxScroll = getPanelMaxScroll(panelId);
    const trackX = UI_PANEL.x + UI_PANEL.w - 24;
    const trackY = UI_CONTENT.y;
    const trackH = UI_CONTENT.h;
    drawRoundRect(ctx, trackX, trackY, 10, trackH, 5, maxScroll > 0 ? 'rgba(96, 125, 111, 0.26)' : 'rgba(96, 125, 111, 0.12)', null);
    if (maxScroll <= 0) {
        ctx.fillStyle = 'rgba(83, 100, 92, 0.7)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('已显示全部内容', UI_PANEL.x + UI_PANEL.w - 34, UI_CONTENT.bottom - 8);
        return;
    }
    const thumbH = Math.max(44, trackH * (trackH / (trackH + maxScroll)));
    const thumbY = trackY + (trackH - thumbH) * (uiState.scroll[panelId] / maxScroll);
    drawRoundRect(ctx, trackX - 1, thumbY, 12, thumbH, 6, '#34495e', '#607d6f');
}

function getPanelMaxScroll(panelId) {
    if (panelId === 'market') {
        const visibleMarketItems = getMarketItemIds().filter(isMarketItemUnlocked).length;
        return Math.max(0, UI_CONTENT_PAD_TOP + 30 + visibleMarketItems * 72 - UI_CONTENT.h);
    }
    if (panelId === 'orders') {
        const visitorTasks = getVisitorIds().filter(id => isVisitorUnlocked(id) && !getVisitorProgress(id).finished).length;
        return Math.max(0, UI_CONTENT_PAD_TOP + 28 + tasks.length * 90 + 40 + visitorTasks * 90 - UI_CONTENT.h);
    }
    if (panelId === 'seeds') {
        const visibleCropCount = getCropIds().filter(id => !CROP_CONFIG[id].hidden || isItemUnlocked(id)).length;
        return Math.max(0, UI_CONTENT_PAD_TOP + 34 + Math.ceil(visibleCropCount / 4) * 86 + 28 + 18 + Math.ceil(getAnimalIds().length / 4) * 86 - UI_CONTENT.h);
    }
    if (panelId === 'build') {
        const tab = uiState.activeTabs.build;
        const counts = { ranch: 5, processing: 4, miracle: getMiracleIds().length };
        const rowH = tab === 'ranch' ? 104 : tab === 'processing' ? 148 : 166;
        return Math.max(0, UI_CONTENT_PAD_TOP + (counts[tab] || 0) * rowH - UI_CONTENT.h);
    }
    if (panelId === 'journal') {
        const tab = uiState.activeTabs.journal;
        if (tab === 'codex') {
            const group = CODEX_GROUPS[uiState.activeTabs.codex] || CODEX_GROUPS.crops;
            const cols = Math.max(3, Math.min(4, Math.floor(UI_CONTENT.w / 210)));
            const groupRows = Math.ceil(getCodexDisplayItems(group).length / cols);
            const setCols = Math.max(2, Math.min(3, Math.floor(UI_CONTENT.w / 260)));
            const setRows = Math.ceil(CODEX_SET_REWARDS.length / setCols);
            return Math.max(0, UI_CONTENT_PAD_TOP + 70 + 40 + 72 + 34 + setRows * 82 + 24 + groupRows * 132 - UI_CONTENT.h);
        }
        if (tab === 'letters') {
            return Math.max(0, UI_CONTENT_PAD_TOP + 24 + 330 + 18 + 196 - UI_CONTENT.h);
        }
        if (tab === 'talents') return Math.max(0, UI_CONTENT_PAD_TOP + 26 + Object.keys(TALENT_CONFIG).length * 88 + Object.keys(skills).length * 72 + 220 - UI_CONTENT.h);
        if (tab === 'visitors') return Math.max(0, UI_CONTENT_PAD_TOP + 26 + 342 + 20 - UI_CONTENT.h);
        if (tab === 'miracle') return Math.max(0, UI_CONTENT_PAD_TOP + 26 + getMiracleIds().length * 92 + 44 - UI_CONTENT.h);
        if (tab === 'endings') return Math.max(0, UI_CONTENT_PAD_TOP + 28 + Object.keys(ENDING_CONFIG).length * 118 + 20 - UI_CONTENT.h);
        return 0;
    }
    return 0;
}

function getOrderDockMaxScroll() {
    const contentH = UI_ORDER_DOCK.h - 60;
    return Math.max(0, 12 + tasks.length * 70 - contentH);
}

function lightenColor(color) {
    const map = {
        '#27ae60': '#2ecc71',
        '#f39c12': '#f5b041',
        '#8e44ad': '#a569bd',
        '#7f8c8d': '#95a5a6',
        '#e74c3c': '#ec7063',
        '#2980b9': '#3498db'
    };
    return map[color] || color;
}

// DOM control handoff.
// Buttons and tabs should not be painted on Canvas anymore. Canvas only reports
// their hit boxes and callbacks; js/ui/bitcn-dom-ui.js renders the actual UI.
const drawCanvasUIBeforeDomControlsFinal = drawCanvasUI;
drawCanvasUI = function drawCanvasUI(ctx) {
    window.__bitcnControls = [];
    drawCanvasUIBeforeDomControlsFinal(ctx);
};

function registerDomControl(id, x, y, w, h, label, action, options = {}) {
    if (typeof isClippedContentControl === 'function' && isClippedContentControl(id, y, h)) return;
    const disabled = !action || options.disabled;
    const freeControl = id.startsWith('tab-') || id.startsWith('setting-') || id === 'settings-toggle' || id === 'close-settings' || id === 'close-panel';
    const clip = uiState.activePanel && !freeControl ? {
        x: UI_CONTENT.x,
        y: UI_CONTENT.y,
        w: UI_CONTENT.w,
        h: UI_CONTENT.h
    } : null;
    registerButton(id, x, y, w, h, disabled ? null : action);
    window.__bitcnControls = window.__bitcnControls || [];
    window.__bitcnControls.push({
        id,
        x,
        y,
        w,
        h,
        label: String(label || ''),
        action: disabled ? null : action,
        disabled,
        kind: options.kind || 'button',
        active: !!options.active,
        danger: !!options.danger,
        compact: !!options.compact,
        clip
    });
}

drawSmallButton = function drawSmallButton(ctx, id, x, y, w, h, label, action, color = UI_THEME.button) {
    registerDomControl(id, x, y, w, h, label, action, {
        danger: color === UI_THEME.danger || color === '#e74c3c',
        disabled: color === '#95a5a6' || color === UI_THEME.buttonDisabled,
        compact: w <= 52 || h <= 30
    });
};

drawMultiLineButton = function drawMultiLineButton(ctx, id, x, y, w, h, label, action, color = UI_THEME.button) {
    registerDomControl(id, x, y, w, h, String(label || '').replace(/\n/g, ' '), action, {
        disabled: color === '#95a5a6' || color === UI_THEME.buttonDisabled,
        compact: w <= 90 || h <= 38
    });
};

drawIconSmallButton = function drawIconSmallButton(ctx, id, x, y, w, h, icon, action, color = UI_THEME.button) {
    const iconLabels = { close: 'x', gear: '设置', check: 'ok', lock: '锁' };
    registerDomControl(id, x, y, w, h, iconLabels[icon] || '', action, {
        danger: icon === 'close' || color === UI_THEME.danger,
        disabled: color === '#95a5a6' || color === UI_THEME.buttonDisabled,
        compact: true
    });
};

drawPixelIconButton = function drawPixelIconButton(ctx, id, x, y, w, h, icon, label, action, active = false) {
    registerDomControl(id, x, y, w, h, label, action, {
        active,
        kind: 'nav'
    });
};

drawTabs = function drawTabs(ctx, panelId, tabs, x, y) {
    let cursorX = x;
    tabs.forEach(([id, label]) => {
        const width = Math.max(70, label.length * 16 + 26);
        registerDomControl(`tab-${panelId}-${id}`, cursorX, y, width, 30, label, () => {
            uiState.activeTabs[panelId] = id;
            if (panelId === 'codex') uiState.scroll.journal = 0;
            else uiState.scroll[panelId] = 0;
        }, {
            active: uiState.activeTabs[panelId] === id,
            kind: 'tab',
            compact: true
        });
        cursorX += width + 8;
    });
};

const drawUIPanelBeforeExternalDomPanels = drawUIPanel;
drawUIPanel = function drawUIPanel(ctx, panelId) {
    if (panelId === 'market') return;
    drawUIPanelBeforeExternalDomPanels(ctx, panelId);
};

const drawUIPanelBeforeDomMarket = drawUIPanel;
drawUIPanel = function drawUIPanel(ctx, panelId) {
    if (panelId === 'market') return;
    drawUIPanelBeforeDomMarket(ctx, panelId);
};

function drawCanvasUI(ctx) {
    uiState.buttons = [];
    drawStatusHUD(ctx);
    drawTileTip(ctx);
    if (uiState.activePanel) drawUIPanel(ctx, uiState.activePanel);
    drawSkillDock(ctx);
    drawZoomDock(ctx);
    if (!uiState.activePanel && !uiState.settingsOpen) drawOrderDock(ctx);
    if (uiState.settingsOpen) drawSettingsPanel(ctx);
    if (!uiState.activePanel && !uiState.settingsOpen && !uiState.activeStoryPopup) drawTutorialGuide(ctx);
    drawBottomNav(ctx);
    drawStoryPopup(ctx);
}

function drawStatusHUD(ctx) {
    draw8BitFrame(ctx, 14, 10, canvas.width - 28, 46, 'rgba(255, 250, 229, 0.95)', UI_THEME.border, false);
    drawPixelIcon(ctx, 'coin', 30, 17, 1.45);
    drawPixelIcon(ctx, 'clock', 394, 17, 1.35);
    ctx.fillStyle = UI_THEME.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${coins}`, 60, 39);
    ctx.fillText(`Lv.${playerLevel}`, 146, 39);
    ctx.fillText(`EXP ${playerExp}/${getMaxExp()}`, 226, 39);
    ctx.fillText(`${getClockLabel()}`, 424, 39);
    ctx.fillText(`${WEATHER_CONFIG[weather.type].icon} ${WEATHER_CONFIG[weather.type].name}`, 570, 39);
    ctx.fillText(`生长 ${Math.round(getGrowthMultiplier() * 100)}%`, 718, 39);
    ctx.fillText(`工具 ${getToolLabel(currentSelectedTool)}`, 868, 39);
    ctx.fillText(`视野 ${Math.round((camera.zoom || 1) * 100)}%`, canvas.width - 360, 39);
    ctx.textAlign = 'right';
    ctx.fillStyle = UI_THEME.text;
    ctx.fillText('双指缩放 · 长按看地块', canvas.width - 72, 39);
    drawIconSmallButton(ctx, 'settings-toggle', canvas.width - 54, 16, 32, 28, 'gear', () => toggleSettings(), UI_THEME.header);
}

function drawBottomNav(ctx) {
    const nav = [
        { id: 'journal', icon: 'book', label: '手札' },
        { id: 'seeds', icon: 'package', label: '种子' },
        { id: 'build', icon: 'hammer', label: '建造' },
        { id: 'market', icon: 'market', label: '市场' }
    ];
    const y = canvas.height - UI_BAR_HEIGHT + 8;
    const itemW = Math.min(190, Math.max(145, Math.floor((canvas.width - 250) / nav.length)));
    const gap = 18;
    const startX = (canvas.width - (itemW * nav.length + gap * (nav.length - 1))) / 2;
    draw8BitFrame(ctx, startX - 18, y - 6, itemW * nav.length + gap * (nav.length - 1) + 36, 58, 'rgba(230, 238, 199, 0.92)', UI_THEME.border, true);
    nav.forEach((item, index) => {
        const x = startX + index * (itemW + gap);
        drawPixelIconButton(ctx, `nav-${item.id}`, x, y, itemW, 42, item.icon, item.label, () => togglePanel(item.id), uiState.activePanel === item.id);
    });
}

function drawUIPanel(ctx, panelId) {
    const titles = { journal: '手札', seeds: '种子', build: '建造', orders: '订单', market: '市场' };
    const icons = { journal: 'book', seeds: 'package', build: 'hammer', orders: 'order', market: 'market' };
    const title = titles[panelId] || '';
    draw8BitFrame(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, UI_THEME.panel, UI_THEME.border, true);
    draw8BitHeader(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, 48, UI_THEME.header, UI_THEME.headerDark);
    drawPixelIcon(ctx, icons[panelId] || 'book', UI_PANEL.x + 18, UI_PANEL.y + 8, 1.8);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, UI_PANEL.x + 56, UI_PANEL.y + 30);
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f7ecd1';
    ctx.fillText('内容较多时可滚动', UI_PANEL.x + UI_PANEL.w - 58, UI_PANEL.y + 29);
    drawIconSmallButton(ctx, 'close-panel', UI_PANEL.x + UI_PANEL.w - 42, UI_PANEL.y + 9, 28, 26, 'close', () => closePanel(), UI_THEME.danger);
    drawPanelTabs(ctx, panelId);

    ctx.save();
    ctx.beginPath();
    ctx.rect(UI_CONTENT.x, UI_CONTENT.y, UI_CONTENT.w, UI_CONTENT.h);
    ctx.clip();
    if (panelId === 'journal') drawJournalPanel(ctx);
    if (panelId === 'seeds') drawSeedsPanel(ctx);
    if (panelId === 'build') drawBuildPanel(ctx);
    if (panelId === 'orders') drawOrdersPanel(ctx);
    if (panelId === 'market') drawMarketPanel(ctx);
    ctx.restore();
    drawScrollHint(ctx, panelId);
}

function drawSettingsPanel(ctx) {
    const x = UI_SETTINGS.x;
    const y = UI_SETTINGS.y;
    draw8BitFrame(ctx, x, y, UI_SETTINGS.w, UI_SETTINGS.h, UI_THEME.panel, UI_THEME.border, true);
    draw8BitHeader(ctx, x, y, UI_SETTINGS.w, 44, UI_THEME.header, UI_THEME.headerDark);
    drawPixelIcon(ctx, 'gear', x + 16, y + 9, 1.6);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('设置', x + 48, y + 27);
    drawIconSmallButton(ctx, 'close-settings', x + UI_SETTINGS.w - 42, y + 8, 28, 26, 'close', () => toggleSettings(false), UI_THEME.danger);
    drawTextLine(ctx, `当前时间：${getClockLabel()}`, x + 22, y + 72, UI_THEME.ink, '15px Arial');
    drawTextLine(ctx, `当前视野：${Math.round((camera.zoom || 1) * 100)}%`, x + 22, y + 98, UI_THEME.ink, '15px Arial');
    drawSmallButton(ctx, 'setting-save', x + 22, y + 124, 142, 34, '手动保存', () => {
        saveGame();
        effectText = '已保存';
        effectAlpha = 1.0;
    }, UI_THEME.button);
    drawSmallButton(ctx, 'setting-reset-zoom', x + 184, y + 124, 142, 34, '重置视野', () => resetCameraZoom(), UI_THEME.blue);
    drawSmallButton(ctx, 'setting-audio', x + 22, y + 174, 142, 34, audioEnabled ? '音效 开' : '音效 关', () => toggleAudio(), audioEnabled ? UI_THEME.button : UI_THEME.buttonDisabled);
    drawSmallButton(ctx, 'setting-shake', x + 184, y + 174, 142, 34, uiPreferences?.screenShake === false ? '震动 关' : '震动 开', () => toggleScreenShake(), uiPreferences?.screenShake === false ? UI_THEME.buttonDisabled : UI_THEME.button);
    drawTextLine(ctx, '关闭后收割、共振、稀有发现都不会晃动画面。', x + 22, y + 226, UI_THEME.muted, '13px Arial');
    drawSmallButton(ctx, 'setting-reset-game', x + 184, y + 238, 142, 34, '重置世界', () => resetGame(), UI_THEME.danger);
}

function getPanelIcon(id) {
    const icons = { journal: '', seeds: '', build: '', orders: '', market: '' };
    return icons[id] || '';
}

window.uiState = uiState;

var FARM_UI = {
    ink: '#3f2f24',
    text: '#5f4a35',
    muted: '#8a7356',
    paper: 'rgba(255, 232, 166, 0.98)',
    paper2: '#f7d58f',
    wood: '#b46b3a',
    woodDark: '#6f3d25',
    woodLight: '#d99155',
    green: '#5c9a4d',
    greenDark: '#356735',
    gold: '#f3ba3f',
    goldLight: '#ffd96d',
    red: '#b94d3e',
    blue: '#4f8fad',
    disabled: '#b9a88c',
    shadow: 'rgba(54, 36, 24, 0.34)'
};

function draw8BitFrame(ctx, x, y, w, h, fill = FARM_UI.paper, border = FARM_UI.woodDark, shadow = true) {
    if (shadow) {
        ctx.fillStyle = FARM_UI.shadow;
        ctx.fillRect(x + 6, y + 7, w, h);
    }
    ctx.fillStyle = border;
    ctx.fillRect(x + 8, y, w - 16, 6);
    ctx.fillRect(x + 8, y + h - 6, w - 16, 6);
    ctx.fillRect(x, y + 8, 6, h - 16);
    ctx.fillRect(x + w - 6, y + 8, 6, h - 16);
    ctx.fillRect(x + 6, y + 6, 8, 8);
    ctx.fillRect(x + w - 14, y + 6, 8, 8);
    ctx.fillRect(x + 6, y + h - 14, 8, 8);
    ctx.fillRect(x + w - 14, y + h - 14, 8, 8);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x + 10, y + 10, w - 20, 4);
    ctx.fillStyle = 'rgba(92,55,31,0.16)';
    ctx.fillRect(x + 10, y + h - 14, w - 20, 4);
}

function draw8BitHeader(ctx, x, y, w, h, fill = FARM_UI.wood, border = FARM_UI.woodDark) {
    ctx.fillStyle = border;
    ctx.fillRect(x + 8, y, w - 16, h);
    ctx.fillRect(x, y + 8, w, h - 8);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 8, y + 6, w - 16, h - 10);
    ctx.fillRect(x + 6, y + 12, w - 12, h - 16);
    ctx.fillStyle = FARM_UI.woodLight;
    for (let px = x + 22; px < x + w - 22; px += 34) ctx.fillRect(px, y + 6, 10, h - 10);
    ctx.fillStyle = 'rgba(80,45,25,0.22)';
    ctx.fillRect(x + 8, y + h - 8, w - 16, 4);
}

function drawFarmButtonSurface(ctx, x, y, w, h, fill, border, pressed = false) {
    const dy = pressed ? 3 : 0;
    const unit = h <= 30 ? 4 : 6;
    if (!pressed) {
        ctx.fillStyle = 'rgba(54, 36, 24, 0.28)';
        ctx.fillRect(x + unit, y + unit + 1, w, h);
    }
    ctx.fillStyle = border;
    ctx.fillRect(x + unit, y + dy, w - unit * 2, unit);
    ctx.fillRect(x + unit, y + h - unit + dy, w - unit * 2, unit);
    ctx.fillRect(x, y + unit + dy, unit, h - unit * 2);
    ctx.fillRect(x + w - unit, y + unit + dy, unit, h - unit * 2);
    ctx.fillRect(x + unit, y + unit + dy, unit, unit);
    ctx.fillRect(x + w - unit * 2, y + unit + dy, unit, unit);
    ctx.fillRect(x + unit, y + h - unit * 2 + dy, unit, unit);
    ctx.fillRect(x + w - unit * 2, y + h - unit * 2 + dy, unit, unit);
    ctx.fillStyle = fill;
    ctx.fillRect(x + unit, y + unit + dy, w - unit * 2, h - unit * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.36)';
    ctx.fillRect(x + unit * 2, y + unit + dy, Math.max(0, w - unit * 4), unit);
    ctx.fillRect(x + unit * 2, y + unit * 2 + dy, unit * 2, unit);
    ctx.fillStyle = 'rgba(92,55,31,0.18)';
    ctx.fillRect(x + unit * 2, y + h - unit * 2 + dy, Math.max(0, w - unit * 4), unit);
    ctx.fillRect(x + w - unit * 4, y + h - unit * 3 + dy, unit * 2, unit);
}

function drawPixelIconButton(ctx, id, x, y, w, h, icon, label, action, active = false) {
    const hover = action && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    const fill = active ? FARM_UI.goldLight : hover ? '#ffe7a5' : '#fff2c4';
    drawFarmButtonSurface(ctx, x, y, w, h, fill, active ? FARM_UI.woodDark : FARM_UI.greenDark, false);
    drawPixelIcon(ctx, icon, x + 18, y + Math.max(5, Math.floor((h - 32) / 2)), 2);
    ctx.fillStyle = FARM_UI.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 58, y + h / 2 + 6);
    registerButton(id, x, y, w, h, action);
}

function drawIconSmallButton(ctx, id, x, y, w, h, icon, action, color = FARM_UI.gold) {
    const disabled = !action || color === UI_THEME.buttonDisabled || color === FARM_UI.disabled || color === '#95a5a6';
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    drawFarmButtonSurface(ctx, x, y, w, h, disabled ? FARM_UI.disabled : hover ? '#ffd96d' : color, FARM_UI.woodDark, false);
    drawPixelIcon(ctx, icon, x + Math.floor((w - 24) / 2), y + Math.floor((h - 24) / 2), 1.5);
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawSmallButton(ctx, id, x, y, w, h, label, action, color = FARM_UI.gold) {
    if (isClippedContentControl(id, y, h)) return;
    const disabled = !action || color === '#95a5a6' || color === UI_THEME.buttonDisabled || color === FARM_UI.disabled;
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    const fill = disabled ? FARM_UI.disabled : hover ? FARM_UI.goldLight : normalizeFarmButtonColor(color);
    drawFarmButtonSurface(ctx, x, y, w, h, fill, disabled ? '#776751' : FARM_UI.woodDark, false);
    ctx.fillStyle = disabled ? '#715d49' : FARM_UI.ink;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawButtonLikeBottomNav(ctx, id, x, y, w, h, label, action, color = FARM_UI.gold) {
    drawSmallButton(ctx, id, x, y, w, h, label, action, color);
}

function drawMultiLineButton(ctx, id, x, y, w, h, label, action, color = FARM_UI.gold) {
    const disabled = !action || color === '#95a5a6' || color === UI_THEME.buttonDisabled || color === FARM_UI.disabled;
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    const fill = disabled ? FARM_UI.disabled : hover ? FARM_UI.goldLight : normalizeFarmButtonColor(color);
    drawFarmButtonSurface(ctx, x, y, w, h, fill, FARM_UI.woodDark, false);
    ctx.fillStyle = disabled ? '#715d49' : FARM_UI.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    label.split('\n').forEach((line, index) => ctx.fillText(line, x + w / 2, y + 21 + index * 19));
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function normalizeFarmButtonColor(color) {
    const map = {
        [UI_THEME.button]: FARM_UI.green,
        [UI_THEME.blue]: FARM_UI.blue,
        [UI_THEME.purple]: '#a471b5',
        [UI_THEME.danger]: FARM_UI.red,
        [UI_THEME.warn]: FARM_UI.gold,
        '#27ae60': FARM_UI.green,
        '#2980b9': FARM_UI.blue,
        '#8e44ad': '#a471b5',
        '#e74c3c': FARM_UI.red,
        '#f39c12': FARM_UI.gold,
        '#7f8c8d': '#9c8b72',
        '#607d6f': FARM_UI.green
    };
    return map[color] || color || FARM_UI.gold;
}

// Final UI pass: keep the copied 8bitcn DOM navigation as the only bottom nav,
// and reserve Canvas for in-game panels. This avoids duplicate nav bars.
function drawCanvasUI(ctx) {
    uiState.buttons = [];
    drawStatusHUD(ctx);
    drawTileTip(ctx);
    if (uiState.activePanel) drawUIPanel(ctx, uiState.activePanel);
    drawSkillDock(ctx);
    drawZoomDock(ctx);
    if (!uiState.activePanel && !uiState.settingsOpen) drawOrderDock(ctx);
    if (uiState.settingsOpen) drawSettingsPanel(ctx);
    if (!uiState.activePanel && !uiState.settingsOpen && !uiState.activeStoryPopup) drawTutorialGuide(ctx);
    drawStoryPopup(ctx);
}

function drawStatusHUD(ctx) {
    draw8BitFrame(ctx, 14, 10, canvas.width - 28, 46, '#ffefb8', FARM_UI.woodDark, false);
    drawPixelIcon(ctx, 'coin', 30, 17, 1.45);
    drawPixelIcon(ctx, 'clock', 394, 17, 1.35);
    ctx.fillStyle = FARM_UI.ink;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${coins}`, 60, 39);
    ctx.fillText(`Lv.${playerLevel}`, 146, 39);
    ctx.fillText(`EXP ${playerExp}/${getMaxExp()}`, 226, 39);
    ctx.fillText(`${getClockLabel()}`, 424, 39);
    ctx.fillText(`${WEATHER_CONFIG[weather.type].icon} ${WEATHER_CONFIG[weather.type].name}`, 570, 39);
    ctx.fillText(`生长 ${Math.round(getGrowthMultiplier() * 100)}%`, 718, 39);
    ctx.fillText(`工具 ${getToolLabel(currentSelectedTool)}`, 868, 39);
    ctx.fillText(`视野 ${Math.round((camera.zoom || 1) * 100)}%`, canvas.width - 390, 39);
    ctx.textAlign = 'right';
    ctx.fillStyle = FARM_UI.text;
    ctx.fillText('双指缩放 · 长按看地块', canvas.width - 92, 39);
    drawIconSmallButton(ctx, 'settings-toggle', canvas.width - 58, 16, 32, 28, 'gear', () => toggleSettings(), FARM_UI.gold);
}

function drawSkillDock(ctx) {
    const dockW = 124;
    const x = 18;
    const y = 76;
    draw8BitFrame(ctx, x - 8, y - 8, dockW + 16, 188, '#efe0a7', FARM_UI.greenDark, true);
    const ids = ['sow', 'rain', 'harvest'];
    const labels = { sow: '播种', rain: '求雨', harvest: '收割' };
    ids.forEach((id, index) => {
        const skill = skills[id];
        const by = y + index * 58;
        const timeLeft = Math.max(0, Math.ceil((getSkillCd(id) - (Date.now() - skill.lastUsed)) / 1000));
        const ready = timeLeft <= 0;
        const label = ready ? `${skill.name}\n${labels[id]}` : `${skill.name}\n${timeLeft}s`;
        drawMultiLineButton(ctx, `dock-skill-${id}`, x, by, dockW, 48, label, () => useSkill(id), ready ? '#a471b5' : FARM_UI.disabled);
    });
}

function drawZoomDock(ctx) {
    const x = 18;
    const y = 292;
    const w = 140;
    draw8BitFrame(ctx, x - 8, y - 8, w + 16, 134, '#efe0a7', FARM_UI.greenDark, true);
    ctx.fillStyle = FARM_UI.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('视野缩放', x + w / 2, y + 18);
    drawSmallButton(ctx, 'zoom-in', x, y + 34, 60, 34, '+', () => zoomCamera(1.18), FARM_UI.blue);
    drawSmallButton(ctx, 'zoom-out', x + 80, y + 34, 60, 34, '-', () => zoomCamera(1 / 1.18), FARM_UI.blue);
    drawSmallButton(ctx, 'zoom-reset', x, y + 82, w, 32, `${Math.round((camera.zoom || 1) * 100)}%`, () => resetCameraZoom(), '#9c8b72');
}

function drawUIPanel(ctx, panelId) {
    const titles = { journal: '手札', seeds: '种子', build: '建造', orders: '订单', market: '市场' };
    const icons = { journal: 'book', seeds: 'package', build: 'hammer', orders: 'order', market: 'market' };
    draw8BitFrame(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, FARM_UI.paper, FARM_UI.woodDark, true);
    draw8BitHeader(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, 48, FARM_UI.wood, FARM_UI.woodDark);
    drawPixelIcon(ctx, icons[panelId] || 'book', UI_PANEL.x + 18, UI_PANEL.y + 8, 1.8);
    ctx.fillStyle = '#fff5ce';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(titles[panelId] || '', UI_PANEL.x + 56, UI_PANEL.y + 30);
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe7a5';
    ctx.fillText('内容较多时可滚动', UI_PANEL.x + UI_PANEL.w - 58, UI_PANEL.y + 29);
    drawIconSmallButton(ctx, 'close-panel', UI_PANEL.x + UI_PANEL.w - 42, UI_PANEL.y + 9, 28, 26, 'close', () => closePanel(), FARM_UI.red);
    drawPanelTabs(ctx, panelId);

    const contentY = panelId === 'journal' ? UI_PANEL.y + 146 : UI_CONTENT.y;
    const contentH = UI_PANEL.y + UI_PANEL.h - contentY - 24;
    ctx.save();
    ctx.beginPath();
    ctx.rect(UI_CONTENT.x, contentY, UI_CONTENT.w, contentH);
    ctx.clip();
    ctx.translate(0, contentY - UI_CONTENT.y);
    if (panelId === 'journal') drawJournalPanel(ctx);
    if (panelId === 'seeds') drawSeedsPanel(ctx);
    if (panelId === 'build') drawBuildPanel(ctx);
    if (panelId === 'orders') drawOrdersPanel(ctx);
    if (panelId === 'market') drawMarketPanel(ctx);
    ctx.restore();
    drawScrollHint(ctx, panelId);
}

function drawBottomNav(ctx) {
    // Bottom navigation is now the copied 8bitcn DOM shell in bitcn-dom-ui.js.
}

function drawTabs(ctx, panelId, tabs, x, y) {
    let cursorX = x;
    tabs.forEach(([id, label]) => {
        const active = uiState.activeTabs[panelId] === id;
        const width = Math.max(88, label.length * 18 + 34);
        drawFarmButtonSurface(ctx, cursorX, y, width, 32, active ? FARM_UI.goldLight : '#f6e5ae', active ? FARM_UI.woodDark : '#9d8150', false);
        ctx.fillStyle = FARM_UI.ink;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, cursorX + width / 2, y + 21);
        registerButton(`tab-${panelId}-${id}`, cursorX, y, width, 32, () => {
            uiState.activeTabs[panelId] = id;
            if (panelId === 'codex') uiState.scroll.journal = 0;
            else uiState.scroll[panelId] = 0;
        });
        cursorX += width + 12;
    });
}

function drawPanelTabs(ctx, panelId) {
    if (panelId === 'journal') {
        drawTabs(ctx, 'journal', [
            ['codex', '图鉴'],
            ['letters', '爷爷的信'],
            ['talents', '天赋'],
            ['miracle', '奇迹'],
            ['visitors', '访客'],
            ['endings', '结局']
        ], UI_PANEL.x + 18, UI_PANEL.y + 60);
    }
    if (panelId === 'build') {
        drawTabs(ctx, 'build', [
            ['ranch', '养殖'],
            ['processing', '加工'],
            ['miracle', '奇迹']
        ], UI_PANEL.x + 18, UI_PANEL.y + 60);
    }
    if (panelId === 'journal' && uiState.activeTabs.journal === 'codex') {
        drawTabs(ctx, 'codex', [
            ['crops', '作物'],
            ['animals', '动物'],
            ['products', '奇物']
        ], UI_PANEL.x + 18, UI_PANEL.y + 102);
    }
}

function drawCodexPanel(ctx, x, y) {
    const total = getCodexTotalCount();
    const collected = getCollectedUniqueCount();
    const percent = Math.round((collected / total) * 100);
    draw8BitFrame(ctx, x, y - 8, UI_CONTENT.w, 72, '#fff3bd', '#c08a48', false);
    drawPixelIcon(ctx, 'book', x + 18, y + 10, 1.7);
    drawTextLine(ctx, `图鉴称号：${getCodexTitle(collected)}`, x + 58, y + 20, FARM_UI.ink, 'bold 17px Arial');
    drawTextLine(ctx, `收集率 ${collected}/${total} (${percent}%)`, x + 58, y + 46, FARM_UI.text, '13px Arial');
    draw8BitFrame(ctx, x + 310, y + 28, UI_CONTENT.w - 350, 16, '#e4dcc5', '#bda16a', false);
    ctx.fillStyle = FARM_UI.green;
    ctx.fillRect(x + 316, y + 34, Math.max(0, (UI_CONTENT.w - 362) * (collected / total)), 4);
    y += 86;
    y = drawCodexRewards(ctx, x, y);
    y = drawCodexSetRewards(ctx, x, y);
    const group = CODEX_GROUPS[uiState.activeTabs.codex] || CODEX_GROUPS.crops;
    drawCodexGroup(ctx, group, x, y + 8);
}

function drawCodexRewards(ctx, x, y) {
    drawTextLine(ctx, '里程碑奖励', x, y, FARM_UI.ink, 'bold 15px Arial');
    y += 22;
    const gap = 14;
    const cardW = Math.floor((UI_CONTENT.w - gap * 3) / 4);
    CODEX_REWARDS.forEach((reward, index) => {
        const rx = x + index * (cardW + gap);
        const ready = getCodexPercent() >= reward.percent;
        const claimed = collection.claimedRewards[reward.id];
        draw8BitFrame(ctx, rx, y, cardW, 64, claimed ? '#eadfbd' : ready ? '#fff0b6' : '#fff7d2', ready ? FARM_UI.gold : '#bda16a', false);
        drawTextLine(ctx, reward.label, rx + 14, y + 24, FARM_UI.ink, 'bold 13px Arial');
        drawTextLine(ctx, `${reward.percent}%  ${reward.coins}币 + ${reward.exp}EXP`, rx + 14, y + 46, FARM_UI.text, '12px Arial');
        drawSmallButton(ctx, `codex-reward-${reward.id}`, rx + cardW - 70, y + 18, 54, 28, claimed ? '已领' : '领取', () => claimCodexReward(reward.id), ready && !claimed ? FARM_UI.green : FARM_UI.disabled);
    });
    return y + 82;
}

function drawCodexSetRewards(ctx, x, y) {
    drawTextLine(ctx, '类别收集奖励', x, y, FARM_UI.ink, 'bold 15px Arial');
    y += 24;
    const cols = 3;
    const gap = 16;
    const cardW = Math.floor((UI_CONTENT.w - gap * (cols - 1)) / cols);
    const cardH = 74;
    CODEX_SET_REWARDS.forEach((reward, index) => {
        const ids = getCropCategoryIds(reward.category);
        const got = getCollectedCategoryCount(reward.category);
        const ready = isCodexSetRewardReady(reward);
        const claimed = collection.claimedSetRewards?.[reward.id];
        const col = index % cols;
        const row = Math.floor(index / cols);
        const rx = x + col * (cardW + gap);
        const ry = y + row * (cardH + gap);
        draw8BitFrame(ctx, rx, ry, cardW, cardH, claimed ? '#eadfbd' : ready ? '#fff0b6' : '#fff7d2', ready ? FARM_UI.gold : '#bda16a', false);
        drawTextLine(ctx, reward.label, rx + 16, ry + 26, FARM_UI.ink, 'bold 13px Arial');
        drawTextLine(ctx, `${got}/${ids.length}  ${reward.bonusLabel}`, rx + 16, ry + 50, FARM_UI.text, '12px Arial');
        drawSmallButton(ctx, `codex-set-${reward.id}`, rx + cardW - 72, ry + 22, 54, 28, claimed ? '已领' : '领取', () => claimCodexSetReward(reward.id), ready && !claimed ? FARM_UI.green : FARM_UI.disabled);
    });
    return y + Math.ceil(CODEX_SET_REWARDS.length / cols) * (cardH + gap) + 18;
}

function drawCodexGroup(ctx, group, x, y) {
    const items = getCodexDisplayItems(group);
    const got = group.items.filter(isCollected).length;
    drawTextLine(ctx, `${group.name} ${got}/${group.items.length}`, x, y, FARM_UI.ink, 'bold 15px Arial');
    y += 24;
    const cols = Math.max(3, Math.min(4, Math.floor(UI_CONTENT.w / 220)));
    const gap = 16;
    const cardW = Math.floor((UI_CONTENT.w - gap * (cols - 1)) / cols);
    const cardH = 124;
    items.forEach((itemId, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        drawCodexItemCard(ctx, itemId, x + col * (cardW + gap), y + row * (cardH + gap), cardW, cardH);
    });
}

function drawCodexItemCard(ctx, itemId, x, y, w, h) {
    const config = CROP_CONFIG[itemId];
    const amount = getCollectedAmount(itemId);
    const found = amount > 0;
    const unlocked = isItemUnlocked(itemId);
    draw8BitFrame(ctx, x, y, w, h, found ? '#fff7d2' : '#d7ddd2', found ? '#9d8150' : '#9da895', false);
    if (found) {
        ctx.fillStyle = FARM_UI.ink;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(config.icon, x + 16, y + 34);
    } else {
        drawCodexSilhouette(ctx, x + 34, y + 30, unlocked);
        if (!unlocked) drawPixelIcon(ctx, 'lock', x + w - 42, y + 18, 1.25);
    }
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = found ? FARM_UI.ink : '#667060';
    ctx.fillText(found ? config.name : `${getCodexKindName(itemId)}剪影`, x + 58, y + 28);
    ctx.font = '12px Arial';
    const detail = found ? getCodexFoundDetail(itemId, amount) : getCodexHint(itemId);
    drawWrappedText(ctx, detail, x + 16, y + 56, w - 28, 15, found ? FARM_UI.text : '#667060', '12px Arial');
    if (VARIANT_CONFIG[itemId]) {
        const variants = getVariantProgress(itemId);
        const line = found ? `变种 ${variants.found}/${variants.total}` : '变种：未发现';
        drawTextLine(ctx, line, x + 16, y + h - 12, found && variants.found > 0 ? '#8e44ad' : FARM_UI.muted, '11px Arial');
    }
}

function drawOrderDock(ctx) {
    const x = UI_ORDER_DOCK.x;
    const y = UI_ORDER_DOCK.y;
    draw8BitFrame(ctx, x, y, UI_ORDER_DOCK.w, UI_ORDER_DOCK.h, FARM_UI.paper, FARM_UI.woodDark, true);
    draw8BitHeader(ctx, x, y, UI_ORDER_DOCK.w, 42, FARM_UI.wood, FARM_UI.woodDark);
    drawPixelIcon(ctx, 'order', x + 14, y + 8, 1.5);
    ctx.fillStyle = '#fff5ce';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('订单看板', x + 46, y + 27);
    drawSmallButton(ctx, 'order-dock-more', x + UI_ORDER_DOCK.w - 74, y + 8, 56, 26, '详情', () => togglePanel('orders'), FARM_UI.gold);

    const contentX = x + 12;
    const contentY = y + 54;
    const contentW = UI_ORDER_DOCK.w - 24;
    const contentH = UI_ORDER_DOCK.h - 66;
    uiState.orderDockScroll = Math.min(uiState.orderDockScroll, getOrderDockMaxScroll());
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentW, contentH);
    ctx.clip();
    tasks.forEach((task, index) => {
        const config = CROP_CONFIG[task.item];
        if (!config) return;
        const enough = inventory[task.item] >= task.amount;
        const cardY = contentY + 6 + index * 72 - uiState.orderDockScroll;
        if (cardY + 60 < contentY || cardY > contentY + contentH) return;
        draw8BitFrame(ctx, contentX, cardY, contentW, 60, enough ? '#fff0b6' : '#fff7d2', enough ? FARM_UI.green : '#bda16a', false);
        ctx.fillStyle = FARM_UI.ink;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${config.icon} ${config.name} x${task.amount}`, contentX + 14, cardY + 24);
        ctx.fillStyle = enough ? FARM_UI.greenDark : FARM_UI.text;
        ctx.font = '12px Arial';
        ctx.fillText(`${inventory[task.item]}/${task.amount}  奖励 ${task.reward}币`, contentX + 14, cardY + 45);
        drawSmallButton(ctx, `order-dock-${index}`, contentX + contentW - 76, cardY + 16, 62, 28, enough ? '交付' : '等待', () => deliverTask(index), enough ? FARM_UI.green : FARM_UI.disabled);
    });
    ctx.restore();
    drawOrderDockScrollbar(ctx, x + UI_ORDER_DOCK.w - 12, contentY, contentH);
}

function drawOrdersPanel(ctx) {
    const x = UI_CONTENT.x;
    let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.orders;
    drawTextLine(ctx, '普通订单看板', x, y, FARM_UI.ink, 'bold 16px Arial');
    y += 30;
    tasks.forEach((task, index) => {
        const config = CROP_CONFIG[task.item];
        if (!config) return;
        const enough = inventory[task.item] >= task.amount;
        const cardW = UI_CONTENT.w - 160;
        drawInfoCard(ctx, x, y, cardW, 78, `${config.icon} ${config.name} x${task.amount}`, `进度 ${inventory[task.item]}/${task.amount}  奖励 ${task.reward}币 + ${task.exp}EXP`, enough ? FARM_UI.green : FARM_UI.gold);
        drawSmallButton(ctx, `order-${index}`, x + cardW + 28, y + 22, 100, 32, enough ? '交付' : '未达标', () => deliverTask(index), enough ? FARM_UI.green : FARM_UI.disabled);
        y += 92;
    });
    y += 12;
    drawTextLine(ctx, '访客委托', x, y, FARM_UI.ink, 'bold 16px Arial');
    y += 30;
    const visitorTasks = getVisitorIds().filter(id => isVisitorUnlocked(id) && !getVisitorProgress(id).finished);
    if (visitorTasks.length === 0) {
        drawTextLine(ctx, '暂无可交付访客委托，继续提升农场进度。', x, y, FARM_UI.text, '14px Arial');
        return;
    }
    visitorTasks.forEach(id => {
        const config = VISITOR_CONFIG[id];
        const progress = getVisitorProgress(id);
        const ready = canDeliverVisitorTask(id);
        const cardW = UI_CONTENT.w - 160;
        drawInfoCard(ctx, x, y, cardW, 78, `${config.icon} ${config.name}：${progress.task.title}`, `${formatVisitorNeed(progress.task.need)}  奖励 ${formatRewardText(progress.task.reward)}`, ready ? FARM_UI.green : FARM_UI.gold);
        drawSmallButton(ctx, `order-visitor-${id}`, x + cardW + 28, y + 22, 100, 32, ready ? '交付' : '未达标', () => deliverVisitorTask(id), ready ? FARM_UI.green : FARM_UI.disabled);
        y += 92;
    });
}

function drawMarketPanel(ctx) {
    const ids = getMarketItemIds().filter(isMarketItemUnlocked);
    const x = UI_CONTENT.x;
    let y = UI_CONTENT.y + UI_CONTENT_PAD_TOP - uiState.scroll.market;
    drawTextLine(ctx, '像素交易所：价格每 10 秒波动一次。', x, y, FARM_UI.text, '14px Arial');
    y += 32;
    if (ids.length === 0) {
        drawTextLine(ctx, '市场会在首次收获或获得产物后逐步上架。', x, y, FARM_UI.text, '15px Arial');
        return;
    }
    ids.forEach(id => {
        if (uiState.marketAmounts[id] === undefined) uiState.marketAmounts[id] = 1;
        const config = CROP_CONFIG[id];
        const amount = Math.min(Math.max(1, uiState.marketAmounts[id]), Math.max(1, inventory[id] || 0));
        uiState.marketAmounts[id] = amount;
        const market = marketState[id] || { price: config.basePrice, trend: 0 };
        const price = Math.max(1, Math.floor((market.price || config.basePrice || 1) * getCategoryPriceMultiplier(id)));
        const trend = market.trend > 0.2 ? '↑' : market.trend < -0.2 ? '↓' : '-';
        const cardW = UI_CONTENT.w - 338;
        drawInfoCard(ctx, x, y, cardW, 66, `${config.icon} ${config.name}  库存 ${inventory[id]}`, `当前价 ${price}币 ${trend}  本次 ${amount} 个 = ${amount * price}币`, FARM_UI.blue);
        drawSmallButton(ctx, `market-minus-${id}`, x + cardW + 24, y + 16, 36, 30, '-', () => { if (uiState.activeMarketInput === id) commitMarketInput(); changeMarketAmount(id, -1); }, '#9c8b72');
        drawMarketAmountInput(ctx, id, x + cardW + 66, y + 16, 74, 30, amount);
        drawSmallButton(ctx, `market-plus-${id}`, x + cardW + 148, y + 16, 36, 30, '+', () => { if (uiState.activeMarketInput === id) commitMarketInput(); changeMarketAmount(id, 1); }, '#9c8b72');
        drawSmallButton(ctx, `market-max-${id}`, x + cardW + 192, y + 16, 50, 30, '全选', () => setMarketAmount(id, inventory[id]), '#9c8b72');
        drawSmallButton(ctx, `market-sell-${id}`, x + cardW + 250, y + 16, 76, 30, '卖出', () => { if (uiState.activeMarketInput === id) commitMarketInput(); sellItemAmount(id, uiState.marketAmounts[id]); }, inventory[id] > 0 ? FARM_UI.gold : FARM_UI.disabled);
        y += 76;
    });
}

function drawMarketAmountInput(ctx, id, x, y, w, h, amount) {
    const active = uiState.activeMarketInput === id;
    const hover = isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    drawFarmButtonSurface(ctx, x, y, w, h, active ? '#fff0b6' : hover ? '#fff7d2' : '#fffdf0', active ? FARM_UI.red : '#bda16a', false);
    ctx.fillStyle = FARM_UI.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(active ? (uiState.marketDraft || '|') : String(amount), x + w / 2, y + 20);
    registerButton(`market-input-${id}`, x, y, w, h, () => beginMarketInput(id));
}

function drawEndingsPanel(ctx, x, y) {
    checkEndingUnlocks(true);
    const unlockedCount = Object.keys(endingState.unlocked || {}).length;
    drawTextLine(ctx, `结局收藏：${unlockedCount}/${Object.keys(ENDING_CONFIG).length}`, x, y, FARM_UI.ink, 'bold 16px Arial');
    y += 32;
    Object.entries(ENDING_CONFIG).forEach(([id, ending]) => {
        const unlocked = !!endingState.unlocked[id];
        const unread = unlocked && !endingState.read[id];
        draw8BitFrame(ctx, x, y, UI_CONTENT.w - 16, 108, unlocked ? '#fff7d2' : '#d7ddd2', unread ? FARM_UI.gold : '#bda16a', false);
        if (unlocked) drawPixelIcon(ctx, 'trophy', x + 22, y + 24, 2);
        else drawPixelIcon(ctx, 'lock', x + 24, y + 24, 2);
        ctx.textAlign = 'left';
        ctx.fillStyle = unlocked ? FARM_UI.ink : '#667060';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(unlocked ? `${ending.title}${unread ? ' •' : ''}` : '未解锁结局', x + 76, y + 30);
        ctx.font = '13px Arial';
        if (unlocked) {
            ending.text.forEach((line, index) => ctx.fillText(line, x + 76, y + 56 + index * 22));
        } else {
            ctx.fillText('继续推进奇迹、访客、图鉴与加工系统。', x + 76, y + 60);
        }
        registerButton(`ending-read-${id}`, x, y, UI_CONTENT.w - 16, 108, () => markEndingRead(id));
        y += 124;
    });
}

function drawInfoCard(ctx, x, y, w, h, title, body, accent) {
    draw8BitFrame(ctx, x, y, w, h, '#fff3bd', '#c08a48', false);
    ctx.fillStyle = normalizeFarmButtonColor(accent || FARM_UI.green);
    ctx.fillRect(x + 8, y + 10, 6, h - 20);
    drawTextLine(ctx, title, x + 20, y + 27, FARM_UI.ink, 'bold 15px Arial');
    drawTextLine(ctx, body, x + 20, y + 52, FARM_UI.text, '13px Arial');
}

function drawStatusHUD(ctx) {
    draw8BitFrame(ctx, 14, 10, canvas.width - 28, 46, 'rgba(255, 239, 184, 0.96)', FARM_UI.woodDark, false);
    drawPixelIcon(ctx, 'coin', 30, 17, 1.45);
    drawPixelIcon(ctx, 'clock', 394, 17, 1.35);
    ctx.fillStyle = FARM_UI.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${coins}`, 60, 39);
    ctx.fillText(`Lv.${playerLevel}`, 146, 39);
    ctx.fillText(`EXP ${playerExp}/${getMaxExp()}`, 226, 39);
    ctx.fillText(`${getClockLabel()}`, 424, 39);
    ctx.fillText(`${WEATHER_CONFIG[weather.type].icon} ${WEATHER_CONFIG[weather.type].name}`, 570, 39);
    ctx.fillText(`生长 ${Math.round(getGrowthMultiplier() * 100)}%`, 718, 39);
    ctx.fillText(`工具 ${getToolLabel(currentSelectedTool)}`, 868, 39);
    ctx.fillText(`视野 ${Math.round((camera.zoom || 1) * 100)}%`, canvas.width - 360, 39);
    ctx.textAlign = 'right';
    ctx.fillStyle = FARM_UI.text;
    ctx.fillText('双指缩放 · 长按看地块', canvas.width - 72, 39);
    drawIconSmallButton(ctx, 'settings-toggle', canvas.width - 54, 16, 32, 28, 'gear', () => toggleSettings(), FARM_UI.gold);
}

function drawBottomNav(ctx) {
    if (typeof window.refreshBitcnDomUi === 'function') return;
}

function drawUIPanel(ctx, panelId) {
    const titles = { journal: '手札', seeds: '种子', build: '建造', orders: '订单', market: '市场' };
    const icons = { journal: 'book', seeds: 'package', build: 'hammer', orders: 'order', market: 'market' };
    draw8BitFrame(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, FARM_UI.paper, FARM_UI.woodDark, true);
    draw8BitHeader(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, 48, FARM_UI.wood, FARM_UI.woodDark);
    drawPixelIcon(ctx, icons[panelId] || 'book', UI_PANEL.x + 18, UI_PANEL.y + 8, 1.8);
    ctx.fillStyle = '#fff5ce';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(titles[panelId] || '', UI_PANEL.x + 56, UI_PANEL.y + 30);
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe7a5';
    ctx.fillText('内容较多时可滚动', UI_PANEL.x + UI_PANEL.w - 58, UI_PANEL.y + 29);
    drawIconSmallButton(ctx, 'close-panel', UI_PANEL.x + UI_PANEL.w - 42, UI_PANEL.y + 9, 28, 26, 'close', () => closePanel(), FARM_UI.red);
    drawPanelTabs(ctx, panelId);
    ctx.save();
    ctx.beginPath();
    ctx.rect(UI_CONTENT.x, UI_CONTENT.y, UI_CONTENT.w, UI_CONTENT.h);
    ctx.clip();
    if (panelId === 'journal') drawJournalPanel(ctx);
    if (panelId === 'seeds') drawSeedsPanel(ctx);
    if (panelId === 'build') drawBuildPanel(ctx);
    if (panelId === 'orders') drawOrdersPanel(ctx);
    if (panelId === 'market') drawMarketPanel(ctx);
    ctx.restore();
    drawScrollHint(ctx, panelId);
}

function drawGridItems(ctx, ids, x, y, type) {
    const cardW = 178;
    const cardH = 72;
    ids.forEach((id, index) => {
        const config = CROP_CONFIG[id];
        const col = index % 4;
        const row = Math.floor(index / 4);
        const px = x + col * (cardW + 14);
        const py = y + row * (cardH + 14);
        const unlocked = isItemUnlocked(id);
        const selected = currentSelectedTool === id;
        draw8BitFrame(ctx, px, py, cardW, cardH, selected ? '#fff0b6' : unlocked ? UI_THEME.card : '#e1e5d8', selected ? UI_THEME.warn : unlocked ? UI_THEME.borderSoft : '#a8b1a2', false);
        ctx.fillStyle = unlocked ? UI_THEME.ink : UI_THEME.muted;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(unlocked ? `${config.icon} ${config.name}` : '？？？', px + 14, py + 29);
        ctx.font = '12px Arial';
        const detail = type === 'crop'
            ? (unlocked ? `${config.seedPrice}币 / Lv.${config.reqLevel}` : (config.unlockHint || `Lv.${config.reqLevel} 解锁`))
            : (unlocked ? `${config.price}币 / Lv.${config.reqLevel}` : (config.unlockHint || `Lv.${config.reqLevel} 解锁`));
        ctx.fillText(detail, px + 14, py + 55);
        if (!unlocked) drawPixelIcon(ctx, 'lock', px + cardW - 34, py + 18, 1.2);
        registerButton(`select-${id}`, px, py, cardW, cardH, () => {
            if (!unlocked) return;
            selectTool(id);
            closePanel();
        });
    });
}

function draw8BitFrame(ctx, x, y, w, h, fill, border, shadow = true) {
    if (shadow) {
        ctx.fillStyle = 'rgba(33, 30, 24, 0.30)';
        ctx.fillRect(x + 5, y + 6, w, h);
    }
    ctx.fillStyle = border;
    ctx.fillRect(x + 8, y, w - 16, 6);
    ctx.fillRect(x + 8, y + h - 6, w - 16, 6);
    ctx.fillRect(x, y + 8, 6, h - 16);
    ctx.fillRect(x + w - 6, y + 8, 6, h - 16);
    ctx.fillRect(x + 6, y + 6, 6, 6);
    ctx.fillRect(x + w - 12, y + 6, 6, 6);
    ctx.fillRect(x + 6, y + h - 12, 6, 6);
    ctx.fillRect(x + w - 12, y + h - 12, 6, 6);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
}

function draw8BitHeader(ctx, x, y, w, h, fill, border) {
    ctx.fillStyle = border;
    ctx.fillRect(x + 8, y, w - 16, h);
    ctx.fillRect(x, y + 8, w, h - 8);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 8, y + 6, w - 16, h - 10);
    ctx.fillRect(x + 6, y + 12, w - 12, h - 16);
}

function drawStatusHUD(ctx) {
    drawRoundRect(ctx, 14, 10, canvas.width - 28, 46, 8, UI_THEME.panel, UI_THEME.border);
    drawPixelIcon(ctx, 'coin', 30, 17, 1.4);
    ctx.fillStyle = UI_THEME.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${coins}`, 58, 39);
    ctx.fillText(`Lv.${playerLevel}`, 142, 39);
    ctx.fillText(`EXP ${playerExp}/${getMaxExp()}`, 222, 39);
    ctx.fillText(`时间 ${getClockLabel()}`, 422, 39);
    ctx.fillText(`${WEATHER_CONFIG[weather.type].icon} ${WEATHER_CONFIG[weather.type].name}`, 570, 39);
    ctx.fillText(`生长 ${Math.round(getGrowthMultiplier() * 100)}%`, 718, 39);
    ctx.fillText(`工具 ${getToolLabel(currentSelectedTool)}`, 868, 39);
    ctx.fillText(`视野 ${Math.round((camera.zoom || 1) * 100)}%`, canvas.width - 360, 39);
    ctx.textAlign = 'right';
    ctx.fillStyle = UI_THEME.text;
    ctx.fillText('双指缩放 · 长按看地块', canvas.width - 72, 39);
    drawIconSmallButton(ctx, 'settings-toggle', canvas.width - 54, 16, 32, 28, 'gear', () => toggleSettings(), UI_THEME.header);
}

function drawBottomNav(ctx) {
    const nav = [
        { id: 'journal', icon: 'book', label: '手札' },
        { id: 'seeds', icon: 'seed', label: '种子' },
        { id: 'build', icon: 'hammer', label: '建造' },
        { id: 'market', icon: 'market', label: '市场' }
    ];
    const y = canvas.height - UI_BAR_HEIGHT + 8;
    const itemW = Math.min(190, Math.max(145, Math.floor((canvas.width - 250) / nav.length)));
    const gap = 18;
    const startX = (canvas.width - (itemW * nav.length + gap * (nav.length - 1))) / 2;
    drawRoundRect(ctx, startX - 18, y - 6, itemW * nav.length + gap * (nav.length - 1) + 36, 58, 10, 'rgba(84, 72, 50, 0.76)', UI_THEME.border);
    nav.forEach((item, index) => {
        const x = startX + index * (itemW + gap);
        drawPixelIconButton(ctx, `nav-${item.id}`, x, y, itemW, 42, item.icon, item.label, () => togglePanel(item.id), uiState.activePanel === item.id);
    });
}

function drawUIPanel(ctx, panelId) {
    const titles = { journal: '手札', seeds: '种子', build: '建造', orders: '订单', market: '市场' };
    const icons = { journal: 'book', seeds: 'seed', build: 'hammer', orders: 'order', market: 'market' };
    const title = titles[panelId] || '';
    drawRoundRect(ctx, UI_PANEL.x + 4, UI_PANEL.y + 6, UI_PANEL.w, UI_PANEL.h, 10, UI_THEME.shadow, null);
    drawRoundRect(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 10, UI_THEME.panel, UI_THEME.border);
    drawRoundRect(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, 46, 10, UI_THEME.header, UI_THEME.headerDark);
    drawPixelIcon(ctx, icons[panelId] || 'book', UI_PANEL.x + 18, UI_PANEL.y + 8, 1.8);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, UI_PANEL.x + 56, UI_PANEL.y + 30);
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f7ecd1';
    ctx.fillText('内容较多时可滚动', UI_PANEL.x + UI_PANEL.w - 58, UI_PANEL.y + 29);
    drawIconSmallButton(ctx, 'close-panel', UI_PANEL.x + UI_PANEL.w - 42, UI_PANEL.y + 9, 28, 26, 'close', () => closePanel(), UI_THEME.danger);
    drawPanelTabs(ctx, panelId);

    ctx.save();
    ctx.beginPath();
    ctx.rect(UI_CONTENT.x, UI_CONTENT.y, UI_CONTENT.w, UI_CONTENT.h);
    ctx.clip();
    if (panelId === 'journal') drawJournalPanel(ctx);
    if (panelId === 'seeds') drawSeedsPanel(ctx);
    if (panelId === 'build') drawBuildPanel(ctx);
    if (panelId === 'orders') drawOrdersPanel(ctx);
    if (panelId === 'market') drawMarketPanel(ctx);
    ctx.restore();
    drawScrollHint(ctx, panelId);
}

function drawSettingsPanel(ctx) {
    const x = UI_SETTINGS.x;
    const y = UI_SETTINGS.y;
    drawRoundRect(ctx, x + 4, y + 6, UI_SETTINGS.w, UI_SETTINGS.h, 10, UI_THEME.shadow, null);
    drawRoundRect(ctx, x, y, UI_SETTINGS.w, UI_SETTINGS.h, 10, UI_THEME.panel, UI_THEME.border);
    drawRoundRect(ctx, x, y, UI_SETTINGS.w, 42, 10, UI_THEME.header, UI_THEME.headerDark);
    drawPixelIcon(ctx, 'gear', x + 16, y + 9, 1.6);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('设置', x + 48, y + 27);
    drawIconSmallButton(ctx, 'close-settings', x + UI_SETTINGS.w - 42, y + 8, 28, 26, 'close', () => toggleSettings(false), UI_THEME.danger);
    drawTextLine(ctx, `当前时间：${getClockLabel()}`, x + 22, y + 72, UI_THEME.ink, '15px Arial');
    drawTextLine(ctx, `当前视野：${Math.round((camera.zoom || 1) * 100)}%`, x + 22, y + 98, UI_THEME.ink, '15px Arial');
    drawSmallButton(ctx, 'setting-save', x + 22, y + 124, 142, 34, '手动保存', () => {
        saveGame();
        effectText = '已保存';
        effectAlpha = 1.0;
    }, UI_THEME.button);
    drawSmallButton(ctx, 'setting-reset-zoom', x + 184, y + 124, 142, 34, '重置视野', () => resetCameraZoom(), UI_THEME.blue);
    drawSmallButton(ctx, 'setting-audio', x + 22, y + 174, 142, 34, audioEnabled ? '音效 开' : '音效 关', () => toggleAudio(), audioEnabled ? UI_THEME.button : UI_THEME.buttonDisabled);
    drawSmallButton(ctx, 'setting-shake', x + 184, y + 174, 142, 34, uiPreferences?.screenShake === false ? '震动 关' : '震动 开', () => toggleScreenShake(), uiPreferences?.screenShake === false ? UI_THEME.buttonDisabled : UI_THEME.button);
    drawTextLine(ctx, '关闭后收割、共振、稀有发现都不会晃动画面。', x + 22, y + 226, UI_THEME.muted, '13px Arial');
    drawSmallButton(ctx, 'setting-reset-game', x + 184, y + 238, 142, 34, '重置世界', () => resetGame(), UI_THEME.danger);
}

function drawPixelIconButton(ctx, id, x, y, w, h, icon, label, action, active = false) {
    const hover = action && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    draw8BitFrame(ctx, x, y, w, h, active ? '#ffd979' : hover ? '#fff3c7' : UI_THEME.card, active ? UI_THEME.warn : UI_THEME.border, true);
    drawPixelIcon(ctx, icon, x + 18, y + Math.max(5, Math.floor((h - 32) / 2)), 2);
    ctx.fillStyle = UI_THEME.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 58, y + h / 2 + 6);
    registerButton(id, x, y, w, h, action);
}

function drawIconSmallButton(ctx, id, x, y, w, h, icon, action, color = UI_THEME.button) {
    const disabled = !action || color === UI_THEME.buttonDisabled || color === '#95a5a6';
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    draw8BitFrame(ctx, x, y, w, h, disabled ? UI_THEME.buttonDisabled : hover ? lightenColor(color) : color, UI_THEME.border, false);
    drawPixelIcon(ctx, icon, x + Math.floor((w - 24) / 2), y + Math.floor((h - 24) / 2), 1.5);
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawOrderDock(ctx) {
    const x = UI_ORDER_DOCK.x;
    const y = UI_ORDER_DOCK.y;
    drawRoundRect(ctx, x + 4, y + 6, UI_ORDER_DOCK.w, UI_ORDER_DOCK.h, 10, UI_THEME.shadow, null);
    drawRoundRect(ctx, x, y, UI_ORDER_DOCK.w, UI_ORDER_DOCK.h, 10, UI_THEME.panel, UI_THEME.border);
    drawRoundRect(ctx, x, y, UI_ORDER_DOCK.w, 42, 10, UI_THEME.header, UI_THEME.headerDark);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('订单看板', x + 16, y + 27);
    drawSmallButton(ctx, 'order-dock-more', x + UI_ORDER_DOCK.w - 72, y + 8, 50, 26, '详情', () => togglePanel('orders'), UI_THEME.button);

    const contentX = x + 10;
    const contentY = y + 50;
    const contentW = UI_ORDER_DOCK.w - 20;
    const contentH = UI_ORDER_DOCK.h - 60;
    uiState.orderDockScroll = Math.min(uiState.orderDockScroll, getOrderDockMaxScroll());

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentW, contentH);
    ctx.clip();
    tasks.forEach((task, index) => {
        const config = CROP_CONFIG[task.item];
        if (!config) return;
        const enough = inventory[task.item] >= task.amount;
        const cardY = contentY + 6 + index * 70 - uiState.orderDockScroll;
        if (cardY + 58 < contentY || cardY > contentY + contentH) return;
        drawRoundRect(ctx, contentX, cardY, contentW, 58, 7, UI_THEME.card, enough ? UI_THEME.button : UI_THEME.borderSoft);
        ctx.fillStyle = UI_THEME.ink;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${config.icon} ${config.name} x${task.amount}`, contentX + 12, cardY + 22);
        ctx.fillStyle = enough ? UI_THEME.button : UI_THEME.muted;
        ctx.font = '12px Arial';
        ctx.fillText(`${inventory[task.item]}/${task.amount}  奖励 ${task.reward}币`, contentX + 12, cardY + 43);
        drawSmallButton(ctx, `order-dock-${index}`, contentX + contentW - 74, cardY + 16, 62, 28, enough ? '交付' : '等待', () => deliverTask(index), enough ? UI_THEME.button : UI_THEME.buttonDisabled);
    });
    ctx.restore();
}

function drawStoryPopup(ctx) {
    if (!uiState.activeStoryPopup && uiState.storyPopupQueue.length > 0) {
        uiState.activeStoryPopup = uiState.storyPopupQueue.shift();
    }
    const letter = uiState.activeStoryPopup;
    if (!letter) return;
    const w = Math.min(660, Math.round(canvas.width * 0.56));
    const h = Math.min(500, canvas.height - 160);
    const x = Math.round((canvas.width - w) / 2);
    const y = Math.round((canvas.height - h) / 2);
    ctx.fillStyle = 'rgba(42, 47, 38, 0.34)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawRoundRect(ctx, x + 5, y + 7, w, h, 12, UI_THEME.shadow, null);
    drawRoundRect(ctx, x, y, w, h, 12, '#fffaf0', '#d8caa2');
    drawRoundRect(ctx, x, y, w, 50, 12, UI_THEME.header, UI_THEME.headerDark);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`新信件：${letter.title}`, x + 22, y + 32);
    drawRoundRect(ctx, x + 30, y + 74, w - 60, h - 182, 8, '#fffdf6', '#eadfbd');
    drawTextLine(ctx, `${letter.id} ${letter.title}`, x + 50, y + 108, UI_THEME.ink, 'bold 18px Arial');
    let bodyY = y + 146;
    letter.body.forEach(line => {
        bodyY = drawWrappedText(ctx, line, x + 50, bodyY, w - 100, 28, '#3d4f48', '15px Arial');
        bodyY += 8;
    });
    drawTextLine(ctx, '已收入手札，可在“爷爷的信”页重新阅读。', x + 34, y + h - 74, UI_THEME.muted, '13px Arial');
    drawSmallButton(ctx, 'story-popup-open', x + w - 250, y + h - 54, 104, 34, '打开手札', () => {
        uiState.activeTabs.journal = 'letters';
        uiState.activeStoryLetter = letter.id;
        const letterIndex = STORY_LETTERS.findIndex(item => item.id === letter.id);
        if (letterIndex >= 0) uiState.storyListPage = Math.floor(letterIndex / 6);
        closeStoryPopup(true);
        uiState.activePanel = 'journal';
        markTutorialJournalOpened();
    }, UI_THEME.blue);
    drawSmallButton(ctx, 'story-popup-close', x + w - 128, y + h - 54, 96, 34, '收下', () => closeStoryPopup(true), UI_THEME.button);
}

function showTileInfo(screenX, screenY, worldX, worldY) {
    if (worldX < farmStartX || worldX > farmStartX + gridWidth || worldY < farmStartY || worldY > farmStartY + gridHeight) return false;
    const col = Math.floor((worldX - farmStartX) / TILE_SIZE);
    const row = Math.floor((worldY - farmStartY) / TILE_SIZE);
    const cell = gridData[row]?.[col];
    if (!cell) return false;
    let title = `地块 (${row + 1}, ${col + 1})`;
    let line1 = '状态：可种植';
    let line2 = `当前工具：${getToolLabel(currentSelectedTool)}`;
    if (cell.state === -1) {
        line1 = `状态：未开垦，需要 ${UNLOCK_PRICE} 币`;
        line2 = '点击可解锁周围土地';
    } else if (cell.state === 1) {
        const config = CROP_CONFIG[cell.cropType];
        const left = Math.max(0, Math.ceil((getActualGrowTime(cell.cropType) / getGrowthMultiplier() - (Date.now() - cell.timer)) / 1000));
        line1 = `作物：${config.icon} ${config.name}`;
        line2 = `阶段：生长中，约 ${left}s 后成熟`;
    } else if (cell.state === 2) {
        const config = CROP_CONFIG[cell.cropType];
        line1 = `作物：${config.icon} ${config.name}`;
        line2 = '阶段：成熟，点击可收割';
    } else if (cell.state === 4) {
        const parent = gridData[cell.parentRow]?.[cell.parentCol];
        const config = CROP_CONFIG[cell.cropType];
        const mature = parent?.state === 2;
        line1 = `作物：${config.icon} ${config.name} 的占位地块`;
        line2 = mature ? '点击任意占位格可收获整株' : '生长中，占据 2x2 地块';
    }
    uiState.tileTip = { x: screenX + 12, y: screenY + 12, title, line1, line2, until: Date.now() + 3200 };
    return true;
}

function getPanelIcon(id) {
    const icons = { journal: '', seeds: '', build: '', orders: '', market: '' };
    return icons[id] || '';
}

function drawStatusHUD(ctx) {
    drawRoundRect(ctx, 14, 10, canvas.width - 28, 46, 8, UI_THEME.panel, UI_THEME.border);
    ctx.fillStyle = UI_THEME.ink;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`金币 ${coins}`, 32, 39);
    ctx.fillText(`Lv.${playerLevel}`, 146, 39);
    ctx.fillText(`EXP ${playerExp}/${getMaxExp()}`, 226, 39);
    ctx.fillText(`时间 ${getClockLabel()}`, 426, 39);
    ctx.fillText(`${WEATHER_CONFIG[weather.type].icon} ${WEATHER_CONFIG[weather.type].name}`, 570, 39);
    ctx.fillText(`生长 ${Math.round(getGrowthMultiplier() * 100)}%`, 718, 39);
    ctx.fillText(`工具 ${getToolLabel(currentSelectedTool)}`, 868, 39);
    ctx.fillText(`视野 ${Math.round((camera.zoom || 1) * 100)}%`, canvas.width - 360, 39);
    ctx.textAlign = 'right';
    ctx.fillText('滚轮/双指缩放 · 长按看地块', canvas.width - 72, 39);
    drawSmallButton(ctx, 'settings-toggle', canvas.width - 54, 16, 32, 28, '设置', () => toggleSettings(), UI_THEME.header);
}

function drawUIPanel(ctx, panelId) {
    const titles = { journal: '手札', seeds: '种子', build: '建造', orders: '订单', market: '市场' };
    const title = titles[panelId] || '';
    drawRoundRect(ctx, UI_PANEL.x + 4, UI_PANEL.y + 6, UI_PANEL.w, UI_PANEL.h, 10, UI_THEME.shadow, null);
    drawRoundRect(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 10, UI_THEME.panel, UI_THEME.border);
    drawRoundRect(ctx, UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, 46, 10, UI_THEME.header, UI_THEME.headerDark);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${getPanelIcon(panelId)} ${title}`, UI_PANEL.x + 18, UI_PANEL.y + 30);
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f7ecd1';
    ctx.fillText('内容较多时可滚动', UI_PANEL.x + UI_PANEL.w - 58, UI_PANEL.y + 29);
    drawSmallButton(ctx, 'close-panel', UI_PANEL.x + UI_PANEL.w - 42, UI_PANEL.y + 9, 28, 26, '×', () => closePanel(), UI_THEME.danger);
    drawPanelTabs(ctx, panelId);

    ctx.save();
    ctx.beginPath();
    ctx.rect(UI_CONTENT.x, UI_CONTENT.y, UI_CONTENT.w, UI_CONTENT.h);
    ctx.clip();
    if (panelId === 'journal') drawJournalPanel(ctx);
    if (panelId === 'seeds') drawSeedsPanel(ctx);
    if (panelId === 'build') drawBuildPanel(ctx);
    if (panelId === 'orders') drawOrdersPanel(ctx);
    if (panelId === 'market') drawMarketPanel(ctx);
    ctx.restore();
    drawScrollHint(ctx, panelId);
}

function drawPanelTabs(ctx, panelId) {
    if (panelId === 'journal') {
        drawTabs(ctx, 'journal', [
            ['codex', '图鉴'],
            ['letters', '爷爷的信'],
            ['talents', '天赋'],
            ['miracle', '奇迹'],
            ['visitors', '访客'],
            ['endings', '结局']
        ], UI_PANEL.x + 18, UI_PANEL.y + 58);
    }
    if (panelId === 'build') {
        drawTabs(ctx, 'build', [
            ['ranch', '养殖'],
            ['processing', '加工'],
            ['miracle', '奇迹']
        ], UI_PANEL.x + 18, UI_PANEL.y + 58);
    }
    if (panelId === 'journal' && uiState.activeTabs.journal === 'codex') {
        drawTabs(ctx, 'codex', [
            ['crops', '作物'],
            ['animals', '动物'],
            ['processed', '加工品'],
            ['miracle', '奇迹']
        ], UI_PANEL.x + 18, UI_PANEL.y + 92);
    }
}

function drawBottomNav(ctx) {
    const nav = [
        { id: 'journal', icon: '📖', label: '手札' },
        { id: 'seeds', icon: '🌱', label: '种子' },
        { id: 'build', icon: '⚒', label: '建造' },
        { id: 'market', icon: '📈', label: '市场' }
    ];
    const y = canvas.height - UI_BAR_HEIGHT + 8;
    const itemW = Math.min(190, Math.max(145, Math.floor((canvas.width - 250) / nav.length)));
    const gap = 18;
    const startX = (canvas.width - (itemW * nav.length + gap * (nav.length - 1))) / 2;
    drawRoundRect(ctx, startX - 18, y - 6, itemW * nav.length + gap * (nav.length - 1) + 36, 58, 10, 'rgba(84, 72, 50, 0.76)', UI_THEME.border);
    nav.forEach((item, index) => {
        const x = startX + index * (itemW + gap);
        const active = uiState.activePanel === item.id;
        const hover = isPointInRect(uiState.mouseX, uiState.mouseY, x, y, itemW, 42);
        drawRoundRect(ctx, x, y, itemW, 42, 8, active ? '#ffd979' : hover ? '#fff3c7' : UI_THEME.card, active ? UI_THEME.warn : UI_THEME.border);
        ctx.fillStyle = UI_THEME.ink;
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.icon} ${item.label}`, x + itemW / 2, y + 27);
        registerButton(`nav-${item.id}`, x, y, itemW, 42, () => togglePanel(item.id));
    });
}

function drawSkillDock(ctx) {
    const dockW = 132;
    const dockH = 196;
    const x = 20;
    const y = 74;
    draw8BitFrame(ctx, x - 8, y - 8, dockW + 16, dockH + 16, 'rgba(230, 238, 199, 0.88)', UI_THEME.border, true);
    const ids = ['sow', 'rain', 'harvest'];
    const labels = { sow: '播种', rain: '求雨', harvest: '收割' };
    ids.forEach((id, index) => {
        const skill = skills[id];
        const bx = x;
        const by = y + index * 64;
        const timeLeft = Math.max(0, Math.ceil((getSkillCd(id) - (Date.now() - skill.lastUsed)) / 1000));
        const ready = timeLeft <= 0;
        const label = ready ? `${skill.name}\n${labels[id]}` : `${skill.name}\n${timeLeft}s`;
        drawMultiLineButton(ctx, `dock-skill-${id}`, bx, by, dockW, 54, label, () => useSkill(id), ready ? UI_THEME.purple : UI_THEME.buttonDisabled);
    });
}

function drawZoomDock(ctx) {
    const x = 20;
    const y = 300;
    draw8BitFrame(ctx, x - 8, y - 8, 190, 168, 'rgba(230, 238, 199, 0.82)', UI_THEME.border, true);
    ctx.fillStyle = UI_THEME.ink;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('视野缩放', x + 87, y + 18);
    drawSmallButton(ctx, 'zoom-in', x, y + 32, 82, 44, '+', () => zoomCamera(1.18), UI_THEME.blue);
    drawSmallButton(ctx, 'zoom-out', x + 94, y + 32, 82, 44, '-', () => zoomCamera(1 / 1.18), UI_THEME.blue);
    drawSmallButton(ctx, 'zoom-reset', x, y + 90, 176, 42, `${Math.round((camera.zoom || 1) * 100)}%`, () => resetCameraZoom(), UI_THEME.muted);
}

function drawSettingsPanel(ctx) {
    const x = UI_SETTINGS.x;
    const y = UI_SETTINGS.y;
    drawRoundRect(ctx, x + 4, y + 6, UI_SETTINGS.w, UI_SETTINGS.h, 10, UI_THEME.shadow, null);
    drawRoundRect(ctx, x, y, UI_SETTINGS.w, UI_SETTINGS.h, 10, UI_THEME.panel, UI_THEME.border);
    drawRoundRect(ctx, x, y, UI_SETTINGS.w, 42, 10, UI_THEME.header, UI_THEME.headerDark);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('设置', x + 16, y + 27);
    drawSmallButton(ctx, 'close-settings', x + UI_SETTINGS.w - 42, y + 8, 28, 26, '×', () => toggleSettings(false), UI_THEME.danger);
    drawTextLine(ctx, `当前时间：${getClockLabel()}`, x + 22, y + 72, UI_THEME.ink, '15px Arial');
    drawTextLine(ctx, `当前视野：${Math.round((camera.zoom || 1) * 100)}%`, x + 22, y + 98, UI_THEME.ink, '15px Arial');
    drawSmallButton(ctx, 'setting-save', x + 22, y + 124, 142, 34, '手动保存', () => {
        saveGame();
        effectText = '已保存';
        effectAlpha = 1.0;
    }, UI_THEME.button);
    drawSmallButton(ctx, 'setting-reset-zoom', x + 184, y + 124, 142, 34, '重置视野', () => resetCameraZoom(), UI_THEME.blue);
    drawSmallButton(ctx, 'setting-audio', x + 22, y + 174, 142, 34, audioEnabled ? '音效 开' : '音效 关', () => toggleAudio(), audioEnabled ? UI_THEME.button : UI_THEME.buttonDisabled);
    drawSmallButton(ctx, 'setting-shake', x + 184, y + 174, 142, 34, uiPreferences?.screenShake === false ? '震动 关' : '震动 开', () => toggleScreenShake(), uiPreferences?.screenShake === false ? UI_THEME.buttonDisabled : UI_THEME.button);
    drawTextLine(ctx, '关闭后收割、共振、稀有发现都不会晃动画面。', x + 22, y + 226, UI_THEME.muted, '13px Arial');
    drawSmallButton(ctx, 'setting-reset-game', x + 184, y + 238, 142, 34, '重置世界', () => resetGame(), UI_THEME.danger);
}

function drawTileTip(ctx) {
    if (!uiState.tileTip || Date.now() > uiState.tileTip.until) {
        uiState.tileTip = null;
        return;
    }
    const tip = uiState.tileTip;
    const x = Math.min(canvas.width - 260, Math.max(16, tip.x));
    const y = Math.min(canvas.height - UI_BAR_HEIGHT - 124, Math.max(58, tip.y));
    drawRoundRect(ctx, x + 3, y + 5, 244, 104, 8, UI_THEME.shadow, null);
    drawRoundRect(ctx, x, y, 244, 104, 8, UI_THEME.panel, UI_THEME.border);
    drawTextLine(ctx, tip.title, x + 14, y + 28, UI_THEME.ink, 'bold 15px Arial');
    drawTextLine(ctx, tip.line1, x + 14, y + 56, UI_THEME.text, '13px Arial');
    drawTextLine(ctx, tip.line2, x + 14, y + 80, UI_THEME.text, '13px Arial');
}

function drawTabs(ctx, panelId, tabs, x, y) {
    let cursorX = x;
    tabs.forEach(([id, label]) => {
        const active = uiState.activeTabs[panelId] === id;
        const width = Math.max(70, label.length * 16 + 26);
        drawRoundRect(ctx, cursorX, y, width, 30, 7, active ? '#ffd979' : '#f2ead7', active ? UI_THEME.warn : UI_THEME.borderSoft);
        ctx.fillStyle = UI_THEME.ink;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, cursorX + width / 2, y + 20);
        registerButton(`tab-${panelId}-${id}`, cursorX, y, width, 30, () => {
            uiState.activeTabs[panelId] = id;
            if (panelId === 'codex') uiState.scroll.journal = 0;
            else uiState.scroll[panelId] = 0;
        });
        cursorX += width + 8;
    });
}

function drawInfoCard(ctx, x, y, w, h, title, body, accent) {
    draw8BitFrame(ctx, x, y, w, h, UI_THEME.card, UI_THEME.borderSoft, false);
    ctx.fillStyle = accent || UI_THEME.button;
    ctx.fillRect(x + 6, y + 8, 5, h - 16);
    drawTextLine(ctx, title, x + 14, y + 25, UI_THEME.ink, 'bold 15px Arial');
    drawTextLine(ctx, body, x + 14, y + 50, UI_THEME.text, '13px Arial');
}

function drawSmallButton(ctx, id, x, y, w, h, label, action, color = UI_THEME.button) {
    if (isClippedContentControl(id, y, h)) return;
    const disabled = !action || color === '#95a5a6' || color === UI_THEME.buttonDisabled;
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    draw8BitFrame(ctx, x, y, w, h, disabled ? UI_THEME.buttonDisabled : hover ? lightenColor(color) : color, UI_THEME.border, false);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawMultiLineButton(ctx, id, x, y, w, h, label, action, color = UI_THEME.button) {
    const disabled = !action || color === '#95a5a6' || color === UI_THEME.buttonDisabled;
    const hover = !disabled && isPointInRect(uiState.mouseX, uiState.mouseY, x, y, w, h);
    draw8BitFrame(ctx, x, y, w, h, disabled ? UI_THEME.buttonDisabled : hover ? lightenColor(color) : color, UI_THEME.border, false);
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    const lines = label.split('\n');
    lines.forEach((line, index) => ctx.fillText(line, x + w / 2, y + 21 + index * 19));
    registerButton(id, x, y, w, h, disabled ? null : action);
}

function drawScrollHint(ctx, panelId) {
    const maxScroll = getPanelMaxScroll(panelId);
    const trackX = UI_PANEL.x + UI_PANEL.w - 24;
    const trackY = UI_CONTENT.y;
    const trackH = UI_CONTENT.h;
    drawRoundRect(ctx, trackX, trackY, 10, trackH, 5, maxScroll > 0 ? 'rgba(118, 146, 127, 0.24)' : 'rgba(118, 146, 127, 0.10)', null);
    if (maxScroll <= 0) {
        ctx.fillStyle = UI_THEME.muted;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('已显示全部内容', UI_PANEL.x + UI_PANEL.w - 34, UI_CONTENT.bottom - 8);
        return;
    }
    const thumbH = Math.max(44, trackH * (trackH / (trackH + maxScroll)));
    const thumbY = trackY + (trackH - thumbH) * (uiState.scroll[panelId] / maxScroll);
    drawRoundRect(ctx, trackX - 1, thumbY, 12, thumbH, 6, UI_THEME.header, UI_THEME.border);
}

function lightenColor(color) {
    const map = {
        '#27ae60': '#2ecc71',
        '#f39c12': '#f5b041',
        '#8e44ad': '#a569bd',
        '#7f8c8d': '#95a5a6',
        '#e74c3c': '#ec7063',
        '#2980b9': '#3498db',
        [UI_THEME.button]: UI_THEME.buttonHover,
        [UI_THEME.warn]: '#e3ad3d',
        [UI_THEME.danger]: '#d56b58',
        [UI_THEME.blue]: '#76a3b9',
        [UI_THEME.purple]: '#a17ab6',
        [UI_THEME.header]: '#a17a53',
        [UI_THEME.muted]: '#819282'
    };
    return map[color] || color;
}

// DOM control handoff.
// Buttons and tabs should not be painted on Canvas anymore. Canvas only reports
// their hit boxes and callbacks; js/ui/bitcn-dom-ui.js renders the actual UI.
const drawCanvasUIBeforeDomControls = drawCanvasUI;
drawCanvasUI = function drawCanvasUI(ctx) {
    window.__bitcnControls = [];
    drawCanvasUIBeforeDomControls(ctx);
};

function registerDomControl(id, x, y, w, h, label, action, options = {}) {
    if (typeof isClippedContentControl === 'function' && isClippedContentControl(id, y, h)) return;
    const disabled = !action || options.disabled;
    const freeControl = id.startsWith('tab-') || id.startsWith('setting-') || id === 'settings-toggle' || id === 'close-settings' || id === 'close-panel';
    const clip = uiState.activePanel && !freeControl ? {
        x: UI_CONTENT.x,
        y: UI_CONTENT.y,
        w: UI_CONTENT.w,
        h: UI_CONTENT.h
    } : null;
    registerButton(id, x, y, w, h, disabled ? null : action);
    window.__bitcnControls = window.__bitcnControls || [];
    window.__bitcnControls.push({
        id,
        x,
        y,
        w,
        h,
        label: String(label || ''),
        action: disabled ? null : action,
        disabled,
        kind: options.kind || 'button',
        active: !!options.active,
        danger: !!options.danger,
        compact: !!options.compact,
        clip
    });
}

drawSmallButton = function drawSmallButton(ctx, id, x, y, w, h, label, action, color = UI_THEME.button) {
    registerDomControl(id, x, y, w, h, label, action, {
        danger: color === UI_THEME.danger || color === '#e74c3c',
        disabled: color === '#95a5a6' || color === UI_THEME.buttonDisabled,
        compact: w <= 52 || h <= 30
    });
};

drawMultiLineButton = function drawMultiLineButton(ctx, id, x, y, w, h, label, action, color = UI_THEME.button) {
    registerDomControl(id, x, y, w, h, String(label || '').replace(/\n/g, ' '), action, {
        disabled: color === '#95a5a6' || color === UI_THEME.buttonDisabled,
        compact: w <= 90 || h <= 38
    });
};

drawIconSmallButton = function drawIconSmallButton(ctx, id, x, y, w, h, icon, action, color = UI_THEME.button) {
    const iconLabels = { close: 'x', gear: '设置', check: 'ok', lock: '锁' };
    registerDomControl(id, x, y, w, h, iconLabels[icon] || '', action, {
        danger: icon === 'close' || color === UI_THEME.danger,
        disabled: color === '#95a5a6' || color === UI_THEME.buttonDisabled,
        compact: true
    });
};

drawPixelIconButton = function drawPixelIconButton(ctx, id, x, y, w, h, icon, label, action, active = false) {
    registerDomControl(id, x, y, w, h, label, action, {
        active,
        kind: 'nav'
    });
};

drawTabs = function drawTabs(ctx, panelId, tabs, x, y) {
    let cursorX = x;
    tabs.forEach(([id, label]) => {
        const width = Math.max(70, label.length * 16 + 26);
        registerDomControl(`tab-${panelId}-${id}`, cursorX, y, width, 30, label, () => {
            uiState.activeTabs[panelId] = id;
            if (panelId === 'codex') uiState.scroll.journal = 0;
            else uiState.scroll[panelId] = 0;
        }, {
            active: uiState.activeTabs[panelId] === id,
            kind: 'tab',
            compact: true
        });
        cursorX += width + 8;
    });
};


// DOM mode hard bypass. bitcn-dom-ui.js calls this after it loads.
// Keep the old Canvas helpers available for state utilities, but stop drawing
// or scrolling Canvas UI when the DOM shell is active.
(function installCanvasUiDomModeHardBypassFactory() {
    window.installCanvasUiHardBypass = function installCanvasUiHardBypass() {
        window.__bitcnDomMode = true;
        const noopDrawCanvasUI = function drawCanvasUI() {
            if (window.uiState) window.uiState.buttons = [];
            window.__bitcnControls = [];
        };
        try { drawCanvasUI = window.drawCanvasUI = noopDrawCanvasUI; } catch (error) { window.drawCanvasUI = noopDrawCanvasUI; }

        const domWheelBypass = function handleCanvasUIWheel() {
            return false;
        };
        try { handleCanvasUIWheel = window.handleCanvasUIWheel = domWheelBypass; } catch (error) { window.handleCanvasUIWheel = domWheelBypass; }

        const domClickGuard = function handleCanvasUIClick() {
            return !!(window.uiState?.activePanel || window.uiState?.settingsOpen || window.uiState?.activeStoryPopup);
        };
        try { handleCanvasUIClick = window.handleCanvasUIClick = domClickGuard; } catch (error) { window.handleCanvasUIClick = domClickGuard; }

        const domKeyBypass = function handleCanvasUIKeyDown() {
            return false;
        };
        try { handleCanvasUIKeyDown = window.handleCanvasUIKeyDown = domKeyBypass; } catch (error) { window.handleCanvasUIKeyDown = domKeyBypass; }
    };

    if (window.__bitcnDomMode) window.installCanvasUiHardBypass();
})();
