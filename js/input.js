// ==========================================
// Input: 工具选择、鼠标交互、相机拖拽
// ==========================================
let isDraggingCamera = false;
let lastMouseX = 0;
let lastMouseY = 0;
let isSpacebarDown = false;
let touchState = null;
let touchInfoTimer = null;
let farmHoverTipKey = '';
const ANIMAL_TOOL_IDS = ['chicken', 'sheep', 'cow', 'bee', 'pig'];
const MIN_CAMERA_PAN_ZOOM = 1.01;

function getDefaultCameraPosition() {
    const anchorX = typeof WORLD_VIEW_FARM_SCREEN_X !== 'undefined' ? WORLD_VIEW_FARM_SCREEN_X : 50;
    const anchorY = typeof WORLD_VIEW_FARM_SCREEN_Y !== 'undefined' ? WORLD_VIEW_FARM_SCREEN_Y : 50;
    return {
        x: -(farmStartX - anchorX),
        y: -(farmStartY - anchorY)
    };
}

function canPanCamera() {
    return (camera.zoom || 1) > MIN_CAMERA_PAN_ZOOM;
}

function clampCameraToView() {
    const zoom = camera.zoom || 1;
    const fixed = getDefaultCameraPosition();
    if (zoom <= MIN_CAMERA_PAN_ZOOM) {
        camera.zoom = 1;
        camera.x = fixed.x;
        camera.y = fixed.y;
        return;
    }
    const viewW = canvas?.width || 1600;
    const viewH = canvas?.height || 900;
    const anchorX = typeof WORLD_VIEW_FARM_SCREEN_X !== 'undefined' ? WORLD_VIEW_FARM_SCREEN_X : 50;
    const anchorY = typeof WORLD_VIEW_FARM_SCREEN_Y !== 'undefined' ? WORLD_VIEW_FARM_SCREEN_Y : 50;
    const defaultLeft = farmStartX - anchorX;
    const defaultTop = farmStartY - anchorY;
    const defaultRight = defaultLeft + viewW;
    const defaultBottom = defaultTop + viewH;
    const centerX = viewW / 2;
    const centerY = viewH / 2;
    const visibleW = viewW / zoom;
    const visibleH = viewH / zoom;
    const cameraXMin = centerX * (1 - 1 / zoom) - (defaultRight - visibleW);
    const cameraXMax = centerX * (1 - 1 / zoom) - defaultLeft;
    const cameraYMin = centerY * (1 - 1 / zoom) - (defaultBottom - visibleH);
    const cameraYMax = centerY * (1 - 1 / zoom) - defaultTop;
    camera.x = Math.max(cameraXMin, Math.min(cameraXMax, camera.x));
    camera.y = Math.max(cameraYMin, Math.min(cameraYMax, camera.y));
}
window.clampCameraToView = clampCameraToView;

function bindInput() {
    window.addEventListener('keydown', (e) => {
        if (handleCanvasUIKeyDown(e)) {
            e.preventDefault();
            return;
        }
        if (e.code === 'Space') {
            isSpacebarDown = true;
            canvas.style.cursor = 'grab';
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpacebarDown = false;
            if (!isDraggingCamera) canvas.style.cursor = 'default';
        }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('auxclick', e => {
        if (e.button === 1) e.preventDefault();
    });
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mouseleave', clearFarmHoverTip);
    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
}

window.selectTool = function(toolId) {
    if (CROP_CONFIG[toolId] && !isItemUnlocked(toolId)) return;
    currentSelectedTool = toolId;
    if (isSeedTool(toolId) && typeof uiPreferences !== 'undefined') {
        uiPreferences.lastSeedTool = toolId;
        if (typeof saveGame === 'function') saveGame();
    }
};

function isAnimalTool(toolId) {
    return ANIMAL_TOOL_IDS.includes(toolId);
}

function isSeedTool(toolId) {
    return CROP_CONFIG[toolId]?.seedPrice !== undefined;
}

function getFarmPlotGap() {
    return typeof FARM_PLOT_GAP !== 'undefined' ? FARM_PLOT_GAP : 0;
}

function getFarmVisualWidth() {
    return gridWidth + getFarmPlotGap();
}

function getFarmVisualHeight() {
    return gridHeight + getFarmPlotGap();
}

function getFarmCellAtWorld(worldX, worldY) {
    const localX = worldX - farmStartX;
    const localY = worldY - farmStartY;
    if (localX < 0 || localY < 0 || localX > getFarmVisualWidth() || localY > getFarmVisualHeight()) return null;
    const gap = getFarmPlotGap();
    const plotSize = typeof FARM_PLOT_SIZE !== 'undefined' ? FARM_PLOT_SIZE : Math.floor(COLS / 2);
    const halfW = plotSize * TILE_SIZE;
    const halfH = plotSize * TILE_SIZE;
    let colOffset = 0;
    let rowOffset = 0;
    let tileX = localX;
    let tileY = localY;
    if (localX >= halfW + gap) {
        colOffset = plotSize;
        tileX = localX - halfW - gap;
    } else if (localX >= halfW) {
        return null;
    }
    if (localY >= halfH + gap) {
        rowOffset = plotSize;
        tileY = localY - halfH - gap;
    } else if (localY >= halfH) {
        return null;
    }
    const col = colOffset + Math.floor(tileX / TILE_SIZE);
    const row = rowOffset + Math.floor(tileY / TILE_SIZE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return { row, col };
}

function isFarmArea(worldX, worldY) {
    return !!getFarmCellAtWorld(worldX, worldY);
}

function getLastSeedTool() {
    const saved = typeof uiPreferences !== 'undefined' ? uiPreferences.lastSeedTool : null;
    if (saved && isSeedTool(saved) && isItemUnlocked(saved)) return saved;
    if (isSeedTool(currentSelectedTool) && isItemUnlocked(currentSelectedTool)) return currentSelectedTool;
    return 'carrot';
}

function switchBackToLastSeedTool(fromAnimalFarm = false) {
    const seedTool = getLastSeedTool();
    currentSelectedTool = seedTool;
    if (typeof uiPreferences !== 'undefined') uiPreferences.lastSeedTool = seedTool;
    effectText = fromAnimalFarm
        ? `当前选择的是动物，已切回 ${CROP_CONFIG[seedTool]?.name || '种子'} 播种`
        : `已切回 ${CROP_CONFIG[seedTool]?.name || '种子'}`;
    effectAlpha = 1.0;
}

window.hireWorker = function(type) {
    const cost = type === 'human' ? 600 : 1800;
    const currentCount = (workers || []).filter(worker => worker.type === type).length;
    const limit = WORKER_LIMITS[type] ?? Infinity;
    if (currentCount >= limit) {
        alert(type === 'drone' ? '无人机目前只能部署 1 台，可以通过升级强化。' : '员工最多雇佣 5 名。');
        return;
    }
    if (type === 'drone' && playerLevel < 5 && getTalentLevel('industry') < 4) {
        alert('无人机需要 Lv.5 或工业领袖 L4。');
        return;
    }
    if (coins >= cost) {
        coins -= cost;
        workers.push({ type, x: crossroadX, y: crossroadY, vx: -2, vy: (Math.random() - 0.5) * 2, actionTimer: 0 });
        effectText = type === 'drone' ? '🚁 无人机已加入！' : '👷 员工已加入！';
        effectAlpha = 1.0;
        recordDiary(type === 'drone' ? '雇佣无人机' : '雇佣员工');
        updateUI();
        saveGame();
    } else {
        alert('金币不足！');
    }
};

window.dismissWorker = function(type) {
    const index = workers.map(worker => worker.type).lastIndexOf(type);
    if (index < 0) return;
    workers.splice(index, 1);
    effectText = type === 'drone' ? '🚁 已召回一台无人机' : '👷 已召回一名员工';
    effectAlpha = 1.0;
    recordDiary(type === 'drone' ? '召回无人机' : '召回员工');
    updateUI();
    saveGame();
};

function handleCanvasMouseDown(e) {
    const screen = getCanvasMouse(e);
    setCanvasUIMouse(screen.x, screen.y);

    if (isSpacebarDown || e.button === 1) {
        e.preventDefault();
        isDraggingCamera = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (handleCanvasUIClick(screen.x, screen.y)) return;
    const pos = getWorldMouse(e);

    if (e.button === 2) {
        showTileInfo(screen.x, screen.y, pos.worldX, pos.worldY);
        return;
    }

    const visitorId = getVisitorIconAtWorld(pos.worldX, pos.worldY);
    if (visitorId) {
        openVisitorJournal(visitorId);
        return;
    }

    if (isAnimalTool(currentSelectedTool)) {
        if (currentSelectedTool !== 'bee' && isFarmArea(pos.worldX, pos.worldY)) {
            switchBackToLastSeedTool(true);
            interactWithFarm(pos.worldX, pos.worldY);
            return;
        }
        placeAnimal(pos.worldX, pos.worldY);
        return;
    }
    interactWithFarm(pos.worldX, pos.worldY);
}

function getWorldMouse(e) {
    const screen = getCanvasMouse(e);
    const world = screenToWorldPoint(screen.x, screen.y);
    return {
        worldX: world.x,
        worldY: world.y
    };
}

function getCanvasMouse(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function getVisitorIconAtWorld(worldX, worldY) {
    if (typeof getVisitorIds !== 'function' || typeof isVisitorUnlocked !== 'function') return null;
    const visitors = getVisitorIds().filter(isVisitorUnlocked);
    const baseX = ranchStartX + 26;
    const baseY = ranchStartY + ranchHeight + 54;
    for (let index = 0; index < visitors.length; index++) {
        const x = baseX + (index % 4) * 66;
        const y = baseY + 14 + Math.floor(index / 4) * 48;
        if (worldX >= x - 14 && worldX <= x + 32 && worldY >= y - 24 && worldY <= y + 34) {
            return visitors[index];
        }
    }
    return null;
}

function openVisitorJournal(visitorId) {
    if (!window.uiState || !VISITOR_CONFIG[visitorId]) return;
    uiState.activePanel = 'journal';
    uiState.activeTabs.journal = 'visitors';
    uiState.activeVisitor = visitorId;
    uiState.visitorDialog = null;
    uiState.settingsOpen = false;
    uiState.scroll.journal = 0;
    if (typeof markTutorialJournalOpened === 'function') markTutorialJournalOpened();
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi();
}

function placeAnimal(worldX, worldY) {
    if (!isItemUnlocked(currentSelectedTool)) return;
    const isClickRanch = worldX >= ranchStartX && worldX <= ranchStartX + ranchWidth && worldY >= ranchStartY && worldY <= ranchStartY + ranchHeight;
    const isClickFarm = isFarmArea(worldX, worldY);
    const price = CROP_CONFIG[currentSelectedTool].price;

    if (currentSelectedTool === 'bee' && !isClickFarm) return alert('🐝 蜜蜂请放置在左侧农田区！');
    if (['chicken', 'sheep', 'cow', 'pig'].includes(currentSelectedTool) && !isClickRanch) return alert('请放置在右侧牧场区！');
    if (getAnimalCount(currentSelectedTool) >= getAnimalCapacity(currentSelectedTool)) {
        const buildingId = getRanchBuildingId(currentSelectedTool);
        const buildingName = RANCH_BUILDING_CONFIG[buildingId]?.name || '养殖建筑';
        return alert(`${buildingName}容量不足，请在建造窗口升级。`);
    }
    if (coins < price) return alert('金币不足！');

    coins -= price;
    animals.push({ type: currentSelectedTool, x: crossroadX, y: crossroadY, vx: currentSelectedTool === 'bee' ? -3 : 3, vy: (Math.random() - 0.5) * 2, timer: Date.now() });
    playSound('build');
    markCollected(currentSelectedTool, 1);
    recordDiary(`放置 ${CROP_CONFIG[currentSelectedTool].name}`);
    updateUI();
    saveGame();
}

function interactWithFarm(worldX, worldY) {
    const target = getFarmCellAtWorld(worldX, worldY);
    if (!target) return;
    if (!isItemUnlocked(currentSelectedTool)) return;
    const col = target.col;
    const row = target.row;
    const cell = gridData[row][col];

    if (cell.state === -1) {
        unlockLandPatch(row, col);
    } else if (cell.state === 0) {
        if (plantCell(cell, currentSelectedTool, Date.now())) playSound('plant');
    } else if (cell.state === 2) {
        harvestCell(row, col, true);
    } else if (cell.state === 4) {
        const parent = gridData[cell.parentRow]?.[cell.parentCol];
        if (parent?.state === 2) harvestCell(cell.parentRow, cell.parentCol, true);
    }
    updateUI();
    saveGame();
}

function unlockLandPatch(centerRow, centerCol) {
    const targets = [];
    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
            const cell = gridData[r]?.[c];
            if (cell?.state === -1) targets.push(cell);
        }
    }
    if (targets.length === 0) return;
    const affordable = Math.min(targets.length, Math.floor(coins / UNLOCK_PRICE));
    if (affordable <= 0) {
        alert(`解锁需要 ${UNLOCK_PRICE} 币`);
        return;
    }
    for (let i = 0; i < affordable; i++) targets[i].state = 0;
    coins -= affordable * UNLOCK_PRICE;
    effectText = `⛏️ 开垦土地 x${affordable}`;
    effectAlpha = 1.0;
    recordDiary(`开垦土地 x${affordable}`);
}

function handleMouseMove(e) {
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screen = {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
        setCanvasUIMouse(screen.x, screen.y);
        if (e.target === canvas && !isDraggingCamera) {
            updateFarmHoverTip(screen, screenToWorldPoint(screen.x, screen.y));
        } else if (e.target !== canvas) {
            clearFarmHoverTip();
        }
    }
    if (!isDraggingCamera) return;
    if (!canPanCamera()) {
        clampCameraToView();
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const zoom = camera.zoom || 1;
    camera.x += (e.clientX - lastMouseX) * scaleX / zoom;
    camera.y += (e.clientY - lastMouseY) * scaleY / zoom;
    clampCameraToView();
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function handleCanvasWheel(e) {
    const screen = getCanvasMouse(e);
    setCanvasUIMouse(screen.x, screen.y);
    if (handleCanvasUIWheel(screen.x, screen.y, e.deltaY)) {
        e.preventDefault();
        return;
    }
    zoomCamera(e.deltaY < 0 ? 1.08 : 1 / 1.08, screen.x, screen.y);
    clampCameraToView();
    e.preventDefault();
}

function handleMouseUp() {
    if (!isDraggingCamera) return;
    isDraggingCamera = false;
    canvas.style.cursor = isSpacebarDown ? 'grab' : 'default';
}

function handleCanvasTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    if (e.touches.length >= 2) {
        clearTimeout(touchInfoTimer);
        const gesture = getTouchGesture(e.touches);
        touchState = {
            mode: 'pinch',
            lastCenterX: gesture.centerX,
            lastCenterY: gesture.centerY,
            lastDistance: gesture.distance,
            moved: true,
            infoShown: false
        };
        e.preventDefault();
        return;
    }
    const touch = e.touches[0];
    const screen = getCanvasPointFromClient(touch.clientX, touch.clientY);
    const world = screenToWorldPoint(screen.x, screen.y);
    setCanvasUIMouse(screen.x, screen.y);
    touchState = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        screen,
        world,
        moved: false,
        infoShown: false
    };
    clearTimeout(touchInfoTimer);
    touchInfoTimer = setTimeout(() => {
        if (!touchState || touchState.moved) return;
        touchState.infoShown = true;
        showTileInfo(touchState.screen.x, touchState.screen.y, touchState.world.x, touchState.world.y);
    }, 520);
    e.preventDefault();
}

function handleCanvasTouchMove(e) {
    if (!touchState || !e.touches || e.touches.length === 0) return;
    if (e.touches.length >= 2 || touchState.mode === 'pinch') {
        clearTimeout(touchInfoTimer);
        const gesture = getTouchGesture(e.touches);
        if (touchState.lastDistance && gesture.distance > 0) {
            const rect = canvas.getBoundingClientRect();
            const zoom = camera.zoom || 1;
            const dx = gesture.centerX - touchState.lastCenterX;
            const dy = gesture.centerY - touchState.lastCenterY;
            if (canPanCamera()) {
                camera.x += dx * (canvas.width / rect.width) / zoom;
                camera.y += dy * (canvas.height / rect.height) / zoom;
            }
            const center = getCanvasPointFromClient(gesture.centerX, gesture.centerY);
            zoomCamera(gesture.distance / touchState.lastDistance, center.x, center.y);
            clampCameraToView();
        }
        touchState.mode = 'pinch';
        touchState.moved = true;
        touchState.lastCenterX = gesture.centerX;
        touchState.lastCenterY = gesture.centerY;
        touchState.lastDistance = gesture.distance;
        e.preventDefault();
        return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchState.lastX;
    const dy = touch.clientY - touchState.lastY;
    const totalDx = touch.clientX - touchState.startX;
    const totalDy = touch.clientY - touchState.startY;
    if (Math.hypot(totalDx, totalDy) > 10) {
        touchState.moved = true;
        clearTimeout(touchInfoTimer);
    }
    if (touchState.moved && canPanCamera()) {
        const rect = canvas.getBoundingClientRect();
        const zoom = camera.zoom || 1;
        camera.x += dx * (canvas.width / rect.width) / zoom;
        camera.y += dy * (canvas.height / rect.height) / zoom;
        clampCameraToView();
    } else if (touchState.moved) {
        clampCameraToView();
    }
    touchState.lastX = touch.clientX;
    touchState.lastY = touch.clientY;
    e.preventDefault();
}

function handleCanvasTouchEnd(e) {
    clearTimeout(touchInfoTimer);
    if (!touchState) return;
    if (touchState.mode === 'pinch') {
        if (e.touches && e.touches.length === 1) {
            const touch = e.touches[0];
            const screen = getCanvasPointFromClient(touch.clientX, touch.clientY);
            touchState = {
                startX: touch.clientX,
                startY: touch.clientY,
                lastX: touch.clientX,
                lastY: touch.clientY,
                screen,
                world: screenToWorldPoint(screen.x, screen.y),
                moved: true,
                infoShown: true
            };
        } else {
            touchState = null;
        }
        e.preventDefault();
        return;
    }
    if (!touchState.moved && !touchState.infoShown) {
        const screen = touchState.screen;
        setCanvasUIMouse(screen.x, screen.y);
        if (!handleCanvasUIClick(screen.x, screen.y)) {
            const visitorId = getVisitorIconAtWorld(touchState.world.x, touchState.world.y);
            if (visitorId) {
                openVisitorJournal(visitorId);
            } else if (isAnimalTool(currentSelectedTool)) {
                if (currentSelectedTool !== 'bee' && isFarmArea(touchState.world.x, touchState.world.y)) {
                    switchBackToLastSeedTool(true);
                    interactWithFarm(touchState.world.x, touchState.world.y);
                    return;
                }
                placeAnimal(touchState.world.x, touchState.world.y);
            } else {
                interactWithFarm(touchState.world.x, touchState.world.y);
            }
        }
        updateUI();
        saveGame();
    }
    touchState = null;
    e.preventDefault();
}

function getCanvasPointFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function getTouchGesture(touches) {
    const first = touches[0];
    const second = touches[1] || touches[0];
    const centerX = (first.clientX + second.clientX) / 2;
    const centerY = (first.clientY + second.clientY) / 2;
    return {
        centerX,
        centerY,
        distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
    };
}

function updateFarmHoverTip(screen, world) {
    if (!window.uiState || window.uiState.activePanel || window.uiState.settingsOpen || window.uiState.activeStoryPopup || window.uiState.npcArrivalPopup) {
        return clearFarmHoverTip();
    }
    const target = typeof getFarmCellAtWorld === 'function' ? getFarmCellAtWorld(world.x, world.y) : null;
    const cell = target ? gridData[target.row]?.[target.col] : null;
    const tip = cell ? getFarmHoverTip(target.row, target.col, cell) : null;
    if (!tip) return clearFarmHoverTip();
    const key = `${target.row}:${target.col}:${tip.title}:${tip.line1}:${tip.line2}`;
    const changed = key !== farmHoverTipKey;
    farmHoverTipKey = key;
    window.uiState.tileTip = {
        x: screen.x + 12,
        y: screen.y + 12,
        title: tip.title,
        line1: tip.line1,
        line2: tip.line2,
        hover: true,
        until: Date.now() + 260
    };
    if (changed && typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi();
}

function getFarmHoverTip(row, col, cell) {
    if (cell.state === 0) {
        if (isSeedTool(currentSelectedTool)) {
            const crop = CROP_CONFIG[currentSelectedTool];
            return {
                title: `点击种植 ${crop?.name || '种子'}`,
                line1: `当前种子：${crop?.icon || ''} ${crop?.name || currentSelectedTool}`,
                line2: '左侧农田空地可以播种'
            };
        }
        if (isAnimalTool(currentSelectedTool)) {
            return {
                title: '当前选择的是动物',
                line1: '请切换种子播种',
                line2: '点农田会自动切回上次种子'
            };
        }
        return null;
    }
    if (cell.state === 1) {
        return getGrowingFarmHoverTip(cell);
    }
    if (cell.state === 2) {
        const crop = CROP_CONFIG[cell.cropType];
        return {
            title: '点击收获',
            line1: `${crop?.icon || ''} ${crop?.name || '作物'} 已成熟`,
            line2: `地块 (${row + 1}, ${col + 1})`
        };
    }
    if (cell.state === 4) {
        const parent = gridData[cell.parentRow]?.[cell.parentCol];
        if (parent?.state === 2) return getFarmHoverTip(cell.parentRow, cell.parentCol, parent);
        if (parent?.state === 1) return getGrowingFarmHoverTip(parent);
    }
    return null;
}

function getGrowingFarmHoverTip(cell) {
    const crop = CROP_CONFIG[cell.cropType];
    const duration = Math.max(1, getActualGrowTime(cell.cropType) / getGrowthMultiplier());
    const percent = Math.max(0, Math.min(99, Math.floor(((Date.now() - cell.timer) / duration) * 100)));
    return {
        title: `成长中 ${percent}%`,
        line1: `${crop?.icon || ''} ${crop?.name || '作物'}`,
        line2: '成熟后点击收获'
    };
}

function clearFarmHoverTip() {
    farmHoverTipKey = '';
    if (!window.uiState?.tileTip?.hover) return;
    window.uiState.tileTip = null;
    if (typeof window.refreshBitcnDomUi === 'function') window.refreshBitcnDomUi();
}
