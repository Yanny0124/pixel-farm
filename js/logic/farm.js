// ==========================================
// Logic/Farm: 种植、生长、收割、邻接共振
// ==========================================
function updateCrops(now) {
    const growthMultiplier = getGrowthMultiplier();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = gridData[r][c];
            if (cell.state === 1 && now - cell.timer > getActualGrowTime(cell.cropType) / growthMultiplier) {
                cell.state = 2;
            }
        }
    }
}

function getActualGrowTime(cropType) {
    return (CROP_CONFIG[cropType]?.growTime || 0) * CROP_GROW_TIME_SCALE * getCategoryGrowTimeScale(cropType);
}

function plantCell(cell, cropType, now) {
    if (!canPlantCropAtCell(cell, cropType)) return false;
    let actualCropType = mutationState.pending[cropType] || cropType;
    const config = CROP_CONFIG[actualCropType];
    const position = findCellPosition(cell);
    const seedCost = CROP_CONFIG[cropType].seedPrice;
    if (coins < seedCost) return false;
    coins -= seedCost;
    if (actualCropType !== cropType) {
        delete mutationState.pending[cropType];
        effectText = `这片土壤出现异色嫩芽：${config.name}`;
        effectAlpha = 1.0;
    }
    if (cropType === 'wheat' && weather.type === 'rain') stats.rainWheatPlantStreak = (stats.rainWheatPlantStreak || 0) + 1;
    else if (cropType !== 'rainWheat') stats.rainWheatPlantStreak = 0;
    cell.state = 1;
    cell.timer = now;
    cell.cropType = actualCropType;
    if (actualCropType === 'pumpkin') reserveLargeCrop(position.row, position.col, actualCropType, now);
    return true;
}

function canPlantCropAtCell(cell, cropType, options = {}) {
    if (!cell || cell.state !== 0) return false;
    if (!CROP_CONFIG[cropType] || CROP_CONFIG[cropType].seedPrice === undefined) return false;
    if (!isItemUnlocked(cropType)) return false;
    const actualCropType = mutationState.pending[cropType] || cropType;
    const position = actualCropType === 'pumpkin' ? findCellPosition(cell) : null;
    if (actualCropType !== 'pumpkin' || canReserveLargeCrop(position?.row, position?.col)) return true;
    if (!options.quiet) {
        effectText = '南瓜需要右下相邻 2x2 空地';
        effectAlpha = 1.0;
    }
    return false;
}

function findCellPosition(targetCell) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (gridData[r][c] === targetCell) return { row: r, col: c };
        }
    }
    return null;
}

function canReserveLargeCrop(row, col) {
    if (row === null || col === null || row === undefined || col === undefined) return false;
    if (row >= ROWS - 1 || col >= COLS - 1) return false;
    if (!isLargeCropWithinFarmPlot(row, col)) return false;
    return [[0, 0], [0, 1], [1, 0], [1, 1]].every(([dr, dc]) => gridData[row + dr]?.[col + dc]?.state === 0);
}

function isLargeCropWithinFarmPlot(row, col) {
    const plotSize = typeof FARM_PLOT_SIZE !== 'undefined' ? FARM_PLOT_SIZE : Math.floor(COLS / 2);
    const startPlotCol = Math.floor(col / plotSize);
    const endPlotCol = Math.floor((col + 1) / plotSize);
    const startPlotRow = Math.floor(row / plotSize);
    const endPlotRow = Math.floor((row + 1) / plotSize);
    return startPlotCol === endPlotCol && startPlotRow === endPlotRow;
}

function reserveLargeCrop(row, col, cropType, now) {
    [[0, 1], [1, 0], [1, 1]].forEach(([dr, dc]) => {
        const cell = gridData[row + dr]?.[col + dc];
        if (!cell) return;
        cell.state = 4;
        cell.timer = now;
        cell.cropType = cropType;
        cell.parentRow = row;
        cell.parentCol = col;
    });
}

function harvestCell(row, col, allowResonance = true, options = {}) {
    const cell = gridData[row][col];
    if (cell.state !== 2 || !cell.cropType) return 0;
    const cropType = cell.cropType;
    let targets = [{ row, col }];
    let resonanceTriggered = false;

    if (allowResonance) {
        const cluster = findMatureCluster(row, col, cropType);
        if (cluster.length >= 3 && Math.random() < getResonanceChance()) {
            targets = cluster;
            resonanceTriggered = true;
            stats.resonances = (stats.resonances || 0) + 1;
            effectText = `✨ 邻接共振！连收 ${cluster.length} 株 ${CROP_CONFIG[cropType].name}`;
            effectAlpha = 1.0;
            spawnResonanceBurst(cluster, cropType);
        }
    }

    let expGained = 0;
    let harvestedAmount = 0;
    let harvestedCells = 0;
    let resonanceEffectsSpawned = 0;
    const resonanceEffectLimit = resonanceTriggered ? Math.min(24, targets.length) : targets.length;
    const resonanceEffectStep = resonanceTriggered && resonanceEffectLimit > 0 ? Math.max(1, Math.ceil(targets.length / resonanceEffectLimit)) : 1;
    for (const target of targets) {
        const targetCell = gridData[target.row][target.col];
        if (targetCell.state !== 2 || targetCell.cropType !== cropType) continue;
        const config = CROP_CONFIG[cropType];
        let amount = 1;
        if (getTalentLevel('agriculture') >= 5 && Math.random() < 0.1) amount++;
        if (!config.noSell) inventory[cropType] = (inventory[cropType] || 0) + amount;
        if (config.produces) {
            const produced = (config.produceAmount || 1) * amount;
            inventory[config.produces] = (inventory[config.produces] || 0) + produced;
            markCollected(config.produces, produced);
        }
        const woodDrop = rollHarvestWoodDrop(cropType, amount);
        if (woodDrop > 0) {
            inventory.wood = (inventory.wood || 0) + woodDrop;
            markCollected('wood', woodDrop);
            if (!options.quiet) addFloatingText({
                x: (typeof getFarmTileWorldX === 'function' ? getFarmTileWorldX(target.col) : farmStartX + target.col * TILE_SIZE) + TILE_SIZE / 2,
                y: (typeof getFarmTileWorldY === 'function' ? getFarmTileWorldY(target.row) : farmStartY + target.row * TILE_SIZE) + 6,
                text: `+${woodDrop}🪵`,
                life: 90,
                color: '#8d6e63'
            });
        }
        markCollected(cropType, amount);
        harvestedAmount += amount;
        harvestedCells++;
        expGained += config.exp * amount;
        stats.harvests[cropType] = (stats.harvests[cropType] || 0) + amount;
        if (cropType === 'lavender' && isDeepNight()) stats.nightLavenderHarvests = (stats.nightLavenderHarvests || 0) + amount;
        if (!resonanceTriggered || (resonanceEffectsSpawned < resonanceEffectLimit && harvestedCells % resonanceEffectStep === 1)) {
            spawnHarvestEffects(target.row, target.col, config, resonanceTriggered ? Object.assign({}, options, { bulk: true, particleCount: 2 }) : options);
            resonanceEffectsSpawned++;
        }
        targetCell.state = 0;
        targetCell.cropType = null;
        clearLargeCropPlaceholders(target.row, target.col);
    }

    if (resonanceTriggered && harvestedAmount > 0 && !options.quiet) {
        addFloatingText({
            x: (typeof getFarmTileWorldX === 'function' ? getFarmTileWorldX(col) : farmStartX + col * TILE_SIZE) + TILE_SIZE / 2,
            y: (typeof getFarmTileWorldY === 'function' ? getFarmTileWorldY(row) : farmStartY + row * TILE_SIZE) - 4,
            text: `+${CROP_CONFIG[cropType].icon} x${harvestedAmount}`,
            life: 105,
            color: '#f1c40f'
        });
    }
    if (expGained > 0) addExp(expGained);
    if (expGained > 0) {
        const discoveredVariant = tryDiscoverVariant(cropType, targets.length);
        applyHarvestShake(cropType, { resonanceTriggered, discoveredVariant, options });
        if (!options.quiet) {
            playSound(targets.length > 1 ? 'resonance' : 'harvest');
            recordDiary(`收获 ${CROP_CONFIG[cropType].name} x${targets.length}`);
        }
    }
    return harvestedCells;
}

function rollHarvestWoodDrop(cropType, amount) {
    const config = CROP_CONFIG[cropType];
    if (!config || config.produces || config.noSell) return 0;
    let chance = 0.12;
    if (['根茎类', '谷物类'].includes(config.category)) chance = 0.16;
    if (getTalentLevel('agriculture') >= 2) chance += 0.04;
    let wood = 0;
    for (let i = 0; i < amount; i++) {
        if (Math.random() < chance) wood++;
    }
    return wood;
}

function applyHarvestShake(cropType, context) {
    if (context.options?.quiet) return;
    if (context.resonanceTriggered) {
        triggerScreenShake(130, 2.1, context.options);
        return;
    }
    if (context.discoveredVariant) {
        triggerScreenShake(95, 1.35, context.options);
        return;
    }
    if (isHighValueHarvest(cropType)) {
        triggerScreenShake(60, 0.75, context.options);
    }
}

function isHighValueHarvest(cropType) {
    const config = CROP_CONFIG[cropType];
    if (!config) return false;
    return !!config.rarity || config.basePrice >= 50 || !!config.noSell;
}

function clearLargeCropPlaceholders(row, col) {
    [[0, 1], [1, 0], [1, 1]].forEach(([dr, dc]) => {
        const cell = gridData[row + dr]?.[col + dc];
        if (cell?.state !== 4 || cell.parentRow !== row || cell.parentCol !== col) return;
        cell.state = 0;
        cell.cropType = null;
        delete cell.parentRow;
        delete cell.parentCol;
    });
}

function tryDiscoverVariant(cropType, harvestedCount) {
    const progress = getVariantProgress(cropType);
    if (progress.total === 0 || progress.found >= progress.total) return false;
    const next = progress.variants.find(variant => isVariantReady(cropType, variant) && !(collection.variants[cropType] || {})[variant.id]);
    if (!next) return false;
    let chance = next.chance || 0;
    chance += collectionBonuses.variantChance || 0;
    const finalChance = chance >= 1 ? 1 : Math.min(0.18, chance);
    if (Math.random() > finalChance) return false;
    if (markVariantCollected(cropType, next.id)) {
        mutationState.pending[cropType] = next.cropId;
        effectText = `图鉴发现：${next.name}`;
        effectAlpha = 1.0;
        recordDiary(`发现变种：${next.name}`);
        return true;
    }
    return false;
}

function isVariantReady(cropType, variant) {
    if (variant.minHarvest && (stats.harvests?.[cropType] || 0) < variant.minHarvest) return false;
    if (variant.required && !variant.required()) return false;
    return true;
}

function isDeepNight() {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 4;
}

function findMatureCluster(row, col, cropType) {
    const visited = new Set();
    const queue = [{ row, col }];
    let head = 0;
    const cluster = [];
    while (head < queue.length) {
        const node = queue[head++];
        const key = `${node.row},${node.col}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const cell = gridData[node.row]?.[node.col];
        if (!cell || cell.state !== 2 || cell.cropType !== cropType) continue;
        cluster.push(node);
        queue.push({ row: node.row - 1, col: node.col });
        queue.push({ row: node.row + 1, col: node.col });
        queue.push({ row: node.row, col: node.col - 1 });
        queue.push({ row: node.row, col: node.col + 1 });
    }
    return cluster;
}
