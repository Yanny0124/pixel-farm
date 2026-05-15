// ==========================================
// Logic/Workers: 劳工与无人机自动化
// ==========================================
function updateWorkers(now) {
    updateTalentAutomation(now);
    const canAutoSow = isAutoSowEnabled();
    const sowTool = getAutoSowSeedTool();
    for (let index = 0; index < workers.length; index++) {
        const worker = workers[index];
        ensureWorkerRuntime(worker, index, now);
        updateWorkerPatrol(worker, now, canAutoSow && !!sowTool, index);
        const actionCD = worker.type === 'drone' ? getDroneActionCooldown() : 1000;
        if (now - worker.actionTimer <= actionCD) continue;
        const useTargetCell = worker.target && worker.target.row !== undefined && worker.target.col !== undefined && Math.hypot((worker.target.x || worker.x) - worker.x, (worker.target.y || worker.y) - worker.y) <= 10;
        const currentCell = useTargetCell ? worker.target : (typeof getFarmCellAtWorld === 'function' ? getFarmCellAtWorld(worker.x, worker.y) : null);
        const col = useTargetCell ? worker.target.col : currentCell?.col;
        const row = useTargetCell ? worker.target.row : currentCell?.row;
        if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

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

function ensureWorkerRuntime(worker, index, now) {
    if (!worker || typeof worker !== 'object') return;
    const seed = Number.isFinite(worker.wanderSeed) ? worker.wanderSeed : Math.floor((now + index * 7919 + Math.random() * 100000) % 100000);
    const colSlots = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, workers.length || 1))));
    const rowSlots = Math.max(1, Math.ceil(Math.max(1, workers.length || 1) / colSlots));
    const slotCol = index % colSlots;
    const slotRow = Math.floor(index / colSlots) % rowSlots;
    const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
    const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
    const homeX = farmStartX + farmW * ((slotCol + 0.5) / colSlots);
    const homeY = farmStartY + farmH * ((slotRow + 0.5) / rowSlots) - (worker.type === 'drone' ? 18 : 0);
    const defaults = {
        wanderSeed: seed,
        homeX,
        homeY,
        nextWanderAt: now + 700 + seededUnit(seed, 1) * 1800
    };
    Object.entries(defaults).forEach(([key, value]) => {
        if (Number.isFinite(worker[key])) return;
        Object.defineProperty(worker, key, {
            value,
            writable: true,
            configurable: true,
            enumerable: false
        });
    });
    if (!Number.isFinite(worker.actionTimer)) worker.actionTimer = 0;
    if (!Number.isFinite(worker.vx)) worker.vx = 0;
    if (!Number.isFinite(worker.vy)) worker.vy = 0;
}

function seededUnit(seed, salt = 0) {
    const x = Math.sin((seed || 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

function getWorkerTargetHoldMs(worker) {
    const base = worker.type === 'drone' ? Math.max(2600, 4500 - getDroneUpgradeLevel('efficiency') * 220) : 7000;
    return base + seededUnit(worker.wanderSeed, Date.now() % 997) * (worker.type === 'drone' ? 900 : 1800);
}

function updateWorkerPatrol(worker, now, canAutoSow, index = 0) {
    ensureWorkerRuntime(worker, index, now);
    if (!worker.target || now > (worker.targetUntil || 0) || isWorkerTargetDone(worker.target, canAutoSow)) {
        worker.target = pickWorkerTarget(worker, canAutoSow, index);
        worker.targetUntil = now + getWorkerTargetHoldMs(worker);
        worker.idleUntil = 0;
    }
    const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
    const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
    const targetX = worker.target?.x ?? (farmStartX + farmW / 2);
    const targetY = worker.target?.y ?? (farmStartY + farmH / 2);
    const dx = targetX - worker.x;
    const dy = targetY - worker.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = worker.type === 'drone' ? getDroneMoveSpeed() : 1.35;
    const arrivalRadius = worker.target?.kind === 'patrol' ? (worker.type === 'drone' ? 34 : 26) : 9;
    if (distance <= arrivalRadius) {
        worker.vx *= worker.type === 'drone' ? 0.94 : 0.86;
        worker.vy *= worker.type === 'drone' ? 0.94 : 0.86;
        if (worker.target?.kind === 'patrol') {
            if (!worker.idleUntil) worker.idleUntil = now + 520 + seededUnit(worker.wanderSeed, now % 613) * (worker.type === 'drone' ? 900 : 1500);
            if (now >= worker.idleUntil || now >= (worker.nextWanderAt || 0)) {
                worker.target = pickWorkerTarget(worker, canAutoSow, index);
                worker.targetUntil = now + getWorkerTargetHoldMs(worker);
                worker.nextWanderAt = now + 1200 + seededUnit(worker.wanderSeed, now % 977) * (worker.type === 'drone' ? 2200 : 3600);
                worker.idleUntil = 0;
            }
        }
    } else {
        const desiredVx = (dx / distance) * speed;
        const desiredVy = (dy / distance) * speed;
        const easing = worker.type === 'drone' ? 0.16 : 0.11;
        worker.vx = (Number.isFinite(worker.vx) ? worker.vx : 0) * (1 - easing) + desiredVx * easing;
        worker.vy = (Number.isFinite(worker.vy) ? worker.vy : 0) * (1 - easing) + desiredVy * easing;
    }
    if (worker.target?.kind === 'patrol') {
        worker.vx += (seededUnit(worker.wanderSeed, Math.floor(now / 900)) - 0.5) * (worker.type === 'drone' ? 0.045 : 0.025);
        worker.vy += (seededUnit(worker.wanderSeed, Math.floor(now / 1100) + 13) - 0.5) * (worker.type === 'drone' ? 0.04 : 0.018);
    }
    applyWorkerSeparation(worker, workers, index);
    const velocity = Math.hypot(worker.vx, worker.vy);
    const maxSpeed = worker.type === 'drone' ? speed : speed * 0.95;
    if (velocity > maxSpeed) {
        worker.vx = (worker.vx / velocity) * maxSpeed;
        worker.vy = (worker.vy / velocity) * maxSpeed;
    }
    worker.x += worker.vx;
    worker.y += worker.vy;
    worker.x = Math.max(farmStartX + 8, Math.min(farmStartX + farmW - 8, worker.x));
    worker.y = Math.max(farmStartY + 8, Math.min(farmStartY + farmH - 8, worker.y));
}

function isWorkerTargetDone(target, canAutoSow) {
    if (target?.kind === 'patrol') return false;
    if (!target || target.row === undefined || target.col === undefined) return true;
    const cell = gridData[target.row]?.[target.col];
    if (!cell) return true;
    if (target.kind === 'harvest') return cell.state !== 2;
    if (target.kind === 'sow') return !canAutoSow || cell.state !== 0;
    return false;
}

function getReservedWorkerCells(worker) {
    const reserved = new Set();
    for (const other of workers || []) {
        if (!other || other === worker || !other.target) continue;
        if (!['harvest', 'sow'].includes(other.target.kind)) continue;
        if (other.target.row === undefined || other.target.col === undefined) continue;
        if (isWorkerTargetDone(other.target, true)) continue;
        reserved.add(`${other.target.row}:${other.target.col}`);
    }
    return reserved;
}

function pickWorkerTarget(worker, canAutoSow, index = 0) {
    ensureWorkerRuntime(worker, index, Date.now());
    const preferredStates = [2, ...(canAutoSow ? [0] : [])];
    const reserved = getReservedWorkerCells(worker);
    for (const state of preferredStates) {
        const cells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (gridData[r][c].state !== state) continue;
                if (reserved.has(`${r}:${c}`)) continue;
                cells.push({ row: r, col: c });
            }
        }
        if (cells.length > 0) {
            cells.sort((a, b) => {
                const ax = (typeof getFarmTileWorldX === 'function' ? getFarmTileWorldX(a.col) : farmStartX + a.col * TILE_SIZE) + TILE_SIZE / 2;
                const ay = (typeof getFarmTileWorldY === 'function' ? getFarmTileWorldY(a.row) : farmStartY + a.row * TILE_SIZE) + TILE_SIZE / 2;
                const bx = (typeof getFarmTileWorldX === 'function' ? getFarmTileWorldX(b.col) : farmStartX + b.col * TILE_SIZE) + TILE_SIZE / 2;
                const by = (typeof getFarmTileWorldY === 'function' ? getFarmTileWorldY(b.row) : farmStartY + b.row * TILE_SIZE) + TILE_SIZE / 2;
                return Math.hypot(ax - worker.x, ay - worker.y) - Math.hypot(bx - worker.x, by - worker.y);
            });
            const choice = cells[Math.min(cells.length - 1, Math.floor(Math.random() * Math.min(4, cells.length)))];
            return {
                kind: state === 2 ? 'harvest' : 'sow',
                row: choice.row,
                col: choice.col,
                x: (typeof getFarmTileWorldX === 'function' ? getFarmTileWorldX(choice.col) : farmStartX + choice.col * TILE_SIZE) + TILE_SIZE / 2,
                y: (typeof getFarmTileWorldY === 'function' ? getFarmTileWorldY(choice.row) : farmStartY + choice.row * TILE_SIZE) + TILE_SIZE / 2 - (worker.type === 'drone' ? 14 : 0)
            };
        }
    }
    return pickWorkerWanderTarget(worker, index);
}

function pickWorkerWanderTarget(worker, index = 0) {
    ensureWorkerRuntime(worker, index, Date.now());
    worker.patrolPhase = typeof worker.patrolPhase === 'number' ? worker.patrolPhase + 1 : Math.floor(seededUnit(worker.wanderSeed, index) * 7);
    const phase = worker.patrolPhase;
    const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
    const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
    const radiusX = Math.max(TILE_SIZE * 1.4, farmW * 0.16);
    const radiusY = Math.max(TILE_SIZE * 1.4, farmH * 0.16);
    const angle = seededUnit(worker.wanderSeed, phase * 17) * Math.PI * 2;
    const wobbleX = Math.cos(angle) * radiusX * (0.35 + seededUnit(worker.wanderSeed, phase + 3) * 0.65);
    const wobbleY = Math.sin(angle) * radiusY * (0.35 + seededUnit(worker.wanderSeed, phase + 7) * 0.65);
    const jitterX = (seededUnit(worker.wanderSeed, phase + 11) - 0.5) * TILE_SIZE * 1.8;
    const jitterY = (seededUnit(worker.wanderSeed, phase + 19) - 0.5) * TILE_SIZE * 1.8;
    const x = Math.max(farmStartX + 14, Math.min(farmStartX + farmW - 14, worker.homeX + wobbleX + jitterX));
    const y = Math.max(farmStartY + 14, Math.min(farmStartY + farmH - 14, worker.homeY + wobbleY + jitterY));
    return {
        kind: 'patrol',
        x,
        y: y - (worker.type === 'drone' ? 10 : 0)
    };
}

function applyWorkerSeparation(worker, workerList, index) {
    if (!Array.isArray(workerList)) return;
    let pushX = 0;
    let pushY = 0;
    for (let i = 0; i < workerList.length; i++) {
        if (i === index) continue;
        const other = workerList[i];
        if (!other) continue;
        const dx = worker.x - other.x;
        const dy = worker.y - other.y;
        const dist = Math.hypot(dx, dy);
        if (!Number.isFinite(dist) || dist <= 0 || dist >= 24) continue;
        const strength = (24 - dist) / 24;
        pushX += (dx / dist) * strength;
        pushY += (dy / dist) * strength;
    }
    if (!pushX && !pushY) return;
    const force = worker.type === 'drone' ? 0.095 : 0.065;
    worker.vx += pushX * force;
    worker.vy += pushY * force;
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
