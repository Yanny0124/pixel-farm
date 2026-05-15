// ==========================================
// Render/Effects: 粒子、浮字、震屏
// ==========================================
const MAX_PARTICLES = 180;
const MAX_FLOATING_TEXTS = 40;
const MAX_RESONANCE_BURSTS = 6;
const MAX_RESONANCE_BURST_CELLS = 40;

function trimEffectList(list, max) {
    if (!Array.isArray(list) || list.length <= max) return list;
    list.splice(0, list.length - max);
    return list;
}

function addFloatingText(text) {
    floatingTexts.push(text);
    trimEffectList(floatingTexts, MAX_FLOATING_TEXTS);
}

function spawnHarvestEffects(row, col, config, options = {}) {
    if (options.quiet) return;
    const x = farmStartX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = farmStartY + row * TILE_SIZE + TILE_SIZE / 2;
    const defaultCount = options.bulk ? 2 : 10;
    const particleCount = Math.max(0, Math.min(10, Number.isFinite(options.particleCount) ? options.particleCount : defaultCount));
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 4,
            life: 45,
            color: config.matureColor
        });
    }
    trimEffectList(particles, MAX_PARTICLES);
    if (!options.bulk) addFloatingText({ x, y, text: `+${config.icon}`, life: 90, color: '#f1c40f' });
}

function configKeyByName(config) {
    return Object.keys(CROP_CONFIG).find(key => CROP_CONFIG[key] === config);
}

function triggerScreenShake(duration = 80, power = 1.5, options = {}) {
    if (options.quiet || uiPreferences?.screenShake === false) return;
    screenShake.until = Date.now() + duration;
    screenShake.duration = duration;
    screenShake.power = power;
}

function spawnResonanceBurst(cluster, cropType) {
    const sourceCells = cluster.length > MAX_RESONANCE_BURST_CELLS
        ? cluster.filter((_, index) => index % Math.ceil(cluster.length / MAX_RESONANCE_BURST_CELLS) === 0).slice(0, MAX_RESONANCE_BURST_CELLS)
        : cluster;
    resonanceBursts.push({
        cropType,
        cells: sourceCells.map(cell => ({ row: cell.row, col: cell.col })),
        life: 70,
        maxLife: 70
    });
    trimEffectList(resonanceBursts, MAX_RESONANCE_BURSTS);
}

function updateEffects() {
    trimEffectList(particles, MAX_PARTICLES);
    trimEffectList(floatingTexts, MAX_FLOATING_TEXTS);
    trimEffectList(resonanceBursts, MAX_RESONANCE_BURSTS);
    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.life--;
    }
    particles = particles.filter(p => p.life > 0);

    for (const text of floatingTexts) {
        text.y -= 0.45;
        text.life--;
    }
    floatingTexts = floatingTexts.filter(text => text.life > 0);
    for (const burst of resonanceBursts) {
        burst.life--;
    }
    resonanceBursts = resonanceBursts.filter(burst => burst.life > 0);
    if (offlineReturnFx) {
        offlineReturnFx.life--;
        if (offlineReturnFx.life <= 0) offlineReturnFx = null;
    }
    if (effectAlpha > 0) effectAlpha -= 0.015;
}

function drawEffects(ctx) {
    drawResonanceBursts(ctx);
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 45);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    for (const text of floatingTexts) {
        ctx.globalAlpha = Math.max(0, text.life / 90);
        ctx.fillStyle = text.color;
        ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
}

function drawResonanceBursts(ctx) {
    for (const burst of resonanceBursts) {
        const alpha = Math.max(0, burst.life / burst.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (const cell of burst.cells) {
            const cx = farmStartX + cell.col * TILE_SIZE + TILE_SIZE / 2;
            const cy = farmStartY + cell.row * TILE_SIZE + TILE_SIZE / 2;
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx + 10, cy);
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(cx, cy + 10);
        }
        ctx.stroke();
        ctx.restore();
    }
}

function drawOfflineReturnFx(ctx) {
    if (!offlineReturnFx) return;
    const progress = 1 - offlineReturnFx.life / offlineReturnFx.maxLife;
    const alpha = Math.min(1, offlineReturnFx.life / 40);
    const scytheX = -140 + (canvas.width + 280) * progress;
    const scytheY = canvas.height * 0.46 + Math.sin(progress * Math.PI) * -80;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(241, 196, 15, 0.18)';
    for (let i = 0; i < 36; i++) {
        const x = (i * 97 + progress * 900) % canvas.width;
        const y = 120 + ((i * 53 + progress * 500) % (canvas.height - 250));
        ctx.fillRect(x, y, 5, 5);
    }

    ctx.translate(scytheX, scytheY);
    ctx.rotate(-0.35);
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-40, 35);
    ctx.lineTo(52, -34);
    ctx.stroke();
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(48, -32, 54, -0.2, 1.8);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(44, 62, 80, 0.72)';
    ctx.fillRect(canvas.width / 2 - 250, 76, 500, 54);
    ctx.fillStyle = '#fff7d6';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`离线 ${offlineReturnFx.minutes} 分钟：${offlineReturnFx.cropReady} 块作物成熟，动物产出 ${offlineReturnFx.animalItems} 件`, canvas.width / 2, 111);
    ctx.restore();
}
