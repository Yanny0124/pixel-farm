// ==========================================
// Render/Renderer: Canvas 分层绘制
// ==========================================
let canvas = null;
let ctx = null;

function initRenderer() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
}

function renderFrame() {
    const shake = Date.now() < screenShake.until ? screenShake.power : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawFarm();
    drawWeatherLayer();
    drawOfflineReturnFx(ctx);
    drawCanvasUI(ctx);
    drawGlobalEffectText();
    ctx.restore();
}

function drawFarm() {
    ctx.save();
    const zoom = camera.zoom || 1;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.translate(camera.x, camera.y);
    drawCropArea();
    drawProcessingBuildings();
    drawIrrigationCanal();
    drawRanch();
    drawAnimals();
    drawWorkers();
    drawEternalBarn();
    drawVisitors();
    drawEffects(ctx);
    ctx.restore();
}

function worldToScreen(worldX, worldY) {
    const zoom = camera.zoom || 1;
    return {
        x: canvas.width / 2 + ((worldX + camera.x) - canvas.width / 2) * zoom,
        y: canvas.height / 2 + ((worldY + camera.y) - canvas.height / 2) * zoom
    };
}

function drawCropArea() {
    ctx.fillStyle = '#bdc3c7';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🌾 巨型种植区 (16x16)', farmStartX, farmStartY - 25);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawTile(r, c);
        }
    }
    drawMatureResonanceLinks();
}

function drawTile(r, c) {
    const x = farmStartX + c * TILE_SIZE;
    const y = farmStartY + r * TILE_SIZE;
    const cell = gridData[r][c];
    if (cell.state === -1) {
        drawSoilTexture(ctx, x, y, TILE_SIZE, r * COLS + c, true);
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '10px Arial';
        ctx.fillText('🔒50币', x + 5, y + 28);
        return;
    }

    drawSoilTexture(ctx, x, y, TILE_SIZE, r * COLS + c, false);
    ctx.strokeStyle = '#81c784';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

    if (cell.state === 4) {
        ctx.fillStyle = 'rgba(230, 126, 34, 0.10)';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        return;
    }
    if (cell.state !== 0) drawCropInTile(cell, x, y);
}

function drawCropInTile(cell, x, y) {
    const config = CROP_CONFIG[cell.cropType];
    const stageCount = config.stages || 4;
    if (cell.state === 1) {
        const progress = Math.min(1, (Date.now() - cell.timer) / (getActualGrowTime(cell.cropType) / getGrowthMultiplier()));
        const stage = Math.max(0, Math.min(stageCount - 2, Math.floor(progress * (stageCount - 1))));
        drawCropSprite(ctx, cell.cropType, stage, x, y, TILE_SIZE);
    } else if (cell.state === 2) {
        if (cell.cropType === 'pumpkin') {
            drawCropSprite(ctx, cell.cropType, stageCount - 1, x, y, TILE_SIZE * 2);
        } else {
            drawCropSprite(ctx, cell.cropType, stageCount - 1, x, y, TILE_SIZE);
        }
        ctx.strokeStyle = '#f1c40f';
        ctx.strokeRect(x + 3, y + 3, cell.cropType === 'pumpkin' ? 84 : 39, cell.cropType === 'pumpkin' ? 84 : 39);
    }
}

function drawMatureResonanceLinks() {
    ctx.save();
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.36)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = gridData[r][c];
            if (cell.state !== 2 || !cell.cropType) continue;
            const right = gridData[r]?.[c + 1];
            const down = gridData[r + 1]?.[c];
            const cx = farmStartX + c * TILE_SIZE + TILE_SIZE / 2;
            const cy = farmStartY + r * TILE_SIZE + TILE_SIZE / 2;
            if (right && right.state === 2 && right.cropType === cell.cropType) {
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + TILE_SIZE, cy);
            }
            if (down && down.state === 2 && down.cropType === cell.cropType) {
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx, cy + TILE_SIZE);
            }
        }
    }
    ctx.stroke();
    ctx.restore();
}

function drawRanch() {
    ctx.fillStyle = '#bdc3c7';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🐔🐮 皇家大牧场', ranchStartX, ranchStartY - 25);
    ctx.fillStyle = '#a5d6a7';
    ctx.fillRect(ranchStartX, ranchStartY, ranchWidth, ranchHeight);
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 4;
    ctx.strokeRect(ranchStartX, ranchStartY, ranchWidth, ranchHeight);
    drawRanchBuildings();
}

function drawIrrigationCanal() {
    const state = miracleState.irrigation;
    if (!state || state.stage <= 0) return;
    const progress = state.completed ? 1 : state.stage / MIRACLE_CONFIG.irrigation.stages.length;
    const x = farmStartX - 36;
    const y = farmStartY - 20;
    const w = gridWidth + 72;
    const h = gridHeight + 40;
    ctx.save();
    ctx.globalAlpha = 0.42 + progress * 0.5;
    ctx.strokeStyle = state.completed ? '#3498db' : '#78909c';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = state.completed ? '#85d7ff' : '#b0bec5';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    drawRoundRect(ctx, x + 14, y + 16, 132, 24, 12, 'rgba(248, 249, 244, 0.86)', state.completed ? '#3498db' : '#78909c');
    ctx.fillStyle = state.completed ? '#2980b9' : '#607d6f';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`先祖灌溉渠 ${state.completed ? '完成' : `${state.stage}/7`}`, x + 80, y + 32);
    ctx.restore();
}

function drawEternalBarn() {
    const state = miracleState.barn;
    if (!state || state.stage <= 0) return;
    const progress = state.completed ? 1 : state.stage / MIRACLE_CONFIG.barn.stages.length;
    const x = ranchStartX + ranchWidth - 188;
    const y = ranchStartY + ranchHeight + 22;
    ctx.save();
    ctx.globalAlpha = 0.7 + progress * 0.3;
    drawRoundRect(ctx, x, y + 34, 150, 92, 8, state.completed ? '#f4d35e' : '#c8b27d', '#5d4037');
    ctx.fillStyle = state.completed ? '#8e5b2d' : '#795548';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 42);
    ctx.lineTo(x + 75, y - 6);
    ctx.lineTo(x + 160, y + 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = state.completed ? '#fff7d6' : '#e3e8e4';
    ctx.fillRect(x + 58, y + 72, 34, 54);
    ctx.fillStyle = state.completed ? '#263238' : '#607d6f';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`永恒谷仓 ${state.completed ? '完成' : `${state.stage}/5`}`, x + 75, y + 148);
    ctx.restore();
}

function drawProcessingBuildings() {
    Object.keys(PROCESSING_BUILDING_CONFIG).forEach(id => {
        const config = PROCESSING_BUILDING_CONFIG[id];
        const level = getProcessingBuildingLevel(id);
        if (!shouldRevealProcessingSite(id)) return;
        const x = config.x;
        const y = config.y;
        const w = config.w;
        const h = config.h;
        ctx.save();
        ctx.globalAlpha = level > 0 ? 1 : 0.45;
        ctx.fillStyle = 'rgba(60, 70, 64, 0.16)';
        ctx.fillRect(x + 8, y + h - 6, w - 16, 8);
        drawRoundRect(ctx, x + 8, y + 24, w - 16, h - 24, 6, level > 0 ? config.color : '#cfd8d3', '#5d6d5f');
        ctx.fillStyle = level > 0 ? '#34495e' : '#95a5a6';
        ctx.fillRect(x + 18, y + h - 38, w - 36, 30);
        ctx.fillStyle = level > 0 ? '#f8faf7' : '#d7ddd8';
        ctx.fillRect(x + 26, y + 42, 18, 18);
        ctx.fillRect(x + w - 44, y + 42, 18, 18);

        if (id === 'mill') drawMillDetails(x, y, w, h, level);
        if (id === 'ketchupFactory') drawFactoryDetails(x, y, w, h, level);
        if (id === 'bakery') drawBakeryDetails(x, y, w, h, level);
        if (id === 'dairy') drawDairyDetails(x, y, w, h, level);

        drawRoundRect(ctx, x + w - 40, y + h - 24, 32, 17, 8, level > 0 ? '#34495e' : '#7f8c8d', null);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(level > 0 ? `L${level}` : '锁', x + w - 24, y + h - 12);
        ctx.fillStyle = level > 0 ? '#263238' : '#7f8c8d';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(config.name, x + w / 2, y + 18);
        const job = getProcessingJob(id);
        if (job) {
            const progress = Math.max(0, Math.min(1, (Date.now() - job.startedAt) / job.duration));
            drawRoundRect(ctx, x + 18, y + h - 8, w - 36, 7, 4, '#e3e8e4', null);
            drawRoundRect(ctx, x + 18, y + h - 8, (w - 36) * progress, 7, 4, '#f39c12', null);
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('加工中', x + w / 2, y + h - 14);
        } else if (processingAuto[id]) {
            ctx.fillStyle = '#f39c12';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('自动', x + w / 2, y + h - 14);
        }
        ctx.restore();
    });
    ctx.textAlign = 'left';
}

function shouldRevealProcessingSite(id) {
    return getProcessingBuildingLevel(id) > 0 || isProcessingBuildingUnlocked(id);
}

function drawMillDetails(x, y, w, h, level) {
    ctx.fillStyle = level > 0 ? '#8d6e63' : '#95a5a6';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 47, 24, 0, Math.PI * 2);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillRect(x + w / 2 - 3, y + 20, 6, 54);
    ctx.fillRect(x + w / 2 - 27, y + 44, 54, 6);
}

function drawFactoryDetails(x, y, w, h, level) {
    ctx.fillStyle = level > 0 ? '#7f1d1d' : '#95a5a6';
    ctx.fillRect(x + 16, y + 16, w - 32, 14);
    ctx.fillStyle = level > 0 ? '#34495e' : '#7f8c8d';
    ctx.fillRect(x + w - 30, y + 8, 12, 30);
    ctx.fillStyle = level > 0 ? '#f7f1d5' : '#d7ddd8';
    ctx.fillRect(x + w / 2 - 10, y + 44, 20, 26);
}

function drawBakeryDetails(x, y, w, h, level) {
    ctx.fillStyle = level > 0 ? '#b87945' : '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 28);
    ctx.lineTo(x + w / 2, y + 2);
    ctx.lineTo(x + w - 6, y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = level > 0 ? '#fff1b8' : '#d7ddd8';
    ctx.fillRect(x + 38, y + 48, w - 76, 18);
}

function drawDairyDetails(x, y, w, h, level) {
    ctx.fillStyle = level > 0 ? '#f7f1d5' : '#d7ddd8';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 52, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = level > 0 ? '#f4d35e' : '#95a5a6';
    ctx.fillRect(x + w / 2 - 13, y + 48, 26, 12);
    ctx.fillStyle = level > 0 ? '#34495e' : '#7f8c8d';
    ctx.fillRect(x + 18, y + h - 42, 14, 34);
    ctx.fillRect(x + w - 32, y + h - 42, 14, 34);
}

function drawRanchBuildings() {
    Object.keys(RANCH_BUILDING_CONFIG).forEach(id => {
        const config = RANCH_BUILDING_CONFIG[id];
        const level = getRanchBuildingLevel(id);
        if (!shouldRevealRanchSite(id)) return;
        ctx.save();
        ctx.globalAlpha = level > 0 ? 1 : 0.48;

        const x = config.x;
        const y = config.y;
        const w = config.w;
        const h = config.h;

        ctx.fillStyle = 'rgba(60, 70, 64, 0.18)';
        ctx.fillRect(x + 8, y + h - 8, w - 16, 10);

        if (id === 'coop') drawCoopBuilding(x, y, w, h, level);
        if (id === 'sheepfold') drawSheepfoldBuilding(x, y, w, h, level);
        if (id === 'cowshed') drawCowshedBuilding(x, y, w, h, level);
        if (id === 'apiary') drawApiaryBuilding(x, y, w, h, level);
        if (id === 'pigpen') drawPigpenBuilding(x, y, w, h, level);

        drawRanchBuildingBadge(config, level);
        ctx.restore();
    });
    ctx.textAlign = 'left';
}

function shouldRevealRanchSite(id) {
    const config = RANCH_BUILDING_CONFIG[id];
    if (!config) return false;
    return getRanchBuildingLevel(id) > 0 || playerLevel >= config.reqLevel;
}

function drawCoopBuilding(x, y, w, h, level) {
    const locked = level <= 0;
    drawRoundRect(ctx, x + 8, y + 28, w - 16, h - 28, 6, locked ? '#d7ddd8' : '#f7d794', '#6d4c41');
    ctx.fillStyle = locked ? '#8fa39a' : '#c0392b';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 32);
    ctx.lineTo(x + w / 2, y + 2);
    ctx.lineTo(x + w - 2, y + 32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6d4c41';
    ctx.stroke();
    ctx.fillStyle = locked ? '#95a5a6' : '#8e5a2a';
    ctx.fillRect(x + 18, y + h - 34, w - 36, 8);
    ctx.fillStyle = locked ? '#b0b8b3' : '#fef6d8';
    ctx.fillRect(x + 24, y + 44, 20, 18);
    ctx.fillRect(x + w - 44, y + 44, 20, 18);
    ctx.fillStyle = locked ? '#7f8c8d' : '#e67e22';
    ctx.fillRect(x + w / 2 - 13, y + h - 36, 26, 30);
    ctx.fillStyle = locked ? '#7f8c8d' : '#f1c40f';
    ctx.fillRect(x + 48, y + h - 18, 34, 6);
}

function drawSheepfoldBuilding(x, y, w, h, level) {
    const locked = level <= 0;
    ctx.fillStyle = locked ? '#d7ddd8' : '#9bcf9b';
    ctx.fillRect(x + 6, y + 26, w - 12, h - 32);
    ctx.strokeStyle = locked ? '#95a5a6' : '#8d6e63';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, y + 26, w - 12, h - 32);
    ctx.fillStyle = locked ? '#95a5a6' : '#f4f1e8';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 38, 22, 0, Math.PI * 2);
    ctx.arc(x + w / 2 - 18, y + 42, 14, 0, Math.PI * 2);
    ctx.arc(x + w / 2 + 18, y + 42, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = locked ? '#7f8c8d' : '#2f3136';
    ctx.fillRect(x + w / 2 - 8, y + 42, 16, 14);
    ctx.fillStyle = locked ? '#7f8c8d' : '#b8860b';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 18 + i * 28, y + h - 34, 6, 32);
    ctx.fillRect(x + 12, y + h - 28, w - 24, 5);
    ctx.fillRect(x + 12, y + h - 14, w - 24, 5);
}

function drawCowshedBuilding(x, y, w, h, level) {
    const locked = level <= 0;
    drawRoundRect(ctx, x + 8, y + 24, w - 16, h - 24, 5, locked ? '#d7ddd8' : '#b94a48', '#5d4037');
    ctx.fillStyle = locked ? '#8fa39a' : '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(x, y + 28);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.stroke();
    ctx.fillStyle = locked ? '#c6cfca' : '#fff7e6';
    ctx.fillRect(x + w / 2 - 28, y + h - 45, 56, 42);
    ctx.strokeStyle = locked ? '#95a5a6' : '#5d4037';
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 28, y + h - 45);
    ctx.lineTo(x + w / 2 + 28, y + h - 3);
    ctx.moveTo(x + w / 2 + 28, y + h - 45);
    ctx.lineTo(x + w / 2 - 28, y + h - 3);
    ctx.stroke();
    ctx.fillStyle = locked ? '#95a5a6' : '#2f3136';
    ctx.fillRect(x + 18, y + 40, 18, 12);
    ctx.fillRect(x + w - 38, y + 36, 16, 16);
}

function drawApiaryBuilding(x, y, w, h, level) {
    const locked = level <= 0;
    ctx.fillStyle = locked ? '#d7ddd8' : '#7a4f24';
    ctx.fillRect(x + 18, y + 18, w - 36, 10);
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = locked ? '#c6cfca' : (i % 2 === 0 ? '#f1c40f' : '#f7dc6f');
        ctx.fillRect(x + 24, y + 28 + i * 13, w - 48, 12);
        ctx.strokeStyle = '#6d4c41';
        ctx.strokeRect(x + 24, y + 28 + i * 13, w - 48, 12);
    }
    ctx.fillStyle = locked ? '#95a5a6' : '#2f3136';
    ctx.fillRect(x + w / 2 - 6, y + 52, 12, 6);
    if (!locked) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 12, y + 34, 5, 4);
        ctx.fillRect(x + w - 18, y + 50, 5, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 9, y + 31, 4, 3);
        ctx.fillRect(x + w - 15, y + 47, 4, 3);
    }
    ctx.fillStyle = locked ? '#95a5a6' : '#27ae60';
    ctx.fillRect(x + 8, y + h - 12, w - 16, 8);
}

function drawPigpenBuilding(x, y, w, h, level) {
    const locked = level <= 0;
    ctx.fillStyle = locked ? '#d7ddd8' : '#b87945';
    ctx.fillRect(x + 8, y + 28, w - 16, h - 34);
    ctx.fillStyle = locked ? '#c6cfca' : '#8d6e63';
    ctx.fillRect(x + 8, y + h - 28, w - 16, 22);
    ctx.fillStyle = locked ? '#95a5a6' : '#6d4c41';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 12 + i * 24, y + 22, 7, h - 20);
    ctx.fillRect(x + 8, y + 36, w - 16, 6);
    ctx.fillRect(x + 8, y + h - 20, w - 16, 6);
    ctx.fillStyle = locked ? '#95a5a6' : '#f8a5c2';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 54, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = locked ? '#7f8c8d' : '#ad5d7c';
    ctx.fillRect(x + w / 2 - 8, y + 56, 16, 8);
}

function drawRanchBuildingBadge(config, level) {
    const x = config.x;
    const y = config.y;
    const w = config.w;
    const h = config.h;
    drawRoundRect(ctx, x + w - 42, y + h - 26, 34, 18, 9, level > 0 ? '#34495e' : '#7f8c8d', null);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(level > 0 ? `L${level}` : '锁', x + w - 25, y + h - 13);
    ctx.fillStyle = level > 0 ? '#34495e' : '#7f8c8d';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(config.name, x + w / 2, y + 18);
    ctx.font = '12px Arial';
    ctx.fillText(level > 0 ? `容量 ${getAnimalCapacity(config.animal)}` : `Lv.${config.reqLevel} 可建造`, x + w / 2, y + h - 36);
}

function drawAnimals() {
    for (const animal of animals) {
        drawAnimalSprite(ctx, animal);
    }
}

function drawWorkers() {
    for (const worker of workers) {
        if (worker.type === 'human') {
            ctx.fillStyle = '#f39c12';
            ctx.fillRect(worker.x - 8, worker.y - 15, 16, 16);
            ctx.fillStyle = '#3498db';
            ctx.fillRect(worker.x - 6, worker.y, 12, 10);
        } else if (worker.type === 'drone') {
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(worker.x - 10, worker.y - 10, 20, 20);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(worker.x - 4, worker.y - 4, 8, 8);
        }
    }
    if (getTalentLevel('industry') >= 4 && !workers.some(worker => worker.type === 'drone')) {
        const t = Date.now() / 900;
        const x = ranchStartX + 90 + Math.cos(t) * 24;
        const y = ranchStartY + 74 + Math.sin(t) * 12;
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(x - 10, y - 8, 20, 16);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 4, y - 3, 8, 6);
        ctx.fillStyle = '#263238';
        ctx.fillRect(x - 16, y - 2, 6, 2);
        ctx.fillRect(x + 10, y - 2, 6, 2);
    }
}

function drawVisitors() {
    const visitors = getVisitorIds().filter(isVisitorUnlocked);
    if (visitors.length === 0) return;
    const baseX = ranchStartX + 26;
    const baseY = ranchStartY + ranchHeight + 54;
    ctx.save();
    drawRoundRect(ctx, baseX - 14, baseY - 42, 292, 96, 10, 'rgba(248, 249, 244, 0.62)', 'rgba(96, 125, 111, 0.6)');
    ctx.fillStyle = 'rgba(52, 73, 94, 0.65)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('访客休息区', baseX - 2, baseY - 20);
    ctx.restore();
    visitors.forEach((id, index) => {
        const config = VISITOR_CONFIG[id];
        const progress = getVisitorProgress(id);
        const x = baseX + (index % 4) * 66;
        const y = baseY + 14 + Math.floor(index / 4) * 48;
        ctx.save();
        ctx.fillStyle = 'rgba(60, 70, 64, 0.18)';
        ctx.fillRect(x - 12, y + 24, 42, 8);
        drawRoundRect(ctx, x - 10, y - 20, 38, 48, 7, progress.finished ? '#dff4e6' : '#fff3cd', progress.finished ? '#27ae60' : '#f39c12');
        ctx.fillStyle = '#263238';
        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(config.icon, x + 9, y + 2);
        ctx.font = 'bold 10px Arial';
        ctx.fillText(progress.finished ? '入驻' : '委托', x + 9, y + 20);
        ctx.restore();
    });
    ctx.textAlign = 'left';
}

function drawWeatherLayer() {
    ctx.fillStyle = WEATHER_CONFIG[weather.type].tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (weather.type === 'rain') drawRain();
    if (weather.type === 'drought') drawDroughtHeat();
    if (isNightTime()) {
        ctx.fillStyle = 'rgba(28, 31, 74, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawTorchLights();
    }
}

function drawRain() {
    ctx.strokeStyle = 'rgba(174, 214, 241, 0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
        const x = (i * 47 + Date.now() / 20) % canvas.width;
        const y = (i * 83 + Date.now() / 8) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 12);
        ctx.stroke();
    }
}

function drawDroughtHeat() {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#d35400';
    for (let i = 0; i < 16; i++) {
        const y = (Date.now() / 60 + i * 53) % canvas.height;
        ctx.fillRect(0, y, canvas.width, 2);
    }
    ctx.restore();
}

function drawTorchLights() {
    const torches = [
        [farmStartX - 10, farmStartY - 10],
        [farmStartX + gridWidth + 10, farmStartY - 10],
        [farmStartX - 10, farmStartY + gridHeight + 10],
        [farmStartX + gridWidth + 10, farmStartY + gridHeight + 10]
    ];
    for (const [worldX, worldY] of torches) {
        const point = worldToScreen(worldX, worldY);
        const x = point.x;
        const y = point.y;
        const pulse = 28 + Math.sin(Date.now() / 180 + x) * 5;
        const gradient = ctx.createRadialGradient(x, y, 1, x, y, pulse);
        gradient.addColorStop(0, 'rgba(255, 205, 90, 0.72)');
        gradient.addColorStop(0.35, 'rgba(255, 159, 67, 0.24)');
        gradient.addColorStop(1, 'rgba(255, 159, 67, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x - 1, y - 1, 3, 3);
    }
}

function drawGlobalEffectText() {
    if (effectAlpha <= 0) return;
    ctx.fillStyle = `rgba(155, 89, 182, ${effectAlpha})`;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(effectText, canvas.width / 2, 80 + (1 - effectAlpha) * 20);
    ctx.textAlign = 'left';
}
