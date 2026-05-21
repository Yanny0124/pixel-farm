// ==========================================
// Main: 初始化与主循环
// ==========================================
let lastLogicAt = Date.now();
let lastNarrativeCheckAt = 0;
let lastSlowLogicAt = 0;
let lastSkillButtonRefreshAt = 0;
let visitorDeltaSeconds = 0;
const SLOW_LOGIC_INTERVAL_MS = 250;
const SKILL_BUTTON_REFRESH_MS = 250;

function updateLogic() {
    const now = Date.now();
    const deltaSeconds = Math.min(5, Math.max(0, (now - lastLogicAt) / 1000));
    lastLogicAt = now;
    stats.totalPlaySeconds = (stats.totalPlaySeconds || 0) + deltaSeconds;
    visitorDeltaSeconds += deltaSeconds;
    if (now - lastNarrativeCheckAt > 30000) {
        lastNarrativeCheckAt = now;
        checkStoryUnlocks(false);
    }
    if (now - lastSlowLogicAt >= SLOW_LOGIC_INTERVAL_MS) {
        lastSlowLogicAt = now;
        updateWeather(now);
        updateCrops(now);
        updateProcessing(now);
        if (typeof updateOrderRefresh === 'function') updateOrderRefresh(now);
    }
    updateAnimals(now);
    if (visitorDeltaSeconds >= 1) {
        updateVisitorArrivals(visitorDeltaSeconds);
        visitorDeltaSeconds = 0;
    }
    updateWorkers(now);
    if (!window.__bitcnDomMode && now - lastSkillButtonRefreshAt >= SKILL_BUTTON_REFRESH_MS) {
        lastSkillButtonRefreshAt = now;
        updateSkillButtons(now);
    }
    updateEffects();
}

function updateSkillButtons(now) {
    for (const key in skills) {
        const btn = document.getElementById(`skill-${key}`);
        if (!btn) continue;
        const skill = skills[key];
        const timeLeft = getSkillCd(key) - (now - skill.lastUsed);
        if (timeLeft > 0) {
            btn.classList.add('on-cd');
            btn.innerText = `${skill.name} (${Math.ceil(timeLeft / 1000)}s)`;
        } else {
            btn.classList.remove('on-cd');
            btn.innerText = skill.name;
        }
    }
}

function gameLoop() {
    const perf = window.PerfDebug;
    if (perf) perf.beginFrame();
    const logicStart = getPerfNow();
    updateLogic();
    if (perf) perf.recordDuration('update', getPerfNow() - logicStart);
    const renderStart = getPerfNow();
    renderFrame();
    if (perf) perf.recordDuration('render', getPerfNow() - renderStart);
    const domStart = getPerfNow();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi();
    if (perf) {
        perf.recordDuration('dom', getPerfNow() - domStart);
        perf.endFrame();
    }
    requestAnimationFrame(gameLoop);
}

function getPerfNow() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

async function startGame() {
    showLoadingScreen();
    initRenderer();
    try {
        await preloadGameAssets(updateLoadingScreen);
    } catch (error) {
        console.warn('[Assets] Essential preload failed. Starting with renderer fallbacks.', error);
    }
    bindInput();
    loadGame();
    setInterval(updateMarket, 10000);
    setInterval(saveGame, 5000);
    renderFrame();
    hideLoadingScreen();
    gameLoop();
}

startGame();
