import { State } from './core/state.js';
import { Renderer } from './render/renderer.js';
import { UIManager } from './ui/uiManager.js';
import { Farm } from './logic/farm.js';

let lastTime = 0;
const LOGIC_STEP = 1000 / 3; // 3Hz

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;

  // 逻辑更新
  Farm.update(LOGIC_STEP);

  // 渲染
  Renderer.render();

  requestAnimationFrame(loop);
}

window.onload = () => {
  State.load();
  Renderer.init('gameCanvas');
  UIManager.init();

  // 自动存档
  setInterval(() => State.save(), 5000);

  requestAnimationFrame(loop);
};