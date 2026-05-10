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
    if (!CROP_CONFIG[cropType] || CROP_CONFIG[cropType].seedPrice === undefined) return false;
    if (!isItemUnlocked(cropType)) return false;
    let actualCropType = mutationState.pending[cropType] || cropType;
    const config = CROP_CONFIG[actualCropType];
    const position = findCellPosition(cell);
    if (actualCropType === 'pumpkin' && !canReserveLargeCrop(position?.row, position?.col)) {
        effectText = '南瓜需要右下相邻 2x2 空地';
        effectAlpha = 1.0;
        return false;
    }
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
    return [[0, 0], [0, 1], [1, 0], [1, 1]].every(([dr, dc]) => gridData[row + dr]?.[col + dc]?.state === 0);
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

    if (allowResonance) {
        const cluster = findMatureCluster(row, col, cropType);
        if (cluster.length >= 3 && Math.random() < getResonanceChance()) {
            targets = cluster;
            stats.resonances = (stats.resonances || 0) + 1;
            effectText = `✨ 邻接共振！连收 ${cluster.length} 株 ${CROP_CONFIG[cropType].name}`;
            effectAlpha = 1.0;
            spawnResonanceBurst(cluster, cropType);
        }
    }

    let expGained = 0;
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
            floatingTexts.push({
                x: farmStartX + target.col * TILE_SIZE + TILE_SIZE / 2,
                y: farmStartY + target.row * TILE_SIZE + 6,
                text: `+${woodDrop}🪵`,
                life: 90,
                color: '#8d6e63'
            });
        }
        markCollected(cropType, amount);
        expGained += config.exp * amount;
        stats.harvests[cropType] = (stats.harvests[cropType] || 0) + amount;
        if (cropType === 'lavender' && isDeepNight()) stats.nightLavenderHarvests = (stats.nightLavenderHarvests || 0) + amount;
        spawnHarvestEffects(target.row, target.col, config, options);
        targetCell.state = 0;
        targetCell.cropType = null;
        clearLargeCropPlaceholders(target.row, target.col);
    }

    if (expGained > 0) addExp(expGained);
    if (expGained > 0) {
        tryDiscoverVariant(cropType, targets.length);
        playSound(targets.length > 1 ? 'resonance' : 'harvest');
        recordDiary(`收获 ${CROP_CONFIG[cropType].name} x${targets.length}`);
    }
    return targets.length;
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
    if (progress.total === 0 || progress.found >= progress.total) return;
    const next = progress.variants.find(variant => isVariantReady(cropType, variant) && !(collection.variants[cropType] || {})[variant.id]);
    if (!next) return;
    let chance = next.chance || 0;
    chance += collectionBonuses.variantChance || 0;
    const finalChance = chance >= 1 ? 1 : Math.min(0.18, chance);
    if (Math.random() > finalChance) return;
    if (markVariantCollected(cropType, next.id)) {
        mutationState.pending[cropType] = next.cropId;
        effectText = `图鉴发现：${next.name}`;
        effectAlpha = 1.0;
        recordDiary(`发现变种：${next.name}`);
    }
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
    const cluster = [];
    while (queue.length > 0) {
        const node = queue.shift();
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
