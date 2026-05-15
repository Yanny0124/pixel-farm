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

function getAnimalCapacity(type) {
    const buildingId = getRanchBuildingId(type);
    const config = RANCH_BUILDING_CONFIG[buildingId];
    if (!config) return 99;
    const level = getRanchBuildingLevel(buildingId);
    return 1 + level * config.capacityPerLevel;
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

function updateAnimals(now) {
    for (const animal of animals) {
        if (['chicken', 'sheep', 'cow', 'pig'].includes(animal.type)) {
            updateRanchAnimalPath(animal, now);
        } else if (animal.type === 'bee') {
            updateBee(animal, now);
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

function updateRanchAnimalPath(animal, now) {
    if (!animal.target || now > (animal.targetUntil || 0) || Math.hypot((animal.target.x || animal.x) - animal.x, (animal.target.y || animal.y) - animal.y) < 8) {
        animal.target = {
            x: ranchStartX + 18 + Math.random() * Math.max(1, ranchWidth - 36),
            y: ranchStartY + 18 + Math.random() * Math.max(1, ranchHeight - 36)
        };
        animal.targetUntil = now + 4500 + Math.random() * 5000;
    }
    steerAnimal(animal, animal.target.x, animal.target.y, animal.type === 'chicken' ? 0.72 : 0.56);
    animal.x = Math.max(ranchStartX + 8, Math.min(ranchStartX + ranchWidth - 8, animal.x));
    animal.y = Math.max(ranchStartY + 8, Math.min(ranchStartY + ranchHeight - 8, animal.y));
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

function updateBee(animal, now) {
    if (!animal.target || now > (animal.targetUntil || 0) || Math.hypot((animal.target.x || animal.x) - animal.x, (animal.target.y || animal.y) - animal.y) < 12) {
        animal.target = {
            x: farmStartX + 18 + Math.random() * Math.max(1, gridWidth - 36),
            y: farmStartY + 18 + Math.random() * Math.max(1, gridHeight - 36)
        };
        animal.targetUntil = now + 2600 + Math.random() * 2400;
    }
    steerAnimal(animal, animal.target.x, animal.target.y, 1.25);
    animal.x = Math.max(farmStartX + 8, Math.min(farmStartX + gridWidth - 8, animal.x));
    animal.y = Math.max(farmStartY + 8, Math.min(farmStartY + gridHeight - 8, animal.y));

    const beeCol = Math.floor((animal.x - farmStartX) / TILE_SIZE);
    const beeRow = Math.floor((animal.y - farmStartY) / TILE_SIZE);
    for (let r = beeRow - 1; r <= beeRow + 1; r++) {
        for (let c = beeCol - 1; c <= beeCol + 1; c++) {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && gridData[r][c].state === 1) {
                gridData[r][c].timer -= 16;
            }
        }
    }
}
