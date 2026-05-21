// Lightweight frame metrics and render-only stress scenes.
(function initPerfDebug() {
    const FRAME_WINDOW = 90;
    const state = {
        enabled: false,
        sceneId: '',
        frames: [],
        frameStartedAt: 0,
        durations: {},
        counts: {},
        scene: null
    };

    function now() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    function beginFrame() {
        state.frameStartedAt = now();
        state.durations = {};
        state.counts = {};
    }

    function recordDuration(key, duration) {
        if (!Number.isFinite(duration)) return;
        state.durations[key] = (state.durations[key] || 0) + Math.max(0, duration);
    }

    function setCount(key, value) {
        state.counts[key] = Math.max(0, Math.round(Number(value) || 0));
    }

    function bumpCount(key, amount = 1) {
        state.counts[key] = (state.counts[key] || 0) + amount;
    }

    function endFrame() {
        if (!state.frameStartedAt) return;
        const frame = {
            total: now() - state.frameStartedAt,
            update: state.durations.update || 0,
            render: state.durations.render || 0,
            dom: state.durations.dom || 0,
            counts: { ...state.counts }
        };
        state.frames.push(frame);
        if (state.frames.length > FRAME_WINDOW) state.frames.shift();
    }

    function getAverages() {
        const samples = state.frames.length || 1;
        const total = state.frames.reduce((sum, frame) => sum + frame.total, 0) / samples;
        return {
            frame: total,
            fps: total > 0 ? Math.min(240, 1000 / total) : 0,
            update: state.frames.reduce((sum, frame) => sum + frame.update, 0) / samples,
            render: state.frames.reduce((sum, frame) => sum + frame.render, 0) / samples,
            dom: state.frames.reduce((sum, frame) => sum + frame.dom, 0) / samples
        };
    }

    function getLatestCounts() {
        return state.frames[state.frames.length - 1]?.counts || state.counts;
    }

    function drawOverlay(ctx) {
        if (!state.enabled || !ctx) return;
        const avg = getAverages();
        const counts = getLatestCounts();
        const lines = [
            `FPS ${avg.fps.toFixed(1)}  frame ${avg.frame.toFixed(1)}ms`,
            `update ${avg.update.toFixed(2)}  render ${avg.render.toFixed(2)}  DOM ${avg.dom.toFixed(2)}ms`,
            `crops ${counts.cropsDrawn || 0}/${counts.cropsSeen || 0}  animals ${counts.animalsDrawn || 0}/${counts.animalsSeen || 0}`,
            `workers ${counts.workersDrawn || 0}/${counts.workersSeen || 0}  fx ${counts.effectsDrawn || 0}/${counts.effectsSeen || 0}`,
            `crop cache ${counts.cropSpriteCacheHits || 0} hit / ${counts.cropSpriteCacheMisses || 0} miss`,
            `scene ${state.sceneId || 'live'}  benchmark is render-only`
        ];
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(27, 34, 31, 0.82)';
        ctx.fillRect(14, 58, 372, 126);
        ctx.strokeStyle = 'rgba(231, 240, 202, 0.72)';
        ctx.strokeRect(14.5, 58.5, 371, 125);
        ctx.fillStyle = '#f4f1c9';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((line, index) => ctx.fillText(line, 24, 68 + index * 18));
        ctx.restore();
    }

    function startBenchmark(sceneId = 'combined') {
        state.sceneId = sceneId;
        state.scene = buildScene(sceneId);
        state.enabled = true;
        console.info(`[PerfDebug] Started render-only "${sceneId}" benchmark. Use PerfDebug.stopBenchmark() to return to live rendering.`);
        return describeScene();
    }

    function stopBenchmark() {
        state.sceneId = '';
        state.scene = null;
        console.info('[PerfDebug] Benchmark stopped.');
    }

    function getBenchmarkCell(row, col, cell) {
        return state.scene?.cells?.[row]?.[col] || cell;
    }

    function getBenchmarkAnimals() {
        return state.scene?.animals || [];
    }

    function getBenchmarkWorkers() {
        return state.scene?.workers || [];
    }

    function getBenchmarkEffects(kind) {
        return state.scene?.effects?.[kind] || [];
    }

    function buildScene(sceneId) {
        const id = String(sceneId || 'combined').toLowerCase();
        return {
            cells: ['mature', 'combined'].includes(id) ? buildMatureFarmCells() : null,
            animals: ['units', 'combined'].includes(id) ? buildAnimals(160) : [],
            workers: ['units', 'combined'].includes(id) ? buildWorkers(48) : [],
            effects: ['effects', 'combined'].includes(id) ? buildEffects() : {}
        };
    }

    function buildMatureFarmCells() {
        return Array.from({ length: ROWS }, (_, row) => Array.from({ length: COLS }, (_, col) => ({
            state: 2,
            cropType: 'carrot',
            timer: 0
        })));
    }

    function buildAnimals(count) {
        const types = ['chicken', 'sheep', 'cow', 'pig', 'bee'];
        const cols = Math.ceil(Math.sqrt(count));
        return Array.from({ length: count }, (_, index) => {
            const type = types[index % types.length];
            const inFarm = type === 'bee';
            const areaX = inFarm ? farmStartX : ranchStartX;
            const areaY = inFarm ? farmStartY : ranchStartY;
            const areaW = inFarm ? (typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth) : ranchWidth;
            const areaH = inFarm ? (typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight) : ranchHeight;
            const row = Math.floor(index / cols);
            return {
                type,
                x: areaX + 18 + ((index % cols) / Math.max(1, cols - 1)) * Math.max(1, areaW - 36),
                y: areaY + 18 + ((row % cols) / Math.max(1, cols - 1)) * Math.max(1, areaH - 36),
                vx: index % 2 ? 0.55 : -0.55,
                vy: 0,
                timer: 0
            };
        });
    }

    function buildWorkers(count) {
        const cols = Math.ceil(Math.sqrt(count));
        const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
        const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
        return Array.from({ length: count }, (_, index) => {
            const row = Math.floor(index / cols);
            const type = index % 4 === 0 ? 'drone' : 'human';
            return {
                type,
                x: farmStartX + 16 + ((index % cols) / Math.max(1, cols - 1)) * Math.max(1, farmW - 32),
                y: farmStartY + 18 + ((row % cols) / Math.max(1, cols - 1)) * Math.max(1, farmH - 36),
                vx: index % 2 ? 0.8 : -0.8,
                vy: 0.2,
                target: index % 3 === 0 ? { kind: 'harvest' } : { kind: 'patrol' }
            };
        });
    }

    function buildEffects() {
        const particles = [];
        const texts = [];
        const cells = [];
        const farmW = typeof getFarmVisualWidth === 'function' ? getFarmVisualWidth() : gridWidth;
        const farmH = typeof getFarmVisualHeight === 'function' ? getFarmVisualHeight() : gridHeight;
        for (let index = 0; index < 180; index++) {
            particles.push({
                x: farmStartX + 12 + ((index * 37) % Math.max(1, farmW - 24)),
                y: farmStartY + 12 + ((index * 29) % Math.max(1, farmH - 24)),
                life: 25 + index % 20,
                color: index % 2 ? '#f1c40f' : '#e67e22'
            });
        }
        for (let index = 0; index < 40; index++) {
            texts.push({
                x: farmStartX + 18 + ((index * 61) % Math.max(1, farmW - 36)),
                y: farmStartY + 18 + ((index * 43) % Math.max(1, farmH - 36)),
                text: '+crop',
                life: 40 + index % 30,
                color: '#f1c40f'
            });
        }
        for (let row = 0; row < ROWS && cells.length < 40; row++) {
            for (let col = 0; col < COLS && cells.length < 40; col += 2) cells.push({ row, col });
        }
        return {
            particles,
            texts,
            bursts: [{ cells, life: 52, maxLife: 70 }]
        };
    }

    function describeScene() {
        return {
            enabled: state.enabled,
            scene: state.sceneId || 'live',
            commands: [
                'PerfDebug.enable(true)',
                "PerfDebug.startBenchmark('mature')",
                "PerfDebug.startBenchmark('units')",
                "PerfDebug.startBenchmark('effects')",
                "PerfDebug.startBenchmark('combined')",
                'PerfDebug.stopBenchmark()'
            ]
        };
    }

    window.PerfDebug = {
        enable(value = true) {
            state.enabled = !!value;
            return describeScene();
        },
        toggle() {
            state.enabled = !state.enabled;
            return describeScene();
        },
        beginFrame,
        recordDuration,
        setCount,
        bumpCount,
        endFrame,
        drawOverlay,
        getAverages,
        describeScene,
        startBenchmark,
        stopBenchmark,
        getBenchmarkCell,
        getBenchmarkAnimals,
        getBenchmarkWorkers,
        getBenchmarkEffects
    };

    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('perf')) state.enabled = true;
})();
