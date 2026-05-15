// Market panel renderer extracted from bitcn-dom-ui.js.
(function initMarketPanel() {
    function market(context) {
        const {
            force = false,
            marketPanel,
            marketAmounts,
            getActiveMarketItem,
            setActiveMarketItem,
            getMarketScrollTop,
            setMarketScrollTop,
            setMarketScrollFreezeUntil,
            getMarketRenderKeyValue,
            setMarketRenderKey,
            createBitcnButton,
            makeBorderPieces,
            getMarketRows,
            getUnitPrice,
            clampAmount,
            render,
            renderMarketPanel
        } = context || {};
        if (!marketPanel || !marketAmounts || typeof createBitcnButton !== 'function') return;

        const modalOpen = !!(window.uiState?.settingsOpen || window.uiState?.activeStoryPopup || window.uiState?.npcArrivalPopup);
        const open = window.uiState?.activePanel === 'market' && !modalOpen;
        marketPanel.classList.toggle('is-open', !!open);
        if (!open) {
            marketPanel.innerHTML = '';
            if (typeof setMarketRenderKey === 'function') setMarketRenderKey('');
            return;
        }
        const rows = typeof getMarketRows === 'function' ? getMarketRows() : [];
        let activeMarketItem = typeof getActiveMarketItem === 'function' ? getActiveMarketItem() : '';
        if (rows.length && !rows.includes(activeMarketItem)) {
            activeMarketItem = rows[0];
            if (typeof setActiveMarketItem === 'function') setActiveMarketItem(activeMarketItem);
        }
        rows.forEach(id => {
            if (!marketAmounts[id]) marketAmounts[id] = 1;
            marketAmounts[id] = typeof clampAmount === 'function' ? clampAmount(id, marketAmounts[id]) : marketAmounts[id];
        });
        const amountKey = rows.map(id => `${id}:${marketAmounts[id] || 1}`).join('|');
        const key = [window.uiState?.activePanel || '', rows.join(','), activeMarketItem, amountKey].join('|') + `|force:${force ? 1 : 0}`;
        if (!force && typeof getMarketRenderKeyValue === 'function' && key === getMarketRenderKeyValue()) return;
        if (typeof setMarketRenderKey === 'function') setMarketRenderKey(key);
        marketPanel.innerHTML = '';
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = '市场';
        const hint = document.createElement('span');
        hint.textContent = '输入数量后出售';
        const close = createBitcnButton('×', 'bitcn-close-button', () => {
            if (typeof window.togglePanel === 'function') window.togglePanel('market');
            if (typeof render === 'function') render();
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
            const unitPrice = typeof getUnitPrice === 'function' ? getUnitPrice(activeMarketItem) : 0;
            const history = window.BitcnMarketChart?.normalizeHistory
                ? window.BitcnMarketChart.normalizeHistory(state, config.basePrice || unitPrice)
                : (state.history || [unitPrice]);
            const currentPrice = unitPrice;
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
            if (typeof setMarketScrollTop === 'function') setMarketScrollTop(list.scrollTop);
            if (typeof setMarketScrollFreezeUntil === 'function') setMarketScrollFreezeUntil(Date.now() + 900);
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
                if (typeof setActiveMarketItem === 'function') setActiveMarketItem(id);
                if (typeof renderMarketPanel === 'function') renderMarketPanel(true);
            });
            const meta = document.createElement('div');
            meta.className = 'bitcn-market-meta';
            const name = document.createElement('strong');
            name.textContent = `${config.icon || ''} ${config.name}`;
            const sub = document.createElement('span');
            const unitPrice = typeof getUnitPrice === 'function' ? getUnitPrice(id) : 0;
            const unitPriceText = typeof formatCoins === 'function' ? formatCoins(unitPrice) : `${unitPrice}币`;
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
        list.scrollTop = typeof getMarketScrollTop === 'function' ? getMarketScrollTop() : 0;
        if (typeof makeBorderPieces === 'function') makeBorderPieces().forEach(piece => marketPanel.appendChild(piece.cloneNode()));
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.market = market;
})();
