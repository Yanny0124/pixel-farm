// ==========================================
// UI/Bitcn Market Chart: 市场价格折线图
// ==========================================
(function initBitcnMarketChart() {
    function normalizeHistory(state, fallbackPrice = 1) {
        const current = state?.price || fallbackPrice || 1;
        const history = Array.isArray(state?.history)
            ? state.history.map(point => typeof point === 'number' ? point : point?.price).filter(price => Number.isFinite(price) && price > 0)
            : [];
        return history.length ? history : [current];
    }

    function draw(canvas, prices) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(320, Math.floor(rect.width || 520));
        const height = Math.max(150, Math.floor(rect.height || 180));
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = Math.max(1, max - min);
        const pad = 22;
        const plotW = width - pad * 2;
        const plotH = height - pad * 2;

        ctx.fillStyle = '#fff8dc';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(125, 93, 52, 0.22)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(pad, y);
            ctx.lineTo(width - pad, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#6f9b4d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        prices.forEach((price, index) => {
            const x = prices.length === 1 ? pad + plotW : pad + (plotW * index) / (prices.length - 1);
            const y = pad + plotH - ((price - min) / range) * plotH;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const latest = prices[prices.length - 1];
        const previous = prices[prices.length - 2] || latest;
        ctx.fillStyle = latest >= previous ? '#4f8b3f' : '#b85c4a';
        const x = prices.length === 1 ? pad + plotW : width - pad;
        const y = pad + plotH - ((latest - min) / range) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    window.BitcnMarketChart = { normalizeHistory, draw };
})();
