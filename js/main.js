// ==========================================
// Main: 初始化与主循环
// ==========================================
let lastLogicAt = Date.now();
let lastNarrativeCheckAt = 0;

function updateLogic() {
    const now = Date.now();
    const deltaSeconds = Math.min(5, Math.max(0, (now - lastLogicAt) / 1000));
    lastLogicAt = now;
    stats.totalPlaySeconds = (stats.totalPlaySeconds || 0) + deltaSeconds;
    if (now - lastNarrativeCheckAt > 30000) {
        lastNarrativeCheckAt = now;
        checkStoryUnlocks(false);
    }
    updateWeather(now);
    updateCrops(now);
    updateAnimals(now);
    updateProcessing(now);
    updateVisitorArrivals(deltaSeconds);
    updateWorkers(now);
    updateSkillButtons(now);
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
    updateLogic();
    renderFrame();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initRenderer();
    bindInput();
    loadGame();
    setInterval(updateMarket, 10000);
    setInterval(saveGame, 5000);
    gameLoop();
}

startGame();
