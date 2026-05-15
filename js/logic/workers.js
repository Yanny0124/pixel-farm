// ==========================================
// Logic/Workers: 劳工与无人机自动化
// ==========================================
function updateWorkers(now) {
    updateTalentAutomation(now);
    const canAutoSow = isAutoSowEnabled();
    const sowTool = getAutoSowSeedTool();
    for (const worker of workers) {
        updateWorkerPatrol(worker, now, canAutoSow && !!sowTool);
        const actionCD = worker.type === 'drone' ? getDroneActionCooldown() : 1000;
        if (now - worker.actionTimer <= actionCD) continue;
        const useTargetCell = worker.target && worker.target.row !== undefined && worker.target.col !== undefined && Math.hypot((worker.target.x || worker.x) - worker.x, (worker.target.y || worker.y) - worker.y) <= 10;
        const col = useTargetCell ? worker.target.col : Math.floor((worker.x - farmStartX) / TILE_SIZE);
        const row = useTargetCell ? worker.target.row : Math.floor((worker.y - farmStartY) / TILE_SIZE);
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

        const cell = gridData[row][col];
        if (cell.state === 2) {
            harvestCell(row, col, false, { quiet: true });
            worker.actionTimer = now;
            updateUI();
        } else if (canAutoSow && sowTool && cell.state === 0) {
            if (plantCell(cell, sowTool, now)) {
                worker.actionTimer = now;
                updateUI();
            }
        }
    }
}

function updateWorkerPatrol(worker, now, canAutoSow) {
    if (!worker.target || now > (worker.targetUntil || 0) || isWorkerTargetDone(worker.target, canAutoSow)) {
        worker.target = pickWorkerTarget(worker, canAutoSow);
        worker.targetUntil = now + (worker.type === 'drone' ? Math.max(2600, 4500 - getDroneUpgradeLevel('efficiency') * 220) : 7000);
        worker.idleUntil = 0;
    }
    const targetX = worker.target?.x ?? (farmStartX + gridWidth / 2);
    const targetY = worker.target?.y ?? (farmStartY + gridHeight / 2);
    const dx = targetX - worker.x;
    const dy = targetY - worker.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = worker.type === 'drone' ? getDroneMoveSpeed() : 1.35;
    if (distance <= speed + 0.4) {
        worker.x = targetX;
        worker.y = targetY;
        worker.vx = 0;
        worker.vy = 0;
        if (worker.target?.kind === 'patrol') {
            if (!worker.idleUntil) worker.idleUntil = now + 450 + Math.random() * (worker.type === 'drone' ? 650 : 1200);
            if (now >= worker.idleUntil) {
                worker.target = pickWorkerTarget(worker, canAutoSow);
                worker.targetUntil = now + (worker.type === 'drone' ? Math.max(2600, 4500 - getDroneUpgradeLevel('efficiency') * 220) : 7000);
                worker.idleUntil = 0;
            }
        }
        return;
    }
    const desiredVx = (dx / distance) * speed;
    const desiredVy = (dy / distance) * speed;
    const easing = worker.type === 'drone' ? 0.24 : 0.18;
    worker.vx = (Number.isFinite(worker.vx) ? worker.vx : 0) * (1 - easing) + desiredVx * easing;
    worker.vy = (Number.isFinite(worker.vy) ? worker.vy : 0) * (1 - easing) + desiredVy * easing;
    const velocity = Math.hypot(worker.vx, worker.vy);
    if (velocity > speed) {
        worker.vx = (worker.vx / velocity) * speed;
        worker.vy = (worker.vy / velocity) * speed;
    }
    worker.x += worker.vx;
    worker.y += worker.vy;
    worker.x = Math.max(farmStartX + 8, Math.min(farmStartX + gridWidth - 8, worker.x));
    worker.y = Math.max(farmStartY + 8, Math.min(farmStartY + gridHeight - 8, worker.y));
}

function isWorkerTargetDone(target, canAutoSow) {
    if (!target || target.row === undefined || target.col === undefined) return true;
    const cell = gridData[target.row]?.[target.col];
    if (!cell) return true;
    if (target.kind === 'harvest') return cell.state !== 2;
    if (target.kind === 'sow') return !canAutoSow || cell.state !== 0;
    return false;
}

function pickWorkerTarget(worker, canAutoSow) {
    const preferredStates = [2, ...(canAutoSow ? [0] : [])];
    for (const state of preferredStates) {
        const cells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (gridData[r][c].state === state) cells.push({ row: r, col: c });
            }
        }
        if (cells.length > 0) {
            cells.sort((a, b) => {
                const ax = farmStartX + a.col * TILE_SIZE + TILE_SIZE / 2;
                const ay = farmStartY + a.row * TILE_SIZE + TILE_SIZE / 2;
                const bx = farmStartX + b.col * TILE_SIZE + TILE_SIZE / 2;
                const by = farmStartY + b.row * TILE_SIZE + TILE_SIZE / 2;
                return Math.hypot(ax - worker.x, ay - worker.y) - Math.hypot(bx - worker.x, by - worker.y);
            });
            const choice = cells[Math.min(cells.length - 1, Math.floor(Math.random() * Math.min(4, cells.length)))];
            return {
                kind: state === 2 ? 'harvest' : 'sow',
                row: choice.row,
                col: choice.col,
                x: farmStartX + choice.col * TILE_SIZE + TILE_SIZE / 2,
                y: farmStartY + choice.row * TILE_SIZE + TILE_SIZE / 2 - (worker.type === 'drone' ? 14 : 0)
            };
        }
    }
    worker.patrolPhase = typeof worker.patrolPhase === 'number' ? worker.patrolPhase + 1 : Math.floor(Math.random() * 4);
    const lane = worker.patrolPhase % 4;
    return {
        kind: 'patrol',
        x: farmStartX + gridWidth * (lane % 2 ? 0.72 : 0.28) + (Math.random() - 0.5) * TILE_SIZE,
        y: farmStartY + gridHeight * (lane > 1 ? 0.70 : 0.30) + (Math.random() - 0.5) * TILE_SIZE
    };
}

let lastAutoSowAt = 0;
let lastAutoAnimalCollectAt = 0;

function isAutoSowEnabled() {
    return typeof uiPreferences === 'undefined' || uiPreferences.autoSowEnabled !== false;
}

function getAutoSowSeedTool() {
    const saved = typeof uiPreferences !== 'undefined' ? uiPreferences.lastSeedTool : null;
    if (saved && CROP_CONFIG[saved]?.seedPrice && isItemUnlocked(saved)) return saved;
    if (CROP_CONFIG[currentSelectedTool]?.seedPrice && isItemUnlocked(currentSelectedTool)) return currentSelectedTool;
    return isItemUnlocked('carrot') ? 'carrot' : null;
}

function updateTalentAutomation(now) {
    if (isAutoSowEnabled() && getTalentLevel('industry') >= 2 && now - lastAutoSowAt > 3500) {
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
    const sowTool = getAutoSowSeedTool();
    if (!sowTool) return 0;
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
        if (plantCell(gridData[pos.r][pos.c], sowTool, now)) planted++;
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
