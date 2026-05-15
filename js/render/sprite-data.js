// ==========================================
// Render/SpriteData: 代码定义像素精灵
// ==========================================
const CROP_STAGE_PALETTES = {
    wheat: ['#6d8f35', '#9cad42', '#d9b84f', '#f2c94c'],
    carrot: ['#5f9f42', '#76b852', '#f39c3d', '#e67e22'],
    potato: ['#6d8f35', '#8aa05a', '#c9a66b', '#8d6e4b'],
    corn: ['#5f8f3f', '#7faf4f', '#d6c35a', '#f1c40f'],
    tomato: ['#6d8f35', '#4f9f47', '#ef5350', '#c0392b'],
    strawberry: ['#5f9f42', '#76b852', '#ef6f8f', '#c0392b'],
    pumpkin: ['#6d8f35', '#9cad42', '#d8a24a', '#e67e22'],
    rice: ['#7cae5b', '#a8d08d', '#d6c35a', '#efe08a']
};

Object.assign(CROP_STAGE_PALETTES, {
    sunflower: ['#6d8f35', '#8fac3f', '#d4ac0d', '#f1c40f'],
    sugarcane: ['#7cae5b', '#9ccc65', '#66bb6a', '#2e7d32'],
    cotton: ['#7cae5b', '#a5d6a7', '#d6eaf8', '#fdfefe'],
    purpleCarrot: ['#5f9f42', '#76b852', '#b56bd6', '#6c3483'],
    blackTomato: ['#4f9f47', '#6fbd6d', '#5d3a3a', '#2c1b1b'],
    goldenWheat: ['#9cad42', '#d9b84f', '#f9e79f', '#f1c40f'],
    blueCorn: ['#5f8f3f', '#7faf4f', '#85c1e9', '#2e86c1'],
    whiteStrawberry: ['#5f9f42', '#76b852', '#fdebd0', '#f8f9f9'],
    chili: ['#5f9f42', '#76b852', '#f1948a', '#c0392b'],
    lavender: ['#5f9f42', '#76b852', '#c39bd3', '#8e44ad'],
    pine: ['#5f8f3f', '#28784a', '#196f3d', '#145a32'],
    saffron: ['#6d8f35', '#b56bd6', '#8e44ad', '#f5b041'],
    lotusRoot: ['#a8d08d', '#d7b899', '#e8c9a8', '#c89f7a'],
    oak: ['#5f8f3f', '#27ae60', '#1e8449', '#196f3d'],
    rainWheat: ['#85c1e9', '#5dade2', '#aed6f1', '#3498db'],
    moonflower: ['#7cae5b', '#c5cae9', '#e8eaf6', '#f8f9f9']
});

const ANIMAL_PALETTES = {
    chicken: { body: '#fff8d8', accent: '#f39c12', dark: '#6d4c41' },
    sheep: { body: '#f4f1e8', accent: '#2f3136', dark: '#bdc3c7' },
    cow: { body: '#fbfbf2', accent: '#2f3136', dark: '#e8b6cf' },
    bee: { body: '#f1c40f', accent: '#2f3136', dark: '#d9edf7' },
    pig: { body: '#f8a5c2', accent: '#f78fb3', dark: '#ad5d7c' }
};

function drawCropSprite(ctx, cropType, stage, x, y, cellSize) {
    const palette = CROP_STAGE_PALETTES[cropType] || CROP_STAGE_PALETTES.wheat;
    const px = Math.floor(cellSize / 16);
    const ox = x + Math.floor((cellSize - px * 16) / 2);
    const oy = y + Math.floor((cellSize - px * 16) / 2);
    const now = typeof getRenderNow === 'function' ? getRenderNow() : Date.now();
    const sway = Math.sin(now / 260 + x * 0.03 + y * 0.02) > 0 ? 1 : 0;
    const color = palette[Math.min(stage, palette.length - 1)];

    if (stage <= 0) {
        rectPx(ctx, ox, oy, px, 7, 10, 2, 3, '#5f8f3f');
        rectPx(ctx, ox, oy, px, 8, 8, 1, 2, color);
        rectPx(ctx, ox, oy, px, 6, 12, 4, 1, '#6d4c41');
        return;
    }

    if (cropType === 'carrot') {
        rectPx(ctx, ox, oy, px, 7, 4 + sway, 2, 7, '#5f9f42');
        rectPx(ctx, ox, oy, px, 5, 8, 6, 2, '#76b852');
        rectPx(ctx, ox, oy, px, 6, 10, 4, 4 + stage, color);
        rectPx(ctx, ox, oy, px, 7, 11, 2, 2, '#ffd08a');
        return;
    }

    if (cropType === 'potato') {
        rectPx(ctx, ox, oy, px, 6, 5 + sway, 2, 8, '#5f8f3f');
        rectPx(ctx, ox, oy, px, 5, 9, 6, 2, '#76b852');
        rectPx(ctx, ox, oy, px, 5, 11, 4, 3, color);
        rectPx(ctx, ox, oy, px, 10, 10, 3, 3, color);
        rectPx(ctx, ox, oy, px, 6, 12, 1, 1, '#e7cf9d');
        return;
    }

    if (cropType === 'corn' || cropType === 'rice' || cropType === 'blueCorn' || cropType === 'rainWheat' || cropType === 'goldenWheat' || cropType === 'sugarcane') {
        rectPx(ctx, ox, oy, px, 7, 3, 2, 11, '#5f8f3f');
        rectPx(ctx, ox, oy, px, 5, 7 + sway, 3, 2, '#7faf4f');
        rectPx(ctx, ox, oy, px, 9, 8 - sway, 3, 2, '#7faf4f');
        rectPx(ctx, ox, oy, px, 6, 4, 4, 5 + stage, color);
        rectPx(ctx, ox, oy, px, 7, 5, 1, 6, '#fff2a8');
        return;
    }

    if (cropType === 'tomato' || cropType === 'blackTomato' || cropType === 'chili') {
        rectPx(ctx, ox, oy, px, 7, 4 + sway, 2, 9, '#4f9f47');
        rectPx(ctx, ox, oy, px, 5, 7, 6, 2, '#6fbd6d');
        rectPx(ctx, ox, oy, px, 4, 9, 4, 4, color);
        rectPx(ctx, ox, oy, px, 9, 8, 4, 4, color);
        rectPx(ctx, ox, oy, px, 5, 10, 1, 1, '#ffd1d1');
        rectPx(ctx, ox, oy, px, 10, 9, 1, 1, '#ffd1d1');
        return;
    }

    if (cropType === 'strawberry' || cropType === 'whiteStrawberry' || cropType === 'lavender' || cropType === 'moonflower' || cropType === 'saffron') {
        rectPx(ctx, ox, oy, px, 7, 4 + sway, 2, 9, '#4f9f47');
        rectPx(ctx, ox, oy, px, 5, 7, 6, 2, '#6fbd6d');
        for (let i = 0; i < 4; i++) {
            const bx = 4 + (i % 2) * 5;
            const by = 9 + Math.floor(i / 2) * 3;
            rectPx(ctx, ox, oy, px, bx, by, 3, 3, color);
        }
        return;
    }

    if (cropType === 'sunflower') {
        rectPx(ctx, ox, oy, px, 7, 5 + sway, 2, 9, '#4f9f47');
        rectPx(ctx, ox, oy, px, 5, 9, 3, 2, '#6fbd6d');
        rectPx(ctx, ox, oy, px, 9, 8, 3, 2, '#6fbd6d');
        if (stage <= 1) {
            rectPx(ctx, ox, oy, px, 6, 6, 4, 4, '#d4ac0d');
            rectPx(ctx, ox, oy, px, 7, 7, 2, 2, '#6d4c41');
        } else {
            rectPx(ctx, ox, oy, px, 5, 3, 6, 2, '#f7d64a');
            rectPx(ctx, ox, oy, px, 4, 5, 8, 2, '#f1c40f');
            rectPx(ctx, ox, oy, px, 5, 7, 6, 2, '#f7d64a');
            rectPx(ctx, ox, oy, px, 6, 4, 4, 4, '#6d4c41');
            rectPx(ctx, ox, oy, px, 7, 5, 2, 2, '#3d2b1f');
        }
        return;
    }

    if (cropType === 'pumpkin') {
        rectPx(ctx, ox, oy, px, 7, 4 + sway, 2, 7, '#4f9f47');
        rectPx(ctx, ox, oy, px, 4, 8, 8, 6, color);
        rectPx(ctx, ox, oy, px, 6, 8, 1, 6, '#f7b267');
        rectPx(ctx, ox, oy, px, 9, 8, 1, 6, '#b85c21');
        return;
    }

    if (cropType === 'cotton') {
        rectPx(ctx, ox, oy, px, 7, 5 + sway, 2, 8, '#4f9f47');
        rectPx(ctx, ox, oy, px, 5, 8, 6, 2, '#6fbd6d');
        rectPx(ctx, ox, oy, px, 4, 7, 4, 4, '#fdfefe');
        rectPx(ctx, ox, oy, px, 8, 6, 4, 4, '#f7fbff');
        rectPx(ctx, ox, oy, px, 6, 10, 5, 3, '#eaf2f8');
        return;
    }

    if (cropType === 'pine' || cropType === 'oak') {
        rectPx(ctx, ox, oy, px, 7, 4, 2, 10, '#6d4c41');
        rectPx(ctx, ox, oy, px, 4, 5, 8, 3 + stage, color);
        rectPx(ctx, ox, oy, px, 5, 2, 6, 4, color);
        rectPx(ctx, ox, oy, px, 3, 8, 10, 3, color);
        return;
    }

    rectPx(ctx, ox, oy, px, 7, 5 + sway, 2, 8, '#6d8f35');
    rectPx(ctx, ox, oy, px, 5, 8, 6, 2, '#9cad42');
    rectPx(ctx, ox, oy, px, 4, 4, 8, 4 + stage, color);
    rectPx(ctx, ox, oy, px, 5, 5, 2, 1, '#fff2a8');
    rectPx(ctx, ox, oy, px, 9, 6, 2, 1, '#fff2a8');
}

function drawAnimalSprite(ctx, animal) {
    const palette = ANIMAL_PALETTES[animal.type] || ANIMAL_PALETTES.chicken;
    const now = typeof getRenderNow === 'function' ? getRenderNow() : Date.now();
    const step = Math.sin(now / 160 + animal.x * 0.1) > 0 ? 1 : 0;
    const x = Math.round(animal.x);
    const y = Math.round(animal.y);

    if (animal.type === 'bee') {
        ctx.fillStyle = palette.dark;
        ctx.fillRect(x - 7, y - 5 - step, 4, 3);
        ctx.fillRect(x + 3, y - 5 + step, 4, 3);
        ctx.fillStyle = palette.body;
        ctx.fillRect(x - 5, y - 3, 10, 8);
        ctx.fillStyle = palette.accent;
        ctx.fillRect(x - 1, y - 3, 2, 8);
        return;
    }

    if (animal.type === 'cow') {
        const facing = animal.vx >= 0 ? 1 : -1;
        ctx.fillStyle = '#fbfbf2';
        ctx.fillRect(x - 16, y - 10, 28, 16);
        ctx.fillRect(x + facing * 8, y - 16, 12 * facing, 12);
        ctx.fillStyle = '#2f3136';
        ctx.fillRect(x - 11, y - 8, 7, 5);
        ctx.fillRect(x + 1, y - 10, 8, 6);
        ctx.fillRect(x + facing * 12, y - 13, 4 * facing, 4);
        ctx.fillStyle = '#f6c6d8';
        ctx.fillRect(x + facing * 15, y - 8, 5 * facing, 4);
        ctx.fillRect(x - 4, y + 3, 8, 4);
        ctx.fillStyle = '#d8b26e';
        ctx.fillRect(x + facing * 10, y - 18, 3 * facing, 4);
        ctx.fillRect(x + facing * 17, y - 18, 3 * facing, 4);
        ctx.fillStyle = '#2f3136';
        ctx.fillRect(x - 12, y + 5 + step, 4, 8);
        ctx.fillRect(x + 6, y + 5 - step, 4, 8);
        ctx.fillRect(x - facing * 19, y - 8, 3, 10);
        ctx.fillStyle = '#fbfbf2';
        ctx.fillRect(x + facing * 15, y - 12, 2, 2);
        return;
    }

    if (animal.type === 'chicken') {
        const right = animal.vx >= 0;
        ctx.fillStyle = 'rgba(58, 42, 30, 0.16)';
        ctx.fillRect(x - 7, y + 8, 14, 4);
        ctx.fillStyle = '#fff3c8';
        ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillRect(x - 5, y - 9, 10, 18);
        ctx.fillStyle = '#f8d98a';
        ctx.fillRect(right ? x - 3 : x, y - 2, 4, 6);
        ctx.fillStyle = '#f39c12';
        if (right) {
            ctx.fillRect(x + 6, y - 4, 4, 3);
        } else {
            ctx.fillRect(x - 10, y - 4, 4, 3);
        }
        ctx.fillStyle = '#3b3025';
        ctx.fillRect(right ? x + 3 : x - 5, y - 5, 2, 2);
        ctx.fillStyle = '#d94b38';
        ctx.fillRect(x - 1, y - 12, 3, 3);
        ctx.fillStyle = '#8c6239';
        ctx.fillRect(x - 4, y + 6 + step, 2, 5);
        ctx.fillRect(x + 3, y + 6 - step, 2, 5);
        return;
    }

    const w = animal.type === 'cow' ? 24 : animal.type === 'pig' ? 20 : animal.type === 'sheep' ? 18 : 14;
    const h = animal.type === 'cow' ? 16 : animal.type === 'pig' ? 14 : animal.type === 'sheep' ? 16 : 12;
    ctx.fillStyle = palette.body;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(animal.vx >= 0 ? x + w / 4 : x - w / 2, y - h / 4, 5, 6);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(x - w / 3, y + h / 2 - 1 + step, 3, 4);
    ctx.fillRect(x + w / 4, y + h / 2 - 1 - step, 3, 4);
}

function drawSoilTexture(ctx, x, y, size, variant, locked) {
    if (locked) {
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#95a5a6';
        ctx.strokeRect(x, y, size, size);
        return;
    }

    const base = weather.type === 'drought' ? '#b87945' : weather.type === 'rain' ? '#80644f' : '#9f7a4f';
    ctx.fillStyle = base;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = weather.type === 'rain' ? 'rgba(188, 214, 199, 0.22)' : 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 4; i++) {
        const px = x + ((variant * 17 + i * 13) % (size - 6)) + 3;
        const py = y + ((variant * 11 + i * 19) % (size - 6)) + 3;
        ctx.fillRect(px, py, 2, 2);
    }
    if (weather.type === 'drought') {
        ctx.strokeStyle = '#6d4c41';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 10);
        ctx.lineTo(x + 18, y + 22);
        ctx.lineTo(x + 13, y + 34);
        ctx.moveTo(x + 30, y + 7);
        ctx.lineTo(x + 24, y + 18);
        ctx.lineTo(x + 32, y + 27);
        ctx.stroke();
    }
}

function rectPx(ctx, ox, oy, px, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * px, oy + y * px, w * px, h * px);
}
