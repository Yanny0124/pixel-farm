// src/logic/animal.js
import { State } from '../core/state.js';

export const AnimalSystem = {
  update(dt) {
    const now = Date.now();
    State.data.animals.forEach(a => {
      // 搬你现在的 engine.js: 动物移动、边界反弹、产出判定
      a.x += a.vx; a.y += a.vy;
      // ... 全部搬过来
    });
  },
  
  spawn(type, x, y) {
    // 搬 engine.js mousedown 里的 animals.push(...)
  }
};