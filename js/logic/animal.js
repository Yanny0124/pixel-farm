// ==========================================
// Logic/Animal: 动物移动与产出
// ==========================================
function getAnimalProductType(type) {
    if (type === 'sheep') return 'wool';
    if (type === 'cow') return 'milk';
    if (type === 'bee') return 'honey';
    if (type === 'pig') return 'truffle';
    return 'egg';
}

function getGoldenAnimalProductType(type) {
    if (type === 'sheep') return 'goldenWool';
    if (type === 'cow') return 'goldenMilk';
    if (type === 'bee') return 'royalHoney';
    if (type === 'pig') return 'blackTruffle';
    return 'goldenEgg';
}

function rollAnimalProductType(type, produced) {
    const baseProduct = getAnimalProductType(type);
    if (getTalentLevel('husbandry') < 3) return { baseProduct, baseAmount: produced, rareProduct: null, rareAmount: 0 };
    const rareChance = 0.08 + Math.min(0.08, getRanchBuildingLevel(getRanchBuildingId(type)) * 0.02);
    let rareAmount = 0;
    for (let i = 0; i < produced; i++) {
        if (Math.random() < rareChance) rareAmount++;
    }
    return {
        baseProduct,
        baseAmount: produced - rareAmount,
        rareProduct: getGoldenAnimalProductType(type),
        rareAmount
    };
}

function addAnimalProducts(type, produced) {
    const result = rollAnimalProductType(type, produced);
    if (result.baseAmount > 0) {
        inventory[result.baseProduct] += result.baseAmount;
        markCollected(result.baseProduct, result.baseAmount);
    }
    if (result.rareProduct && result.rareAmount > 0) {
        inventory[result.rareProduct] = (inventory[result.rareProduct] || 0) + result.rareAmount;
        markCollected(result.rareProduct, result.rareAmount);
    }
    return result;
}

function getRanchBuildingId(type) {
    return Object.keys(RANCH_BUILDING_CONFIG).find(id => RANCH_BUILDING_CONFIG[id].animal === type);
}

function getRanchBuildingLevel(id) {
    return ranchBuildings[id] || 0;
}

const FINAL_RANCH_ANIMAL_CAPACITY = {
    chicken: 36,
    sheep: 32,
    cow: 24,
    bee: 20,
    pig: 20
};

function getAnimalCapacity(type) {
    const buildingId = getRanchBuildingId(type);
    const config = RANCH_BUILDING_CONFIG[buildingId];
    if (!config) return 99;
    const level = getRanchBuildingLevel(buildingId);
    const capacity = 1 + level * config.capacityPerLevel;
    return level >= config.maxLevel ? Math.max(capacity, FINAL_RANCH_ANIMAL_CAPACITY[type] || capacity) : capacity;
}

function getAnimalCount(type) {
    return animals.filter(animal => animal.type === type).length;
}

function getAnimalBuildingBonus(type) {
    const buildingId = getRanchBuildingId(type);
    const config = RANCH_BUILDING_CONFIG[buildingId];
    if (!config) return 0;
    return getRanchBuildingLevel(buildingId) * config.bonusPerLevel;
}

function getAnimalProduceTime(type, animal = null, now = Date.now()) {
    let pTime = 10000;
    if (type === 'sheep') pTime = 12000;
    if (type === 'cow') pTime = 15000;
    if (type === 'bee') pTime = 12000;
    if (type === 'pig') pTime = 20000;
    if (['chicken', 'sheep', 'cow', 'pig'].includes(type)) {
        pTime *= 1 - Math.min(0.4, getTalentLevel('husbandry') * 0.1);
    }
    pTime *= 1 - Math.min(0.35, getAnimalBuildingBonus(type));
    if (animal && animal.feedUntil && animal.feedUntil > now) pTime *= 0.8;
    if (miracleBonuses.barn) pTime *= 0.9;
    return pTime;
}

function getAnimalFeedOptions(type) {
    if (type === 'chicken') return ['wheat', 'corn'];
    if (type === 'sheep') return ['carrot', 'wheat'];
    if (type === 'cow') return ['wheat', 'corn'];
    if (type === 'pig') return ['carrot', 'potato'];
    if (type === 'bee') return ['sunflower', 'lavender'];
    return [];
}

function tryFeedAnimal(animal, now) {
    if (animal.feedUntil && animal.feedUntil > now) return true;
    const feed = getAnimalFeedOptions(animal.type).find(itemId => (inventory[itemId] || 0) > 0);
    if (!feed) return false;
    inventory[feed]--;
    const moodBonus = getTalentLevel('husbandry') >= 4 ? 1.6 : 1;
    animal.feedUntil = now + Math.round(60 * 1000 * moodBonus);
    return true;
}

function getFedAnimalCount(type) {
    const now = Date.now();
    return animals.filter(animal => animal.type === type && animal.feedUntil && animal.feedUntil > now).length;
}

function getRanchBuildingCost(id) {
    const config = RANCH_BUILDING_CONFIG[id];
    const level = getRanchBuildingLevel(id);
    let cost = Math.round(config.baseCost * Math.pow(1.55, level));
    if (getTalentLevel('industry') >= 5) cost = Math.floor(cost * 0.8);
    if (collectionBonuses.buildingDiscount) cost = Math.floor(cost * (1 - collectionBonuses.buildingDiscount));
    return cost;
}

window.upgradeRanchBuilding = function(id) {
    const config = RANCH_BUILDING_CONFIG[id];
    if (!config) return;
    const level = getRanchBuildingLevel(id);
    if (level >= config.maxLevel) return;
    if (playerLevel < config.reqLevel) {
        alert(`需要 Lv.${config.reqLevel} 解锁${config.name}`);
        return;
    }
    const cost = getRanchBuildingCost(id);
    if (coins < cost) {
        alert('金币不足！');
        return;
    }
    coins -= cost;
    ranchBuildings[id] = level + 1;
    effectText = `${config.icon} ${config.name} 升至 Lv.${ranchBuildings[id]}`;
    effectAlpha = 1.0;
    playSound('build');
    recordDiary(`${config.name}升至 Lv.${ranchBuildings[id]}`);
    updateUI();
    saveGame();
};

let animalMotionFrame = 0;

function updateAnimals(now) {
    animalMotionFrame++;
    const movementBatchCount = getAnimalMovementBatchCount();
    const movementBatch = animalMotionFrame % movementBatchCount;
    for (let index = 0; index < animals.length; index++) {
        const animal = animals[index];
        ensureAnimalMotionRuntime(animal, index, now);
        const motionBatch = getAnimalMotionBatch(animal, index, movementBatchCount);
        const updateMotionDecision = motionBatch === movementBatch || !animal.target;
        if (['chicken', 'sheep', 'cow', 'pig'].includes(animal.type)) {
            updateRanchAnimalPath(animal, now, index, updateMotionDecision);
        } else if (animal.type === 'bee') {
            updateBee(animal, now, index, updateMotionDecision);
        }

        tryFeedAnimal(animal, now);
        const pTime = getAnimalProduceTime(animal.type, animal, now);
        const pType = getAnimalProductType(animal.type);
        if (now - animal.timer > pTime) {
            const produced = Math.floor((now - animal.timer) / pTime);
            const result = addAnimalProducts(animal.type, produced);
            const rareText = result.rareAmount > 0 ? `，稀有 ${CROP_CONFIG[result.rareProduct].name} x${result.rareAmount}` : '';
            recordDiary(`${CROP_CONFIG[animal.type].name}产出 ${CROP_CONFIG[pType].name} x${result.baseAmount}${rareText}`);
            animal.timer = now;
            updateUI();
        }
    }
}

function getAnimalMovementBatchCount() {
    if (isUnitPerformanceMode()) return animals.length > 80 ? 6 : 4;
    if (animals.length > 120) return 5;
    if (animals.length > 60) return 4;
    if (animals.length > 24) return 3;
    return 2;
}

function getAnimalMotionBatch(animal, index, batchCount) {
    return Math.abs(Math.floor((animal.motionSeed || index + 1) + index * 3)) % Math.max(1, batchCount);
}

function ensureAnimalMotionRuntime(animal, index, now) {
    if (!animal || typeof animal !== 'object') return;
    defineAnimalRuntime(animal, 'motionSeed', Math.floor((now + index * 3571 + Math.random() * 100000) % 100000));
    defineAnimalRuntime(animal, 'motionState', 'walk');
    defineAnimalRuntime(animal, 'motionPauseUntil', 0);
    defineAnimalRuntime(animal, 'motionStep', 0);
    defineAnimalRuntime(animal, 'roamAnchorKey', '');
    defineAnimalRuntime(animal, 'roamAnchor', null);
    if (!Number.isFinite(animal.vx)) animal.vx = 0;
    if (!Number.isFinite(animal.vy)) animal.vy = 0;
}

function defineAnimalRuntime(animal, key, value) {
    if (animal[key] !== undefined) return;
    Object.defineProperty(animal, key, {
        value,
        writable: true,
        configurable: true,
        enumerable: false
    });
}

let unitPerformanceModeCache = { at: 0, value: false };

function isUnitPerformanceMode() {
    if (window.PERFORMANCE_MODE === true || window.UNIT_PERFORMANCE_MODE === true) return true;
    const now = Date.now();
    if (now - unitPerformanceModeCache.at < 800) return unitPerformanceModeCache.value;
    if (typeof matchMedia !== 'function') return false;
    unitPerformanceModeCache = {
        at: now,
        value: matchMedia('(max-width: 1024px), (pointer: coarse) and (max-width: 1366px)').matches
    };
    return unitPerformanceModeCache.value;
}

function updateRanchAnimalPath(animal, now, index, updateMotionDecision) {
    const zone = getAnimalActivityZone(animal.type);
    updateAnimalMotionTarget(animal, now, zone, updateMotionDecision, 8, index);
    moveAnimalWithinZone(animal, zone, animal.type === 'chicken' ? 0.72 : 0.56, updateMotionDecision, index);
    if (updateMotionDecision) applyAnimalSeparation(animal, index, zone);
}

function updateAnimalMotionTarget(animal, now, zone, updateMotionDecision, arrivalRadius, index = 0) {
    if (animal.motionState === 'pause' && now < animal.motionPauseUntil) return;
    if (!updateMotionDecision && animal.target) return;
    const reached = animal.target && Math.hypot((animal.target.x || animal.x) - animal.x, (animal.target.y || animal.y) - animal.y) < arrivalRadius;
    const expired = now > (animal.targetUntil || 0);
    if (animal.target && !reached && !expired) return;
    if (reached && animalRuntimeUnit(animal.motionSeed, Math.floor(now / 251)) < 0.3) {
        animal.motionState = 'pause';
        animal.motionPauseUntil = now + 340 + animalRuntimeUnit(animal.motionSeed, now % 613) * 1250;
        animal.vx *= 0.45;
        animal.vy *= 0.45;
        return;
    }
    animal.motionState = expired ? 'turn' : 'walk';
    animal.motionStep++;
    animal.target = pickAnimalZoneTarget(animal, zone, index);
    animal.targetUntil = now + 2800 + animalRuntimeUnit(animal.motionSeed, Math.floor(now / 401)) * (animal.type === 'bee' ? 2400 : 5200);
}

function moveAnimalWithinZone(animal, zone, speed, updateMotionDecision, index = 0) {
    const previousX = animal.x;
    const previousY = animal.y;
    if (animal.motionState === 'pause') {
        animal.vx *= 0.82;
        animal.vy *= 0.82;
        animal.x += animal.vx;
        animal.y += animal.vy;
    } else if (updateMotionDecision || !animal.target) {
        steerAnimal(animal, animal.target?.x ?? zone.cx, animal.target?.y ?? zone.cy, speed);
    } else {
        animal.x += animal.vx || 0;
        animal.y += animal.vy || 0;
    }
    const bounds = isAnimalInsideZone(animal, zone) ? zone : getAnimalTravelBounds(animal, zone);
    const clampedX = Math.max(bounds.x, Math.min(bounds.x + bounds.w, animal.x));
    const clampedY = Math.max(bounds.y, Math.min(bounds.y + bounds.h, animal.y));
    if (clampedX !== animal.x) {
        animal.x = clampedX;
        animal.vx *= -0.35;
        animal.motionState = 'turn';
    }
    if (clampedY !== animal.y) {
        animal.y = clampedY;
        animal.vy *= -0.35;
        animal.motionState = 'turn';
    }
    if (animal.type !== 'bee' && isRanchAnimalOnBuilding(animal)) {
        if (isPointInRanchBuilding(previousX, previousY, animal.type === 'cow' ? 12 : 9)) {
            pushRanchAnimalOffBuilding(animal, zone);
        } else {
            animal.x = previousX;
            animal.y = previousY;
        }
        animal.vx *= -0.45;
        animal.vy *= -0.45;
        animal.motionState = 'turn';
        animal.target = pickAnimalZoneTarget(animal, zone, index);
        animal.targetUntil = 0;
    }
}

function isAnimalInsideZone(animal, zone) {
    return animal.x >= zone.x && animal.x <= zone.x + zone.w && animal.y >= zone.y && animal.y <= zone.y + zone.h;
}

function getAnimalTravelBounds(animal, zone) {
    if (animal.type === 'bee') return zone;
    return getRanchRoamRect(8);
}

const animalActivityZoneCache = {};

function getAnimalActivityZone(type) {
    if (type === 'bee') return getBeeActivityZone();
    const pasture = getRanchRoamRect(14);
    const cacheKey = ['pasture', pasture.x, pasture.y, pasture.w, pasture.h].join('|');
    if (animalActivityZoneCache[type]?.key === cacheKey) return animalActivityZoneCache[type].zone;
    const zone = finishAnimalZone(pasture);
    animalActivityZoneCache[type] = { key: cacheKey, zone };
    return zone;
}

function getRanchRoamRect(inset = 0) {
    const rect = typeof getPastureAreaLayout === 'function'
        ? getPastureAreaLayout().rect
        : { x: ranchStartX, y: ranchStartY, w: ranchWidth, h: ranchHeight };
    return {
        x: rect.x + inset,
        y: rect.y + inset,
        w: Math.max(1, rect.w - inset * 2),
        h: Math.max(1, rect.h - inset * 2)
    };
}

function getBeeActivityZone() {
    const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
    const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
    const farm = { x: farmStartX + 8, y: farmStartY + 8, w: Math.max(1, farmW - 16), h: Math.max(1, farmH - 16) };
    const apiaryConfig = RANCH_BUILDING_CONFIG?.apiary;
    if (!apiaryConfig) return finishAnimalZone(farm);
    const apiary = getLiveRanchBuildingRect('apiary', apiaryConfig);
    const cacheKey = ['bee', apiary.x, apiary.y, apiary.w, apiary.h, farm.x, farm.y, farm.w, farm.h].join('|');
    if (animalActivityZoneCache.bee?.key === cacheKey) return animalActivityZoneCache.bee.zone;
    const bridge = {
        x: Math.min(farm.x, apiary.x - 26),
        y: Math.min(farm.y, apiary.y - 18),
        w: Math.max(farm.x + farm.w, apiary.x + apiary.w + 26) - Math.min(farm.x, apiary.x - 26),
        h: Math.max(farm.y + farm.h, apiary.y + apiary.h + 28) - Math.min(farm.y, apiary.y - 18)
    };
    const zone = finishAnimalZone(bridge);
    animalActivityZoneCache.bee = { key: cacheKey, zone };
    return zone;
}

function finishAnimalZone(zone) {
    return {
        ...zone,
        cx: zone.x + zone.w / 2,
        cy: zone.y + zone.h / 2
    };
}

function pickAnimalZoneTarget(animal, zone, index = 0) {
    if (animal.type === 'bee') return pickBeeZoneTarget(animal, zone);
    const anchorPhase = Math.floor((animal.motionStep || 0) / 5);
    const anchor = getRanchAnimalRoamAnchor(animal, zone, index, anchorPhase);
    const radius = Math.max(28, Math.min(96, Math.min(zone.w, zone.h) * 0.24));
    const salt = (animal.motionStep || 0) * 29 + index * 7;
    let fallback = anchor;
    for (let attempt = 0; attempt < 5; attempt++) {
        const angle = animalRuntimeUnit(animal.motionSeed, salt + 3 + attempt * 11) * Math.PI * 2;
        const distance = 12 + animalRuntimeUnit(animal.motionSeed, salt + 7 + attempt * 17) * radius;
        const target = clampAnimalZonePoint(zone, {
            x: anchor.x + Math.cos(angle) * distance,
            y: anchor.y + Math.sin(angle) * distance * 0.82
        }, 6);
        fallback = target;
        if (!isPointInRanchBuilding(target.x, target.y, 10)) return target;
    }
    return fallback;
}

function getRanchAnimalRoamAnchor(animal, zone, index, phase) {
    const key = [zone.x, zone.y, zone.w, zone.h, index, phase].join('|');
    if (animal.roamAnchorKey === key && animal.roamAnchor) return animal.roamAnchor;
    let fallback = clampAnimalZonePoint(zone, { x: animal.x, y: animal.y }, 10);
    for (let attempt = 0; attempt < 7; attempt++) {
        const slot = index + phase * 17 + attempt * 31 + getRanchAnimalTypeOffset(animal.type);
        const jitterX = (animalRuntimeUnit(animal.motionSeed, phase * 41 + attempt * 13) - 0.5) * 0.13;
        const jitterY = (animalRuntimeUnit(animal.motionSeed, phase * 53 + attempt * 19) - 0.5) * 0.13;
        const anchor = clampAnimalZonePoint(zone, {
            x: zone.x + (0.1 + animalFract(slot * 0.754877666 + jitterX) * 0.8) * zone.w,
            y: zone.y + (0.1 + animalFract(slot * 0.569840296 + jitterY) * 0.8) * zone.h
        }, 10);
        fallback = anchor;
        if (!isPointInRanchBuilding(anchor.x, anchor.y, 16)) {
            animal.roamAnchorKey = key;
            animal.roamAnchor = anchor;
            return anchor;
        }
    }
    animal.roamAnchorKey = key;
    animal.roamAnchor = fallback;
    return fallback;
}

function pickBeeZoneTarget(animal, zone) {
    const salt = Math.floor((animal.targetUntil || Date.now()) / 97);
    return {
        x: zone.x + 6 + animalRuntimeUnit(animal.motionSeed, salt + 3) * Math.max(1, zone.w - 12),
        y: zone.y + 6 + animalRuntimeUnit(animal.motionSeed, salt + 7) * Math.max(1, zone.h - 12)
    };
}

function clampAnimalZonePoint(zone, point, inset = 0) {
    return {
        x: Math.max(zone.x + inset, Math.min(zone.x + zone.w - inset, point.x)),
        y: Math.max(zone.y + inset, Math.min(zone.y + zone.h - inset, point.y))
    };
}

function getRanchAnimalTypeOffset(type) {
    if (type === 'sheep') return 5;
    if (type === 'cow') return 11;
    if (type === 'pig') return 19;
    return 0;
}

function animalFract(value) {
    return value - Math.floor(value);
}

function getRanchAnimalBuildingRects(padding = 0) {
    return Object.entries(RANCH_BUILDING_CONFIG || {}).filter(([id, config]) => (
        config
        && (getRanchBuildingLevel(id) > 0 || playerLevel >= (config.reqLevel || 1))
    )).map(([id, config]) => getRanchBuildingFootprint(getLiveRanchBuildingRect(id, config), padding));
}

function getLiveRanchBuildingRect(id, config) {
    if (typeof getBuildingVisualLayout === 'function') {
        return getBuildingVisualLayout('ranch', id, config).rect;
    }
    return {
        x: config.x,
        y: config.y,
        w: config.w,
        h: config.h
    };
}

function getRanchBuildingFootprint(rect, padding = 0) {
    const insetX = Math.min(14, rect.w * 0.12);
    const top = rect.y + Math.min(rect.h * 0.42, 38);
    return {
        x: rect.x + insetX - padding,
        y: top - padding,
        w: Math.max(1, rect.w - insetX * 2 + padding * 2),
        h: Math.max(1, rect.y + rect.h - top + padding * 2)
    };
}

function isPointInRanchBuilding(x, y, padding = 0) {
    return getRanchAnimalBuildingRects(padding).some(rect => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
}

function isRanchAnimalOnBuilding(animal) {
    const padding = animal.type === 'cow' ? 12 : 9;
    return isPointInRanchBuilding(animal.x, animal.y, padding);
}

function pushRanchAnimalOffBuilding(animal, zone) {
    const padding = animal.type === 'cow' ? 12 : 9;
    const rect = getRanchAnimalBuildingRects(padding).find(building => (
        animal.x >= building.x
        && animal.x <= building.x + building.w
        && animal.y >= building.y
        && animal.y <= building.y + building.h
    ));
    if (!rect) return;
    const candidates = [
        { x: rect.x - 2, y: animal.y },
        { x: rect.x + rect.w + 2, y: animal.y },
        { x: animal.x, y: rect.y - 2 },
        { x: animal.x, y: rect.y + rect.h + 2 }
    ].map(point => ({
        x: Math.max(zone.x, Math.min(zone.x + zone.w, point.x)),
        y: Math.max(zone.y, Math.min(zone.y + zone.h, point.y))
    })).filter(point => !isPointInRanchBuilding(point.x, point.y, padding));
    if (!candidates.length) return;
    const escape = candidates.reduce((best, point) => {
        const distance = Math.hypot(point.x - animal.x, point.y - animal.y);
        return !best || distance < best.distance ? { point, distance } : best;
    }, null);
    animal.x = escape.point.x;
    animal.y = escape.point.y;
}

function animalRuntimeUnit(seed, salt = 0) {
    const x = Math.sin((seed || 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

function applyAnimalSeparation(animal, index, zone) {
    if (!isAnimalInsideZone(animal, zone)) return;
    const sampleRadius = isUnitPerformanceMode() ? 3 : 6;
    let pushX = 0;
    let pushY = 0;
    for (let offset = -sampleRadius; offset <= sampleRadius; offset++) {
        if (!offset) continue;
        const other = animals[index + offset];
        if (!other || other.type === 'bee' || animal.type === 'bee') continue;
        const dx = animal.x - other.x;
        const dy = animal.y - other.y;
        const distance = Math.hypot(dx, dy);
        const spacing = getRanchAnimalSpacing(animal.type, other.type);
        if (!Number.isFinite(distance) || distance <= 0 || distance >= spacing) continue;
        const strength = (spacing - distance) / spacing;
        pushX += (dx / distance) * strength;
        pushY += (dy / distance) * strength;
    }
    if (!pushX && !pushY) return;
    animal.vx = (animal.vx || 0) + pushX * 0.06;
    animal.vy = (animal.vy || 0) + pushY * 0.05;
    animal.x = Math.max(zone.x, Math.min(zone.x + zone.w, animal.x + pushX * 0.4));
    animal.y = Math.max(zone.y, Math.min(zone.y + zone.h, animal.y + pushY * 0.35));
}

function getRanchAnimalSpacing(type, otherType) {
    const largeAnimal = type === 'cow' || type === 'pig' || otherType === 'cow' || otherType === 'pig';
    return largeAnimal ? 24 : 18;
}

function steerAnimal(animal, targetX, targetY, speed) {
    const dx = targetX - animal.x;
    const dy = targetY - animal.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    animal.vx = Number.isFinite(animal.vx) ? animal.vx : 0;
    animal.vy = Number.isFinite(animal.vy) ? animal.vy : 0;
    if (distance <= speed + 0.35) {
        animal.x = targetX;
        animal.y = targetY;
        animal.vx *= 0.35;
        animal.vy *= 0.35;
        return;
    }
    const ease = animal.type === 'bee' ? 0.14 : 0.12;
    animal.vx = animal.vx * (1 - ease) + (dx / distance) * speed * ease;
    animal.vy = animal.vy * (1 - ease) + (dy / distance) * speed * ease;
    const velocity = Math.hypot(animal.vx, animal.vy);
    if (velocity > speed) {
        animal.vx = (animal.vx / velocity) * speed;
        animal.vy = (animal.vy / velocity) * speed;
    }
    animal.x += animal.vx;
    animal.y += animal.vy;
}

function updateBee(animal, now, index, updateMotionDecision) {
    const zone = getBeeActivityZone();
    updateAnimalMotionTarget(animal, now, zone, updateMotionDecision, 12, index);
    moveAnimalWithinZone(animal, zone, 1.25, updateMotionDecision, index);
    if (updateMotionDecision) applyAnimalSeparation(animal, index, zone);
    applyBeeGrowthAura(animal);
}

function applyBeeGrowthAura(animal) {
    const beeCell = typeof getFarmCellAtWorld === 'function' ? getFarmCellAtWorld(animal.x, animal.y) : null;
    const beeCol = beeCell?.col ?? Math.floor((animal.x - farmStartX) / TILE_SIZE);
    const beeRow = beeCell?.row ?? Math.floor((animal.y - farmStartY) / TILE_SIZE);
    for (let r = beeRow - 1; r <= beeRow + 1; r++) {
        for (let c = beeCol - 1; c <= beeCol + 1; c++) {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && gridData[r][c].state === 1) {
                gridData[r][c].timer -= 16;
            }
        }
    }
}
