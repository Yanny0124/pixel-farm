// ==========================================
// Render/Renderer: Canvas 分层绘制
// ==========================================
let canvas = null;
let ctx = null;
let renderNow = Date.now();
let grassPattern = null;
let grassPatternImage = null;
let cropBaseCache = null;
const GENERATED_ASSET_ROOT = 'assets/generated';
const GENERATED_SPRITES = {
    background: `${GENERATED_ASSET_ROOT}/environment/clean_farm_base_background_v2.png`,
    ranch: {
        coop: level => `${GENERATED_ASSET_ROOT}/ranch/coop_l${level}.png`,
        sheepfold: level => `${GENERATED_ASSET_ROOT}/ranch/sheepfold_l${level}.png`,
        cowshed: level => `${GENERATED_ASSET_ROOT}/ranch/cowshed_l${level}.png`,
        apiary: level => `${GENERATED_ASSET_ROOT}/ranch/apiary_l${level}.png`,
        pigpen: level => `${GENERATED_ASSET_ROOT}/ranch/pigpen_l${level}.png`
    },
    processing: {
        mill: level => `${GENERATED_ASSET_ROOT}/processing/mill_l${level}.png`,
        ketchupFactory: level => `${GENERATED_ASSET_ROOT}/processing/ketchup_factory_l${level}.png`,
        bakery: level => `${GENERATED_ASSET_ROOT}/processing/bakery_l${level}.png`,
        dairy: level => `${GENERATED_ASSET_ROOT}/processing/dairy_l${level}.png`
    },
    miracles: {
        irrigation: stage => `${GENERATED_ASSET_ROOT}/miracles/irrigation_s${stage}.png`,
        barn: stage => `${GENERATED_ASSET_ROOT}/miracles/barn_s${stage}.png`
    },
    workers: {
        human: ['worker_idle', 'worker_walk_l', 'worker_walk_r', 'worker_tool'].map(name => `${GENERATED_ASSET_ROOT}/workers/${name}.png`),
        drone: ['drone_idle', 'drone_tilt_l', 'drone_tilt_r', 'drone_spray'].map(name => `${GENERATED_ASSET_ROOT}/workers/${name}.png`)
    }
};
const generatedAssetCache = {};

function initRenderer() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    preloadGeneratedAssets();
}

function renderFrame() {
    renderNow = Date.now();
    if (typeof window.clampCameraToView === 'function') window.clampCameraToView();
    ctx.imageSmoothingEnabled = false;
    const shake = getSmoothShakeOffset();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shake.x || shake.y) ctx.translate(shake.x, shake.y);
    try {
        drawFarm();
    } catch (error) {
        console.error('[Renderer] drawFarm failed', error);
    }
    drawWeatherLayer();
    drawOfflineReturnFx(ctx);
    drawCanvasUI(ctx);
    drawGlobalEffectText();
    ctx.restore();
}

function getRenderNow() {
    return renderNow || Date.now();
}

function getSmoothShakeOffset() {
    const now = getRenderNow();
    if (!screenShake || now >= screenShake.until || uiPreferences?.screenShake === false) return { x: 0, y: 0 };
    const duration = screenShake.duration || 80;
    const elapsed = Math.max(0, duration - (screenShake.until - now));
    const progress = Math.min(1, elapsed / duration);
    const falloff = Math.pow(1 - progress, 2);
    const wave = Math.sin(progress * Math.PI * 2);
    const power = (screenShake.power || 1) * falloff;
    return {
        x: wave * power,
        y: Math.sin(progress * Math.PI * 1.5) * power * 0.35
    };
}

function drawFarm() {
    ctx.save();
    const zoom = camera.zoom || 1;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.translate(camera.x, camera.y);
    beginWorldLayoutDebugFrame();
    drawWorldGrassBackground();
    drawCropArea();
    drawProcessingBuildings();
    drawIrrigationCanal();
    drawRanch();
    drawAnimals();
    drawWorkers();
    drawEternalBarn();
    drawVisitors();
    drawEffects(ctx);
    drawWorldLayoutDebugOverlay();
    ctx.restore();
}

function drawFarmRoads() {
    const roads = getRoadLayoutRects();
    registerWorldLayoutDebugItem('road', getRoadZoneLayout(roads));
    ctx.save();
    roads.forEach(({ key, layout }) => {
        const rect = layout.rect;
        drawStonePathRect(rect.x, rect.y, rect.w, rect.h);
        registerWorldLayoutDebugItem(`road.${key}`, layout);
    });
    ctx.restore();
}

/*

    // 主路：把种植区、牧场和加工区串成一条清晰的横向动线。

    // 右侧支路连接永恒谷仓和牧场边门，避免建筑像被随机撒在草地上。
}

*/

function drawStonePathRect(x, y, w, h) {
    ctx.fillStyle = '#8e8b78';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(58, 47, 38, 0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(232, 224, 193, 0.55)';
    const cell = 18;
    for (let py = y + 4; py < y + h - 4; py += cell) {
        for (let px = x + 4; px < x + w - 4; px += cell) {
            const offset = ((Math.floor((px - x) / cell) + Math.floor((py - y) / cell)) % 2) * 5;
            ctx.fillRect(px + offset, py, Math.min(10, x + w - px - 6), 3);
        }
    }
}

function drawWorldGrassBackground() {
    const backgroundPath = getWorldBackgroundImagePath();
    const image = getGeneratedImage(backgroundPath);
    const layout = getWorldBackgroundLayout();
    drawWorldBackgroundFill();
    registerWorldLayoutDebugItem('background', layout.debug);
    if (!image || !image.complete || !image.naturalWidth) {
        return;
    }
    drawGeneratedImage(backgroundPath, layout.base.x, layout.base.y, layout.base.w, layout.base.h);
}

function drawWorldBackgroundFill() {
    const left = -camera.x - canvas.width;
    const top = -camera.y - canvas.height;
    const right = -camera.x + canvas.width * 2;
    const bottom = -camera.y + canvas.height * 2;
    ctx.save();
    ctx.fillStyle = '#cfe3ba';
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = 'rgba(92, 132, 81, 0.16)';
    for (let y = top - 60; y < bottom + 60; y += 96) {
        ctx.fillRect(left, y, right - left, 4);
    }
    ctx.restore();
}

function preloadGeneratedAssets() {
    const paths = new Set([getWorldBackgroundImagePath()]);
    GENERATED_SPRITES.workers.human.concat(GENERATED_SPRITES.workers.drone).forEach(path => paths.add(path));
    paths.forEach(getGeneratedImage);
}

function getGeneratedImage(path) {
    if (!path) return null;
    if (generatedAssetCache[path]) return generatedAssetCache[path];
    const image = new Image();
    image.onload = () => {
        if (path === GENERATED_SPRITES.background) {
            grassPattern = null;
            grassPatternImage = null;
        }
    };
    image.src = path;
    generatedAssetCache[path] = image;
    return image;
}

function drawGeneratedImage(path, x, y, w, h, options = {}) {
    const image = getGeneratedImage(path);
    if (!image || !image.complete || !image.naturalWidth) return false;
    ctx.save();
    if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
    if (options.locked) ctx.filter = 'grayscale(0.9) saturate(0.45) brightness(0.9)';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
}

function drawCenteredGeneratedImage(path, cx, baseY, maxW, maxH, options = {}) {
    const image = getGeneratedImage(path);
    if (!image || !image.complete || !image.naturalWidth) return false;
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    return drawGeneratedImage(path, cx - w / 2, baseY - h, w, h, options);
}

function getWorldBackgroundLayout() {
    const imageRatio = 1417 / 1110;
    const viewW = canvas?.width || 1600;
    const viewH = canvas?.height || 900;
    let w = viewW;
    let h = w / imageRatio;
    if (h > viewH) {
        h = viewH;
        w = h * imageRatio;
    }
    const anchorX = typeof WORLD_VIEW_FARM_SCREEN_X !== 'undefined' ? WORLD_VIEW_FARM_SCREEN_X : 50;
    const anchorY = typeof WORLD_VIEW_FARM_SCREEN_Y !== 'undefined' ? WORLD_VIEW_FARM_SCREEN_Y : 50;
    const defaultLeft = farmStartX - anchorX;
    const defaultTop = farmStartY - anchorY;
    const fallback = {
        x: defaultLeft - (w - viewW) / 2,
        y: defaultTop - (h - viewH) / 2,
        w,
        h,
        anchor: 'top-left'
    };
    const layout = getWorldLayoutVisual(['background'], fallback);
    return {
        base: layout.rect,
        debug: layout
    };
}

function worldToScreen(worldX, worldY) {
    const zoom = camera.zoom || 1;
    return {
        x: canvas.width / 2 + ((worldX + camera.x) - canvas.width / 2) * zoom,
        y: canvas.height / 2 + ((worldY + camera.y) - canvas.height / 2) * zoom
    };
}

function drawRoundRect(targetCtx, x, y, width, height, radius, fillStyle, strokeStyle) {
    const r = Math.max(0, Math.min(radius || 0, Math.abs(width) / 2, Math.abs(height) / 2));
    targetCtx.beginPath();
    targetCtx.moveTo(x + r, y);
    targetCtx.lineTo(x + width - r, y);
    targetCtx.quadraticCurveTo(x + width, y, x + width, y + r);
    targetCtx.lineTo(x + width, y + height - r);
    targetCtx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    targetCtx.lineTo(x + r, y + height);
    targetCtx.quadraticCurveTo(x, y + height, x, y + height - r);
    targetCtx.lineTo(x, y + r);
    targetCtx.quadraticCurveTo(x, y, x + r, y);
    targetCtx.closePath();
    if (fillStyle) {
        targetCtx.fillStyle = fillStyle;
        targetCtx.fill();
    }
    if (strokeStyle) {
        targetCtx.strokeStyle = strokeStyle;
        targetCtx.stroke();
    }
}

function beginWorldLayoutDebugFrame() {
    if (window.LayoutDebug?.beginFrame) window.LayoutDebug.beginFrame();
}

function drawWorldLayoutDebugOverlay() {
    if (window.LayoutDebug?.draw) window.LayoutDebug.draw(ctx);
}

function registerWorldLayoutDebugItem(key, layout) {
    if (!window.LayoutDebug?.record || !layout) return;
    window.LayoutDebug.record(key, layout.rect || layout, {
        configRect: layout.visual || layout.rect || layout,
        visualRef: layout.visualRef || null,
        layoutEntry: layout.entry || null,
        path: layout.path || ''
    });
}

function getWorldLayoutEntry(path) {
    let node = window.WORLD_LAYOUT;
    for (const part of path) {
        if (!node || typeof node !== 'object') return null;
        node = node[part];
    }
    return node || null;
}

function getWorldLayoutImage(entry, fallback) {
    return entry?.image || fallback;
}

function getWorldBackgroundImagePath() {
    return getWorldLayoutImage(getWorldLayoutEntry(['background']), GENERATED_SPRITES.background);
}

function getWorldLayoutVisual(path, fallback) {
    const entry = getWorldLayoutEntry(path);
    const visualRef = entry?.visual || (entry && entry.x !== undefined ? entry : null);
    const visual = normalizeWorldLayoutVisual(visualRef, fallback);
    const offset = entry?.visualOffset || visualRef?.visualOffset || null;
    const offsetVisual = applyWorldLayoutOffset(visual, offset);
    return {
        entry,
        visualRef,
        visual: offsetVisual,
        rect: resolveWorldLayoutAnchor(offsetVisual),
        path: path.join('.')
    };
}

function normalizeWorldLayoutVisual(visual, fallback = {}) {
    const source = visual || {};
    const w = getFiniteNumber(source.w ?? source.width, getFiniteNumber(fallback.w ?? fallback.width, 0));
    const h = getFiniteNumber(source.h ?? source.height, getFiniteNumber(fallback.h ?? fallback.height, 0));
    return {
        x: getFiniteNumber(source.x, getFiniteNumber(fallback.x, 0)),
        y: getFiniteNumber(source.y, getFiniteNumber(fallback.y, 0)),
        w,
        h,
        anchor: source.anchor || fallback.anchor || 'top-left'
    };
}

function getFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function applyWorldLayoutOffset(visual, offset) {
    if (!offset) return visual;
    return {
        ...visual,
        x: visual.x + getFiniteNumber(offset.x, 0),
        y: visual.y + getFiniteNumber(offset.y, 0)
    };
}

function resolveWorldLayoutAnchor(visual) {
    const rect = {
        x: visual.x,
        y: visual.y,
        w: visual.w,
        h: visual.h,
        anchor: visual.anchor || 'top-left'
    };
    if (rect.anchor === 'center') {
        rect.x -= rect.w / 2;
        rect.y -= rect.h / 2;
    } else if (rect.anchor === 'bottom-center') {
        rect.x -= rect.w / 2;
        rect.y -= rect.h;
    }
    return rect;
}

function getDefaultFarmAreaRect() {
    return {
        x: farmStartX,
        y: farmStartY,
        w: gridWidth + getFarmPlotGap(),
        h: gridHeight + getFarmPlotGap(),
        anchor: 'top-left'
    };
}

function getFarmAreaLayout() {
    return getWorldLayoutVisual(['zones', 'farmland'], getDefaultFarmAreaRect());
}

function getFarmRenderOrigin() {
    const rect = getFarmAreaLayout().rect;
    return { x: rect.x, y: rect.y };
}

function getPastureAreaLayout() {
    return getWorldLayoutVisual(['zones', 'pasture'], {
        x: ranchStartX,
        y: ranchStartY,
        w: ranchWidth,
        h: ranchHeight,
        anchor: 'top-left'
    });
}

function getRoadLayoutRects() {
    const farmRect = getDefaultFarmAreaRect();
    const roadY = farmRect.y + farmRect.h + 64;
    const roadStartX = farmRect.x + 32;
    const roadEndX = Math.max(ranchStartX + ranchWidth + 74, farmRect.x + farmRect.w + 270);
    const fallback = {
        main: { x: roadStartX, y: roadY, w: roadEndX - roadStartX, h: 34, anchor: 'top-left' },
        farmGate: { x: farmRect.x + farmRect.w / 2 - 17, y: farmRect.y + farmRect.h - 4, w: 34, h: roadY - (farmRect.y + farmRect.h) + 38, anchor: 'top-left' },
        ranchGate: { x: ranchStartX + ranchWidth / 2 - 17, y: ranchStartY + ranchHeight - 4, w: 34, h: roadY - (ranchStartY + ranchHeight) + 38, anchor: 'top-left' },
        processingGate: { x: farmRect.x + Math.round(farmRect.w * 0.70) - 17, y: roadY - 12, w: 34, h: 78, anchor: 'top-left' },
        ranchSide: { x: ranchStartX + ranchWidth + 24, y: ranchStartY + 116, w: 34, h: ranchHeight - 18, anchor: 'top-left' },
        ranchBottom: { x: ranchStartX + ranchWidth - 12, y: ranchStartY + ranchHeight - 38, w: 70, h: 34, anchor: 'top-left' },
        ranchConnector: { x: ranchStartX + ranchWidth + 24, y: roadY - 4, w: 34, h: 118, anchor: 'top-left' }
    };
    const configured = getWorldLayoutEntry(['roads']);
    const keys = Array.from(new Set(Object.keys(fallback).concat(configured ? Object.keys(configured) : [])));
    return keys.map(key => ({
        key,
        layout: getWorldLayoutVisual(['roads', key], fallback[key] || { x: 0, y: 0, w: 0, h: 0, anchor: 'top-left' })
    }));
}

function getRoadZoneLayout(roads) {
    const rects = roads.map(item => item.layout.rect).filter(rect => rect.w > 0 && rect.h > 0);
    if (rects.length === 0) {
        return getWorldLayoutVisual(['zones', 'road'], { x: 0, y: 0, w: 0, h: 0, anchor: 'top-left' });
    }
    const left = Math.min(...rects.map(rect => rect.x));
    const top = Math.min(...rects.map(rect => rect.y));
    const right = Math.max(...rects.map(rect => rect.x + rect.w));
    const bottom = Math.max(...rects.map(rect => rect.y + rect.h));
    return getWorldLayoutVisual(['zones', 'road'], {
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
        anchor: 'top-left'
    });
}

function getBuildingVisualLayout(group, id, config) {
    return getWorldLayoutVisual(['buildings', group, id], {
        x: config.x,
        y: config.y,
        w: config.w,
        h: config.h,
        anchor: 'top-left'
    });
}

function getMiracleVisualLayout(id, part, fallback) {
    return getWorldLayoutVisual(['miracles', id, part], fallback);
}

function getNpcMapAvatarLayout(id, index, fallback) {
    return getWorldLayoutVisual(['npcs', id, 'mapAvatar'], fallback);
}


let referenceFarmLayoutKey = '';

function applyReferenceFarmLayout() {
    // Legacy hook retained for callers; visual placement now lives in WORLD_LAYOUT.
    return;
    if (typeof farmStartX === 'undefined' || typeof farmStartY === 'undefined') return;
    if (typeof gridWidth === 'undefined' || typeof gridHeight === 'undefined') return;
    if (typeof ranchStartX === 'undefined' || typeof ranchStartY === 'undefined') return;
    if (typeof ranchWidth === 'undefined' || typeof ranchHeight === 'undefined') return;

    const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
    const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
    const key = [farmStartX, farmStartY, farmW, farmH, ranchStartX, ranchStartY, ranchWidth, ranchHeight].join('|');
    if (key === referenceFarmLayoutKey) return;
    referenceFarmLayoutKey = key;

    // 参考图布局：左侧种植区、右侧牧场、底部加工建筑沿一条石路排开。
    // 这里直接调整配置对象，点击判定、建造面板和 Canvas 绘制会使用同一套坐标。
    const bottomRoadY = farmStartY + farmH + 64;
    const processingY = bottomRoadY + 8;
    const clampWidth = value => Math.max(110, Math.min(148, value));

    if (typeof PROCESSING_BUILDING_CONFIG !== 'undefined' && PROCESSING_BUILDING_CONFIG) {
        const processingLayout = {
            mill: {
                x: farmStartX + 38,
                y: processingY,
                w: clampWidth(farmW * 0.19),
                h: 116
            },
            ketchupFactory: {
                x: farmStartX + Math.round(farmW * 0.28),
                y: processingY + 2,
                w: clampWidth(farmW * 0.18),
                h: 112
            },
            bakery: {
                x: farmStartX + Math.round(farmW * 0.58),
                y: processingY + 6,
                w: clampWidth(farmW * 0.18),
                h: 110
            },
            dairy: {
                x: farmStartX + Math.round(farmW * 0.78),
                y: processingY + 4,
                w: clampWidth(farmW * 0.18),
                h: 112
            }
        };
        Object.entries(processingLayout).forEach(([id, rect]) => {
            if (!PROCESSING_BUILDING_CONFIG[id]) return;
            Object.assign(PROCESSING_BUILDING_CONFIG[id], rect);
        });
    }

    if (typeof RANCH_BUILDING_CONFIG !== 'undefined' && RANCH_BUILDING_CONFIG) {
        const buildingW = Math.max(108, Math.min(132, ranchWidth * 0.22));
        const topY = ranchStartY + 28;
        const lowerY = ranchStartY + ranchHeight - 116;
        const ranchLayout = {
            coop: {
                x: ranchStartX + 42,
                y: topY,
                w: buildingW,
                h: 96
            },
            sheepfold: {
                x: ranchStartX + ranchWidth / 2 - buildingW / 2,
                y: topY - 4,
                w: buildingW,
                h: 100
            },
            cowshed: {
                x: ranchStartX + ranchWidth - buildingW - 42,
                y: topY + 2,
                w: buildingW,
                h: 98
            },
            apiary: {
                x: ranchStartX + 58,
                y: lowerY,
                w: buildingW,
                h: 94
            },
            pigpen: {
                x: ranchStartX + ranchWidth - buildingW - 58,
                y: lowerY + 4,
                w: buildingW,
                h: 92
            }
        };
        Object.entries(ranchLayout).forEach(([id, rect]) => {
            if (!RANCH_BUILDING_CONFIG[id]) return;
            Object.assign(RANCH_BUILDING_CONFIG[id], {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.round(rect.w),
                h: Math.round(rect.h)
            });
        });
    }
}

function drawCropArea() {
    const farmLayout = getFarmAreaLayout();
    registerWorldLayoutDebugItem('farmland', farmLayout);
    drawCropBaseLayer();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawCropTileOverlay(r, c);
        }
    }
    drawLargeMatureCrops();
    drawMatureResonanceLinks();
}

function drawCropAreaStable() {
    const farmLayout = getFarmAreaLayout();
    registerWorldLayoutDebugItem('farmland', farmLayout);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawTileStable(r, c);
        }
    }
    drawLargeMatureCrops();
    drawMatureResonanceLinks();
}

function getFarmPlotGap() {
    return typeof FARM_PLOT_GAP !== 'undefined' ? FARM_PLOT_GAP : 0;
}

function getFarmTileLocalX(col) {
    const plotSize = typeof FARM_PLOT_SIZE !== 'undefined' ? FARM_PLOT_SIZE : Math.floor(COLS / 2);
    return col * TILE_SIZE + (col >= plotSize ? getFarmPlotGap() : 0);
}

function getFarmTileLocalY(row) {
    const plotSize = typeof FARM_PLOT_SIZE !== 'undefined' ? FARM_PLOT_SIZE : Math.floor(ROWS / 2);
    return row * TILE_SIZE + (row >= plotSize ? getFarmPlotGap() : 0);
}

function getFarmTileWorldX(col) {
    return getFarmRenderOrigin().x + getFarmTileLocalX(col);
}

function getFarmTileWorldY(row) {
    return getFarmRenderOrigin().y + getFarmTileLocalY(row);
}

function getFarmVisualWidth() {
    return gridWidth + getFarmPlotGap();
}

function getFarmVisualHeight() {
    return gridHeight + getFarmPlotGap();
}

function getMatureBorderInset() {
    return Math.max(2, TILE_SIZE * 0.09);
}

function isRenderLargeCropWithinFarmPlot(row, col) {
    const plotSize = typeof FARM_PLOT_SIZE !== 'undefined' ? FARM_PLOT_SIZE : Math.floor(COLS / 2);
    const startPlotCol = Math.floor(col / plotSize);
    const endPlotCol = Math.floor((col + 1) / plotSize);
    const startPlotRow = Math.floor(row / plotSize);
    const endPlotRow = Math.floor((row + 1) / plotSize);
    return startPlotCol === endPlotCol && startPlotRow === endPlotRow;
}

function drawTileStable(r, c) {
    const x = getFarmTileWorldX(c);
    const y = getFarmTileWorldY(r);
    const cell = gridData[r][c];
    if (cell.state === -1) {
        ctx.fillStyle = 'rgba(70, 68, 54, 0.42)';
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = 'rgba(255, 248, 223, 0.9)';
        ctx.font = '10px Arial';
        ctx.fillText('50币', x + 5, y + 28);
        return;
    }

    if (cell.state === 4) {
        ctx.fillStyle = 'rgba(230, 126, 34, 0.10)';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        return;
    }
    if (cell.state !== 0) drawCropInTile(cell, x, y);
}

function drawCropBaseLayer() {
    const key = getCropBaseCacheKey();
    if (!cropBaseCache || cropBaseCache.key !== key) {
        cropBaseCache = {
            key,
            canvas: buildCropBaseCanvas()
        };
    }
    const origin = getFarmRenderOrigin();
    ctx.drawImage(cropBaseCache.canvas, origin.x, origin.y);
}

function getCropBaseCacheKey() {
    const lockedMask = gridData.map(row => row.map(cell => cell.state === -1 ? '1' : '0').join('')).join('');
    return `${TILE_SIZE}|${ROWS}x${COLS}|gap:${getFarmPlotGap()}|${lockedMask}`;
}

function buildCropBaseCanvas() {
    const buffer = document.createElement('canvas');
    buffer.width = getFarmVisualWidth();
    buffer.height = getFarmVisualHeight();
    const previousCtx = ctx;
    try {
        ctx = buffer.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = getFarmTileLocalX(c);
                const y = getFarmTileLocalY(r);
                const cell = gridData[r][c];

                if (cell.state === -1) {
                    ctx.fillStyle = 'rgba(70, 68, 54, 0.42)';
                    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.fillStyle = 'rgba(255, 248, 223, 0.9)';
                    ctx.font = '10px Arial';
                    ctx.fillText('50币', x + 5, y + 28);
                }
            }
        }
    } finally {
        ctx = previousCtx;
    }
    return buffer;
}

function drawFarmPlotDividers() {
    if (!Array.isArray(FARM_PLOTS)) return;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (const plot of FARM_PLOTS) {
        const x = getFarmTileWorldX(plot.col);
        const y = getFarmTileWorldY(plot.row);
        const w = plot.cols * TILE_SIZE;
        const h = plot.rows * TILE_SIZE;
        ctx.strokeStyle = plot.color || 'rgba(255,255,255,0.5)';
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 248, 223, 0.78)';
        ctx.fillRect(x + 8, y + 8, 54, 18);
        ctx.fillStyle = '#4b3a2a';
        ctx.fillText(plot.name || plot.id, x + 13, y + 11);
        ctx.setLineDash([10, 8]);
    }
    ctx.restore();
}

function drawCropTileOverlay(r, c) {
    const x = getFarmTileWorldX(c);
    const y = getFarmTileWorldY(r);
    const cell = gridData[r][c];
    if (cell.state === -1) return;

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
        const progress = Math.min(1, (getRenderNow() - cell.timer) / (getActualGrowTime(cell.cropType) / getGrowthMultiplier()));
        const stage = Math.max(0, Math.min(stageCount - 2, Math.floor(progress * (stageCount - 1))));
        drawCropSprite(ctx, cell.cropType, stage, x, y, TILE_SIZE);
    } else if (cell.state === 2) {
        if (cell.cropType === 'pumpkin') {
            return;
        } else {
            drawCropSprite(ctx, cell.cropType, stageCount - 1, x, y, TILE_SIZE);
        }
        const matureInset = getMatureBorderInset();
        ctx.save();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            x + matureInset,
            y + matureInset,
            TILE_SIZE - matureInset * 2,
            TILE_SIZE - matureInset * 2
        );
        ctx.restore();
    }
}

function drawLargeMatureCrops() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = gridData[r][c];
            if (cell.state !== 2 || cell.cropType !== 'pumpkin') continue;
            if (!isRenderLargeCropWithinFarmPlot(r, c)) continue;
            const x = getFarmTileWorldX(c);
            const y = getFarmTileWorldY(r);
            const stageCount = CROP_CONFIG.pumpkin.stages || 5;
            const matureInset = getMatureBorderInset();
            drawCropSprite(ctx, 'pumpkin', stageCount - 1, x, y, TILE_SIZE * 2);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                x + matureInset,
                y + matureInset,
                TILE_SIZE * 2 - matureInset * 2,
                TILE_SIZE * 2 - matureInset * 2
            );
        }
    }
}

function drawMatureResonanceLinks() {
    const maxLinks = 80;
    let linksDrawn = 0;
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
            const cx = getFarmTileWorldX(c) + TILE_SIZE / 2;
            const cy = getFarmTileWorldY(r) + TILE_SIZE / 2;
            if (right && right.state === 2 && right.cropType === cell.cropType) {
                ctx.moveTo(cx, cy);
                ctx.lineTo(getFarmTileWorldX(c + 1) + TILE_SIZE / 2, cy);
                linksDrawn++;
                if (linksDrawn >= maxLinks) break;
            }
            if (down && down.state === 2 && down.cropType === cell.cropType) {
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx, getFarmTileWorldY(r + 1) + TILE_SIZE / 2);
                linksDrawn++;
                if (linksDrawn >= maxLinks) break;
            }
        }
        if (linksDrawn >= maxLinks) break;
    }
    ctx.stroke();
    ctx.restore();
}

function drawRanch() {
    const pastureLayout = getPastureAreaLayout();
    const pastureRect = pastureLayout.rect;
    const ranchStartX = pastureRect.x;
    const ranchStartY = pastureRect.y;
    registerWorldLayoutDebugItem('pasture', pastureLayout);
    drawRanchBuildings();
}

function drawRanchFenceFrame(x, y, w, h) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#6d4c41';
    ctx.fillStyle = '#9b7653';

    const gateW = 70;
    const bottomGateX = x + w / 2 - gateW / 2;
    const leftGateY = y + 118;

    drawFenceRun(x, y, w, 'horizontal', [{ start: bottomGateX - x, end: bottomGateX - x + gateW }]);
    drawFenceRun(x, y + h, w, 'horizontal', [{ start: bottomGateX - x, end: bottomGateX - x + gateW }]);
    drawFenceRun(x, y, h, 'vertical', [{ start: leftGateY - y, end: leftGateY - y + 54 }]);
    drawFenceRun(x + w, y, h, 'vertical', []);

    // 石柱强化围栏边角，像参考图那种“这地方真有人管”的牧场感。
    const posts = [
        [x - 5, y - 5], [x + w - 9, y - 5], [x - 5, y + h - 9], [x + w - 9, y + h - 9],
        [bottomGateX - 7, y + h - 9], [bottomGateX + gateW - 7, y + h - 9],
        [x - 5, leftGateY - 5], [x - 5, leftGateY + 50]
    ];
    posts.forEach(([px, py]) => {
        ctx.fillStyle = '#7f7d70';
        ctx.fillRect(px, py, 14, 18);
        ctx.fillStyle = '#a9a48f';
        ctx.fillRect(px + 2, py + 2, 10, 4);
        ctx.strokeStyle = 'rgba(58, 47, 38, 0.4)';
        ctx.strokeRect(px + 0.5, py + 0.5, 13, 17);
    });

    ctx.restore();
}

function drawFenceRun(x, y, length, direction, gaps = []) {
    const isHorizontal = direction === 'horizontal';
    const postStep = 28;
    const railColor = '#8d6a47';
    const postColor = '#6d4c41';
    const shouldSkip = pos => gaps.some(gap => pos >= gap.start && pos <= gap.end);

    ctx.save();
    if (isHorizontal) {
        for (let px = 0; px <= length; px += postStep) {
            if (shouldSkip(px)) continue;
            ctx.fillStyle = postColor;
            ctx.fillRect(x + px - 3, y - 9, 7, 18);
        }
        ctx.fillStyle = railColor;
        for (let px = 0; px < length; px += postStep) {
            if (shouldSkip(px + postStep / 2)) continue;
            ctx.fillRect(x + px, y - 6, Math.min(postStep, length - px), 4);
            ctx.fillRect(x + px, y + 4, Math.min(postStep, length - px), 4);
        }
    } else {
        for (let py = 0; py <= length; py += postStep) {
            if (shouldSkip(py)) continue;
            ctx.fillStyle = postColor;
            ctx.fillRect(x - 9, y + py - 3, 18, 7);
        }
        ctx.fillStyle = railColor;
        for (let py = 0; py < length; py += postStep) {
            if (shouldSkip(py + postStep / 2)) continue;
            ctx.fillRect(x - 6, y + py, 4, Math.min(postStep, length - py));
            ctx.fillRect(x + 4, y + py, 4, Math.min(postStep, length - py));
        }
    }
    ctx.restore();
}

function drawIrrigationCanal() {
    const state = miracleState.irrigation;
    if (!state || state.stage <= 0) return;
}

function drawEternalBarn() {
    const state = miracleState.barn;
    if (!state || state.stage <= 0) return;
    const progress = state.completed ? 1 : state.stage / MIRACLE_CONFIG.barn.stages.length;
    const pastureRect = getPastureAreaLayout().rect;
    const barnLayout = getMiracleVisualLayout('barn', 'building', {
        x: pastureRect.x + pastureRect.w - 134,
        y: pastureRect.y + pastureRect.h + 64,
        w: 150,
        h: 134,
        anchor: 'top-left'
    });
    const x = barnLayout.rect.x;
    const y = barnLayout.rect.y;
    registerWorldLayoutDebugItem('barn', barnLayout);
    ctx.save();
    ctx.globalAlpha = 0.7 + progress * 0.3;
    const stage = state.completed ? 5 : Math.max(1, Math.min(state.stage, 5));
    const spritePath = GENERATED_SPRITES.miracles.barn(stage);
    const drawn = drawCenteredGeneratedImage(spritePath, x + 75, y + 134, 158, 132);
    if (drawn) {
        drawRoundRect(ctx, x + 8, y + 134, 134, 23, 12, 'rgba(248, 249, 244, 0.86)', state.completed ? '#f4d35e' : '#8d7f64');
        ctx.fillStyle = state.completed ? '#8e5b2d' : '#607d6f';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`永恒谷仓 ${state.completed ? '完成' : `${state.stage}/5`}`, x + 75, y + 150);
        ctx.restore();
        return;
    }
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
        const layout = getBuildingVisualLayout('processing', id, config);
        const x = layout.rect.x;
        const y = layout.rect.y;
        const w = layout.rect.w;
        const h = layout.rect.h;
        registerWorldLayoutDebugItem(id, layout);
        ctx.save();
        ctx.globalAlpha = level > 0 ? 1 : 0.45;
        const spriteLevel = Math.max(1, Math.min(level || 1, 4));
        const spritePath = GENERATED_SPRITES.processing[id]?.(spriteLevel);
        const drawn = drawCenteredGeneratedImage(spritePath, x + w / 2, y + h + 8, w * 1.12, h * 1.16, { locked: level <= 0 });
        if (drawn) {
            drawGeneratedBuildingBadge(x, y, w, h, config.name, level, level > 0 ? null : `Lv.${config.reqLevel}`);
            drawProcessingJobBadge(id, x, y, w, h);
            ctx.restore();
            return;
        }
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
        const job = getProcessingJob(id);
        if (job) {
            const progress = Math.max(0, Math.min(1, (getRenderNow() - job.startedAt) / job.duration));
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

function drawGeneratedBuildingBadge(x, y, w, h, name, level, lockedText) {
    drawRoundRect(ctx, x + w - 40, y + h - 24, 32, 17, 8, level > 0 ? '#34495e' : '#7f8c8d', null);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(level > 0 ? `L${level}` : '锁', x + w - 24, y + h - 12);
}

function drawProcessingJobBadge(id, x, y, w, h) {
    const job = getProcessingJob(id);
    if (!job && !processingAuto[id]) return;
    const label = job ? '加工中' : '自动';
    drawRoundRect(ctx, x + 18, y + h - 8, w - 36, 8, 4, 'rgba(227, 232, 228, 0.9)', null);
    if (job) {
        const progress = Math.max(0, Math.min(1, (getRenderNow() - job.startedAt) / job.duration));
        drawRoundRect(ctx, x + 18, y + h - 8, (w - 36) * progress, 8, 4, '#f39c12', null);
    }
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h - 14);
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

        const layout = getBuildingVisualLayout('ranch', id, config);
        const x = layout.rect.x;
        const y = layout.rect.y;
        const w = layout.rect.w;
        const h = layout.rect.h;
        const visualConfig = { ...config, x, y, w, h };
        registerWorldLayoutDebugItem(id, layout);

        ctx.fillStyle = 'rgba(60, 70, 64, 0.18)';
        ctx.fillRect(x + 8, y + h - 8, w - 16, 10);

        const maxSpriteLevel = id === 'apiary' || id === 'pigpen' ? 3 : 4;
        const spriteLevel = Math.max(1, Math.min(level || 1, maxSpriteLevel));
        const spritePath = GENERATED_SPRITES.ranch[id]?.(spriteLevel);
        const drawn = drawCenteredGeneratedImage(spritePath, x + w / 2, y + h + 10, w * 1.18, h * 1.22, { locked: level <= 0 });
        if (drawn) {
            drawRanchBuildingBadge(visualConfig, level);
            ctx.restore();
            return;
        }

        if (id === 'coop') drawCoopBuilding(x, y, w, h, level);
        if (id === 'sheepfold') drawSheepfoldBuilding(x, y, w, h, level);
        if (id === 'cowshed') drawCowshedBuilding(x, y, w, h, level);
        if (id === 'apiary') drawApiaryBuilding(x, y, w, h, level);
        if (id === 'pigpen') drawPigpenBuilding(x, y, w, h, level);

        drawRanchBuildingBadge(visualConfig, level);
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
}

function drawAnimals() {
    for (const animal of animals) {
        drawAnimalSprite(ctx, animal);
    }
}

function drawWorkers() {
    for (const worker of workers) {
        const x = Math.round(worker.x);
        const y = Math.round(worker.y);
        ctx.save();
        ctx.fillStyle = worker.type === 'drone' ? 'rgba(58, 64, 62, 0.16)' : 'rgba(58, 42, 30, 0.18)';
        ctx.beginPath();
        ctx.ellipse(x, y + 12, worker.type === 'drone' ? 17 : 12, worker.type === 'drone' ? 5 : 6, 0, 0, Math.PI * 2);
        ctx.fill();
        const spritePath = getWorkerSpritePath(worker);
        const spriteSize = worker.type === 'drone' ? 54 : 50;
        if (drawGeneratedImage(spritePath, x - spriteSize / 2, y - spriteSize + 16, spriteSize, spriteSize)) {
            ctx.restore();
            continue;
        }
        if (worker.type === 'human') {
            ctx.fillStyle = '#7b4a2d';
            ctx.fillRect(x - 7, y - 18, 14, 6);
            ctx.fillStyle = '#f4c35f';
            ctx.fillRect(x - 8, y - 13, 16, 13);
            ctx.fillStyle = '#4f8c6b';
            ctx.fillRect(x - 6, y, 12, 12);
            ctx.fillStyle = '#3f2f24';
            ctx.fillRect(x - 8, y + 12, 5, 5);
            ctx.fillRect(x + 3, y + 12, 5, 5);
        } else if (worker.type === 'drone') {
            ctx.fillStyle = '#6f7f7a';
            ctx.fillRect(x - 13, y - 8, 26, 16);
            ctx.fillStyle = '#d7ded7';
            ctx.fillRect(x - 8, y - 5, 16, 10);
            ctx.fillStyle = '#77a96b';
            ctx.fillRect(x - 3, y - 2, 6, 4);
            ctx.fillStyle = '#3f4d45';
            ctx.fillRect(x - 20, y - 2, 7, 3);
            ctx.fillRect(x + 13, y - 2, 7, 3);
        }
        ctx.restore();
    }
}

function getWorkerSpritePath(worker) {
    const moving = Math.hypot(worker.vx || 0, worker.vy || 0) > 0.35;
    const frame = Math.floor(getRenderNow() / 220) % 2;
    if (worker.type === 'drone') {
        if (worker.target && worker.target.kind !== 'patrol') return GENERATED_SPRITES.workers.drone[3];
        if (!moving) return GENERATED_SPRITES.workers.drone[0];
        return GENERATED_SPRITES.workers.drone[frame ? 1 : 2];
    }
    if (worker.target && worker.target.kind !== 'patrol') return GENERATED_SPRITES.workers.human[3];
    if (!moving) return GENERATED_SPRITES.workers.human[0];
    return GENERATED_SPRITES.workers.human[frame ? 1 : 2];
}

function drawVisitors() {
    const visitors = getVisitorIds();
    if (visitors.length === 0) return;
    const pastureRect = getPastureAreaLayout().rect;
    const baseX = pastureRect.x + 26;
    const baseY = pastureRect.y + pastureRect.h + 54;
    ctx.save();
    drawRoundRect(ctx, baseX - 14, baseY - 42, 292, 96, 10, 'rgba(248, 249, 244, 0.62)', 'rgba(96, 125, 111, 0.6)');
    ctx.fillStyle = 'rgba(52, 73, 94, 0.65)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('访客休息区', baseX - 2, baseY - 20);
    ctx.restore();
    visitors.forEach((id, index) => {
        const config = VISITOR_CONFIG[id];
        const unlocked = isVisitorUnlocked(id);
        const progress = unlocked ? getVisitorProgress(id) : { finished: false };
        const fallbackX = baseX + (index % 4) * 66;
        const fallbackY = baseY + 14 + Math.floor(index / 4) * 48;
        const avatarLayout = getNpcMapAvatarLayout(id, index, {
            x: fallbackX - 10,
            y: fallbackY - 20,
            w: 38,
            h: 48,
            anchor: 'top-left'
        });
        const avatar = avatarLayout.rect;
        const avatarCenterX = avatar.x + avatar.w / 2;
        const x = avatarCenterX - 9;
        const y = avatar.y + 20;
        registerWorldLayoutDebugItem(`npc.${id}`, avatarLayout);
        ctx.save();
        ctx.fillStyle = 'rgba(60, 70, 64, 0.18)';
        ctx.fillRect(avatar.x - 2, avatar.y + avatar.h - 4, avatar.w + 4, 8);
        drawRoundRect(ctx, avatar.x, avatar.y, avatar.w, avatar.h, 7, !unlocked ? '#d8d1bf' : progress.finished ? '#dff4e6' : '#fff3cd', !unlocked ? '#8f8572' : progress.finished ? '#27ae60' : '#f39c12');
        ctx.fillStyle = '#263238';
        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(config.icon, avatarCenterX, avatar.y + 22);
        ctx.font = 'bold 10px Arial';
        if (!unlocked) {
            ctx.fillText('未到', x + 9, y + 20);
            ctx.restore();
            return;
        }
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
        const x = (i * 47 + getRenderNow() / 20) % canvas.width;
        const y = (i * 83 + getRenderNow() / 8) % canvas.height;
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
        const y = (getRenderNow() / 60 + i * 53) % canvas.height;
        ctx.fillRect(0, y, canvas.width, 2);
    }
    ctx.restore();
}

function drawTorchLights() {
    const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
    const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
    const torches = [
        [farmStartX - 10, farmStartY - 10],
        [farmStartX + farmW + 10, farmStartY - 10],
        [farmStartX - 10, farmStartY + farmH + 10],
        [farmStartX + farmW + 10, farmStartY + farmH + 10]
    ];
    for (const [worldX, worldY] of torches) {
        const point = worldToScreen(worldX, worldY);
        const x = point.x;
        const y = point.y;
        const pulse = 28 + Math.sin(getRenderNow() / 180 + x) * 5;
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
