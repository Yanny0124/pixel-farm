import { State } from '../core/state.js';
import { Farm } from '../logic/farm.js';

export const UIManager = {
  isDragging: false,
  lastMX: 0,
  lastMY: 0,
  isSpaceDown: false,

  init() {
    const cvs = document.getElementById('gameCanvas');

    window.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        this.isSpaceDown = true;
        cvs.style.cursor = 'grab';
        e.preventDefault();
      }
      // 数字键切工具
      if (e.key === '1') State.data.selectedTool = 'wheat';
      if (e.key === '2') State.data.selectedTool = 'carrot';
      if (e.key === '3') State.data.selectedTool = 'watermelon';
    });

    window.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        this.isSpaceDown = false;
        cvs.style.cursor = 'default';
      }
    });

    cvs.addEventListener('mousedown', e => {
      const p = this.getPos(e);
      if (e.button === 1 || (e.button === 0 && this.isSpaceDown)) {
        this.isDragging = true;
        this.lastMX = p.x;
        this.lastMY = p.y;
        cvs.style.cursor = 'grabbing';
        return;
      }
      if (e.button !== 0) return;

      // 先检查 UI 点击（底部工具栏）
      if (this.checkToolbar(p.x, p.y)) return;

      // 否则传递到世界
      const worldX = p.x - State.data.camera.x;
      const worldY = p.y - State.data.camera.y;
      Farm.onClick(worldX, worldY);
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const p = this.getPos(e);
      State.data.camera.x += p.x - this.lastMX;
      State.data.camera.y += p.y - this.lastMY;
      this.lastMX = p.x;
      this.lastMY = p.y;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      cvs.style.cursor = this.isSpaceDown ? 'grab' : 'default';
    });

    cvs.addEventListener('contextmenu', e => e.preventDefault());
  },

  getPos(e) {
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (900 / rect.width),
      y: (e.clientY - rect.top) * (600 / rect.height)
    };
  },

  checkToolbar(x, y) {
    // 底部工具栏区域
    if (y < 540 || y > 590) return false;
    const tools = [
      { id: 'wheat', x: 270, w: 56 },
      { id: 'carrot', x: 340, w: 56 },
      { id: 'watermelon', x: 410, w: 56 }
    ];
    for (const t of tools) {
      if (x >= t.x && x <= t.x + t.w) {
        State.data.selectedTool = t.id;
        return true;
      }
    }
    return false;
  }
};