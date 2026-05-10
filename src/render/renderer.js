import { State } from '../core/state.js';
import { SPRITES, PALETTE } from './spriteData.js';
import { TILE_SIZE, ROWS, COLS, FARM_X, FARM_Y } from '../config/constants.js';
import { CROP_CONFIG } from '../config/crops.js';

let tick = 0;

function drawSprite(ctx, mat, x, y, scale = 2) {
  for (let r = 0; r < mat.length; r++) {
    const row = mat[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch !== ' ' && PALETTE[ch]) {
        ctx.fillStyle = PALETTE[ch];
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

export const Renderer = {
  cvs: null,
  ctx: null,

  init(id) {
    this.cvs = document.getElementById(id);
    this.ctx = this.cvs.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  },

  render() {
    tick++;
    const s = State.data;
    const ctx = this.ctx;
    const W = 900, H = 600;

    ctx.clearRect(0, 0, W, H);

    // 屏幕震动
    let sx = 0, sy = 0;
    if (s.ui.shake.active) {
      s.ui.shake.timer--;
      sx = (Math.random() - 0.5) * s.ui.shake.intensity;
      sy = (Math.random() - 0.5) * s.ui.shake.intensity;
      if (s.ui.shake.timer <= 0) s.ui.shake.active = false;
    }

    ctx.save();
    ctx.translate(s.camera.x + sx, s.camera.y + sy);

    // 1. 农场背景
    ctx.fillStyle = '#2d4a3e';
    ctx.fillRect(-s.camera.x, -s.camera.y, W, H);

    // 2. 地块
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = s.farm.grid[r][c];
        const x = FARM_X + c * TILE_SIZE;
        const y = FARM_Y + r * TILE_SIZE;

        if (!cell.unlocked) {
          drawSprite(ctx, SPRITES.soilLocked, x, y, TILE_SIZE / 8);
        } else {
          drawSprite(ctx, SPRITES.soil, x, y, TILE_SIZE / 8);
          // 作物
          if (cell.state === 1 || cell.state === 2) {
            const cfg = CROP_CONFIG[cell.crop];
            const sway = Math.sin(tick * 0.05 + c) * 1;
            let key = `${cell.crop}_s1`;
            if (cell.state === 2) {
              key = `${cell.crop}_s3`;
              // 成熟高亮
              ctx.fillStyle = `rgba(255,255,0,${0.15 + Math.sin(tick * 0.1) * 0.05})`;
              ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else {
              // 生长进度映射到阶段 1/2
              const elapsed = Date.now() - cell.plantedAt;
              const progress = elapsed / cfg.growTime;
              key = progress < 0.5 ? `${cell.crop}_s1` : `${cell.crop}_s2`;
            }
            if (SPRITES[key]) {
              drawSprite(ctx, SPRITES[key], x + 4 + sway, y + 4, TILE_SIZE / 8);
            }
          }
        }

        // 网格线
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    // 3. 粒子
    for (let i = s.ui.particles.length - 1; i >= 0; i--) {
      const p = s.ui.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.3;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      if (p.life <= 0) s.ui.particles.splice(i, 1);
    }

    ctx.restore();

    // 4. HUD（不受相机影响）
    this.drawHUD(ctx);
  },

  drawHUD(ctx) {
    const s = State.data;

    // 顶部金币条
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10, 10, 220, 36);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`G ${s.coins}`, 20, 34);
    ctx.fillStyle = '#AAA';
    ctx.font = '12px monospace';
    ctx.fillText(`Lv.${s.level}  EXP ${s.exp}/${s.level * 500}`, 100, 34);

    // 底部工具栏背景
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(250, 540, 400, 50);

    // 工具按钮
    const tools = [
      { id: 'wheat', label: 'WHT', x: 270 },
      { id: 'carrot', label: 'CRT', x: 340 },
      { id: 'watermelon', label: 'MEL', x: 410 }
    ];
    tools.forEach(t => {
      const active = s.selectedTool === t.id;
      ctx.fillStyle = active ? '#e74c3c' : '#34495e';
      ctx.fillRect(t.x, 548, 56, 34);
      ctx.fillStyle = active ? '#fff' : '#bdc3c7';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(t.label, t.x + 10, 570);
    });

    // 操作提示
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px monospace';
    ctx.fillText('[左键] 种植/收获  [空格+拖拽] 移动视角  [1/2/3] 切换工具', 260, 590);
  }
};