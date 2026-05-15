// Tutorial panel renderer extracted from bitcn-dom-ui.js.
(function initTutorialPanel() {
    function tutorial(context) {
        const { force = false, tutorialPanel, getTutorialRenderKey, setTutorialRenderKey, createBitcnButton, render } = context || {};
        if (!tutorialPanel || typeof createBitcnButton !== 'function') return;

        const canShow = !window.uiState?.activePanel && !window.uiState?.settingsOpen && !window.uiState?.activeStoryPopup && !window.uiState?.npcArrivalPopup && typeof getTutorialStep === 'function';
        const step = canShow ? getTutorialStep() : null;
        tutorialPanel.classList.toggle('is-open', !!step);
        if (!step) {
            tutorialPanel.innerHTML = '';
            if (typeof setTutorialRenderKey === 'function') setTutorialRenderKey('');
            return;
        }
        const key = `${step.index}:${step.title}:${step.body}:${step.actionLabel || ''}`;
        if (!force && typeof getTutorialRenderKey === 'function' && key === getTutorialRenderKey()) return;
        if (typeof setTutorialRenderKey === 'function') setTutorialRenderKey(key);
        tutorialPanel.innerHTML = '';
        const tag = document.createElement('small');
        tag.textContent = `新手目标 ${step.index}/5`;
        const title = document.createElement('strong');
        title.textContent = step.title || '';
        const body = document.createElement('span');
        body.textContent = step.body || '';
        tutorialPanel.append(tag, title, body);
        if (step.action) {
            tutorialPanel.appendChild(createBitcnButton(step.actionLabel || '前往', 'bitcn-mini-button', () => { step.action(); if (typeof render === 'function') render(true); }));
        }
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.tutorial = tutorial;
})();
