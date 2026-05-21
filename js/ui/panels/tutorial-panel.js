// Tutorial panel renderer extracted from bitcn-dom-ui.js.
(function initTutorialPanel() {
    function tutorial(context) {
        const { force = false, tutorialPanel, getTutorialRenderKey, setTutorialRenderKey, createBitcnButton, render } = context || {};
        if (!tutorialPanel || typeof createBitcnButton !== 'function') return;

        const canShow = !window.uiState?.activePanel && !window.uiState?.settingsOpen && !window.uiState?.activeStoryPopup && !window.uiState?.npcArrivalPopup && typeof getTutorialStep === 'function';
        const rawStep = canShow ? getTutorialStep() : null;
        const step = rawStep ? getTutorialDisplayStep(rawStep) : null;
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

    function getTutorialDisplayStep(step) {
        if (step.index === 1) return getFirstSowStep(step);
        if (step.index === 2) {
            return {
                ...step,
                title: '当前目标：收获第一颗作物',
                body: '等它成熟，悬停看进度；成熟后点击收获。'
            };
        }
        if (step.index === 3) {
            return {
                ...step,
                title: '当前目标：交第一张订单',
                body: '收获进库存后去订单交付，先把金币赚起来。'
            };
        }
        if (step.index === 4) {
            return {
                ...step,
                title: '下一步：扩张农场',
                body: '完成订单赚钱后可以买动物；自动化里还能雇员工，后面解锁无人机。'
            };
        }
        if (step.index === 5) {
            return {
                ...step,
                title: '查看长期目标',
                body: '手札里有图鉴、天赋、访客和奇迹进度。'
            };
        }
        return step;
    }

    function getFirstSowStep(step) {
        const config = CROP_CONFIG?.[currentSelectedTool];
        if (config?.price !== undefined) {
            return {
                ...step,
                title: '先切回种子',
                body: '当前是动物工具。点底部【种子】，选胡萝卜，再点左侧农田。'
            };
        }
        if (currentSelectedTool === 'carrot') {
            return {
                ...step,
                title: '先播下第一颗胡萝卜',
                body: '胡萝卜已选好。点击左侧农田空地播种。'
            };
        }
        return {
            ...step,
            title: '先选胡萝卜',
            body: '点击底部【种子】，选择胡萝卜，再点左侧农田播种。'
        };
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.tutorial = tutorial;
})();
