// ==========================================
// 经济与市场系统
// ==========================================
function updateMarket() {
    for (const key in marketState) {
        const base = CROP_CONFIG[key].basePrice; let state = marketState[key]; const oldPrice = state.price;
        state.trend += (Math.random() - 0.5) * 1.5; state.trend -= ((state.price - base) / base) * 2.0; 
        state.trend = Math.max(-3, Math.min(3, state.trend));
        let newPrice = Math.round(state.price + state.trend + (Math.random() - 0.5));
        newPrice = Math.max(Math.max(1, Math.floor(base * 0.2)), Math.min(Math.ceil(base * 3.0), newPrice));
        state.price = newPrice;
        
        const pElem = document.getElementById(`price-${key}`);
        if (!pElem) continue;
        if (newPrice > oldPrice) { pElem.className = 'price-up'; pElem.innerHTML = `${newPrice} ↑`; } 
        else if (newPrice < oldPrice) { pElem.className = 'price-down'; pElem.innerHTML = `${newPrice} ↓`; } 
        else { pElem.className = 'price-normal'; pElem.innerHTML = `${newPrice} -`; }
    }
}

window.sellItem = function(itemId) {
    const inputElement = document.getElementById(`sell-amt-${itemId}`);
    let sellAmount = parseInt(inputElement.value);
    if (isNaN(sellAmount) || sellAmount <= 0) return;
    if (sellAmount > inventory[itemId]) { sellAmount = inventory[itemId]; inputElement.value = sellAmount; }
    if (sellAmount > 0) { coins += sellAmount * marketState[itemId].price; inventory[itemId] -= sellAmount; updateUI(); saveGame(); }
};

// ==========================================
// 任务系统
// ==========================================
function generateTask() {
    const unlockedItems = Object.keys(CROP_CONFIG).filter(key => ['wheat','carrot','watermelon'].includes(key) && playerLevel >= CROP_CONFIG[key].reqLevel);
    const item = unlockedItems[Math.floor(Math.random() * unlockedItems.length)];
    const amount = Math.floor(Math.random() * 10) + 5; 
    const premium = 1.8 + Math.random() * 0.7;
    const reward = Math.floor(amount * CROP_CONFIG[item].basePrice * premium);
    return { id: Math.random().toString(36).substr(2, 9), item: item, amount: amount, reward: reward, exp: Math.floor(reward / 2) };
}

function initTasks() { while(tasks.length < 3) tasks.push(generateTask()); }

window.deliverTask = function(index) {
    const t = tasks[index];
    if (inventory[t.item] >= t.amount) {
        inventory[t.item] -= t.amount; coins += t.reward; 
        effectText = `✅ 完成订单！赚取 ${t.reward} 币！`; effectAlpha = 1.0;
        addExp(t.exp); tasks[index] = generateTask(); updateUI(); saveGame();
    }
};

// ==========================================
// 技能系统
// ==========================================
function getSkillCd(id) {
    if (id === 'sow') return Math.max(3000, 20000 - (skills.sow.level - 1) * 3000); 
    if (id === 'rain') return Math.max(5000, 30000 - (skills.rain.level - 1) * 3000); 
    if (id === 'harvest') return Math.max(10000, 60000 - (skills.harvest.level - 1) * 5000); 
}
function getSkillCost(id) { return skills[id].level * 500; }

window.upgradeSkill = function(id) {
    const cost = getSkillCost(id);
    if (coins >= cost) {
        coins -= cost; skills[id].level++;
        effectText = `⬆️ ${skills[id].name} 升至 Lv.${skills[id].level}！`; effectAlpha = 1.0;
        updateUI(); saveGame();
    } else { alert(`金币不足！`); }
}