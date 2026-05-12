// Experimental React layer. The Canvas game remains the source of truth.
(function initReactOverlay() {
    const rootEl = document.getElementById('react-ui-root');
    if (!rootEl || !window.React || !window.ReactDOM) return;

    const e = React.createElement;
    const cropName = id => (typeof CROP_CONFIG !== 'undefined' && CROP_CONFIG[id]?.name) || id || '-';

    function readSnapshot() {
        try {
            const inventoryCount = typeof inventory !== 'undefined'
                ? Object.values(inventory).reduce((sum, value) => sum + (Number(value) || 0), 0)
                : 0;
            const openPanel = typeof uiState !== 'undefined' ? (uiState.activePanel || '无') : '无';
            const weatherName = typeof weather !== 'undefined' ? WEATHER_CONFIG[weather.type]?.name : '-';
            const tool = typeof currentSelectedTool !== 'undefined' ? cropName(currentSelectedTool) : '-';
            const shakeOn = typeof uiPreferences === 'undefined' || uiPreferences.screenShake !== false;
            return {
                coins: typeof coins !== 'undefined' ? coins : 0,
                level: typeof playerLevel !== 'undefined' ? playerLevel : 1,
                exp: typeof playerExp !== 'undefined' ? playerExp : 0,
                maxExp: typeof getMaxExp === 'function' ? getMaxExp() : 500,
                weather: weatherName || '-',
                tool,
                openPanel,
                inventoryCount,
                zoom: typeof camera !== 'undefined' ? Math.round((camera.zoom || 1) * 100) : 100,
                shake: shakeOn ? '开' : '关'
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    function App() {
        const [snapshot, setSnapshot] = React.useState(readSnapshot);
        const [open, setOpen] = React.useState(false);

        React.useEffect(() => {
            const timer = setInterval(() => setSnapshot(readSnapshot()), 500);
            return () => clearInterval(timer);
        }, []);

        if (snapshot.error) {
            return e('button', {
                className: 'react-pixel-toggle is-error',
                onClick: () => setSnapshot(readSnapshot)
            }, 'UI 重试');
        }

        return e('div', { className: `react-pixel-ui retro pixelated ${open ? 'is-open' : 'is-closed'}` },
            e('button', {
                className: 'react-pixel-toggle',
                onClick: () => setOpen(!open),
                title: 'React UI 实验面板'
            }, open ? '收起 UI' : 'React UI'),
            open && e('section', { className: 'react-pixel-panel' },
                e('div', { className: 'react-pixel-title' },
                    e('span', null, '牧场速览'),
                    e('small', null, '实验层')
                ),
                e('div', { className: 'react-pixel-grid' },
                    e('span', null, '金币'), e('b', null, snapshot.coins),
                    e('span', null, '等级'), e('b', null, `Lv.${snapshot.level}`),
                    e('span', null, '经验'), e('b', null, `${snapshot.exp}/${snapshot.maxExp}`),
                    e('span', null, '天气'), e('b', null, snapshot.weather),
                    e('span', null, '工具'), e('b', null, snapshot.tool),
                    e('span', null, '库存'), e('b', null, snapshot.inventoryCount),
                    e('span', null, '窗口'), e('b', null, snapshot.openPanel),
                    e('span', null, '视野'), e('b', null, `${snapshot.zoom}%`),
                    e('span', null, '震动'), e('b', null, snapshot.shake)
                ),
                e('div', { className: 'react-pixel-actions' },
                    e('button', { onClick: () => typeof saveGame === 'function' && saveGame() }, '保存'),
                    e('button', { onClick: () => typeof resetCameraZoom === 'function' && resetCameraZoom() }, '重置视野'),
                    e('button', { onClick: () => typeof toggleSettings === 'function' && toggleSettings() }, '设置'),
                    e('button', { onClick: () => typeof toggleScreenShake === 'function' && toggleScreenShake() }, '震动')
                )
            )
        );
    }

    ReactDOM.createRoot(rootEl).render(e(App));
})();
