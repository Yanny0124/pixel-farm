import { ROWS, COLS, TILE_SIZE, FARM_X, FARM_Y } from '../config/constants.js';

function initGrid() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const isCenter = (r >= 6 && r <= 9 && c >= 6 && c <= 9);
      row.push({
        unlocked: isCenter,
        state: isCenter ? 0 : -1,   // -1=未解锁, 0=空, 1=生长中, 2=成熟
        crop: null,
        plantedAt: 0,
        stage: 0
      });
    }
    grid.push(row);
  }
  return grid;
}

export const State = {
  data: null,

  init() {
    this.data = {
      version: 2,
      coins: 1000,
      level: 1,
      exp: 0,
      inventory: { wheat: 0, carrot: 0, watermelon: 0 },
      selectedTool: 'wheat',
      
      farm: {
        grid: initGrid()
      },

      camera: {
        x: -(FARM_X - 50),
        y: -(FARM_Y - 50)
      },

      ui: {
        screen: 'game',           // game | seedBag
        particles: [],
        floaters: [],
        shake: { active: false, timer: 0, intensity: 0 },
        hitRegions: []
      },

      lastSave: Date.now()
    };
  },

  save() {
    this.data.lastSave = Date.now();
    localStorage.setItem('tinyPixelFarm_v2', JSON.stringify(this.data));
  },

  load() {
    const raw = localStorage.getItem('tinyPixelFarm_v2');
    if (raw) {
      this.data = JSON.parse(raw);
      // 补齐可能缺失的新字段
      if (!this.data.ui) this.data.ui = { screen: 'game', particles: [], floaters: [], shake: { active: false, timer: 0, intensity: 0 }, hitRegions: [] };
      if (!this.data.camera) this.data.camera = { x: -(FARM_X - 50), y: -(FARM_Y - 50) };
    } else {
      this.init();
    }
  },

  addExp(amount) {
    this.data.exp += amount;
    const need = this.data.level * 500;
    if (this.data.exp >= need) {
      this.data.exp -= need;
      this.data.level++;
      this.data.coins += 500 * this.data.level;
      // TODO: 升级特效
    }
  }
};