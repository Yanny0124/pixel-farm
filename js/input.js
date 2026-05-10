// ==========================================
// Input: 工具选择、鼠标交互、相机拖拽
// ==========================================
let isDraggingCamera = false;
let lastMouseX = 0;
let lastMouseY = 0;
let isSpacebarDown = false;
let touchState = null;
let touchInfoTimer = null;

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
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
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
};

window.hireWorker = function(type) {
    const cost = type === 'human' ? 600 : 1800;
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
    if (handleCanvasUIClick(screen.x, screen.y)) return;
    const pos = getWorldMouse(e);

    if (e.button === 2) {
        showTileInfo(screen.x, screen.y, pos.worldX, pos.worldY);
        return;
    }

    if (isSpacebarDown || e.button === 1) {
        isDraggingCamera = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) {
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

function placeAnimal(worldX, worldY) {
    if (!isItemUnlocked(currentSelectedTool)) return;
    const isClickRanch = worldX >= ranchStartX && worldX <= ranchStartX + ranchWidth && worldY >= ranchStartY && worldY <= ranchStartY + ranchHeight;
    const isClickFarm = worldX >= farmStartX && worldX <= farmStartX + gridWidth && worldY >= farmStartY && worldY <= farmStartY + gridHeight;
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
    if (worldX < farmStartX || worldX > farmStartX + gridWidth || worldY < farmStartY || worldY > farmStartY + gridHeight) return;
    if (!isItemUnlocked(currentSelectedTool)) return;
    const col = Math.floor((worldX - farmStartX) / TILE_SIZE);
    const row = Math.floor((worldY - farmStartY) / TILE_SIZE);
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
        setCanvasUIMouse((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
    }
    if (!isDraggingCamera) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const zoom = camera.zoom || 1;
    camera.x += (e.clientX - lastMouseX) * scaleX / zoom;
    camera.y += (e.clientY - lastMouseY) * scaleY / zoom;
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
    e.preventDefault();
}

function handleMouseUp() {
    if (!isDraggingCamera) return;
    isDraggingCamera = false;
    canvas.style.cursor = isSpacebarDown ? 'grab' : 'default';
}

function handleCanvasTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
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
    if (!touchState || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchState.lastX;
    const dy = touch.clientY - touchState.lastY;
    const totalDx = touch.clientX - touchState.startX;
    const totalDy = touch.clientY - touchState.startY;
    if (Math.hypot(totalDx, totalDy) > 10) {
        touchState.moved = true;
        clearTimeout(touchInfoTimer);
    }
    if (touchState.moved) {
        const rect = canvas.getBoundingClientRect();
        const zoom = camera.zoom || 1;
        camera.x += dx * (canvas.width / rect.width) / zoom;
        camera.y += dy * (canvas.height / rect.height) / zoom;
    }
    touchState.lastX = touch.clientX;
    touchState.lastY = touch.clientY;
    e.preventDefault();
}

function handleCanvasTouchEnd(e) {
    clearTimeout(touchInfoTimer);
    if (!touchState) return;
    if (!touchState.moved && !touchState.infoShown) {
        const screen = touchState.screen;
        setCanvasUIMouse(screen.x, screen.y);
        if (!handleCanvasUIClick(screen.x, screen.y)) {
            if (['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) {
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
