// Essential image preloading for the first playable frame.
const GAME_ASSET_PRELOAD_TIMEOUT_MS = 9000;

function preloadGameAssets(onProgress) {
    const groups = getEssentialAssetGroups();
    const total = groups.reduce((count, group) => count + group.paths.length, 0);
    let loaded = 0;
    let stopped = false;

    const report = stage => {
        if (stopped || typeof onProgress !== 'function') return;
        onProgress({ loaded, total, stage });
    };

    const preload = async () => {
        for (const group of groups) {
            report(group.stage);
            await Promise.all(group.paths.map(path => waitForCachedImage(path).then(() => {
                loaded++;
                report(group.stage);
            })));
        }
        report('准备农田');
        return { loaded, total, timedOut: false };
    };

    let timeoutId = 0;
    const timeout = new Promise(resolve => {
        timeoutId = window.setTimeout(() => {
            stopped = true;
            console.warn(`[Assets] Essential preload timed out after ${GAME_ASSET_PRELOAD_TIMEOUT_MS}ms. Starting with lazy fallbacks.`);
            resolve({ loaded, total, timedOut: true });
        }, GAME_ASSET_PRELOAD_TIMEOUT_MS);
    });

    report(groups[0]?.stage || '准备农田');
    return Promise.race([preload(), timeout]).finally(() => {
        window.clearTimeout(timeoutId);
    });
}

function getEssentialAssetGroups() {
    return [
        {
            stage: '加载背景',
            paths: uniqueAssetPaths([getWorldBackgroundImagePath()])
        },
        {
            stage: '加载建筑',
            paths: uniqueAssetPaths([
                ...collectLeveledAssetPaths(GENERATED_SPRITES.ranch, RANCH_BUILDING_CONFIG),
                ...collectLeveledAssetPaths(GENERATED_SPRITES.processing, PROCESSING_BUILDING_CONFIG),
                ...collectMiracleAssetPaths()
            ])
        },
        {
            stage: '加载动物',
            paths: uniqueAssetPaths([
                ...GENERATED_SPRITES.workers.human,
                ...GENERATED_SPRITES.workers.drone
            ])
        },
        {
            stage: '加载访客',
            paths: uniqueAssetPaths(Object.values(VISITOR_CONFIG || {}).map(visitor => visitor.portrait))
        }
    ];
}

function collectLeveledAssetPaths(spriteGroup, configGroup) {
    if (!spriteGroup || !configGroup) return [];
    return Object.keys(spriteGroup).flatMap(id => {
        const getPath = spriteGroup[id];
        const maxLevel = Number(configGroup[id]?.maxLevel) || 1;
        if (typeof getPath !== 'function') return [];
        const paths = [];
        for (let level = 1; level <= maxLevel; level++) {
            paths.push(getPath(level));
        }
        return paths;
    });
}

function collectMiracleAssetPaths() {
    return Object.keys(GENERATED_SPRITES.miracles || {}).flatMap(id => {
        const getPath = GENERATED_SPRITES.miracles[id];
        const maxStage = MIRACLE_CONFIG[id]?.stages?.length || 1;
        if (typeof getPath !== 'function') return [];
        const paths = [];
        for (let stage = 1; stage <= maxStage; stage++) {
            paths.push(getPath(stage));
        }
        return paths;
    });
}

function uniqueAssetPaths(paths) {
    return Array.from(new Set((paths || []).filter(Boolean)));
}

function waitForCachedImage(path) {
    const image = getGeneratedImage(path);
    if (!image) return Promise.resolve(false);
    if (image.complete) {
        if (!image.naturalWidth) warnAssetFailure(path);
        return Promise.resolve(!!image.naturalWidth);
    }
    return new Promise(resolve => {
        const finish = ok => {
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
            if (!ok) warnAssetFailure(path);
            resolve(ok);
        };
        const handleLoad = () => finish(true);
        const handleError = () => finish(false);
        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleError, { once: true });
    });
}

function warnAssetFailure(path) {
    console.warn(`[Assets] Failed to load image: ${path}`);
}
