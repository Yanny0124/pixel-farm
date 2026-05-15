// Lightweight world-layout debugging. Off by default.
(function () {
    if (typeof window.DEBUG_LAYOUT === 'undefined') window.DEBUG_LAYOUT = false;
    if (typeof window.DEBUG_SELECTED_LAYOUT === 'undefined') window.DEBUG_SELECTED_LAYOUT = '';
    if (typeof window.DEBUG_LAYOUT_AUTO_CLOSE_MS === 'undefined') window.DEBUG_LAYOUT_AUTO_CLOSE_MS = 60000;

    const state = {
        items: [],
        changes: {},
        wasEnabled: false,
        autoCloseTimer: null,
        logTimer: null,
        pendingLog: null,
        lastActivityAt: 0,
        storageKey: 'pixelFarm.worldLayoutDebugOverrides'
    };

    function isEnabled() {
        const enabled = window.DEBUG_LAYOUT === true;
        if (enabled && !state.wasEnabled) startDebugSession();
        if (!enabled && state.wasEnabled) stopDebugSession(false);
        return enabled;
    }

    function cloneRect(rect) {
        return {
            x: Number(rect.x) || 0,
            y: Number(rect.y) || 0,
            w: Number(rect.w ?? rect.width) || 0,
            h: Number(rect.h ?? rect.height) || 0,
            anchor: rect.anchor || 'top-left'
        };
    }

    function beginFrame() {
        state.items = [];
    }

    function record(key, rect, meta = {}) {
        if (!key || !rect) return;
        const normalized = cloneRect(rect);
        if (normalized.w <= 0 || normalized.h <= 0) return;
        state.items.push({
            key,
            rect: normalized,
            configRect: meta.configRect ? cloneRect(meta.configRect) : normalized,
            visualRef: meta.visualRef || null,
            layoutEntry: meta.layoutEntry || null,
            path: meta.path || ''
        });
    }

    function draw(ctx) {
        if (!isEnabled()) return;
        const zoom = typeof camera !== 'undefined' ? camera.zoom || 1 : 1;
        const line = 1 / zoom;
        ctx.save();
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.font = `${12 / zoom}px monospace`;
        state.items.forEach(item => drawItem(ctx, item, line, zoom));
        ctx.restore();
    }

    function drawItem(ctx, item, line, zoom) {
        const selected = window.DEBUG_SELECTED_LAYOUT === item.key;
        const rect = item.rect;
        const config = item.configRect;
        const color = selected ? '#ffeb3b' : '#00e5ff';
        const label = `${item.key} x:${Math.round(config.x)} y:${Math.round(config.y)} w:${Math.round(config.w)} h:${Math.round(config.h)}`;
        const labelX = rect.x + 3 / zoom;
        const labelY = rect.y - 16 / zoom;
        const labelW = Math.max(54 / zoom, label.length * 7 / zoom);
        const labelH = 14 / zoom;

        ctx.lineWidth = selected ? line * 2 : line;
        ctx.setLineDash(selected ? [] : [6 / zoom, 4 / zoom]);
        ctx.strokeStyle = color;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(20, 24, 28, 0.78)';
        ctx.fillRect(labelX - 2 / zoom, labelY - 1 / zoom, labelW, labelH);
        ctx.fillStyle = color;
        ctx.fillText(label, labelX, labelY);
    }

    function getCanvasPoint(event, target) {
        const rect = target.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (target.width / rect.width),
            y: (event.clientY - rect.top) * (target.height / rect.height)
        };
    }

    function toWorldPoint(screen) {
        if (typeof screenToWorldPoint === 'function') return screenToWorldPoint(screen.x, screen.y);
        const activeCamera = typeof camera !== 'undefined' ? camera : { x: 0, y: 0, zoom: 1 };
        const zoom = activeCamera.zoom || 1;
        const activeCanvas = document.getElementById('gameCanvas');
        return {
            x: (screen.x - activeCanvas.width / 2) / zoom + activeCanvas.width / 2 - (activeCamera.x || 0),
            y: (screen.y - activeCanvas.height / 2) / zoom + activeCanvas.height / 2 - (activeCamera.y || 0)
        };
    }

    function pickItem(world) {
        for (let index = state.items.length - 1; index >= 0; index--) {
            const item = state.items[index];
            const rect = item.rect;
            if (world.x >= rect.x && world.x <= rect.x + rect.w && world.y >= rect.y && world.y <= rect.y + rect.h) {
                return item;
            }
        }
        return null;
    }

    function selectItem(item) {
        if (!item) return;
        markActivity();
        window.DEBUG_SELECTED_LAYOUT = item.key;
        logCurrentConfig(item, 'selected');
    }

    function handleClick(event) {
        if (!isEnabled()) return;
        const screen = getCanvasPoint(event, event.currentTarget);
        selectItem(pickItem(toWorldPoint(screen)));
    }

    function handleKeyDown(event) {
        if (!isEnabled()) return;
        if (event.key === 'Escape') {
            closeDebugMode('escape');
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const deltas = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1]
        };
        const item = getSelectedItem();
        const step = event.shiftKey ? 10 : 1;
        const scaleDelta = getScaleDelta(event);
        if (scaleDelta && item?.visualRef) {
            scaleItem(item, scaleDelta * step);
            event.preventDefault();
            event.stopPropagation();
            markActivity();
            saveChange(item);
            logCurrentConfig(item, 'scaled');
            return;
        }
        const delta = deltas[event.key];
        if (!delta || !window.DEBUG_SELECTED_LAYOUT) return;
        if (!item || !item.visualRef) return;
        item.visualRef.x = Math.round((Number(item.visualRef.x) || 0) + delta[0] * step);
        item.visualRef.y = Math.round((Number(item.visualRef.y) || 0) + delta[1] * step);
        event.preventDefault();
        event.stopPropagation();
        markActivity();
        saveChange(item);
        logCurrentConfig(item, 'moved');
    }

    function getSelectedItem() {
        if (!window.DEBUG_SELECTED_LAYOUT) return null;
        return state.items.find(candidate => candidate.key === window.DEBUG_SELECTED_LAYOUT) || null;
    }

    function getScaleDelta(event) {
        if (event.ctrlKey || event.metaKey) return 0;
        if (event.key === '+' || event.key === '=' || event.key === ']' || event.code === 'NumpadAdd') return 1;
        if (event.key === '-' || event.key === '_' || event.key === '[' || event.code === 'NumpadSubtract') return -1;
        return 0;
    }

    function scaleItem(item, amount) {
        const visual = item.visualRef;
        const widthKey = visual.w !== undefined || visual.width === undefined ? 'w' : 'width';
        const heightKey = visual.h !== undefined || visual.height === undefined ? 'h' : 'height';
        const minSize = Math.max(1, Number(window.DEBUG_LAYOUT_MIN_SIZE) || 4);
        const currentW = Number(visual[widthKey] ?? item.configRect.w) || minSize;
        const currentH = Number(visual[heightKey] ?? item.configRect.h) || minSize;
        visual[widthKey] = Math.max(minSize, Math.round(currentW + amount));
        visual[heightKey] = Math.max(minSize, Math.round(currentH + amount));
    }

    function getLogPayload(item) {
        if (item.layoutEntry) return item.layoutEntry;
        return { visual: item.visualRef || item.configRect };
    }

    function logCurrentConfig(item, action) {
        if (action === 'moved' || action === 'scaled') {
            scheduleChangeLog(item, action);
            return;
        }
        const payload = getLogPayload(item);
        const path = item.path ? ` ${item.path}` : '';
        console.log(`[LayoutDebug] ${action}: ${item.key}${path}`);
        console.log(JSON.stringify(payload, null, 4));
    }

    function scheduleChangeLog(item, action) {
        state.pendingLog = { item, action };
        if (state.logTimer) clearTimeout(state.logTimer);
        state.logTimer = setTimeout(flushChangeLog, 250);
    }

    function flushChangeLog() {
        const pending = state.pendingLog;
        state.pendingLog = null;
        state.logTimer = null;
        if (!pending?.item) return;
        const payload = getLogPayload(pending.item);
        const path = pending.item.path ? ` ${pending.item.path}` : '';
        console.log(`[LayoutDebug] ${pending.action}: ${pending.item.key}${path}`);
        console.log(JSON.stringify(payload, null, 4));
        copySelectedItem(pending.item);
        console.log('[LayoutDebug] saved locally. Use LayoutDebug.copyChanges() once when you want to paste changes back into world-layout.js.');
    }

    function startDebugSession() {
        state.wasEnabled = true;
        markActivity();
        scheduleAutoClose();
    }

    function stopDebugSession(clearSelected) {
        state.wasEnabled = false;
        if (state.autoCloseTimer) {
            clearTimeout(state.autoCloseTimer);
            state.autoCloseTimer = null;
        }
        if (clearSelected) window.DEBUG_SELECTED_LAYOUT = '';
    }

    function markActivity() {
        state.lastActivityAt = Date.now();
        scheduleAutoClose();
    }

    function scheduleAutoClose() {
        if (state.autoCloseTimer) clearTimeout(state.autoCloseTimer);
        state.autoCloseTimer = setTimeout(checkAutoClose, 1000);
    }

    function checkAutoClose() {
        if (!window.DEBUG_LAYOUT) return stopDebugSession(false);
        const timeout = Math.max(1000, Number(window.DEBUG_LAYOUT_AUTO_CLOSE_MS) || 60000);
        if (Date.now() - state.lastActivityAt >= timeout) {
            closeDebugMode('idle');
            return;
        }
        scheduleAutoClose();
    }

    function closeDebugMode(reason) {
        window.DEBUG_LAYOUT = false;
        stopDebugSession(true);
        console.log(`[LayoutDebug] closed${reason ? ` (${reason})` : ''}.`);
    }

    function setNestedValue(target, path, value) {
        let node = target;
        path.slice(0, -1).forEach(part => {
            if (!node[part] || typeof node[part] !== 'object') node[part] = {};
            node = node[part];
        });
        node[path[path.length - 1]] = value;
    }

    function deepMerge(target, source) {
        Object.entries(source || {}).forEach(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                deepMerge(target[key], value);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    function clonePlain(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function saveChange(item) {
        if (!item.path) return;
        const path = item.path.split('.');
        const payload = clonePlain(getLogPayload(item));
        setNestedValue(state.changes, path, payload);
        try {
            localStorage.setItem(state.storageKey, JSON.stringify(state.changes));
        } catch (error) {
            console.warn('[LayoutDebug] local save failed', error);
        }
    }

    function loadSavedChanges() {
        try {
            const raw = localStorage.getItem(state.storageKey);
            state.changes = raw ? JSON.parse(raw) : {};
        } catch (error) {
            state.changes = {};
            console.warn('[LayoutDebug] local load failed', error);
        }
        if (window.WORLD_LAYOUT) deepMerge(window.WORLD_LAYOUT, state.changes);
    }

    function formatChangesSnippet(changes = state.changes) {
        return `const WORLD_LAYOUT_OVERRIDES = ${JSON.stringify(changes, null, 4)};`;
    }

    async function copyText(text) {
        if (!text) return false;
        window.DEBUG_LAYOUT_CLIPBOARD = text;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (error) {
            return false;
        }
        return false;
    }

    function copySelectedItem(item) {
        if (!item.path) return;
        const patch = {};
        setNestedValue(patch, item.path.split('.'), clonePlain(getLogPayload(item)));
        copyText(formatChangesSnippet(patch));
    }

    function copyChanges() {
        const text = formatChangesSnippet();
        console.log(text);
        copyText(text).then(copied => {
            console.log(`[LayoutDebug] ${copied ? 'copied all changes to clipboard' : 'copy failed; use the console output above or window.DEBUG_LAYOUT_CLIPBOARD'}.`);
        });
        return clonePlain(state.changes);
    }

    function clearSavedChanges() {
        state.changes = {};
        try {
            localStorage.removeItem(state.storageKey);
        } catch (error) {
            console.warn('[LayoutDebug] local clear failed', error);
        }
        console.log('[LayoutDebug] cleared local layout overrides. Reload the page to return to source defaults.');
    }

    function install() {
        const target = document.getElementById('gameCanvas');
        if (!target || target.__layoutDebugInstalled) return;
        target.__layoutDebugInstalled = true;
        target.addEventListener('click', handleClick);
        window.addEventListener('keydown', handleKeyDown, true);
    }

    loadSavedChanges();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install);
    } else {
        install();
    }

    window.LayoutDebug = {
        beginFrame,
        record,
        draw,
        open: () => {
            window.DEBUG_LAYOUT = true;
            startDebugSession();
        },
        close: () => closeDebugMode('manual'),
        copyChanges,
        clearSavedChanges,
        getChanges: () => clonePlain(state.changes),
        getItems: () => state.items.slice()
    };
    window.copyWorldLayoutChanges = copyChanges;
    window.clearWorldLayoutDebugChanges = clearSavedChanges;
})();
