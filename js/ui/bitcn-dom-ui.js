// 8bitcn/ui-derived DOM shell.
// Source reference: assets/vendor/8bitcn/components/ui/8bit/button.tsx (MIT).
// From this file onward, interactive UI controls should be DOM/resource-based, not hand-drawn on Canvas.
(function initBitcnDomUi() {
    const root = document.getElementById('game-container');
    if (!root) return;
    window.__bitcnDomMode = true;

    const nav = document.createElement('div');
    nav.id = 'bitcn-nav';
    nav.className = 'retro pixelated bitcn-nav';
    root.appendChild(nav);

    const statusBar = document.createElement('header');
    statusBar.id = 'bitcn-status';
    statusBar.className = 'retro pixelated bitcn-status';
    root.appendChild(statusBar);

    const marketPanel = document.createElement('section');
    marketPanel.id = 'bitcn-market-panel';
    marketPanel.className = 'retro pixelated bitcn-panel bitcn-market-panel';
    marketPanel.setAttribute('aria-label', '市场');
    root.appendChild(marketPanel);

    const settingsPanel = document.createElement('section');
    settingsPanel.id = 'bitcn-settings-panel';
    settingsPanel.className = 'retro pixelated bitcn-panel bitcn-settings-panel';
    settingsPanel.setAttribute('aria-label', '设置');
    root.appendChild(settingsPanel);

    const appPanel = document.createElement('section');
    appPanel.id = 'bitcn-app-panel';
    appPanel.className = 'retro pixelated bitcn-panel bitcn-app-panel';
    appPanel.setAttribute('aria-label', '功能窗口');
    root.appendChild(appPanel);

    const sideDock = document.createElement('aside');
    sideDock.id = 'bitcn-side-dock';
    sideDock.className = 'retro pixelated bitcn-side-dock';
    root.appendChild(sideDock);

    const orderDock = document.createElement('aside');
    orderDock.id = 'bitcn-order-dock';
    orderDock.className = 'retro pixelated bitcn-order-dock';
    root.appendChild(orderDock);

    const controlLayer = document.createElement('div');
    controlLayer.id = 'bitcn-control-layer';
    controlLayer.className = 'retro pixelated bitcn-control-layer';
    root.appendChild(controlLayer);

    const storyModal = document.createElement('section');
    storyModal.id = 'bitcn-story-modal';
    storyModal.className = 'retro pixelated bitcn-story-modal';
    storyModal.setAttribute('aria-label', '新信件');
    root.appendChild(storyModal);

    const tileTip = document.createElement('aside');
    tileTip.id = 'bitcn-tile-tip';
    tileTip.className = 'retro pixelated bitcn-tile-tip';
    tileTip.setAttribute('aria-live', 'polite');
    root.appendChild(tileTip);

    const tutorialPanel = document.createElement('aside');
    tutorialPanel.id = 'bitcn-tutorial-panel';
    tutorialPanel.className = 'retro pixelated bitcn-tutorial-panel';
    root.appendChild(tutorialPanel);

    const supportModal = document.createElement('section');
    supportModal.id = 'bitcn-support-modal';
    supportModal.className = 'retro pixelated bitcn-support-modal';
    supportModal.setAttribute('aria-label', '支持');
    root.appendChild(supportModal);

    const npcArrivalModal = document.createElement('section');
    npcArrivalModal.id = 'bitcn-npc-arrival-modal';
    npcArrivalModal.className = 'retro pixelated bitcn-npc-arrival-modal';
    npcArrivalModal.setAttribute('aria-label', '访客到访');
    root.appendChild(npcArrivalModal);

    function installCanvasUiBypass() {
        window.__bitcnDomMode = true;
        // Canvas now draws only the farm/world. Old Canvas UI must not draw or
        // register controls. Assign both the window property and the global
        // identifier because renderFrame/input call drawCanvasUI()/handleCanvasUIWheel()
        // directly, not as window.drawCanvasUI(). JavaScript, naturally, made this
        // distinction just annoying enough to matter.
        const noopDrawCanvasUI = function drawCanvasUI() {
            if (window.uiState) window.uiState.buttons = [];
            window.__bitcnControls = [];
        };
        try { drawCanvasUI = window.drawCanvasUI = noopDrawCanvasUI; } catch (error) { window.drawCanvasUI = noopDrawCanvasUI; }

        const domClickGuard = function handleCanvasUIClick() {
            return !!(window.uiState?.activePanel || window.uiState?.settingsOpen || window.uiState?.activeStoryPopup || window.uiState?.npcArrivalPopup);
        };
        try { handleCanvasUIClick = window.handleCanvasUIClick = domClickGuard; } catch (error) { window.handleCanvasUIClick = domClickGuard; }

        const domWheelBypass = function handleCanvasUIWheel() {
            return false;
        };
        try { handleCanvasUIWheel = window.handleCanvasUIWheel = domWheelBypass; } catch (error) { window.handleCanvasUIWheel = domWheelBypass; }

        const domKeyBypass = function handleCanvasUIKeyDown() {
            return false;
        };
        try { handleCanvasUIKeyDown = window.handleCanvasUIKeyDown = domKeyBypass; } catch (error) { window.handleCanvasUIKeyDown = domKeyBypass; }

        if (typeof window.installCanvasUiHardBypass === 'function') window.installCanvasUiHardBypass();
        window.__bitcnDomPanelGuard = true;
    }
    installCanvasUiBypass();
    setTimeout(installCanvasUiBypass, 0);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(installCanvasUiBypass);

    const marketAmounts = {};
    let activeMarketItem = '';
    let marketScrollTop = 0;
    let marketScrollFreezeUntil = 0;
    let navRenderKey = '';
    let statusRenderKey = '';
    let orderRenderKey = '';
    let marketRenderKey = '';
    let settingsRenderKey = '';
    let appRenderKey = '';
    let appScrollTop = 0;
    let appScrollPanelKey = '';
    let appScrollFreezeUntil = 0;
    let sideDockRenderKey = '';
    let storyRenderKey = '';
    let storyBodyScrollTop = 0;
    let nextStoryAllowedAt = 0;
    let lastDomRefreshAt = 0;
    let tileTipRenderKey = '';
    let tutorialRenderKey = '';
    let supportOpen = false;
    let supportRenderKey = '';
    let npcArrivalRenderKey = '';
    const supportGithubUrl = 'https://github.com/Yanny0124/pixel-farm';

    const items = [
        { id: 'journal', label: '手札', icon: 'book' },
        { id: 'seeds', label: '种子', icon: 'package' },
        { id: 'build', label: '建造', icon: 'hammer' },
        { id: 'market', label: '市场', icon: 'market' }
    ];

    function makeBorderPieces() {
        return [
            'top-left-line', 'top-right-line', 'bottom-left-line', 'bottom-right-line',
            'corner-tl', 'corner-tr', 'corner-bl', 'corner-br',
            'side-left', 'side-right',
            'shade-top', 'shade-top-stub', 'shade-bottom', 'shade-bottom-stub'
        ].map(name => {
            const span = document.createElement('span');
            span.className = `bitcn-piece bitcn-${name}`;
            span.setAttribute('aria-hidden', 'true');
            return span;
        });
    }

    if (!items.some(item => item.id === 'automation')) {
        items.splice(3, 0, { id: 'automation', label: '自动化', icon: 'clock' });
    }

    function drawIconToCanvas(name, scale = 2) {
        const icon = window.PIXEL_ICONS?.[name];
        const canvas = document.createElement('canvas');
        canvas.width = 16 * scale;
        canvas.height = 16 * scale;
        canvas.className = 'bitcn-nav-icon';
        if (!icon) return canvas;
        const ctx = canvas.getContext('2d');
        icon.grid.forEach((row, rowIndex) => {
            [...row].forEach((cell, colIndex) => {
                if (cell === '.') return;
                ctx.fillStyle = icon.palette[cell] || '#000';
                ctx.fillRect(colIndex * scale, rowIndex * scale, scale, scale);
            });
        });
        return canvas;
    }

    function createBitcnButton(label, className, onClick, disabled = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `bitcn-button ${className || ''}`.trim();
        button.disabled = !!disabled;
        const text = document.createElement('span');
        text.className = 'bitcn-button-label';
        text.textContent = label;
        button.appendChild(text);
        makeBorderPieces().forEach(piece => button.appendChild(piece));
        button.addEventListener('pointerdown', event => event.stopPropagation());
        button.addEventListener('click', event => {
            event.stopPropagation();
            if (onClick) onClick(event);
        });
        return button;
    }

    function setButtonLabel(button, label) {
        const text = button.querySelector('.bitcn-button-label');
        if (text && text.textContent !== label) text.textContent = label;
    }

    function clampAmount(id, value) {
        const inv = typeof inventory !== 'undefined' ? inventory : {};
        const max = Math.max(1, inv[id] || 0);
        const next = parseInt(value, 10);
        return Math.max(1, Math.min(max, Number.isFinite(next) ? next : 1));
    }

    function getMarketRows() {
        if (typeof getMarketItemIds === 'function' && typeof isMarketItemUnlocked === 'function') {
            return getMarketItemIds().filter(isMarketItemUnlocked);
        }
        const inv = typeof inventory !== 'undefined' ? inventory : {};
        const cropConfig = typeof CROP_CONFIG !== 'undefined' ? CROP_CONFIG : {};
        return Object.keys(inv).filter(id => (inv[id] || 0) > 0 && cropConfig[id]);
    }

    function getUnitPrice(id) {
        const cropConfig = typeof CROP_CONFIG !== 'undefined' ? CROP_CONFIG : {};
        const markets = typeof marketState !== 'undefined' ? marketState : {};
        const config = cropConfig[id];
        if (!config) return 0;
        const base = markets[id]?.price || config.basePrice || 0;
        const multiplier = typeof getCategoryPriceMultiplier === 'function' ? getCategoryPriceMultiplier(id) : 1;
        return Math.max(1, Math.floor(base * multiplier));
    }

    function renderNav() {
        const externalRenderNav = window.BitcnPanels?.nav;
        if (typeof externalRenderNav === 'function') {
            externalRenderNav({
                nav,
                items,
                getNavRenderKey: () => navRenderKey,
                setNavRenderKey: key => { navRenderKey = key; },
                createBitcnButton,
                drawIconToCanvas,
                render
            });
            return;
        }
        renderNavFallback();
    }

    function renderNavFallback() {
        const modalOpen = !!(window.uiState?.settingsOpen || window.uiState?.activeStoryPopup || window.uiState?.npcArrivalPopup);
        nav.classList.toggle('is-hidden', modalOpen);
        if (modalOpen) {
            navRenderKey = 'hidden';
            return;
        }
        const key = items.map(item => `${item.id}:${window.uiState?.activePanel === item.id ? 1 : 0}`).join('|');
        if (key === navRenderKey) return;
        navRenderKey = key;
        nav.innerHTML = '';
        items.forEach(item => {
            const button = createBitcnButton(item.label, window.uiState?.activePanel === item.id ? 'is-active' : '', () => {
                if (typeof window.togglePanel === 'function') window.togglePanel(item.id);
                render();
            });
            button.dataset.panel = item.id;
            button.prepend(drawIconToCanvas(item.icon, 2));
            nav.appendChild(button);
        });
    }

    function renderStatusBar(force = false) {
        const externalRenderStatus = window.BitcnPanels?.status;
        if (typeof externalRenderStatus === 'function') {
            externalRenderStatus({
                force,
                statusBar,
                getStatusRenderKey: () => statusRenderKey,
                setStatusRenderKey: key => { statusRenderKey = key; },
                createBitcnButton,
                drawIconToCanvas,
                render,
                openSupport: () => { supportOpen = true; }
            });
            return;
        }
        renderStatusBarFallback(force);
    }

    function renderStatusBarFallback(force = false) {
        const key = [
            coins,
            playerLevel,
            playerExp,
            typeof getMaxExp === 'function' ? getMaxExp() : '',
            typeof getClockLabel === 'function' ? getClockLabel() : '',
            weather?.type || '',
            Math.round((typeof getGrowthMultiplier === 'function' ? getGrowthMultiplier() : 1) * 100),
            currentSelectedTool,
            Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100),
            window.uiState?.settingsOpen ? 1 : 0
        ].join('|');
        if (!force && key === statusRenderKey) return;
        statusRenderKey = key;
        statusBar.innerHTML = '';
        const stats = [
            ['coin', `金币 ${coins}`],
            ['book', `Lv.${playerLevel}`],
            ['market', `EXP ${playerExp}/${typeof getMaxExp === 'function' ? getMaxExp() : 0}`],
            ['clock', typeof getClockLabel === 'function' ? getClockLabel() : '--:--'],
            ['seed', `${WEATHER_CONFIG?.[weather?.type]?.icon || ''} ${WEATHER_CONFIG?.[weather?.type]?.name || ''}`],
            ['seed', `生长 ${Math.round((typeof getGrowthMultiplier === 'function' ? getGrowthMultiplier() : 1) * 100)}%`],
            ['hammer', `工具 ${typeof getToolLabel === 'function' ? getToolLabel(currentSelectedTool) : currentSelectedTool}`],
            ['market', `视野 ${Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100)}%`]
        ];
        stats[0][1] = `金币 ${typeof formatCoins === 'function' ? formatCoins(coins) : coins}`;
        stats.forEach(([icon, label]) => {
            const item = document.createElement('span');
            item.className = 'bitcn-status-chip';
            item.append(drawIconToCanvas(icon, 1), document.createTextNode(label));
            statusBar.appendChild(item);
        });
        const settings = createBitcnButton('设置', 'bitcn-status-button', () => {
            if (window.uiState) {
                window.uiState.activePanel = null;
                window.uiState.activeStoryPopup = null;
            }
            if (typeof toggleSettings === 'function') toggleSettings();
            render();
        });
        const support = createBitcnButton('支持', 'bitcn-status-button bitcn-support-button', () => {
            supportOpen = true;
            if (window.uiState) {
                window.uiState.activePanel = null;
                window.uiState.settingsOpen = false;
                window.uiState.activeStoryPopup = null;
            }
            render(true);
        });
        statusBar.append(settings, support);
    }

    function getMarketRenderKey(rows) {
        // 市场列表滚动时不要因为价格、库存的后台变化重建整块 DOM。
        // 这些数值在出售、加减数量、强制刷新时仍会更新；滚动期间先保证窗口不抽风。
        const amountKey = rows.map(id => `${id}:${marketAmounts[id] || 1}`).join('|');
        return [window.uiState?.activePanel || '', rows.join(','), activeMarketItem, amountKey].join('|');
    }

    function renderMarketPanel(force = false) {
        const externalRenderMarket = window.BitcnPanels?.market;
        if (typeof externalRenderMarket === 'function') {
            externalRenderMarket({
                force,
                marketPanel,
                marketAmounts,
                getActiveMarketItem: () => activeMarketItem,
                setActiveMarketItem: value => { activeMarketItem = value; },
                getMarketScrollTop: () => marketScrollTop,
                setMarketScrollTop: value => { marketScrollTop = value; },
                setMarketScrollFreezeUntil: value => { marketScrollFreezeUntil = value; },
                getMarketRenderKeyValue: () => marketRenderKey,
                setMarketRenderKey: key => { marketRenderKey = key; },
                createBitcnButton,
                makeBorderPieces,
                getMarketRows,
                getUnitPrice,
                clampAmount,
                render,
                renderMarketPanel
            });
            return;
        }
        renderMarketPanelFallback(force);
    }

    function renderMarketPanelFallback(force = false) {
        const modalOpen = !!(window.uiState?.settingsOpen || window.uiState?.activeStoryPopup || window.uiState?.npcArrivalPopup);
        const open = window.uiState?.activePanel === 'market' && !modalOpen;
        marketPanel.classList.toggle('is-open', !!open);
        if (!open) {
            marketPanel.innerHTML = '';
            marketRenderKey = '';
            return;
        }
        const rows = getMarketRows();
        if (rows.length && !rows.includes(activeMarketItem)) activeMarketItem = rows[0];
        rows.forEach(id => {
            if (!marketAmounts[id]) marketAmounts[id] = 1;
            marketAmounts[id] = clampAmount(id, marketAmounts[id]);
        });
        const key = getMarketRenderKey(rows) + `|force:${force ? 1 : 0}`;
        if (!force && key === marketRenderKey) return;
        marketRenderKey = key;
        marketPanel.innerHTML = '';
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = '市场';
        const hint = document.createElement('span');
        hint.textContent = '输入数量后出售';
        const close = createBitcnButton('×', 'bitcn-close-button', () => {
            if (typeof window.togglePanel === 'function') window.togglePanel('market');
            render();
        });
        header.append(title, hint, close);
        const detail = document.createElement('section');
        detail.className = 'bitcn-market-detail';
        const detailInfo = document.createElement('div');
        detailInfo.className = 'bitcn-market-detail-info';
        const chart = document.createElement('canvas');
        chart.className = 'bitcn-market-chart';
        chart.width = 520;
        chart.height = 180;
        if (activeMarketItem && CROP_CONFIG?.[activeMarketItem]) {
            const config = CROP_CONFIG[activeMarketItem];
            const state = marketState?.[activeMarketItem] || {};
            const history = window.BitcnMarketChart?.normalizeHistory
                ? window.BitcnMarketChart.normalizeHistory(state, config.basePrice || getUnitPrice(activeMarketItem))
                : (state.history || [getUnitPrice(activeMarketItem)]);
            const currentPrice = getUnitPrice(activeMarketItem);
            const minPrice = Math.min(...history);
            const maxPrice = Math.max(...history);
            const trend = state.trend > 0.2 ? '上涨' : state.trend < -0.2 ? '下跌' : '稳定';
            const titleLine = document.createElement('strong');
            titleLine.textContent = `${config.icon || ''} ${config.name} 价格走势`;
            const priceLine = document.createElement('span');
            priceLine.textContent = `当前 ${typeof formatCoins === 'function' ? formatCoins(currentPrice) : currentPrice + '币'} / 库存 ${inventory?.[activeMarketItem] || 0}`;
            const rangeLine = document.createElement('span');
            rangeLine.textContent = `区间 ${minPrice}-${maxPrice} / 基准 ${config.basePrice || 0} / 趋势 ${trend}`;
            detailInfo.append(titleLine, priceLine, rangeLine);
            requestAnimationFrame(() => {
                if (window.BitcnMarketChart?.draw) window.BitcnMarketChart.draw(chart, history);
            });
        } else {
            const titleLine = document.createElement('strong');
            titleLine.textContent = '市场详情';
            const priceLine = document.createElement('span');
            priceLine.textContent = '收获或加工后，这里会显示价格折线图。';
            detailInfo.append(titleLine, priceLine);
        }
        detail.append(detailInfo, chart);
        const list = document.createElement('div');
        list.className = 'bitcn-market-list';
        list.addEventListener('scroll', () => {
            marketScrollTop = list.scrollTop;
            marketScrollFreezeUntil = Date.now() + 900;
        }, { passive: true });
        if (!rows.length) {
            const empty = document.createElement('p');
            empty.className = 'bitcn-empty';
            empty.textContent = '先收获或加工物品，市场会逐步出现可交易内容。';
            list.appendChild(empty);
        }
        rows.forEach(id => {
            const config = CROP_CONFIG?.[id];
            if (!config) return;
            const stock = inventory?.[id] || 0;
            const trendValue = marketState?.[id]?.trend || 0;
            const trend = trendValue > 0.2 ? '涨' : trendValue < -0.2 ? '跌' : '稳';
            const card = document.createElement('article');
            card.className = `bitcn-market-card ${stock > 0 ? '' : 'is-disabled'} ${activeMarketItem === id ? 'is-active' : ''}`;
            card.addEventListener('click', () => {
                activeMarketItem = id;
                renderMarketPanel(true);
            });
            const meta = document.createElement('div');
            meta.className = 'bitcn-market-meta';
            const name = document.createElement('strong');
            name.textContent = `${config.icon || ''} ${config.name}`;
            const sub = document.createElement('span');
            const unitPriceText = typeof formatCoins === 'function' ? formatCoins(getUnitPrice(id)) : `${getUnitPrice(id)}币`;
            sub.textContent = `库存 ${stock} / 单价 ${unitPriceText} / ${trend}`;
            meta.append(name, sub);
            const controls = document.createElement('div');
            controls.className = 'bitcn-market-controls';
            controls.addEventListener('click', event => event.stopPropagation());
            const minus = createBitcnButton('-', 'bitcn-action-button', () => { marketAmounts[id] = clampAmount(id, marketAmounts[id] - 1); renderMarketPanel(true); }, stock <= 0);
            const input = document.createElement('input');
            input.className = 'bitcn-market-input';
            input.type = 'number';
            input.min = '1';
            input.max = String(Math.max(1, stock));
            input.value = String(marketAmounts[id]);
            input.disabled = stock <= 0;
            input.addEventListener('input', () => { marketAmounts[id] = clampAmount(id, input.value); });
            const plus = createBitcnButton('+', 'bitcn-action-button', () => { marketAmounts[id] = clampAmount(id, marketAmounts[id] + 1); renderMarketPanel(true); }, stock <= 0);
            const max = createBitcnButton('全部', 'bitcn-action-button bitcn-wide-button', () => { marketAmounts[id] = Math.max(1, stock); renderMarketPanel(true); }, stock <= 0);
            const sell = createBitcnButton('卖出', 'bitcn-action-button bitcn-sell-button', () => {
                marketAmounts[id] = clampAmount(id, marketAmounts[id]);
                if (typeof sellItemAmount === 'function') sellItemAmount(id, marketAmounts[id]);
                renderMarketPanel(true);
            }, stock <= 0);
            controls.append(minus, input, plus, max, sell);
            card.append(meta, controls);
            list.appendChild(card);
        });
        marketPanel.append(header, detail, list);
        list.scrollTop = marketScrollTop;
        makeBorderPieces().forEach(piece => marketPanel.appendChild(piece.cloneNode()));
    }

    function renderSettingsPanel(force = false) {
        const externalRenderSettings = window.BitcnPanels?.settings || window.renderSettingsPanel;
        if (typeof externalRenderSettings === 'function') {
            externalRenderSettings({
                force,
                settingsPanel,
                getSettingsRenderKey: () => settingsRenderKey,
                setSettingsRenderKey: key => { settingsRenderKey = key; },
                createBitcnButton,
                makeBorderPieces,
                render,
                renderSettingsPanel
            });
            return;
        }
        renderSettingsPanelFallback(force);
    }

    function renderSettingsPanelFallback(force = false) {
        const open = !!window.uiState?.settingsOpen;
        settingsPanel.classList.toggle('is-open', open);
        if (!open) {
            settingsPanel.innerHTML = '';
            settingsRenderKey = '';
            return;
        }
        const key = [typeof getClockLabel === 'function' ? getClockLabel() : '', Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100), typeof audioEnabled !== 'undefined' && audioEnabled ? 1 : 0, window.uiPreferences?.screenShake === false ? 0 : 1].join('|');
        if (!force && key === settingsRenderKey) return;
        settingsRenderKey = key;
        settingsPanel.innerHTML = '';
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = '设置';
        const hint = document.createElement('span');
        hint.textContent = '保存、视野、音效';
        const close = createBitcnButton('×', 'bitcn-close-button', () => { if (typeof toggleSettings === 'function') toggleSettings(false); render(); });
        header.append(title, hint, close);
        const stats = document.createElement('div');
        stats.className = 'bitcn-settings-stats';
        [['当前时间', typeof getClockLabel === 'function' ? getClockLabel() : '--:--'], ['当前视野', `${Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100)}%`], ['震动', window.uiPreferences?.screenShake === false ? '关闭' : '开启'], ['音效', typeof audioEnabled !== 'undefined' && audioEnabled ? '开启' : '关闭']].forEach(([label, value]) => {
            const item = document.createElement('div');
            item.className = 'bitcn-stat-chip';
            const name = document.createElement('span');
            name.textContent = label;
            const text = document.createElement('strong');
            text.textContent = value;
            item.append(name, text);
            stats.appendChild(item);
        });
        const actions = document.createElement('div');
        actions.className = 'bitcn-settings-actions';
        actions.append(
            createBitcnButton('手动保存', 'bitcn-settings-button', () => { if (typeof saveGame === 'function') saveGame(); if (typeof effectText !== 'undefined') { effectText = '已保存'; effectAlpha = 1.0; } renderSettingsPanel(true); }),
            createBitcnButton('重置视野', 'bitcn-settings-button', () => { if (typeof resetCameraZoom === 'function') resetCameraZoom(); renderSettingsPanel(true); }),
            createBitcnButton(typeof audioEnabled !== 'undefined' && audioEnabled ? '音效 开' : '音效 关', 'bitcn-settings-button', () => { if (typeof toggleAudio === 'function') toggleAudio(); renderSettingsPanel(true); }),
            createBitcnButton(window.uiPreferences?.screenShake === false ? '震动 关' : '震动 开', 'bitcn-settings-button', () => { if (typeof toggleScreenShake === 'function') toggleScreenShake(); renderSettingsPanel(true); }),
            createBitcnButton('重置世界', 'bitcn-settings-button is-danger', () => { if (typeof resetGame === 'function') resetGame(); renderSettingsPanel(true); })
        );
        const note = document.createElement('p');
        note.className = 'bitcn-settings-note';
        note.textContent = '关闭震动后，收割、共振和稀有发现都不会晃动画面。';
        settingsPanel.append(header, stats, actions, note);
        makeBorderPieces().forEach(piece => settingsPanel.appendChild(piece.cloneNode()));
    }

    function getStableAppRenderKey(panelId) {
        const journalTab = window.uiState?.activeTabs?.journal || '';
        const codexTab = window.uiState?.activeTabs?.codex || '';
        const buildTab = window.uiState?.activeTabs?.build || '';
        const parts = [
            panelId,
            journalTab,
            codexTab,
            buildTab,
            window.uiState?.activeStoryLetter || '',
            window.uiState?.activeVisitor || '',
            window.uiState?.visitorDialog?.id || '',
            window.uiState?.visitorDialog?.line || '',
            window.uiState?.activeEnding || ''
        ];

        if (panelId === 'journal') {
            if (journalTab === 'codex') {
                parts.push(
                    `codex:${getCodexPercent?.() || 0}`,
                    `items:${Object.keys(collection?.items || {}).sort().join(',')}`,
                    `variants:${Object.keys(collection?.variants || {}).sort().join(',')}`,
                    `rewards:${Object.keys(collection?.claimedRewards || {}).sort().join(',')}`,
                    `sets:${Object.keys(collection?.claimedSetRewards || {}).sort().join(',')}`
                );
            } else if (journalTab === 'talents') {
                parts.push(
                    `talentPoints:${talentPoints}`,
                    `talents:${Object.entries(talents || {}).map(([id, level]) => `${id}:${level}`).join(',')}`,
                    `skills:${Object.entries(skills || {}).map(([id, skill]) => `${id}:${skill.level || 1}:${Math.floor((skill.lastUsed || 0) / 1000)}`).join(',')}`,
                    `workers:${(workers || []).map(worker => worker.type).join(',')}`,
                    `drone:${Object.entries(droneUpgrades || {}).map(([id, level]) => `${id}:${level}`).join(',')}`
                );
            } else if (journalTab === 'visitors') {
                parts.push(getVisitorUiKey(), getAmirTimerUiKey(panelId));
            } else if (journalTab === 'endings') {
                parts.push(getEndingUiKey());
            } else if (journalTab === 'miracle') {
                parts.push(Object.entries(miracleState || {}).map(([id, state]) => `${id}:${state.stage || 0}:${state.completed ? 1 : 0}`).join(','));
            } else if (journalTab === 'letters') {
                parts.push(
                    `unlocked:${Object.keys(storyState?.unlocked || {}).sort().join(',')}`,
                    `read:${Object.keys(storyState?.read || {}).sort().join(',')}`
                );
            }
        } else if (panelId === 'seeds') {
            parts.push(`level:${playerLevel}`, `tool:${currentSelectedTool}`, `seen:${JSON.stringify(seedUnlockState || {})}`);
        } else if (panelId === 'build') {
            parts.push(
                `level:${playerLevel}`,
                `ranch:${Object.values(ranchBuildings || {}).join(',')}`,
                `processing:${Object.values(processingBuildings || {}).join(',')}`,
                `jobs:${Object.entries(processingJobs || {}).map(([id, job]) => `${id}:${job.recipeId}:${job.amount}`).join(',')}`,
                `auto:${Object.entries(processingAuto || {}).map(([id, value]) => `${id}:${value ? 1 : 0}`).join(',')}`,
                `miracle:${Object.entries(miracleState || {}).map(([id, state]) => `${id}:${state.stage || 0}:${state.completed ? 1 : 0}`).join(',')}`
            );
        } else if (panelId === 'orders') {
            parts.push(`tasks:${tasks.map(task => task ? `${task.item}:${task.amount}:${task.reward}:${task.exp}:${Array.isArray(task.items) ? task.items.map(entry => `${entry.item}:${entry.amount}`).join('+') : ''}` : 'empty').join(',')}`, `refresh:${typeof getOrderRefreshLeftMs === 'function' ? Math.ceil(getOrderRefreshLeftMs() / 1000) : 0}`, getVisitorUiKey());
        } else if (panelId === 'automation') {
            parts.push(
                `coins:${coins}`,
                `autoSow:${window.uiPreferences?.autoSowEnabled === false ? 0 : 1}`,
                `tool:${currentSelectedTool}`,
                `workers:${(workers || []).map(worker => worker.type).join(',')}`,
                `drone:${Object.entries(droneUpgrades || {}).map(([id, level]) => `${id}:${level}`).join(',')}`
            );
        }

        return parts.join('|');
    }

    function renderAppPanel(force = false) {
        const panelId = window.uiState?.activePanel;
        const open = ['journal', 'seeds', 'build', 'orders', 'automation'].includes(panelId) && !window.uiState?.settingsOpen && !window.uiState?.activeStoryPopup && !window.uiState?.npcArrivalPopup;
        appPanel.classList.toggle('is-open', open);
        if (!open) {
            appPanel.innerHTML = '';
            appRenderKey = '';
            appScrollPanelKey = '';
            return;
        }
        const panelScrollKey = [
            panelId,
            window.uiState?.activeTabs?.journal || '',
            window.uiState?.activeTabs?.codex || '',
            window.uiState?.activeTabs?.build || '',
            window.uiState?.activeStoryLetter || '',
            window.uiState?.activeVisitor || '',
            window.uiState?.activeEnding || ''
        ].join('|');

        // Do not rebuild the app window just because crops/workers changed coins, EXP,
        // inventory counts, or market-adjacent numbers. That was the flicker source:
        // the main loop refreshed DOM while the user scrolled, so the whole panel was
        // destroyed and recreated like a tiny haunted spreadsheet.
        const key = getStableAppRenderKey(panelId);
        if (!force && panelScrollKey === appScrollPanelKey && Date.now() < appScrollFreezeUntil) return;
        if (!force && key === appRenderKey) return;
        const previousContent = appPanel.querySelector('.bitcn-app-content');
        if (previousContent) appScrollTop = previousContent.scrollTop;
        if (panelScrollKey !== appScrollPanelKey) {
            appScrollTop = 0;
            appScrollPanelKey = panelScrollKey;
        }
        appRenderKey = key;
        appPanel.innerHTML = '';

        const titleMap = { journal: '手札', seeds: '种子', build: '建造', orders: '订单', automation: '自动化' };
        const hintMap = { journal: '图鉴、信件、访客、结局', seeds: '作物与动物选择', build: '养殖、加工、奇迹', orders: '交付订单与访客委托', automation: '员工、无人机与自动播种' };
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = titleMap[panelId] || '';
        const hint = document.createElement('span');
        hint.textContent = hintMap[panelId] || '';
        if (panelId === 'automation') {
            title.textContent = '自动化';
            hint.textContent = '员工、无人机与自动播种';
        }
        const close = createBitcnButton('x', 'bitcn-close-button', () => {
            if (typeof window.closePanel === 'function') window.closePanel();
            render();
        });
        header.append(title, hint, close);

        const tabs = document.createElement('nav');
        tabs.className = 'bitcn-app-tabs';
        if (panelId === 'journal') {
            appendTabButtons(tabs, 'journal', [
                ['codex', '图鉴'],
                ['letters', '爷爷的信'],
                ['talents', '天赋'],
                ['miracle', '奇迹'],
                ['visitors', '访客'],
                ['endings', '结局']
            ]);
        }
        if (panelId === 'build') {
            appendTabButtons(tabs, 'build', [
                ['ranch', '养殖'],
                ['processing', '加工'],
                ['miracle', '奇迹']
            ]);
        }

        const content = document.createElement('div');
        content.className = 'bitcn-app-content';
        if (panelId === 'journal') renderJournalDom(content);
        if (panelId === 'seeds') renderSeedsDom(content);
        if (panelId === 'build') renderBuildDom(content);
        if (panelId === 'orders') renderOrdersDom(content);
        if (panelId === 'automation') renderAutomationDom(content);
        content.addEventListener('scroll', () => {
            appScrollTop = content.scrollTop;
            appScrollFreezeUntil = Date.now() + 700;
        }, { passive: true });

        appPanel.append(header);
        if (tabs.childElementCount) appPanel.append(tabs);
        appPanel.append(content);
        requestAnimationFrame(() => {
            content.scrollTop = appScrollTop;
        });
        makeBorderPieces().forEach(piece => appPanel.appendChild(piece.cloneNode()));
    }

    function getVisitorUiKey() {
        if (typeof getVisitorIds !== 'function') return '';
        return getVisitorIds().map(id => {
            const state = visitorState?.[id] || {};
            return `${id}:${state.arrived ? 1 : 0}:${state.resident ? 1 : 0}:${state.step || 0}:${state.lastTalkIndex || 0}`;
        }).join(',');
    }

    function getEndingUiKey() {
        const unlocked = Object.keys(endingState?.unlocked || {}).sort().join(',');
        const read = Object.keys(endingState?.read || {}).sort().join(',');
        return `${unlocked}|${read}|${window.uiState?.activeEnding || ''}`;
    }

    function getAmirTimerUiKey(panelId) {
        if (panelId !== 'journal' || window.uiState?.activeTabs?.journal !== 'visitors') return '';
        if (visitorState?.amir?.arrived || visitorState?.amir?.resident) return 'amir-arrived';
        return `amir-minute:${Math.floor((stats.totalPlaySeconds || 0) / 60)}`;
    }

    function appendTabButtons(container, group, tabs) {
        const active = window.uiState?.activeTabs?.[group];
        tabs.forEach(([id, label]) => {
            const button = createBitcnButton(label, `bitcn-panel-tab ${active === id ? 'is-active' : ''}`, () => {
                window.uiState.activeTabs[group] = id;
                if (group === 'codex') window.uiState.scroll.journal = 0;
                else if (window.uiState.scroll?.[group] !== undefined) window.uiState.scroll[group] = 0;
                renderAppPanel(true);
            });
            container.appendChild(button);
        });
    }

    function renderJournalDom(content) {
        const externalRenderJournal = window.BitcnPanels?.journal;
        if (typeof externalRenderJournal === 'function') {
            externalRenderJournal({ content, renderJournalDomFallback });
            return;
        }
        renderJournalDomFallback(content);
    }

    function renderJournalDomFallback(content) {
        const tab = window.uiState?.activeTabs?.journal || 'codex';
        if (tab === 'codex') return renderCodexDom(content);
        if (tab === 'letters') return renderLettersDom(content);
        if (tab === 'talents') return renderTalentsDom(content);
        if (tab === 'miracle') return renderMiracleJournalDom(content);
        if (tab === 'visitors') return renderVisitorsDom(content);
        if (tab === 'endings') return renderEndingsDom(content);
    }

    function renderCodexDom(content) {
        const total = typeof getCodexTotalCount === 'function' ? getCodexTotalCount() : 0;
        const collected = typeof getCollectedUniqueCount === 'function' ? getCollectedUniqueCount() : 0;
        const percent = Math.round((collected / Math.max(1, total)) * 100);
        const summary = document.createElement('section');
        summary.className = 'bitcn-summary-card';
        const title = document.createElement('strong');
        title.textContent = `图鉴称号：${typeof getCodexTitle === 'function' ? getCodexTitle(collected) : '农场手札'}`;
        const meta = document.createElement('span');
        meta.textContent = `收集率 ${collected}/${total} (${percent}%)`;
        const progress = document.createElement('div');
        progress.className = 'bitcn-progress';
        const bar = document.createElement('i');
        bar.style.width = `${percent}%`;
        progress.appendChild(bar);
        summary.append(title, meta, progress);
        content.appendChild(summary);

        const subtabs = document.createElement('nav');
        subtabs.className = 'bitcn-app-tabs is-sub';
        appendTabButtons(subtabs, 'codex', [
            ['crops', '作物'],
            ['animals', '动物'],
            ['products', '加工品'],
            ['miracle', '奇迹']
        ]);
        content.appendChild(subtabs);

        const rewardGrid = document.createElement('div');
        rewardGrid.className = 'bitcn-reward-grid';
        if (Array.isArray(CODEX_REWARDS)) {
            CODEX_REWARDS.forEach(reward => {
                const ready = typeof getCodexPercent === 'function' && getCodexPercent() >= reward.percent;
                const claimed = collection?.claimedRewards?.[reward.id];
                rewardGrid.appendChild(createRewardCard(reward.label, `${reward.percent}%  ${reward.coins}币 + ${reward.exp}EXP`, claimed, ready, () => {
                    if (typeof claimCodexReward === 'function') claimCodexReward(reward.id);
                    renderAppPanel(true);
                }));
            });
        }
        if (Array.isArray(CODEX_SET_REWARDS)) {
            CODEX_SET_REWARDS.forEach(reward => {
                const got = typeof getCollectedCategoryCount === 'function' ? getCollectedCategoryCount(reward.category) : 0;
                const totalSet = typeof getCropCategoryIds === 'function' ? getCropCategoryIds(reward.category).length : 0;
                const ready = typeof isCodexSetRewardReady === 'function' && isCodexSetRewardReady(reward);
                const claimed = collection?.claimedSetRewards?.[reward.id];
                rewardGrid.appendChild(createRewardCard(reward.label, `${got}/${totalSet}  ${reward.bonusLabel}`, claimed, ready, () => {
                    if (typeof claimCodexSetReward === 'function') claimCodexSetReward(reward.id);
                    renderAppPanel(true);
                }));
            });
        }
        content.appendChild(sectionTitle('收集奖励'));
        content.appendChild(rewardGrid);

        const group = CODEX_GROUPS?.[window.uiState?.activeTabs?.codex] || CODEX_GROUPS?.crops;
        const grid = document.createElement('div');
        grid.className = 'bitcn-card-grid';
        const ids = group && typeof getCodexDisplayItems === 'function' ? getCodexDisplayItems(group) : [];
        ids.forEach(itemId => {
            const config = CROP_CONFIG?.[itemId];
            if (!config) return;
            const found = typeof isCollected === 'function' && isCollected(itemId);
            const card = document.createElement('article');
            card.className = `bitcn-item-card ${found ? '' : 'is-locked'}`;
            const icon = document.createElement('b');
            icon.textContent = found ? (config.icon || '◆') : '？';
            const name = document.createElement('strong');
            name.textContent = found ? config.name : `${typeof getCodexKindName === 'function' ? getCodexKindName(itemId) : '未知'}剪影`;
            const detail = document.createElement('span');
            detail.textContent = found
                ? (typeof getCodexFoundDetail === 'function' ? getCodexFoundDetail(itemId, typeof getCollectedAmount === 'function' ? getCollectedAmount(itemId) : 0) : '已发现')
                : (typeof getCodexHint === 'function' ? getCodexHint(itemId) : '继续探索');
            card.append(icon, name, detail);
            grid.appendChild(card);
        });
        if (group) content.appendChild(sectionTitle(`${group.name} ${group.items.filter(isCollected).length}/${group.items.length}`));
        content.appendChild(grid);
    }

    function createRewardCard(label, detail, claimed, ready, action) {
        const card = document.createElement('article');
        card.className = `bitcn-reward-card ${ready ? 'is-ready' : ''}`;
        const text = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = label;
        const sub = document.createElement('span');
        sub.textContent = detail;
        text.append(title, sub);
        const button = createBitcnButton(claimed ? '已领' : '领取', 'bitcn-mini-button', () => {
            if (!ready || claimed) return;
            if (typeof action === 'function') action();
        }, !ready || claimed);
        card.append(text, button);
        return card;
    }

    function renderSeedsDom(content) {
        const cropIds = typeof getCropIds === 'function' ? getCropIds().filter(id => !CROP_CONFIG[id].hidden || isItemUnlocked(id)) : [];
        content.appendChild(sectionTitle('作物种子'));
        content.appendChild(createSeedGrid(cropIds, 'crop'));
        content.appendChild(sectionTitle('动物与辅助'));
        content.appendChild(createSeedGrid(typeof getAnimalIds === 'function' ? getAnimalIds() : [], 'animal'));
    }

    function createSeedGrid(ids, type) {
        const grid = document.createElement('div');
        grid.className = 'bitcn-card-grid';
        ids.forEach(id => {
            const config = CROP_CONFIG?.[id];
            if (!config) return;
            const unlocked = typeof isItemUnlocked === 'function' ? isItemUnlocked(id) : true;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `bitcn-item-card bitcn-select-card ${unlocked ? '' : 'is-locked'}`;
            card.disabled = !unlocked;
            const icon = document.createElement('b');
            icon.textContent = unlocked ? (config.icon || '◆') : '？';
            const name = document.createElement('strong');
            name.textContent = unlocked ? config.name : `${type === 'crop' ? '作物' : '动物'}剪影`;
            const detail = document.createElement('span');
            detail.textContent = unlocked
                ? (type === 'crop' ? `${config.seedPrice}币 / ${config.category}` : `${config.price}币 / Lv.${config.reqLevel || 1}`)
                : (config.unlockHint || `Lv.${config.reqLevel || 1} 解锁`);
            card.append(icon, name, detail);
            card.addEventListener('click', () => {
                if (!unlocked) return;
                if (typeof selectTool === 'function') selectTool(id);
                if (typeof window.closePanel === 'function') window.closePanel();
                render();
            });
            grid.appendChild(card);
        });
        return grid;
    }

    function renderBuildDom(content) {
        const externalRenderBuild = window.BitcnPanels?.build;
        if (typeof externalRenderBuild === 'function') {
            externalRenderBuild({ content, renderBuildDomFallback });
            return;
        }
        renderBuildDomFallback(content);
    }

    function renderBuildDomFallback(content) {
        const tab = window.uiState?.activeTabs?.build || 'ranch';
        if (tab === 'ranch') return renderRanchBuildDom(content);
        if (tab === 'processing') return renderProcessingBuildDom(content);
        if (tab === 'miracle') return renderMiracleBuildDom(content);
    }

    function renderRanchBuildDom(content) {
        const list = document.createElement('div');
        list.className = 'bitcn-list';
        Object.entries(RANCH_BUILDING_CONFIG || {}).forEach(([id, config]) => {
            const level = typeof getRanchBuildingLevel === 'function' ? getRanchBuildingLevel(id) : 0;
            const cost = typeof getRanchBuildingCost === 'function' ? getRanchBuildingCost(id) : 0;
            const unlocked = playerLevel >= config.reqLevel;
            const maxed = level >= config.maxLevel;
            list.appendChild(createBuildCard(
                `${config.icon || ''} ${config.name}`,
                `Lv.${level}/${config.maxLevel} 容量 ${typeof getAnimalCount === 'function' ? getAnimalCount(config.animal) : 0}/${typeof getAnimalCapacity === 'function' ? getAnimalCapacity(config.animal) : 0}`,
                unlocked ? `费用 ${typeof formatCoins === 'function' ? formatCoins(cost) : cost + '币'}` : `Lv.${config.reqLevel} 可建造`,
                [
                    ['升级', () => { upgradeRanchBuilding(id); renderAppPanel(true); }, unlocked && !maxed && coins >= cost],
                    ['放置动物', () => { selectTool(config.animal); window.closePanel?.(); render(); }, unlocked]
                ]
            ));
        });
        content.appendChild(list);
    }

    function renderProcessingBuildDom(content) {
        const list = document.createElement('div');
        list.className = 'bitcn-list';
        Object.entries(PROCESSING_BUILDING_CONFIG || {}).forEach(([id, config]) => {
            const level = typeof getProcessingBuildingLevel === 'function' ? getProcessingBuildingLevel(id) : 0;
            const cost = typeof getProcessingBuildingCost === 'function' ? getProcessingBuildingCost(id) : 0;
            const unlocked = typeof isProcessingBuildingUnlocked === 'function' ? isProcessingBuildingUnlocked(id) : true;
            const maxed = level >= config.maxLevel;
            const job = typeof getProcessingJob === 'function' ? getProcessingJob(id) : null;
            const recipes = (config.recipes || []).map(recipeId => {
                const recipe = RECIPE_CONFIG?.[recipeId];
                const output = recipe ? CROP_CONFIG?.[recipe.output] : null;
                const max = typeof getRecipeMaxCraft === 'function' ? getRecipeMaxCraft(recipeId) : 0;
                return output ? `${output.icon || ''}${output.name} 可做${max}` : recipeId;
            }).join(' / ');
            list.appendChild(createBuildCard(
                `${config.icon || ''} ${config.name}`,
                `Lv.${level}/${config.maxLevel} ${job ? '加工中' : recipes}`,
                unlocked ? `费用 ${typeof formatCoins === 'function' ? formatCoins(cost) : cost + '币'}` : (config.unlockHint || '未解锁'),
                [
                    ['升级', () => { upgradeProcessingBuilding(id); renderAppPanel(true); }, unlocked && !maxed && coins >= cost],
                    [processingAuto?.[id] ? '自动开' : '自动关', () => { toggleProcessingAuto(id); renderAppPanel(true); }, unlocked && level > 0],
                    ['投一批', () => { const recipeId = (config.recipes || []).find(canCraftRecipe); if (recipeId) startRecipeProcessing(recipeId, getRecipeBatchAmount(recipeId)); renderAppPanel(true); }, unlocked && level > 0 && !job && (config.recipes || []).some(canCraftRecipe)]
                ]
            ));
        });
        content.appendChild(list);
    }

    function renderMiracleBuildDom(content) {
        const list = document.createElement('div');
        list.className = 'bitcn-list';
        (typeof getMiracleIds === 'function' ? getMiracleIds() : []).forEach(id => {
            const config = MIRACLE_CONFIG?.[id];
            if (!config) return;
            const state = ensureMiracleState(id);
            const stage = getMiracleStage(id);
            const ready = stage && hasNeed(stage.need);
            list.appendChild(createBuildCard(`${config.icon || ''} ${config.name}`, state.completed ? config.effect : getMiracleProgressText(id), stage ? formatNeed(stage.need) : '已完成', [
                [state.completed ? '完成' : '提交', () => { submitMiracleStage(id); renderAppPanel(true); }, !!ready]
            ]));
        });
        content.appendChild(list);
    }

    function createBuildCard(titleText, bodyText, metaText, actions = []) {
        const card = document.createElement('article');
        card.className = 'bitcn-build-card';
        const body = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = titleText || '';
        const desc = document.createElement('span');
        desc.textContent = bodyText || '';
        const meta = document.createElement('small');
        meta.textContent = metaText || '';
        body.append(title, desc, meta);
        const actionWrap = document.createElement('div');
        actionWrap.className = 'bitcn-build-actions';
        actions.forEach(([label, action, enabled]) => {
            actionWrap.appendChild(createBitcnButton(label, 'bitcn-mini-button', () => {
                if (!enabled) return;
                if (typeof action === 'function') action();
            }, !enabled));
        });
        card.append(body, actionWrap);
        return card;
    }

    function renderLettersDom(content) {
        const unlockedLetters = (STORY_LETTERS || []).filter(letter => storyState?.unlocked?.[letter.id]);
        if (!window.uiState.activeStoryLetter && unlockedLetters[0]) window.uiState.activeStoryLetter = unlockedLetters[0].id;
        const selected = (STORY_LETTERS || []).find(letter => letter.id === window.uiState.activeStoryLetter) || unlockedLetters[0] || (STORY_LETTERS || [])[0];
        const layout = document.createElement('div');
        layout.className = 'bitcn-letter-layout';
        const list = document.createElement('div');
        list.className = 'bitcn-letter-list';
        (STORY_LETTERS || []).forEach(letter => {
            const unlocked = storyState?.unlocked?.[letter.id];
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `bitcn-letter-button ${selected?.id === letter.id ? 'is-active' : ''}`;
            card.disabled = !unlocked;
            card.textContent = unlocked ? `${letter.id} ${letter.title}` : '未解锁信件';
            card.addEventListener('click', () => {
                if (!unlocked) return;
                window.uiState.activeStoryLetter = letter.id;
                storyState.read[letter.id] = true;
                renderAppPanel(true);
                saveGame?.();
            });
            list.appendChild(card);
        });
        const detail = document.createElement('article');
        detail.className = 'bitcn-letter-detail';
        if (selected && storyState?.unlocked?.[selected.id]) {
            storyState.read[selected.id] = true;
            const title = document.createElement('strong');
            title.textContent = `${selected.id} ${selected.title}`;
            detail.appendChild(title);
            (selected.body || []).forEach(line => {
                const paragraph = document.createElement('p');
                paragraph.textContent = line;
                detail.appendChild(paragraph);
            });
        } else {
            detail.appendChild(createSimpleCard('爷爷的信', '随着等级、图鉴、访客与奇迹进度逐步出现。'));
        }
        layout.append(list, detail);
        content.appendChild(layout);
    }

    function getDroneUpgradeEffectText(id, level) {
        const config = DRONE_UPGRADE_CONFIG?.[id];
        if (!config) return '';
        const nextLevel = Math.min(config.maxLevel || 0, level + 1);
        if (id === 'speed') return `Lv.${level}/${config.maxLevel} 移动速度：当前 ${(3.0 + level * config.bonusPerLevel).toFixed(2)}，下级 ${(3.0 + nextLevel * config.bonusPerLevel).toFixed(2)}`;
        if (id === 'efficiency') return `Lv.${level}/${config.maxLevel} 作业间隔：当前 ${Math.max(80, 260 - level * config.cooldownReduction)}ms，下级 ${Math.max(80, 260 - nextLevel * config.cooldownReduction)}ms`;
        if (id === 'cargo') return `Lv.${level}/${config.maxLevel} 离线收割：当前 ${18 + level * config.offlinePower}，下级 ${18 + nextLevel * config.offlinePower}`;
        return `Lv.${level}/${config.maxLevel || 0}`;
    }

    function renderAutomationDom(content) {
        const autoEnabled = window.uiPreferences?.autoSowEnabled !== false;
        const seedTool = typeof getAutoSowSeedTool === 'function' ? getAutoSowSeedTool() : (window.uiPreferences?.lastSeedTool || currentSelectedTool);
        const seedConfig = CROP_CONFIG?.[seedTool];
        content.appendChild(sectionTitle('自动播种'));
        const autoList = document.createElement('div');
        autoList.className = 'bitcn-list bitcn-compact-list';
        autoList.appendChild(createBuildCard(
            autoEnabled ? '自动播种：开启' : '自动播种：关闭',
            autoEnabled ? `员工会在空田补种 ${seedConfig ? `${seedConfig.icon || ''} ${seedConfig.name}` : '上一种种子'}。` : '关闭后员工只收成熟作物，不会补种。',
            '动物工具点田会自动切回上一个种子工具。',
            [[autoEnabled ? '关闭' : '开启', () => { if (typeof toggleAutoSow === 'function') toggleAutoSow(!autoEnabled); else if (window.uiPreferences) window.uiPreferences.autoSowEnabled = !autoEnabled; renderAppPanel(true); renderSideDock(); saveGame?.(); }, true]]
        ));
        content.appendChild(autoList);
        const humanCount = (workers || []).filter(worker => worker.type === 'human').length;
        const droneCount = (workers || []).filter(worker => worker.type === 'drone').length;
        content.appendChild(sectionTitle('员工'));
        const humanList = document.createElement('div');
        humanList.className = 'bitcn-list bitcn-compact-list';
        humanList.appendChild(createBuildCard(`员工队伍 ${humanCount}/${WORKER_LIMITS.human}`, '员工会巡逻田地，成熟时收割；自动播种开启时会给空田补种。', `雇佣 ${typeof formatCoins === 'function' ? formatCoins(600) : '600币'}`, [
            ['雇佣', () => { hireWorker?.('human'); renderAppPanel(true); }, coins >= 600 && humanCount < WORKER_LIMITS.human],
            ['取消雇佣', () => { dismissWorker?.('human'); renderAppPanel(true); }, humanCount > 0]
        ]));
        content.appendChild(humanList);
        content.appendChild(sectionTitle('无人机'));
        const droneList = document.createElement('div');
        droneList.className = 'bitcn-list bitcn-compact-list';
        const droneUnlocked = playerLevel >= 5 || getTalentLevel('industry') >= 4;
        droneList.appendChild(createBuildCard(`无人机 ${droneCount}/${WORKER_LIMITS.drone}`, '无人机只能部署一只，通过升级提升移动、作业间隔和离线收益。', droneUnlocked ? `部署 ${typeof formatCoins === 'function' ? formatCoins(1800) : '1800币'}` : 'Lv.5 或工业天赋 L4 解锁', [
            ['部署', () => { hireWorker?.('drone'); renderAppPanel(true); }, droneUnlocked && coins >= 1800 && droneCount < WORKER_LIMITS.drone],
            ['召回', () => { dismissWorker?.('drone'); renderAppPanel(true); }, droneCount > 0]
        ]));
        Object.entries(DRONE_UPGRADE_CONFIG || {}).forEach(([id, config]) => {
            const level = getDroneUpgradeLevel(id);
            const maxed = level >= config.maxLevel;
            const cost = getDroneUpgradeCost(id);
            droneList.appendChild(createBuildCard(`无人机升级：${config.name}`, getDroneUpgradeEffectText(id, level), maxed ? '已满级' : `升级 ${typeof formatCoins === 'function' ? formatCoins(cost) : cost + '币'}`, [
                ['升级', () => { upgradeDrone?.(id); renderAppPanel(true); }, droneCount > 0 && !maxed && coins >= cost]
            ]));
        });
        content.appendChild(droneList);
    }

    function renderTalentsDom(content) {
        content.appendChild(sectionTitle('主动技能'));
        const skillList = document.createElement('div');
        skillList.className = 'bitcn-list bitcn-compact-list';
        ['sow', 'rain', 'harvest'].forEach(id => {
            const skill = typeof skills !== 'undefined' ? skills[id] : null;
            if (!skill) return;
            const cd = typeof getSkillCd === 'function' ? getSkillCd(id) : 0;
            const left = Math.max(0, Math.ceil((cd - (Date.now() - skill.lastUsed)) / 1000));
            skillList.appendChild(createBuildCard(`${skill.icon || ''} ${skill.name || id}`, left > 0 ? `冷却 ${left}s` : '可使用', `Lv.${skill.level || 1}`, [
                ['使用', () => { useSkill?.(id); renderAppPanel(true); renderSideDock(); }, left <= 0]
            ]));
        });
        content.appendChild(skillList);
        content.appendChild(sectionTitle(`天赋加点：可用 ${talentPoints}`));
        const list = document.createElement('div');
        list.className = 'bitcn-list';
        Object.entries(TALENT_CONFIG || {}).forEach(([id, config]) => {
            const level = getTalentLevel(id);
            const next = level < config.effects.length ? `下一阶：${config.effects[level]}` : '已满级';
            const current = level > 0 ? `当前：${config.effects[level - 1]}` : '未加点';
            list.appendChild(createBuildCard(`${config.icon} ${config.name} Lv.${level}`, next, current, [
                ['加点', () => { upgradeTalent(id); renderAppPanel(true); }, talentPoints > 0 && level < config.effects.length]
            ]));
        });
        content.appendChild(list);
    }

    function renderMiracleJournalDom(content) {
        (typeof getMiracleIds === 'function' ? getMiracleIds() : []).forEach(id => content.appendChild(createSimpleCard(`${MIRACLE_CONFIG[id].icon} ${MIRACLE_CONFIG[id].name}`, ensureMiracleState(id).completed ? MIRACLE_CONFIG[id].effect : getMiracleProgressText(id))));
    }

    function renderVisitorsDom(content) {
        const externalRenderVisitor = window.BitcnPanels?.visitor;
        if (typeof externalRenderVisitor === 'function') {
            externalRenderVisitor({ content, renderVisitorsDomFallback });
            return;
        }
        renderVisitorsDomFallback(content);
    }

    function renderVisitorsDomFallback(content) {
        const ids = typeof getVisitorIds === 'function' ? getVisitorIds() : [];
        const unlockedIds = ids.filter(isVisitorUnlocked);
        if (!ids.includes(window.uiState.activeVisitor)) window.uiState.activeVisitor = ids[0] || null;
        const activeId = window.uiState.activeVisitor;
        const layout = document.createElement('div');
        layout.className = 'bitcn-visitor-layout';
        const list = document.createElement('div');
        list.className = 'bitcn-visitor-list';
        ids.forEach(id => {
            const config = VISITOR_CONFIG[id];
            const unlocked = isVisitorUnlocked(id);
            const progress = unlocked ? getVisitorProgress(id) : { finished: false };
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `bitcn-letter-button ${id === activeId ? 'is-active' : ''}`;
            button.textContent = `${config.icon} ${config.name}${progress.finished ? ' 入驻' : ''}`;
            button.addEventListener('click', () => { window.uiState.activeVisitor = id; window.uiState.visitorDialog = null; renderAppPanel(true); });
            if (!unlocked) {
                button.classList.add('is-disabled');
                button.textContent = `${config.icon} ${config.name} (未到访)`;
            }
            list.appendChild(button);
        });
        if (!ids.length) {
            const empty = document.createElement('div');
            empty.className = 'bitcn-letter-button is-disabled';
            empty.textContent = '暂无访客';
            list.appendChild(empty);
        }
        const detail = document.createElement('article');
        detail.className = 'bitcn-visitor-detail';
        const config = VISITOR_CONFIG?.[activeId];
        if (!activeId || !config) {
            detail.appendChild(createSimpleCard('尚未到访', '继续经营农场，新的访客出现时会主动打招呼。'));
        } else if (!isVisitorUnlocked(activeId)) {
            detail.appendChild(createSimpleCard(`${config.icon} ${config.name}`, config.unlockHint || '继续经营农场后会到访。'));
        } else {
            const progress = getVisitorProgress(activeId);
            const title = document.createElement('strong');
            title.textContent = `${config.icon} ${config.name}`;
            const status = document.createElement('p');
            status.textContent = progress.finished ? '已经入驻农场，可进行日常闲聊。' : (progress.task?.title || '当前委托');
            const need = document.createElement('p');
            need.textContent = typeof getVisitorStatusText === 'function' ? getVisitorStatusText(activeId) : '';
            const actions = document.createElement('div');
            actions.className = 'bitcn-button-row';
            actions.append(
                createBitcnButton('对话', 'bitcn-mini-button', () => { const line = typeof getVisitorTalkLine === 'function' ? getVisitorTalkLine(activeId) : ''; stats.visitorTalks = (stats.visitorTalks || 0) + 1; window.uiState.visitorDialog = { id: activeId, line }; saveGame?.(); renderAppPanel(true); }, false),
                createBitcnButton(progress.finished ? '已入驻' : '交付', 'bitcn-mini-button', () => { if (!canDeliverVisitorTask(activeId)) return; deliverVisitorTask(activeId); renderAppPanel(true); }, !canDeliverVisitorTask(activeId))
            );
            detail.append(title, status, need, actions);
            if (window.uiState.visitorDialog?.id === activeId && window.uiState.visitorDialog.line) {
                const dialog = document.createElement('div');
                dialog.className = 'bitcn-dialog-box';
                dialog.textContent = window.uiState.visitorDialog.line;
                detail.appendChild(dialog);
            }
        }
        layout.append(list, detail);
        content.appendChild(layout);
    }

    function renderEndingsDom(content) {
        if (typeof checkEndingUnlocks === 'function') checkEndingUnlocks(true);
        const entries = Object.entries(ENDING_CONFIG || {});
        const unlockedCount = typeof getUnlockedEndingCount === 'function' ? getUnlockedEndingCount() : Object.keys(endingState?.unlocked || {}).length;
        const archivedCount = typeof getArchivedEndingCount === 'function' ? getArchivedEndingCount() : Object.keys(endingState?.archive || {}).length;
        content.appendChild(createSimpleCard('结局收藏', `本轮 ${unlockedCount}/${entries.length} · 永久归档 ${archivedCount}/${entries.length}`));
        const list = document.createElement('div');
        list.className = 'bitcn-list bitcn-ending-list';
        entries.forEach(([id, ending]) => {
            const unlocked = !!endingState?.unlocked?.[id];
            const archived = !!endingState?.archive?.[id];
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `bitcn-build-card bitcn-ending-card ${unlocked ? '' : 'is-locked'} ${archived ? 'is-archived' : ''}`;
            const body = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = unlocked || archived ? `${ending.icon || ''} ${ending.title}` : '结局剪影';
            const desc = document.createElement('span');
            desc.textContent = unlocked ? (ending.text || []).join(' ') : archived ? '永久归档，本轮尚未重新达成。' : '继续推进奇迹、访客、图鉴与加工系统。';
            const meta = document.createElement('small');
            meta.textContent = unlocked ? '点击查看' : archived ? '永久归档' : '尚未解锁';
            body.append(title, desc, meta);
            card.appendChild(body);
            card.disabled = !unlocked && !archived;
            card.addEventListener('click', () => { window.uiState.activeEnding = id; if (unlocked && typeof markEndingRead === 'function') markEndingRead(id); renderAppPanel(true); });
            list.appendChild(card);
        });
        content.appendChild(sectionTitle('结局列表'));
        content.appendChild(list);
    }

    function renderOrdersDom(content) {
        const externalRenderOrders = window.BitcnPanels?.orders;
        if (typeof externalRenderOrders === 'function') {
            externalRenderOrders({ content, renderOrdersDomFallback });
            return;
        }
        renderOrdersDomFallback(content);
    }

    function renderOrdersDomFallback(content) {
        const refreshBox = document.createElement('section');
        refreshBox.className = 'bitcn-order-refresh';
        const refreshText = document.createElement('div');
        const refreshTitle = document.createElement('strong');
        refreshTitle.textContent = '订单限量';
        const refreshMeta = document.createElement('span');
        refreshMeta.textContent = `最多 3 单，固定每 5 分钟刷新；下次 ${typeof getOrderRefreshClockLabel === 'function' ? getOrderRefreshClockLabel() : '--:--'}，剩余 ${typeof formatOrderRefreshTime === 'function' ? formatOrderRefreshTime() : '--:--'}`;
        refreshText.append(refreshTitle, refreshMeta);
        refreshBox.append(refreshText, createBitcnButton('刷新', 'bitcn-button', () => { refreshOrderBoardNow?.(); renderAppPanel(true); renderOrderDock(true); }));
        content.appendChild(refreshBox);
        content.appendChild(sectionTitle('普通订单看板'));
        const list = document.createElement('div');
        list.className = 'bitcn-list';
        (tasks || []).forEach((task, index) => {
            if (!task) {
                list.appendChild(createBuildCard('空订单位', '等待下一轮订单刷新。', '最多保留 3 单', []));
                return;
            }
            const enough = typeof isTaskDeliverable === 'function' ? isTaskDeliverable(task) : (inventory[task.item] || 0) >= task.amount;
            const requirement = typeof getTaskRequirementLabel === 'function' ? getTaskRequirementLabel(task, true) : `${CROP_CONFIG[task.item]?.name || task.item} ${inventory[task.item] || 0}/${task.amount}`;
            const shortRequirement = typeof getTaskRequirementLabel === 'function' ? getTaskRequirementLabel(task, false) : `${CROP_CONFIG[task.item]?.name || task.item} x${task.amount}`;
            const reward = typeof formatCoins === 'function' ? formatCoins(task.reward || 0) : `${task.reward || 0}币`;
            list.appendChild(createBuildCard(shortRequirement || '订单', `要求 ${requirement} / 奖励 ${reward} + ${task.exp || 0}EXP`, enough ? '可以交付' : '等待库存', [
                [enough ? '交付' : '等待', () => { deliverTask(index); renderAppPanel(true); renderOrderDock(true); }, enough]
            ]));
        });
        content.appendChild(list);
        content.appendChild(sectionTitle('访客委托'));
        (typeof getVisitorIds === 'function' ? getVisitorIds() : []).forEach(id => {
            if (!isVisitorUnlocked(id)) return;
            const config = VISITOR_CONFIG[id];
            const progress = getVisitorProgress(id);
            if (progress.finished) return;
            content.appendChild(createBuildCard(`${config.icon} ${config.name}`, progress.task?.title || '当前委托', typeof getVisitorStatusText === 'function' ? getVisitorStatusText(id) : config.unlockHint, [
                ['去访客页', () => { window.uiState.activePanel = 'journal'; window.uiState.activeTabs.journal = 'visitors'; window.uiState.activeVisitor = id; renderAppPanel(true); }, true]
            ]));
        });
    }

    function createSimpleCard(titleText, bodyText) {
        const card = document.createElement('article');
        card.className = 'bitcn-build-card';
        const title = document.createElement('strong');
        title.textContent = titleText;
        const body = document.createElement('span');
        body.textContent = bodyText || '';
        card.append(title, body);
        return card;
    }

    function sectionTitle(text) {
        const title = document.createElement('h3');
        title.className = 'bitcn-section-title';
        title.textContent = text;
        return title;
    }

    function renderSideDock() {
        if (window.uiState?.activePanel || window.uiState?.settingsOpen) {
            sideDock.classList.add('is-hidden');
            if (sideDockRenderKey !== 'hidden') {
                sideDock.innerHTML = '';
                sideDockRenderKey = 'hidden';
            }
            return;
        }
        sideDock.classList.remove('is-hidden');
        const skillKey = ['sow', 'rain', 'harvest'].map(id => {
            const skill = typeof skills !== 'undefined' ? skills[id] : null;
            if (!skill) return `${id}:missing`;
            const cd = typeof getSkillCd === 'function' ? getSkillCd(id) : 0;
            const left = Math.max(0, Math.ceil((cd - (Date.now() - skill.lastUsed)) / 1000));
            return `${id}:${left}`;
        }).join('|');
        const key = `${skillKey}|zoom:${Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100)}`;
        if (key === sideDockRenderKey) return;
        sideDockRenderKey = key;
        sideDock.innerHTML = '';
        const skillWrap = document.createElement('div');
        skillWrap.className = 'bitcn-side-card';
        const skillTitle = document.createElement('strong');
        skillTitle.textContent = '技能';
        skillWrap.appendChild(skillTitle);
        [['sow', '播种'], ['rain', '求雨'], ['harvest', '收割']].forEach(([id, fallback]) => {
            const skill = typeof skills !== 'undefined' ? skills[id] : null;
            if (!skill) return;
            const cd = typeof getSkillCd === 'function' ? getSkillCd(id) : 0;
            const left = Math.max(0, Math.ceil((cd - (Date.now() - skill.lastUsed)) / 1000));
            const ready = left <= 0;
            const label = ready ? fallback : `${left}s`;
            const button = createBitcnButton(`${skill.name || ''} ${label}`, ready ? 'bitcn-side-button' : 'bitcn-side-button is-cooling', () => {
                if (typeof useSkill === 'function') useSkill(id);
                renderSideDock();
            }, !ready);
            skillWrap.appendChild(button);
        });
        const zoomWrap = document.createElement('div');
        zoomWrap.className = 'bitcn-side-card';
        const zoomTitle = document.createElement('strong');
        zoomTitle.textContent = '视野';
        const zoomActions = document.createElement('div');
        zoomActions.className = 'bitcn-zoom-row';
        zoomActions.append(
            createBitcnButton('+', 'bitcn-action-button', () => { if (typeof zoomCamera === 'function') zoomCamera(1.18); renderSideDock(); }),
            createBitcnButton('-', 'bitcn-action-button', () => { if (typeof zoomCamera === 'function') zoomCamera(1 / 1.18); renderSideDock(); })
        );
        const zoomValue = createBitcnButton(`${Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100)}%`, 'bitcn-side-button bitcn-reset-zoom', () => { if (typeof resetCameraZoom === 'function') resetCameraZoom(); renderSideDock(); });
        zoomWrap.append(zoomTitle, zoomActions, zoomValue);
        sideDock.append(skillWrap, zoomWrap);
    }

    function renderOrderDock(force = false) {
        const externalRenderOrderDock = window.BitcnPanels?.orderDock;
        if (typeof externalRenderOrderDock === 'function') {
            externalRenderOrderDock({
                force,
                orderDock,
                getOrderRenderKey: () => orderRenderKey,
                setOrderRenderKey: key => { orderRenderKey = key; },
                createBitcnButton,
                render,
                renderOrderDock
            });
            return;
        }
        renderOrderDockFallback(force);
    }

    function renderOrderDockFallback(force = false) {
        const open = !window.uiState?.activePanel && !window.uiState?.settingsOpen && !window.uiState?.activeStoryPopup && !window.uiState?.npcArrivalPopup;
        orderDock.classList.toggle('is-hidden', !open);
        if (!open) {
            orderDock.innerHTML = '';
            orderRenderKey = 'hidden';
            return;
        }
        const key = (tasks || []).map(task => {
            if (!task) return 'empty';
            if (typeof getTaskRequirementLabel === 'function') return `${getTaskRequirementLabel(task, true)}:${task.reward}:${task.exp}`;
            return `${task.item}:${task.amount}:${task.reward}:${inventory[task.item] || 0}`;
        }).join('|') + `|refresh:${typeof getOrderRefreshLeftMs === 'function' ? Math.ceil(getOrderRefreshLeftMs() / 1000) : 0}`;
        if (!force && key === orderRenderKey) return;
        orderRenderKey = key;
        orderDock.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'bitcn-order-header';
        const title = document.createElement('strong');
        title.textContent = '订单看板';
        const more = createBitcnButton('详情', 'bitcn-mini-button', () => { window.uiState.activePanel = 'orders'; window.uiState.settingsOpen = false; render(); });
        header.append(title, more);
        orderDock.appendChild(header);
        const list = document.createElement('div');
        list.className = 'bitcn-order-list';
        (tasks || []).forEach((task, index) => {
            if (!task) return;
            const enough = typeof isTaskDeliverable === 'function' ? isTaskDeliverable(task) : (inventory[task.item] || 0) >= task.amount;
            const card = document.createElement('article');
            card.className = `bitcn-order-card ${enough ? 'is-ready' : ''}`;
            const text = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = typeof getTaskRequirementLabel === 'function' ? (getTaskRequirementLabel(task, false) || '订单') : `${CROP_CONFIG[task.item]?.name || task.item} x${task.amount}`;
            const detail = document.createElement('span');
            detail.textContent = `奖励 ${typeof formatCoins === 'function' ? formatCoins(task.reward || 0) : String(task.reward || 0) + '币'} + ${task.exp || 0}EXP`;
            text.append(name, detail);
            const button = createBitcnButton(enough ? '交付' : '等待', 'bitcn-mini-button', () => { if (!enough) return; deliverTask(index); renderOrderDock(true); }, !enough);
            card.append(text, button);
            list.appendChild(card);
        });
        orderDock.appendChild(list);
    }

    function bindMarketWheelStabilizer() {
        if (marketPanel.__marketWheelStabilized) return;
        marketPanel.__marketWheelStabilized = true;
        marketPanel.addEventListener('wheel', event => {
            if (!marketPanel.classList.contains('is-open')) return;
            const list = marketPanel.querySelector('.bitcn-market-list');
            if (!list) return;

            event.stopPropagation();
            if (event.target.closest('input, button, textarea, select')) return;

            const before = list.scrollTop;
            list.scrollTop += event.deltaY;
            marketScrollTop = list.scrollTop;
            marketScrollFreezeUntil = Date.now() + 900;

            if (list.scrollTop !== before) event.preventDefault();
        }, { passive: false });
    }

    function shieldDomScroll(element) {
        if (!element) return;
        ['pointerdown', 'mousedown', 'click', 'touchstart'].forEach(type => {
            element.addEventListener(type, event => event.stopPropagation(), { passive: true });
        });
        element.addEventListener('wheel', event => {
            event.stopPropagation();
        }, { passive: true });
        element.addEventListener('touchmove', event => {
            event.stopPropagation();
        }, { passive: true });
    }

    function clampDomPoint(x, y, w, h) {
        const rect = root.getBoundingClientRect();
        const sx = rect.width / ((typeof canvas !== 'undefined' && canvas?.width) || 1600);
        const sy = rect.height / ((typeof canvas !== 'undefined' && canvas?.height) || 900);
        return {
            left: Math.max(14, Math.min(rect.width - w - 14, Math.round((x || 0) * sx))),
            top: Math.max(56, Math.min(rect.height - h - 18, Math.round((y || 0) * sy)))
        };
    }

    function closeStoryDom(markRead = false, closeAll = false) {
        if (!window.uiState) return;
        const current = window.uiState.activeStoryPopup;
        if (markRead && current && typeof markStoryRead === 'function') markStoryRead(current.id);
        if (closeAll && Array.isArray(window.uiState.storyPopupQueue)) {
            window.uiState.storyPopupQueue.forEach(letter => {
                if (letter?.id && typeof markStoryRead === 'function') markStoryRead(letter.id);
            });
            window.uiState.storyPopupQueue = [];
        }
        window.uiState.activeStoryPopup = null;
        storyBodyScrollTop = 0;
        nextStoryAllowedAt = Date.now() + 320;
        if (markRead && typeof saveGame === 'function') saveGame();
        render(true);
    }

    function renderStoryModal(force = false) {
        const externalRenderStory = window.BitcnPanels?.story;
        if (typeof externalRenderStory === 'function') {
            externalRenderStory({
                force,
                storyModal,
                getStoryRenderKey: () => storyRenderKey,
                setStoryRenderKey: key => { storyRenderKey = key; },
                getStoryBodyScrollTop: () => storyBodyScrollTop,
                setStoryBodyScrollTop: value => { storyBodyScrollTop = value; },
                getNextStoryAllowedAt: () => nextStoryAllowedAt,
                setNextStoryAllowedAt: value => { nextStoryAllowedAt = value; },
                createBitcnButton,
                shieldDomScroll,
                closeStoryDom,
                render
            });
            return;
        }
        renderStoryModalFallback(force);
    }

    function renderStoryModalFallback(force = false) {
        const state = window.uiState;
        if (!state) return;
        if (!state.activeStoryPopup && state.storyPopupQueue?.length > 0 && Date.now() >= nextStoryAllowedAt) {
            state.activeStoryPopup = state.storyPopupQueue.shift();
        }
        const letter = state.activeStoryPopup;
        storyModal.classList.toggle('is-open', !!letter);
        if (!letter) {
            if (storyRenderKey || storyModal.firstChild) {
                storyModal.innerHTML = '';
                storyRenderKey = '';
                storyBodyScrollTop = 0;
            }
            return;
        }
        const queueCount = state.storyPopupQueue?.length || 0;
        const stableKey = String(letter.id || letter.title || 'story');
        if (stableKey === storyRenderKey && storyModal.firstChild) {
            const hint = storyModal.querySelector('[data-story-hint]');
            if (hint) hint.textContent = queueCount > 0 ? `已收进手札 · 后面还有 ${queueCount} 封` : '已收进手札';
            return;
        }
        const previousBody = storyModal.querySelector('.bitcn-story-body');
        if (previousBody) storyBodyScrollTop = previousBody.scrollTop;
        storyRenderKey = stableKey;
        storyModal.innerHTML = '';
        const scrim = document.createElement('div');
        scrim.className = 'bitcn-story-scrim';
        const card = document.createElement('article');
        card.className = 'bitcn-story-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = `新信件：${letter.title || ''}`;
        const hint = document.createElement('span');
        hint.dataset.storyHint = 'true';
        hint.textContent = queueCount > 0 ? `已收进手札 · 后面还有 ${queueCount} 封` : '已收进手札';
        const close = createBitcnButton('×', 'bitcn-close-button', () => closeStoryDom(true));
        header.append(title, hint, close);
        const body = document.createElement('div');
        body.className = 'bitcn-story-body';
        body.tabIndex = 0;
        const subtitle = document.createElement('h3');
        subtitle.textContent = `${letter.id || ''} ${letter.title || ''}`.trim();
        body.appendChild(subtitle);
        const lines = Array.isArray(letter.body) ? letter.body : [String(letter.body || '')];
        lines.forEach(line => {
            const paragraph = document.createElement('p');
            paragraph.textContent = line;
            body.appendChild(paragraph);
        });
        body.addEventListener('scroll', () => { storyBodyScrollTop = body.scrollTop; }, { passive: true });
        body.addEventListener('wheel', event => { event.stopPropagation(); }, { passive: true });
        body.addEventListener('touchmove', event => { event.stopPropagation(); }, { passive: true });
        const foot = document.createElement('footer');
        foot.className = 'bitcn-story-actions';
        const note = document.createElement('span');
        note.textContent = '可在“手札 / 爷爷的信”重新阅读。';
        const open = createBitcnButton('打开手札', 'bitcn-mini-button', () => {
            state.activeTabs.journal = 'letters';
            state.activeStoryLetter = letter.id;
            const letterIndex = typeof STORY_LETTERS !== 'undefined' ? STORY_LETTERS.findIndex(item => item.id === letter.id) : -1;
            if (letterIndex >= 0) state.storyListPage = Math.floor(letterIndex / 6);
            closeStoryDom(true, false);
            state.activePanel = 'journal';
            state.settingsOpen = false;
            if (typeof markTutorialJournalOpened === 'function') markTutorialJournalOpened();
            render(true);
        });
        const skipAll = createBitcnButton(queueCount > 0 ? `全部收下(${queueCount + 1})` : '全部收下', 'bitcn-mini-button', () => closeStoryDom(true, true));
        const take = createBitcnButton('收下', 'bitcn-mini-button', () => closeStoryDom(true));
        foot.append(note, open, skipAll, take);
        card.append(header, body, foot);
        storyModal.append(scrim, card);
        scrim.addEventListener('click', () => closeStoryDom(true));
        card.addEventListener('wheel', event => {
            event.stopPropagation();
            if (!event.target.closest('.bitcn-story-body')) {
                body.scrollTop += event.deltaY;
                storyBodyScrollTop = body.scrollTop;
                event.preventDefault();
            }
        }, { passive: false });
        ['pointerdown', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchmove', 'touchend'].forEach(type => {
            card.addEventListener(type, event => event.stopPropagation(), { passive: true });
        });
        requestAnimationFrame(() => { body.scrollTop = storyBodyScrollTop; body.focus({ preventScroll: true }); });
        shieldDomScroll(card);
    }

    function renderTileTip(force = false) {
        const tip = window.uiState?.tileTip;
        const visible = !!tip && Date.now() <= tip.until;
        tileTip.classList.toggle('is-open', visible);
        if (!visible) {
            if (window.uiState) window.uiState.tileTip = null;
            tileTip.innerHTML = '';
            tileTipRenderKey = '';
            return;
        }
        const pos = clampDomPoint(tip.x, tip.y, 260, 116);
        const key = `${tip.title}|${tip.line1}|${tip.line2}|${pos.left}|${pos.top}`;
        if (!force && key === tileTipRenderKey) return;
        tileTipRenderKey = key;
        tileTip.style.left = `${pos.left}px`;
        tileTip.style.top = `${pos.top}px`;
        tileTip.innerHTML = '';
        const title = document.createElement('strong');
        title.textContent = tip.title || '';
        const line1 = document.createElement('span');
        line1.textContent = tip.line1 || '';
        const line2 = document.createElement('span');
        line2.textContent = tip.line2 || '';
        tileTip.append(title, line1, line2);
    }

    function renderTutorialPanel(force = false) {
        const externalRenderTutorial = window.BitcnPanels?.tutorial;
        if (typeof externalRenderTutorial === 'function') {
            externalRenderTutorial({
                force,
                tutorialPanel,
                getTutorialRenderKey: () => tutorialRenderKey,
                setTutorialRenderKey: key => { tutorialRenderKey = key; },
                createBitcnButton,
                render
            });
            return;
        }
        renderTutorialPanelFallback(force);
    }

    function renderTutorialPanelFallback(force = false) {
        const canShow = !window.uiState?.activePanel && !window.uiState?.settingsOpen && !window.uiState?.activeStoryPopup && !window.uiState?.npcArrivalPopup && typeof getTutorialStep === 'function';
        const step = canShow ? getTutorialStep() : null;
        tutorialPanel.classList.toggle('is-open', !!step);
        if (!step) {
            tutorialPanel.innerHTML = '';
            tutorialRenderKey = '';
            return;
        }
        const key = `${step.index}:${step.title}:${step.body}:${step.actionLabel || ''}`;
        if (!force && key === tutorialRenderKey) return;
        tutorialRenderKey = key;
        tutorialPanel.innerHTML = '';
        const tag = document.createElement('small');
        tag.textContent = `新手目标 ${step.index}/5`;
        const title = document.createElement('strong');
        title.textContent = step.title || '';
        const body = document.createElement('span');
        body.textContent = step.body || '';
        tutorialPanel.append(tag, title, body);
        if (step.action) {
            tutorialPanel.appendChild(createBitcnButton(step.actionLabel || '前往', 'bitcn-mini-button', () => { step.action(); render(true); }));
        }
    }

    function renderSupportModal(force = false) {
        const externalRenderSupport = window.BitcnPanels?.support;
        if (typeof externalRenderSupport === 'function') {
            externalRenderSupport({
                force,
                supportModal,
                getSupportOpen: () => supportOpen,
                setSupportOpen: value => { supportOpen = value; },
                getSupportRenderKey: () => supportRenderKey,
                setSupportRenderKey: key => { supportRenderKey = key; },
                supportGithubUrl,
                createBitcnButton,
                shieldDomScroll,
                renderSupportModal
            });
            return;
        }
        renderSupportModalFallback(force);
    }

    function renderSupportModalFallback(force = false) {
        supportModal.classList.toggle('is-open', !!supportOpen);
        if (!supportOpen) {
            if (supportModal.firstChild) supportModal.innerHTML = '';
            supportRenderKey = '';
            return;
        }
        const key = supportGithubUrl;
        if (!force && key === supportRenderKey && supportModal.firstChild) return;
        supportRenderKey = key;
        supportModal.innerHTML = '';
        const scrim = document.createElement('div');
        scrim.className = 'bitcn-support-scrim';
        const card = document.createElement('article');
        card.className = 'bitcn-support-card';
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = '支持 Pixel Farm';
        const hint = document.createElement('span');
        hint.textContent = '收藏项目，后续更新会更容易找到。';
        const close = createBitcnButton('×', 'bitcn-close-button', () => { supportOpen = false; renderSupportModal(true); });
        header.append(title, hint, close);
        const body = document.createElement('div');
        body.className = 'bitcn-support-body';
        ['如果你喜欢这个小游戏，欢迎给项目点一个 Star ⭐', '你的支持会让我更有动力继续更新内容和修复 Bug。'].forEach(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            body.appendChild(paragraph);
        });
        const actions = document.createElement('footer');
        actions.className = 'bitcn-story-actions';
        actions.append(
            createBitcnButton('去 GitHub 收藏', 'bitcn-mini-button', () => { window.open(supportGithubUrl, '_blank', 'noopener'); }),
            createBitcnButton('关闭', 'bitcn-mini-button', () => { supportOpen = false; renderSupportModal(true); })
        );
        card.append(header, body, actions);
        supportModal.append(scrim, card);
        scrim.addEventListener('click', () => { supportOpen = false; renderSupportModal(true); });
        shieldDomScroll(card);
    }

    function closeNpcArrival(openVisitor = false) {
        const popup = window.uiState?.npcArrivalPopup;
        if (!window.uiState) return;
        window.uiState.npcArrivalPopup = null;
        npcArrivalRenderKey = '';
        if (openVisitor && popup?.id) {
            window.uiState.activePanel = 'journal';
            window.uiState.activeTabs.journal = 'visitors';
            window.uiState.activeVisitor = popup.id;
            window.uiState.settingsOpen = false;
            if (typeof markTutorialJournalOpened === 'function') markTutorialJournalOpened();
        }
        render(true);
    }

    function renderNpcArrivalModal(force = false) {
        const externalRenderVisitorArrival = window.BitcnPanels?.visitorArrival;
        if (typeof externalRenderVisitorArrival === 'function') {
            externalRenderVisitorArrival({
                force,
                npcArrivalModal,
                getNpcArrivalRenderKey: () => npcArrivalRenderKey,
                setNpcArrivalRenderKey: key => { npcArrivalRenderKey = key; },
                createBitcnButton,
                shieldDomScroll,
                closeNpcArrival
            });
            return;
        }
        renderNpcArrivalModalFallback(force);
    }

    function renderNpcArrivalModalFallback(force = false) {
        const popup = window.uiState?.npcArrivalPopup;
        npcArrivalModal.classList.toggle('is-open', !!popup);
        if (!popup) {
            if (npcArrivalModal.firstChild) npcArrivalModal.innerHTML = '';
            npcArrivalRenderKey = '';
            return;
        }
        const config = VISITOR_CONFIG?.[popup.id];
        const key = `${popup.id || ''}:${popup.line || ''}`;
        if (!force && key === npcArrivalRenderKey && npcArrivalModal.firstChild) return;
        npcArrivalRenderKey = key;
        npcArrivalModal.innerHTML = '';

        const scrim = document.createElement('div');
        scrim.className = 'bitcn-npc-arrival-scrim';
        const card = document.createElement('article');
        card.className = 'bitcn-npc-arrival-card';
        card.setAttribute('role', 'dialog');

        const portrait = document.createElement('div');
        portrait.className = 'bitcn-visitor-portrait';
        if (config?.portrait) {
            const img = document.createElement('img');
            img.src = config.portrait;
            img.alt = config.name || popup.id || '';
            portrait.appendChild(img);
        } else {
            const icon = document.createElement('span');
            icon.textContent = config?.icon || '?';
            portrait.appendChild(icon);
        }

        const body = document.createElement('div');
        body.className = 'bitcn-npc-arrival-body';
        const title = document.createElement('strong');
        title.textContent = `${config?.icon || ''} ${config?.name || '新的访客'} 到访`;
        const role = document.createElement('span');
        role.textContent = config?.role || '访客';
        const line = document.createElement('p');
        line.textContent = popup.line || config?.unlockHint || '有人来到了农场。';
        const actions = document.createElement('footer');
        actions.className = 'bitcn-story-actions';
        actions.append(
            createBitcnButton('去打招呼', 'bitcn-mini-button', () => closeNpcArrival(true)),
            createBitcnButton('稍后', 'bitcn-mini-button', () => closeNpcArrival(false))
        );
        body.append(title, role, line, actions);
        card.append(portrait, body);
        npcArrivalModal.append(scrim, card);
        scrim.addEventListener('click', () => closeNpcArrival(false));
        shieldDomScroll(card);
    }

    function render(force = false) {
        renderStoryModal(force);
        renderStatusBar(force);
        renderNav();
        renderAppPanel(force);
        renderMarketPanel(force);
        renderSettingsPanel(force);
        renderSideDock();
        renderOrderDock(force);
        renderTileTip(force);
        renderTutorialPanel(force);
        renderSupportModal(force);
        renderNpcArrivalModal(force);
    }

    function closeFloatingPanelsFromOutside(event) {
        if (!window.uiState) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('#bitcn-nav, #bitcn-status, #bitcn-side-dock, #bitcn-order-dock, #bitcn-control-layer, #bitcn-tutorial-panel, #bitcn-tile-tip')) return;
        if (target.closest('#bitcn-app-panel, #bitcn-market-panel, #bitcn-settings-panel, #bitcn-npc-arrival-modal, .bitcn-story-card, .bitcn-npc-arrival-card')) return;
        if (window.uiState.activeStoryPopup) return;
        if (window.uiState.npcArrivalPopup) return;

        let closed = false;
        if (supportOpen) {
            supportOpen = false;
            closed = true;
        }
        if (window.uiState.settingsOpen) {
            if (typeof toggleSettings === 'function') toggleSettings(false);
            else window.uiState.settingsOpen = false;
            closed = true;
        }
        if (window.uiState.activePanel) {
            window.uiState.activePanel = null;
            closed = true;
        }
        if (closed) render(true);
    }

    window.refreshBitcnDomUi = function refreshBitcnDomUi(force = false) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (!force && now - lastDomRefreshAt < 120) return;
        lastDomRefreshAt = now;
        render(!!force);
    };
    bindMarketWheelStabilizer();
    root.addEventListener('pointerdown', closeFloatingPanelsFromOutside);
    [appPanel, settingsPanel, sideDock, orderDock, controlLayer, storyModal, tileTip, tutorialPanel, supportModal, npcArrivalModal].forEach(shieldDomScroll);
    render(true);
})();
