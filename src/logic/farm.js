import { State } from '../core/state.js';
import { CROP_CONFIG } from '../config/crops.js';
import { TILE_SIZE, ROWS, COLS, FARM_X, FARM_Y, UNLOCK_PRICE } from '../config/constants.js';

export const Farm = {
  // 点击世界坐标
  onClick(worldX, worldY) {
    const s = State.data;
    
    // 判断是否点在农场区域
    if (worldX < FARM_X || worldX > FARM_X + COLS * TILE_SIZE ||
        worldY < FARM_Y || worldY > FARM_Y + ROWS * TILE_SIZE) {
      return false;
    }

    const col = Math.floor((worldX - FARM_X) / TILE_SIZE);
    const row = Math.floor((worldY - FARM_Y) / TILE_SIZE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;

    const cell = s.farm.grid[row][col];
    const tool = s.selectedTool;
    const now = Date.now();

    // 解锁
    if (cell.state === -1) {
      if (s.coins >= UNLOCK_PRICE) {
        s.coins -= UNLOCK_PRICE;
        cell.unlocked = true;
        cell.state = 0;
        this.spawnParticles(worldX, worldY, '#8e44ad', 6);
      }
      return true;
    }

    // 收割
    if (cell.state === 2) {
      const cfg = CROP_CONFIG[cell.crop];
      s.inventory[cell.crop] = (s.inventory[cell.crop] || 0) + 1;
      State.addExp(cfg.exp);
      this.spawnParticles(worldX, worldY, cfg.matureColor, 10);
      this.floater(worldX, worldY, `+${cfg.basePrice}G`, '#FFD700');
      cell.state = 0;
      cell.crop = null;
      return true;
    }

    // 种植
    if (cell.state === 0) {
      const cfg = CROP_CONFIG[tool];
      if (!cfg) return false;
      if (s.level < cfg.reqLevel) return false;
      if (s.coins < cfg.seedPrice) return false;

      s.coins -= cfg.seedPrice;
      cell.state = 1;
      cell.crop = tool;
      cell.plantedAt = now;
      this.spawnParticles(worldX, worldY, cfg.seedColor, 4);
      return true;
    }

    return false;
  },

  update(dt) {
    const now = Date.now();
    const grid = State.data.farm.grid;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell.state === 1) {
          const cfg = CROP_CONFIG[cell.crop];
          if (now - cell.plantedAt >= cfg.growTime) {
            cell.state = 2;
          }
        }
      }
    }
  },

  spawnParticles(x, y, color, count) {
    const p = State.data.ui.particles;
    for (let i = 0; i < count; i++) {
      p.push({
        x: x + TILE_SIZE / 2,
        y: y + TILE_SIZE / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 1) * 4,
        life: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 2
      });
    }
  },

  floater(x, y, text, color) {
    // 简化版：直接画在粒子层旁边，实际可扩展
  }
};