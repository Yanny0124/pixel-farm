# Tiny Pixel Farm 脚本分块说明

当前项目保持“静态 HTML 直接运行”的方式，不需要构建工具。脚本通过 `index.html` 按顺序加载，因此新增文件时要注意依赖顺序。

## 文件职责

- `config.js`：地图尺寸、作物/动物/天气/天赋等策划数值。
- `state.js`：全局状态、存档读写、离线收益、经验等级等基础状态逻辑。
- `logic/weather.js`：天气切换、祈雨天气、昼夜判断。
- `logic/farm.js`：作物生长、种植、收割、邻接共振。
- `logic/animal.js`：动物移动、动物产出、蜜蜂加速。
- `logic/workers.js`：劳工和无人机自动化。
- `logic/economy.js`：市场价格、出售、订单任务。
- `logic/skills.js`：主动技能和天赋树加点。
- `render/effects.js`：收割粒子、浮动文字、屏幕震动。
- `render/renderer.js`：Canvas 主渲染，按背景、田地、作物、动物、UI、天气遮罩分层绘制。
- `ui/dom-ui.js`：兼容层，保留 `updateUI()` 空入口供旧逻辑调用。
- `ui/canvas-ui.js`：Canvas 内五入口快捷栏、弹窗、标签、滚动列表和按钮交互。
- `input.js`：鼠标点击、工具选择、放置动物、相机拖拽。
- `main.js`：初始化、主循环、定时保存、市场刷新。

## 后续扩展位置

- 图鉴/手札：建议新增 `logic/journal.js` 与 `ui/journal-ui.js`。
- 访客剧情：建议新增 `logic/visitors.js`。
- 奇迹建设：建议新增 `logic/miracle.js` 与对应 UI。
- 加工建筑：建议新增 `logic/processing.js`。
- 像素精灵矩阵：建议新增 `render/sprite-data.js`。
