// ==========================================
// Logic/Workers: 劳工与无人机自动化
// ==========================================
function updateWorkers(now) {
    updateTalentAutomation(now);
    for (const worker of workers) {
        worker.x += worker.vx;
        worker.y += worker.vy;
        if (worker.x < farmStartX + 10) worker.vx = Math.abs(worker.vx) + 0.5;
        if (worker.x > farmStartX + gridWidth - 10) worker.vx = -Math.abs(worker.vx);
        if (worker.y < farmStartY + 10) worker.vy = Math.abs(worker.vy);
        if (worker.y > farmStartY + gridHeight - 10) worker.vy = -Math.abs(worker.vy);
        if (Math.random() < 0.05) {
            worker.vx = (Math.random() - 0.5) * (worker.type === 'drone' ? 5 : 2);
            worker.vy = (Math.random() - 0.5) * (worker.type === 'drone' ? 5 : 2);
        }

        const actionCD = worker.type === 'drone' ? 200 : 1000;
        if (now - worker.actionTimer <= actionCD) continue;
        const col = Math.floor((worker.x - farmStartX) / TILE_SIZE);
        const row = Math.floor((worker.y - farmStartY) / TILE_SIZE);
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

        const cell = gridData[row][col];
        if (cell.state === 2) {
            harvestCell(row, col, false, { quiet: true });
            worker.actionTimer = now;
            updateUI();
        } else if (cell.state === 0 && !['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) {
            if (plantCell(cell, currentSelectedTool, now)) {
                worker.actionTimer = now;
                updateUI();
            }
        }
    }
}

let lastAutoSowAt = 0;
let lastAutoAnimalCollectAt = 0;

function updateTalentAutomation(now) {
    if (getTalentLevel('industry') >= 2 && now - lastAutoSowAt > 3500) {
        const planted = autoSowCurrentSeed(now, 4 + getTalentLevel('industry'));
        if (planted > 0) {
            lastAutoSowAt = now;
            effectText = `🌱 自动播种 x${planted}`;
            effectAlpha = 1.0;
            updateUI();
        } else {
            lastAutoSowAt = now;
        }
    }
    if (getTalentLevel('industry') >= 4 && now - lastAutoAnimalCollectAt > 2500) {
        const collected = collectReadyAnimalProducts(now);
        if (collected > 0) {
            lastAutoAnimalCollectAt = now;
            effectText = `🚁 自动收取动物产物 x${collected}`;
            effectAlpha = 1.0;
            updateUI();
        } else {
            lastAutoAnimalCollectAt = now;
        }
    }
}

function autoSowCurrentSeed(now, limit) {
    if (['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) return 0;
    if (!CROP_CONFIG[currentSelectedTool]?.seedPrice || !isItemUnlocked(currentSelectedTool)) return 0;
    let planted = 0;
    const center = Math.floor(ROWS / 2);
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (gridData[r][c].state === 0) cells.push({ r, c, dist: Math.abs(r - center) + Math.abs(c - center) });
        }
    }
    cells.sort((a, b) => a.dist - b.dist);
    for (const pos of cells) {
        if (planted >= limit) break;
        if (plantCell(gridData[pos.r][pos.c], currentSelectedTool, now)) planted++;
    }
    return planted;
}

function collectReadyAnimalProducts(now) {
    let collected = 0;
    for (const animal of animals) {
        const pTime = getAnimalProduceTime(animal.type, animal);
        if (now - animal.timer <= pTime) continue;
        const produced = Math.floor((now - animal.timer) / pTime);
        const result = addAnimalProducts(animal.type, produced);
        animal.timer = now;
        collected += result.baseAmount + result.rareAmount;
    }
    return collected;
}
