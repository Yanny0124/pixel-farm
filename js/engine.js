const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isDraggingCamera = false; let lastMouseX = 0; let lastMouseY = 0; let isSpacebarDown = false; 

// ==========================================
// UI 更新渲染
// ==========================================
function updateUI() {
    ['wheat', 'carrot', 'watermelon', 'egg', 'wool', 'milk', 'honey', 'truffle'].forEach(id => { 
        if(document.getElementById(`inv-${id}`)) document.getElementById(`inv-${id}`).innerText = inventory[id]; 
    });
    for (const key in marketState) { 
        if(document.getElementById(`price-${key}`)) document.getElementById(`price-${key}`).innerText = marketState[key].price; 
    }
    
    document.getElementById('upg-sow').innerText = `⬆️ ${getSkillCost('sow')}币`;
    document.getElementById('upg-rain').innerText = `⬆️ ${getSkillCost('rain')}币`;
    document.getElementById('upg-harvest').innerText = `⬆️ ${getSkillCost('harvest')}币`;

    document.getElementById('player-level').innerText = playerLevel;
    document.getElementById('player-exp').innerText = playerExp;
    document.getElementById('player-max-exp').innerText = getMaxExp();
    document.getElementById('exp-fill').style.width = `${Math.min(100, (playerExp / getMaxExp()) * 100)}%`;

    ['carrot', 'watermelon', 'chicken', 'sheep', 'cow', 'bee', 'pig'].forEach(id => {
        let btn = document.getElementById(`btn-${id}`);
        if(!btn) return;
        if (playerLevel < CROP_CONFIG[id].reqLevel) {
            btn.disabled = true; if (!btn.innerText.includes("🔒")) btn.innerText = "🔒 " + btn.innerText;
        } else {
            btn.disabled = false; btn.innerText = btn.innerText.replace("🔒 ", "");
        }
    });

    let droneBtn = document.getElementById('btn-drone');
    if(droneBtn) droneBtn.disabled = playerLevel < 5;

    const taskContainer = document.getElementById('task-list'); 
    if(taskContainer) {
        taskContainer.innerHTML = ''; 
        tasks.forEach((t, index) => {
            const config = CROP_CONFIG[t.item]; const isEnough = inventory[t.item] >= t.amount;
            taskContainer.innerHTML += `<div class="task-item"><div class="task-req">${config.icon} 需求：${config.name} x${t.amount}</div><div class="task-req" style="font-weight: normal; font-size: 12px; color: ${isEnough ? '#27ae60' : '#e74c3c'};">进度: ${inventory[t.item]}/${t.amount}</div><div class="task-reward">💰 ${t.reward} �?| �?${t.exp} EXP</div><button class="task-btn" ${isEnough ? '' : 'disabled'} onclick="deliverTask(${index})">${isEnough ? '📦 交付' : '未达�?}</button></div>`;
        });
    }
}

function drawTopUI() { 
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.fillRect(10, 10, 200, 40);
    ctx.fillStyle = '#2c3e50'; ctx.font = 'bold 24px Arial'; ctx.fillText(`💰 金币: ${coins}`, 20, 38); 
}

// ==========================================
// 核心逻辑计算 (Update)
// ==========================================
function updateLogic() {
    const now = Date.now();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = gridData[r][c];
            if (cell.state === 1 && now - cell.timer > CROP_CONFIG[cell.cropType].growTime) cell.state = 2; 
        }
    }

    for (let a of animals) {
        a.x += a.vx; a.y += a.vy;
        if (Math.random() < 0.02) { a.vx = (Math.random() - 0.5) * (a.type === 'bee' ? 4 : 1.5); a.vy = (Math.random() - 0.5) * (a.type === 'bee' ? 4 : 1.5); }

        if (['chicken', 'sheep', 'cow', 'pig'].includes(a.type)) {
            if (a.x < ranchStartX + 5) a.vx = Math.abs(a.vx) + 1; if (a.x > ranchStartX + ranchWidth - 5) a.vx = -Math.abs(a.vx);
            if (a.y < ranchStartY + 5) a.vy = Math.abs(a.vy); if (a.y > ranchStartY + ranchHeight - 5) a.vy = -Math.abs(a.vy);
        } else if (a.type === 'bee') {
            if (a.x < farmStartX + 5) a.vx = Math.abs(a.vx) + 1; if (a.x > farmStartX + gridWidth - 5) a.vx = -Math.abs(a.vx);
            if (a.y < farmStartY + 5) a.vy = Math.abs(a.vy); if (a.y > farmStartY + gridHeight - 5) a.vy = -Math.abs(a.vy);
            const beeCol = Math.floor((a.x - farmStartX) / TILE_SIZE); const beeRow = Math.floor((a.y - farmStartY) / TILE_SIZE);
            for(let r = beeRow - 1; r <= beeRow + 1; r++) {
                for(let c = beeCol - 1; c <= beeCol + 1; c++) {
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && gridData[r][c].state === 1) gridData[r][c].timer -= 16; 
                }
            }
        }
        
        let pTime = 10000; let pType = 'egg'; 
        if (a.type === 'sheep') { pTime = 12000; pType = 'wool'; }
        if (a.type === 'cow') { pTime = 15000; pType = 'milk'; } 
        if (a.type === 'bee') { pTime = 12000; pType = 'honey'; }
        if (a.type === 'pig') { pTime = 20000; pType = 'truffle'; }

        if (now - a.timer > pTime) { inventory[pType] += Math.floor((now - a.timer) / pTime); a.timer = now; updateUI(); }
    }

    for (let w of workers) {
        w.x += w.vx; w.y += w.vy;
        if (w.x < farmStartX + 10) w.vx = Math.abs(w.vx) + 0.5; if (w.x > farmStartX + gridWidth - 10) w.vx = -Math.abs(w.vx);
        if (w.y < farmStartY + 10) w.vy = Math.abs(w.vy); if (w.y > farmStartY + gridHeight - 10) w.vy = -Math.abs(w.vy);
        if (Math.random() < 0.05) { w.vx = (Math.random() - 0.5) * (w.type === 'drone' ? 5 : 2); w.vy = (Math.random() - 0.5) * (w.type === 'drone' ? 5 : 2); }

        let actionCD = w.type === 'drone' ? 200 : 1000;
        if (now - w.actionTimer > actionCD) {
            let col = Math.floor((w.x - farmStartX) / TILE_SIZE); let row = Math.floor((w.y - farmStartY) / TILE_SIZE);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                let cell = gridData[row][col];
                if (cell.state === 2) {
                    inventory[cell.cropType] += 1; addExp(CROP_CONFIG[cell.cropType].exp);
                    cell.state = 0; cell.cropType = null; w.actionTimer = now; updateUI();
                } else if (cell.state === 0 && !['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) {
                    let seedCost = CROP_CONFIG[currentSelectedTool].seedPrice;
                    if (coins >= seedCost) { coins -= seedCost; cell.state = 1; cell.timer = now; cell.cropType = currentSelectedTool; w.actionTimer = now; updateUI(); }
                }
            }
        }
    }

    for (const key in skills) {
        const btn = document.getElementById(`skill-${key}`); const skill = skills[key]; const timeLeft = getSkillCd(key) - (now - skill.lastUsed);
        if(!btn) continue;
        if (timeLeft > 0) { btn.classList.add('on-cd'); btn.innerText = `${skill.name} (${Math.ceil(timeLeft/1000)}s)`; } 
        else { btn.classList.remove('on-cd'); btn.innerText = `${skill.name}`; }
    }
    if (effectAlpha > 0) effectAlpha -= 0.015; 
}

// ==========================================
// 画面渲染 (Render)
// ==========================================
function drawFarm() {
    ctx.save(); ctx.translate(camera.x, camera.y);

    ctx.fillStyle = '#bdc3c7'; ctx.font = 'bold 24px Arial'; ctx.fillText('🌾 巨型种植�?(14x14)', farmStartX, farmStartY - 25);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = farmStartX + c * TILE_SIZE; const y = farmStartY + r * TILE_SIZE; const cell = gridData[r][c];
            if (cell.state === -1) {
                ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 1; ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#ecf0f1'; ctx.font = '10px Arial'; ctx.fillText('🔒50�?, x + 5, y + 28);
                continue;
            }
            ctx.strokeStyle = '#81c784'; ctx.lineWidth = 2; ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            if (cell.state !== 0) {
                const config = CROP_CONFIG[cell.cropType];
                if (cell.state === 1) { ctx.fillStyle = config.seedColor; ctx.fillRect(x + 15, y + 15, 15, 15); } 
                else if (cell.state === 2) { ctx.fillStyle = config.matureColor; ctx.fillRect(x + 5, y + 5, 35, 35); }
            }
        }
    }

    ctx.fillStyle = '#bdc3c7'; ctx.font = 'bold 24px Arial'; ctx.fillText('🐔🐮 皇家大牧�?, ranchStartX, ranchStartY - 25);
    ctx.fillStyle = '#a5d6a7'; ctx.fillRect(ranchStartX, ranchStartY, ranchWidth, ranchHeight);
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.strokeRect(ranchStartX, ranchStartY, ranchWidth, ranchHeight);

    ctx.fillStyle = '#bdc3c7'; ctx.fillRect(crossroadX - 2, crossroadY - 20, 4, 40); ctx.fillRect(crossroadX - 20, crossroadY - 2, 40, 4); 
    ctx.fillStyle = '#95a5a6'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('中心十字', crossroadX, crossroadY - 25); ctx.textAlign = 'left';

    for (let a of animals) {
        if (a.type === 'chicken') {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(a.x - 6, a.y - 6, 12, 12);
            ctx.fillStyle = '#f39c12'; ctx.fillRect(a.vx >= 0 ? a.x + 6 : a.x - 10, a.y - 2, 4, 4); 
        } else if (a.type === 'sheep') {
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(a.x - 8, a.y - 8, 16, 16); 
            ctx.fillStyle = '#333'; ctx.fillRect(a.vx >= 0 ? a.x + 4 : a.x - 8, a.y - 4, 4, 8); 
        } else if (a.type === 'cow') {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(a.x - 12, a.y - 8, 24, 16);
            ctx.fillStyle = '#333'; ctx.fillRect(a.x - 6, a.y - 4, 8, 8); ctx.fillRect(a.x + 4, a.y - 6, 6, 6);
            ctx.fillStyle = '#e1bee7'; ctx.fillRect(a.vx >= 0 ? a.x + 12 : a.x - 16, a.y - 4, 4, 8); 
        } else if (a.type === 'bee') {
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(a.x - 3, a.y - 3, 6, 6); ctx.fillStyle = '#333'; ctx.fillRect(a.x - 1, a.y - 3, 2, 6); 
        } else if (a.type === 'pig') {
            ctx.fillStyle = '#f8a5c2'; ctx.fillRect(a.x - 10, a.y - 6, 20, 14); 
            ctx.fillStyle = '#f78fb3'; ctx.fillRect(a.vx >= 0 ? a.x + 6 : a.x - 10, a.y - 2, 4, 6); 
        }
    }

    for (let w of workers) {
        if (w.type === 'human') {
            ctx.fillStyle = '#f39c12'; ctx.fillRect(w.x - 8, w.y - 15, 16, 16); 
            ctx.fillStyle = '#3498db'; ctx.fillRect(w.x - 6, w.y, 12, 10); 
        } else if (w.type === 'drone') {
            ctx.fillStyle = '#95a5a6'; ctx.fillRect(w.x - 10, w.y - 10, 20, 20); 
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(w.x - 4, w.y - 4, 8, 8); 
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(w.x - 15, w.y - 15, 8, 4); ctx.fillRect(w.x + 7, w.y - 15, 8, 4);
            ctx.fillRect(w.x - 15, w.y + 11, 8, 4); ctx.fillRect(w.x + 7, w.y + 11, 8, 4);
        }
    }
    ctx.restore();

    if (effectAlpha > 0) {
        ctx.fillStyle = `rgba(155, 89, 182, ${effectAlpha})`; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
        ctx.fillText(effectText, canvas.width / 2, 80 + (1-effectAlpha)*20); ctx.textAlign = 'left'; 
    }
}

function gameLoop() { updateLogic(); ctx.clearRect(0, 0, canvas.width, canvas.height); drawFarm(); drawTopUI(); requestAnimationFrame(gameLoop); }

// ==========================================
// 交互事件绑定
// ==========================================
window.addEventListener('keydown', (e) => { if (e.code === 'Space') { isSpacebarDown = true; canvas.style.cursor = 'grab'; e.preventDefault(); } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { isSpacebarDown = false; if (!isDraggingCamera) canvas.style.cursor = 'default'; } });
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.selectTool = function(toolId) {
    if (CROP_CONFIG[toolId] && playerLevel < CROP_CONFIG[toolId].reqLevel) return; 
    currentSelectedTool = toolId;
    document.querySelectorAll('.seed-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(`btn-${toolId}`).classList.add('selected');
};

window.hireWorker = function(type) {
    let cost = type === 'human' ? 1000 : 3000;
    if (type === 'drone' && playerLevel < 5) { alert("等级不足�?); return; }
    if (coins >= cost) {
        coins -= cost; workers.push({ type: type, x: crossroadX, y: crossroadY, vx: -2, vy: (Math.random() - 0.5) * 2, actionTimer: 0 });
        effectText = `👷 雇佣成功！`; effectAlpha = 1.0; updateUI(); saveGame();
    } else { alert("金币不足�?); }
}

window.useSkill = function(skillId) {
    const now = Date.now(); const skill = skills[skillId];
    if (now - skill.lastUsed < getSkillCd(skillId)) return;

    if (skillId === 'sow') {
        if (['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) return;
        let plantedCount = 0; const seedCost = CROP_CONFIG[currentSelectedTool].seedPrice;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (gridData[r][c].state === 0 && coins >= seedCost) { coins -= seedCost; gridData[r][c].state = 1; gridData[r][c].timer = now; gridData[r][c].cropType = currentSelectedTool; plantedCount++; }
            }
        }
        if (plantedCount > 0) effectText = `🌱 播下�?${plantedCount} 颗种子！`;
    } 
    else if (skillId === 'rain') {
        for (let r = 0; r < ROWS; r++) { for (let c = 0; c < COLS; c++) { if (gridData[r][c].state === 1) gridData[r][c].timer -= 10000; } }
        effectText = "🌧�?局部降雨！";
    } 
    else if (skillId === 'harvest') {
        let harvestedCount = 0; let expGained = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (gridData[r][c].state === 2) { inventory[gridData[r][c].cropType] += 1; expGained += CROP_CONFIG[gridData[r][c].cropType].exp; gridData[r][c].state = 0; gridData[r][c].cropType = null; harvestedCount++; }
            }
        }
        if(harvestedCount > 0) { effectText = `�?收割完毕！`; addExp(expGained); }
    }
    updateUI(); skill.lastUsed = now; effectAlpha = 1.0; saveGame();
};

canvas.addEventListener('mousedown', (e) => {
    if (isSpacebarDown || e.button === 1) { isDraggingCamera = true; lastMouseX = e.clientX; lastMouseY = e.clientY; canvas.style.cursor = 'grabbing'; return; }
    const rect = canvas.getBoundingClientRect(); const worldX = (e.clientX - rect.left) - camera.x; const worldY = (e.clientY - rect.top) - camera.y;

    if (['chicken', 'sheep', 'cow', 'bee', 'pig'].includes(currentSelectedTool)) {
        if (playerLevel < CROP_CONFIG[currentSelectedTool].reqLevel) return;
        const isClickRanch = worldX >= ranchStartX && worldX <= ranchStartX + ranchWidth && worldY >= ranchStartY && worldY <= ranchStartY + ranchHeight;
        const isClickFarm = worldX >= farmStartX && worldX <= farmStartX + gridWidth && worldY >= farmStartY && worldY <= farmStartY + gridHeight;
        const price = CROP_CONFIG[currentSelectedTool].price;

        if (currentSelectedTool === 'bee' && !isClickFarm) { alert("🐝 蜜蜂请放置在左侧农田区！"); return; }
        if (['chicken', 'sheep', 'cow', 'pig'].includes(currentSelectedTool) && !isClickRanch) { alert("请放置在右侧牧场区！"); return; }

        if (coins >= price) { coins -= price; animals.push({ type: currentSelectedTool, x: crossroadX, y: crossroadY, vx: currentSelectedTool === 'bee' ? -3 : 3, vy: (Math.random() - 0.5) * 2, timer: Date.now() }); saveGame(); } 
        else { alert(`金币不足！`); }
        return; 
    }

    if (worldX >= farmStartX && worldX <= farmStartX + gridWidth && worldY >= farmStartY && worldY <= farmStartY + gridHeight) {
        if (playerLevel < CROP_CONFIG[currentSelectedTool].reqLevel) return;
        const col = Math.floor((worldX - farmStartX) / TILE_SIZE); const row = Math.floor((worldY - farmStartY) / TILE_SIZE); const cell = gridData[row][col]; 
        
        if (cell.state === -1) { if (coins >= UNLOCK_PRICE) { coins -= UNLOCK_PRICE; cell.state = 0; } else { alert(`解锁需�?${UNLOCK_PRICE} 币`); } } 
        else if (cell.state === 0) { const seedCost = CROP_CONFIG[currentSelectedTool].seedPrice; if (coins >= seedCost) { coins -= seedCost; cell.state = 1; cell.timer = Date.now(); cell.cropType = currentSelectedTool; } } 
        else if (cell.state === 2) { inventory[cell.cropType] += 1; addExp(CROP_CONFIG[cell.cropType].exp); cell.state = 0; cell.cropType = null; updateUI(); }
        saveGame();
    }
});

window.addEventListener('mousemove', (e) => { if (isDraggingCamera) { camera.x += e.clientX - lastMouseX; camera.y += e.clientY - lastMouseY; lastMouseX = e.clientX; lastMouseY = e.clientY; } });
window.addEventListener('mouseup', () => { if (isDraggingCamera) { isDraggingCamera = false; canvas.style.cursor = isSpacebarDown ? 'grab' : 'default'; } });

// ==========================================
// 游戏启动入口
// ==========================================
loadGame(); 
setInterval(updateMarket, 10000); 
setInterval(saveGame, 5000); 
gameLoop();