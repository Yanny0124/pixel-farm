// Orders panel renderer extracted from bitcn-dom-ui.js.
(function initOrdersPanel() {
    function orders(context) {
        const { content, renderOrdersDomFallback } = context || {};
        if (typeof renderOrdersDomFallback === 'function') renderOrdersDomFallback(content);
    }

    function orderDock(context) {
        const { force = false, orderDock, getOrderRenderKey, setOrderRenderKey, createBitcnButton, render, renderOrderDock } = context || {};
        if (!orderDock || typeof createBitcnButton !== 'function') return;

        const open = !window.uiState?.activePanel && !window.uiState?.settingsOpen && !window.uiState?.activeStoryPopup && !window.uiState?.npcArrivalPopup;
        orderDock.classList.toggle('is-hidden', !open);
        if (!open) {
            orderDock.innerHTML = '';
            if (typeof setOrderRenderKey === 'function') setOrderRenderKey('hidden');
            return;
        }
        const key = (tasks || []).map(task => {
            if (!task) return 'empty';
            if (typeof getTaskRequirementLabel === 'function') return `${getTaskRequirementLabel(task, true)}:${task.reward}:${task.exp}`;
            return `${task.item}:${task.amount}:${task.reward}:${inventory[task.item] || 0}`;
        }).join('|') + `|refresh:${typeof getOrderRefreshLeftMs === 'function' ? Math.ceil(getOrderRefreshLeftMs() / 1000) : 0}`;
        if (!force && typeof getOrderRenderKey === 'function' && key === getOrderRenderKey()) return;
        if (typeof setOrderRenderKey === 'function') setOrderRenderKey(key);
        orderDock.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'bitcn-order-header';
        const title = document.createElement('strong');
        title.textContent = '订单看板';
        const more = createBitcnButton('详情', 'bitcn-mini-button', () => { window.uiState.activePanel = 'orders'; window.uiState.settingsOpen = false; if (typeof render === 'function') render(); });
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
            const button = createBitcnButton(enough ? '交付' : '等待', 'bitcn-mini-button', () => { if (!enough) return; deliverTask(index); if (typeof renderOrderDock === 'function') renderOrderDock(true); }, !enough);
            card.append(text, button);
            list.appendChild(card);
        });
        orderDock.appendChild(list);
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.orders = orders;
    window.BitcnPanels.orderDock = orderDock;
})();
