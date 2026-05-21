// Lightweight loading overlay control for startup asset preloading.
function getLoadingElement(id) {
    return document.getElementById(id);
}

function showLoadingScreen() {
    const screen = getLoadingElement('loading-screen');
    if (!screen) return;
    screen.hidden = false;
    screen.classList.remove('is-hidden');
}

function updateLoadingScreen(progress = {}) {
    const loaded = Math.max(0, Number(progress.loaded) || 0);
    const total = Math.max(0, Number(progress.total) || 0);
    const ratio = total > 0 ? Math.min(1, loaded / total) : 0;
    const fill = getLoadingElement('loading-progress-fill');
    const count = getLoadingElement('loading-count');
    const stage = getLoadingElement('loading-stage');
    if (fill) fill.style.width = `${Math.round(ratio * 100)}%`;
    if (count) count.textContent = `正在加载素材 ${loaded} / ${total}`;
    if (stage && progress.stage) stage.textContent = progress.stage;
}

function hideLoadingScreen() {
    const screen = getLoadingElement('loading-screen');
    if (!screen) return;
    screen.classList.add('is-hidden');
    window.setTimeout(() => {
        screen.hidden = true;
    }, 220);
}
