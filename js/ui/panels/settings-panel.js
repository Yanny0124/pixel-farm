// Settings panel renderer extracted from bitcn-dom-ui.js.
(function initSettingsPanel() {
    function settings(context) {
        const {
            force = false,
            settingsPanel,
            getSettingsRenderKey,
            setSettingsRenderKey,
            createBitcnButton,
            makeBorderPieces,
            render,
            renderSettingsPanel
        } = context || {};

        if (!settingsPanel || typeof createBitcnButton !== 'function' || typeof makeBorderPieces !== 'function') return;

        const open = !!window.uiState?.settingsOpen;
        settingsPanel.classList.toggle('is-open', open);
        if (!open) {
            settingsPanel.innerHTML = '';
            if (typeof setSettingsRenderKey === 'function') setSettingsRenderKey('');
            return;
        }
        const key = [typeof getClockLabel === 'function' ? getClockLabel() : '', Math.round(((typeof camera !== 'undefined' && camera.zoom) || 1) * 100), typeof audioEnabled !== 'undefined' && audioEnabled ? 1 : 0, window.uiPreferences?.screenShake === false ? 0 : 1].join('|');
        if (!force && typeof getSettingsRenderKey === 'function' && key === getSettingsRenderKey()) return;
        if (typeof setSettingsRenderKey === 'function') setSettingsRenderKey(key);
        settingsPanel.innerHTML = '';
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = '设置';
        const hint = document.createElement('span');
        hint.textContent = '保存、视野、音效';
        const close = createBitcnButton('×', 'bitcn-close-button', () => { if (typeof toggleSettings === 'function') toggleSettings(false); if (typeof render === 'function') render(); });
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
            createBitcnButton('手动保存', 'bitcn-settings-button', () => { if (typeof saveGame === 'function') saveGame(); if (typeof effectText !== 'undefined') { effectText = '已保存'; effectAlpha = 1.0; } if (typeof renderSettingsPanel === 'function') renderSettingsPanel(true); }),
            createBitcnButton('重置视野', 'bitcn-settings-button', () => { if (typeof resetCameraZoom === 'function') resetCameraZoom(); if (typeof renderSettingsPanel === 'function') renderSettingsPanel(true); }),
            createBitcnButton(typeof audioEnabled !== 'undefined' && audioEnabled ? '音效 开' : '音效 关', 'bitcn-settings-button', () => { if (typeof toggleAudio === 'function') toggleAudio(); if (typeof renderSettingsPanel === 'function') renderSettingsPanel(true); }),
            createBitcnButton(window.uiPreferences?.screenShake === false ? '震动 关' : '震动 开', 'bitcn-settings-button', () => { if (typeof toggleScreenShake === 'function') toggleScreenShake(); if (typeof renderSettingsPanel === 'function') renderSettingsPanel(true); }),
            createBitcnButton('重置世界', 'bitcn-settings-button is-danger', () => { if (typeof resetGame === 'function') resetGame(); if (typeof renderSettingsPanel === 'function') renderSettingsPanel(true); })
        );
        const note = document.createElement('p');
        note.className = 'bitcn-settings-note';
        note.textContent = '关闭震动后，收割、共振和稀有发现都不会晃动画面。';
        settingsPanel.append(header, stats, actions, note);
        makeBorderPieces().forEach(piece => settingsPanel.appendChild(piece.cloneNode()));
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.settings = settings;
})();
