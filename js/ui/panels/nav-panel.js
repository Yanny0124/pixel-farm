// Navigation panel renderer extracted from bitcn-dom-ui.js.
(function initNavPanel() {
    function navPanel(context) {
        const { nav, items, getNavRenderKey, setNavRenderKey, createBitcnButton, drawIconToCanvas, render } = context || {};
        if (!nav || !Array.isArray(items) || typeof createBitcnButton !== 'function') return;

        const modalOpen = !!(window.uiState?.settingsOpen || window.uiState?.activeStoryPopup || window.uiState?.npcArrivalPopup);
        nav.classList.toggle('is-hidden', modalOpen);
        if (modalOpen) {
            if (typeof setNavRenderKey === 'function') setNavRenderKey('hidden');
            return;
        }
        const key = items.map(item => `${item.id}:${window.uiState?.activePanel === item.id ? 1 : 0}`).join('|');
        if (typeof getNavRenderKey === 'function' && key === getNavRenderKey()) return;
        if (typeof setNavRenderKey === 'function') setNavRenderKey(key);
        nav.innerHTML = '';
        items.forEach(item => {
            const button = createBitcnButton(item.label, window.uiState?.activePanel === item.id ? 'is-active' : '', () => {
                if (typeof window.togglePanel === 'function') window.togglePanel(item.id);
                if (typeof render === 'function') render();
            });
            button.dataset.panel = item.id;
            if (typeof drawIconToCanvas === 'function') button.prepend(drawIconToCanvas(item.icon, 2));
            nav.appendChild(button);
        });
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.nav = navPanel;
})();
