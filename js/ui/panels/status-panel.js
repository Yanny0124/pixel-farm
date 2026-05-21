// Status bar renderer extracted from bitcn-dom-ui.js.
(function initStatusPanel() {
    function statusPanel(context) {
        const { force = false, statusBar, getStatusRenderKey, setStatusRenderKey, createBitcnButton, drawIconToCanvas, render, openSupport } = context || {};
        if (!statusBar || typeof createBitcnButton !== 'function') return;

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
        if (!force && typeof getStatusRenderKey === 'function' && key === getStatusRenderKey()) return;
        if (typeof setStatusRenderKey === 'function') setStatusRenderKey(key);
        statusBar.innerHTML = '';
        const stats = [
            ['coin', `金币 ${coins}`],
            ['book', `Lv.${playerLevel}`],
            ['market', `EXP ${playerExp}/${typeof getMaxExp === 'function' ? getMaxExp() : 0}`],
            ['clock', typeof getClockLabel === 'function' ? getClockLabel() : '--:--'],
            ['seed', `${WEATHER_CONFIG?.[weather?.type]?.icon || ''} ${WEATHER_CONFIG?.[weather?.type]?.name || ''}`],
            ['seed', `生长 ${Math.round((typeof getGrowthMultiplier === 'function' ? getGrowthMultiplier() : 1) * 100)}%`],
            ['hammer', getSelectedToolStatusLabel()],
            ['market', `视野 ${Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100)}%`]
        ];
        stats[0][1] = `金币 ${typeof formatCoins === 'function' ? formatCoins(coins) : coins}`;
        stats.forEach(([icon, label]) => {
            const item = document.createElement('span');
            item.className = 'bitcn-status-chip';
            if (typeof drawIconToCanvas === 'function') item.append(drawIconToCanvas(icon, 1), document.createTextNode(label));
            else item.textContent = label;
            statusBar.appendChild(item);
        });
        const settings = createBitcnButton('设置', 'bitcn-status-button', () => {
            if (window.uiState) {
                window.uiState.activePanel = null;
                window.uiState.activeStoryPopup = null;
            }
            if (typeof toggleSettings === 'function') toggleSettings();
            if (typeof render === 'function') render();
        });
        const support = createBitcnButton('支持', 'bitcn-status-button bitcn-support-button', () => {
            if (typeof openSupport === 'function') openSupport();
            if (window.uiState) {
                window.uiState.activePanel = null;
                window.uiState.settingsOpen = false;
                window.uiState.activeStoryPopup = null;
            }
            if (typeof render === 'function') render(true);
        });
        statusBar.append(settings, support);
    }

    function getSelectedToolStatusLabel() {
        const label = typeof getToolLabel === 'function' ? getToolLabel(currentSelectedTool) : currentSelectedTool;
        const config = CROP_CONFIG?.[currentSelectedTool];
        if (config?.seedPrice !== undefined) return `种子 ${label}`;
        if (config?.price !== undefined) return `动物 ${label}`;
        return `工具 ${label}`;
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.status = statusPanel;
})();
