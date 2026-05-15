# Pixel Farm Architecture

## 项目定位

Pixel Farm 是一个温暖像素风网页农场沙盒。玩家在浏览器中经营农场、种植作物、饲养动物、完成订单、解锁图鉴、访客、奇迹和结局。

当前前端运行方式是传统浏览器全局脚本架构，不使用打包器。`index.html` 按顺序加载 `js/` 下的配置、状态、逻辑、渲染、UI 和输入脚本，各文件通过全局变量和挂到 `window` 的函数协作。

核心职责分层：

- Canvas 负责世界渲染：农田、建筑、动物、员工、天气、粒子、全局浮字等由 `js/render/renderer.js` 和相关渲染资源绘制到 `gameCanvas`。
- DOM 负责 UI 面板和交互：导航、状态栏、市场、设置、手册、种子、建造、订单、自动化、弹窗等由 `js/ui/bitcn-dom-ui.js` 创建真实 DOM。
- 游戏状态保存在全局变量中：金币、等级、库存、网格、动物、建筑、订单、访客、图鉴、教程、偏好、相机等主要定义在 `js/state.js`。

## 主循环说明

### `startGame`

`startGame()` 位于 `js/main.js`，是当前游戏启动入口。它按顺序执行：

1. `initRenderer()`：从 DOM 获取 `gameCanvas`，初始化 2D context，并预加载生成资源。
2. `bindInput()`：绑定键盘、鼠标、滚轮、触摸事件。
3. `loadGame()`：从 `localStorage` 读取存档，恢复并规范化全局状态；没有存档时初始化新游戏。
4. `setInterval(updateMarket, 10000)`：定时刷新市场价格。
5. `setInterval(saveGame, 5000)`：定时保存游戏。
6. `gameLoop()`：启动基于 `requestAnimationFrame` 的主循环。

### `updateLogic`

`updateLogic()` 位于 `js/main.js`，每帧执行轻量逻辑，并把部分较重逻辑节流：

- 计算距离上一帧的 `deltaSeconds`，累加 `stats.totalPlaySeconds`。
- 定期检查剧情解锁：约每 30 秒调用 `checkStoryUnlocks(false)`。
- 定期执行慢逻辑：约每 250ms 调用天气、作物、加工、订单刷新等逻辑。
- 每帧更新动物、员工、效果。
- 每秒批量更新访客到访逻辑。
- 在非 DOM UI 模式下刷新旧技能按钮文案；当前 `bitcn-dom-ui.js` 会设置 DOM UI 模式，因此这段通常不会负责主要 UI。

### `renderFrame`

`renderFrame()` 位于 `js/render/renderer.js`，每帧绘制 Canvas 世界：

- 清空画布。
- 应用屏幕震动偏移。
- 调用 `drawFarm()` 绘制世界主体。
- 调用 `drawWeatherLayer()` 绘制天气和昼夜层。
- 调用 `drawOfflineReturnFx(ctx)` 绘制离线回归效果。
- 调用 `drawCanvasUI(ctx)`；当前 DOM UI 会将旧 Canvas UI 旁路为空实现。
- 调用 `drawGlobalEffectText()` 绘制全局提示文字。

注意：Canvas 渲染函数应只绘制世界，不应承担 DOM UI 面板渲染。

### `refreshBitcnDomUi`

`refreshBitcnDomUi(force = false)` 位于 `js/ui/bitcn-dom-ui.js`。

触发来源：

- `gameLoop()` 每帧在 `renderFrame()` 后尝试调用一次。
- `togglePanel()`、`toggleSettings()`、`queueStoryPopup()`、`showTileInfo()` 等 UI 状态变化会强制刷新。
- 部分业务 action 在完成状态修改后会调用 `window.refreshBitcnDomUi(true)`。

节流规则：

- 非强制刷新时，`refreshBitcnDomUi()` 内部会限制刷新频率，当前约 120ms 才允许执行一次 DOM `render()`。
- 强制刷新用于面板切换、弹窗、提示、重要交互完成等需要立即反馈的场景。

## 文件职责

### `js/config.js`

定义游戏常量、作物配置、建筑配置、天气配置、任务/图鉴/剧情等静态数据。其他模块大量读取这里的配置。

### `js/state.js`

定义核心全局状态和基础状态 helper：

- 全局状态：`coins`、`playerLevel`、`playerExp`、`currentSelectedTool`、`inventory`、`marketState`、`skills`、`weather`、`stats`、`collection`、`gridData`、`animals`、`workers`、`tasks`、`camera` 等。
- 存档：`saveGame()`、`loadGame()`。
- 初始化和规范化：`resetRuntimeState()`、`initGrid()`、各类 `normalize*` / `sanitize*` 函数。
- 派生读取：等级、成长倍率、图鉴进度、解锁判断等 getter。
- 部分 action：领取图鉴奖励、升级无人机、切换设置、剧情标记等。

### `js/main.js`

游戏启动和主循环：

- `startGame()` 初始化系统。
- `updateLogic()` 驱动周期性逻辑。
- `renderFrame()` 和 `refreshBitcnDomUi()` 组成每帧显示更新。

### `js/input.js`

处理玩家输入：

- 绑定键盘、鼠标、滚轮、触摸事件。
- 处理工具选择、相机拖拽、缩放、点击农田、点击访客、长按查看地块信息。
- 调用具体 action/helper 修改状态，例如放置动物、种植、收获、开垦土地、雇佣员工。

### `js/logic/*`

承载各业务系统：

- `weather.js`：天气变化和天气派生效果。
- `audio.js`：音效开关和播放。
- `animal.js`：动物产出、牧场建筑、容量等。
- `farm.js`：种植、收获、作物格子规则。
- `workers.js`：员工和无人机自动行为。
- `economy.js`：市场、加工、订单、出售、交付等经济系统。
- `miracles.js`：奇迹、结局、新周目等。
- `visitors.js`：访客解锁、委托、对话、到访提示。
- `skills.js`：主动技能和天赋升级。

这些文件可以修改游戏状态，但应通过明确的 action/helper 完成，并在必要时保存和刷新 UI。

### `js/render/*`

Canvas 世界渲染相关：

- `renderer.js`：Canvas 初始化、每帧绘制、世界元素、建筑、动物、员工、访客、天气、全局效果。
- `effects.js`：粒子、浮字、屏幕效果等。
- `sprite-data.js`：像素 sprite 数据和绘制支持。

渲染层原则上只读取状态并绘制。不要在普通 `draw*` 函数中修改游戏状态、存档或 DOM。

### `js/ui/*`

DOM 和 UI 桥接：

- `dom-ui.js`：兼容旧调用的 `updateUI()` 空入口。
- `canvas-ui.js`：共享 `uiState`、旧 Canvas UI 旁路接口、坐标转换、面板开关、教程提示、地块提示。
- `bitcn-dom-ui.js`：当前主要 DOM UI，创建导航、状态栏、面板、dock、弹窗，并定义 `refreshBitcnDomUi()`。
- `bitcn-market-chart.js`：市场价格图表绘制。
- `pixel-assets.js`、`pxlkit-icons.js`：UI 图标和像素资源。

UI 层可以读取游戏状态并展示，也可以在事件回调中调用 action/helper。但 render 函数本身不应直接承载复杂业务状态修改。

## UI 数据流

### UI 读取的全局状态

DOM UI 主要从以下全局状态读取数据：

- 玩家进度：`coins`、`playerLevel`、`playerExp`、`talentPoints`、`talents`、`stats`。
- 操作状态：`currentSelectedTool`、`skills`、`uiPreferences`、`camera`。
- 农场状态：`gridData`、`animals`、`workers`、`ranchBuildings`、`processingBuildings`、`processingJobs`、`processingAuto`、`droneUpgrades`。
- 经济状态：`inventory`、`marketState`、`tasks`、`orderState`。
- 世界状态：`weather`、`miracleState`、`miracleBonuses`、`collectionBonuses`。
- 收集和剧情：`collection`、`storyState`、`tutorialState`、`farmDiary`、`seedUnlockState`、`visitorState`、`affectionState`、`endingState`。
- UI 状态：`window.uiState`，包括当前面板、tab、弹窗、访客选择、信件选择、tile tip 等。

UI 也会读取派生 helper，例如 `getMaxExp()`、`formatCoins()`、`isItemUnlocked()`、`getGrowthMultiplier()`、`getCodexPercent()`、`getTaskRequirementLabel()`、`getVisitorProgress()` 等。

### UI 调用的状态修改 action/helper

UI 事件回调应调用明确 action/helper 来修改状态，例如：

- 面板和设置：`togglePanel()`、`closePanel()`、`toggleSettings()`。
- 工具与农场：`selectTool()`、`useSkill()`、`upgradeSkill()`、`upgradeTalent()`。
- 建筑和加工：`upgradeRanchBuilding()`、`upgradeProcessingBuilding()`、`startRecipeProcessing()`、`toggleProcessingAuto()`。
- 经济和订单：`sellItem()`、`sellItemAmount()`、`deliverTask()`、`refreshOrderBoard()`。
- 图鉴和剧情：`claimCodexReward()`、`claimCodexSetReward()`、`markStoryRead()`。
- 访客和结局：`deliverVisitorTask()`、`claimEndingReward()`、`claimPostEndingGoal()`、`startNewYearCycle()`。
- 自动化和设置：`hireWorker()`、`dismissWorker()`、`upgradeDrone()`、`toggleAutoSow()`、`toggleScreenShake()`、`toggleAudio()`。
- 存档和刷新：`saveGame()`、`window.refreshBitcnDomUi(true)`。

### 不能在 render 中直接调用的函数

DOM render 函数和 Canvas `draw*` 函数不应直接调用会修改业务状态、保存、弹窗或推进剧情的函数。尤其不要在 render 过程中直接调用：

- 存档/重置：`saveGame()`、`loadGame()`、`resetGame()`。
- 经济交易：`sellItem()`、`sellItemAmount()`、`deliverTask()`、`deliverVisitorTask()`。
- 建造/升级：`upgradeRanchBuilding()`、`upgradeProcessingBuilding()`、`upgradeSkill()`、`upgradeTalent()`、`upgradeDrone()`。
- 农场写入：`plantCell()`、`harvestCell()`、`unlockLandPatch()`、`placeAnimal()`。
- 奖励领取：`claimCodexReward()`、`claimCodexSetReward()`、`claimEndingReward()`、`claimPostEndingGoal()`。
- 剧情推进：`recordDiary()`、`checkStoryUnlocks()`、`unlockStoryLetter()`、`queueStoryPopup()`。
- UI 状态写入：直接改 `window.uiState.*` 的复杂逻辑。

这些函数只能从用户事件、主循环逻辑、初始化/存档流程或专门 action/helper 中调用。render 函数可以把它们作为按钮回调传入，但不应在渲染当下执行它们。

## 重构守则

1. UI render 函数只负责渲染。

   render 函数可以读取状态、计算显示文案、创建或更新 DOM、绑定事件回调。render 函数不直接推进游戏逻辑，不直接发奖励，不直接保存，不直接改复杂业务状态。

2. 游戏状态修改必须走 action/helper 函数。

   所有会改变 `coins`、`inventory`、`gridData`、`animals`、`workers`、`tasks`、`collection`、`storyState`、`visitorState` 等状态的行为，都必须收敛到命名明确的 action/helper。UI 事件只负责调用 action/helper。

3. 不允许在 render 函数里直接写复杂业务逻辑。

   例如订单交付、加工完成、访客委托推进、奇迹材料扣除、图鉴奖励领取、剧情解锁、存档迁移等逻辑，都不应写在 `render*` / `draw*` 函数中。

4. 不允许每帧全量重建大型 DOM 面板。

   `refreshBitcnDomUi()` 可以被主循环频繁触发，因此大型面板必须使用稳定 key、局部更新、滚动冻结或节点复用。市场、手册、订单、建造、弹窗等大型 DOM 不应因为金币、倒计时、库存小变化而整块销毁重建。

5. 不允许同时修改 UI、state、save/load、renderer。

   重构必须分阶段、小步提交。一次改动只碰一个职责层：

   - 只改 UI 结构或渲染。
   - 只改状态 helper/action。
   - 只改存档读取/迁移。
   - 只改 Canvas 渲染。

   如果一个需求确实跨层，先补 action/helper，再让 UI 调用它，最后再调整渲染表现。不要在同一次改动里同时重排 DOM、改存档字段、改全局状态结构和改 Canvas 绘制。

6. Canvas 和 DOM 边界保持清晰。

   Canvas 只画世界和世界效果。DOM 只做 UI 面板和交互控件。不要把 DOM 面板逻辑塞回 Canvas，也不要让 DOM render 修改世界布局配置。

7. 兼容旧入口时必须明确意图。

   `updateUI()`、`drawCanvasUI()`、`handleCanvasUIClick()` 等旧接口目前仍被保留给旧逻辑调用。修改这些入口时必须先确认调用链，避免破坏主循环、输入拦截或 DOM UI 旁路行为。
