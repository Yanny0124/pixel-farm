// Story modal renderer extracted from bitcn-dom-ui.js.
(function initStoryModal() {
    function story(context) {
        const {
            storyModal,
            getStoryRenderKey,
            setStoryRenderKey,
            getStoryBodyScrollTop,
            setStoryBodyScrollTop,
            getNextStoryAllowedAt,
            createBitcnButton,
            shieldDomScroll,
            closeStoryDom,
            render
        } = context || {};
        if (!storyModal || typeof createBitcnButton !== 'function') return;

        const state = window.uiState;
        if (!state) return;
        if (!state.activeStoryPopup && state.storyPopupQueue?.length > 0 && Date.now() >= (typeof getNextStoryAllowedAt === 'function' ? getNextStoryAllowedAt() : 0)) {
            state.activeStoryPopup = state.storyPopupQueue.shift();
        }
        const letter = state.activeStoryPopup;
        storyModal.classList.toggle('is-open', !!letter);
        if (!letter) {
            if ((typeof getStoryRenderKey === 'function' && getStoryRenderKey()) || storyModal.firstChild) {
                storyModal.innerHTML = '';
                if (typeof setStoryRenderKey === 'function') setStoryRenderKey('');
                if (typeof setStoryBodyScrollTop === 'function') setStoryBodyScrollTop(0);
            }
            return;
        }
        const queueCount = state.storyPopupQueue?.length || 0;
        const stableKey = String(letter.id || letter.title || 'story');
        if (typeof getStoryRenderKey === 'function' && stableKey === getStoryRenderKey() && storyModal.firstChild) {
            const hint = storyModal.querySelector('[data-story-hint]');
            if (hint) hint.textContent = queueCount > 0 ? `已收进手札 · 后面还有 ${queueCount} 封` : '已收进手札';
            return;
        }
        const previousBody = storyModal.querySelector('.bitcn-story-body');
        if (previousBody && typeof setStoryBodyScrollTop === 'function') setStoryBodyScrollTop(previousBody.scrollTop);
        if (typeof setStoryRenderKey === 'function') setStoryRenderKey(stableKey);
        storyModal.innerHTML = '';
        const scrim = document.createElement('div');
        scrim.className = 'bitcn-story-scrim';
        const card = document.createElement('article');
        card.className = 'bitcn-story-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = `新信件：${letter.title || ''}`;
        const hint = document.createElement('span');
        hint.dataset.storyHint = 'true';
        hint.textContent = queueCount > 0 ? `已收进手札 · 后面还有 ${queueCount} 封` : '已收进手札';
        const close = createBitcnButton('×', 'bitcn-close-button', () => closeStoryDom?.(true));
        header.append(title, hint, close);
        const body = document.createElement('div');
        body.className = 'bitcn-story-body';
        body.tabIndex = 0;
        const subtitle = document.createElement('h3');
        subtitle.textContent = `${letter.id || ''} ${letter.title || ''}`.trim();
        body.appendChild(subtitle);
        const lines = Array.isArray(letter.body) ? letter.body : [String(letter.body || '')];
        lines.forEach(line => {
            const paragraph = document.createElement('p');
            paragraph.textContent = line;
            body.appendChild(paragraph);
        });
        body.addEventListener('scroll', () => { if (typeof setStoryBodyScrollTop === 'function') setStoryBodyScrollTop(body.scrollTop); }, { passive: true });
        body.addEventListener('wheel', event => { event.stopPropagation(); }, { passive: true });
        body.addEventListener('touchmove', event => { event.stopPropagation(); }, { passive: true });
        const foot = document.createElement('footer');
        foot.className = 'bitcn-story-actions';
        const note = document.createElement('span');
        note.textContent = '可在“手札 / 爷爷的信”重新阅读。';
        const open = createBitcnButton('打开手札', 'bitcn-mini-button', () => {
            state.activeTabs.journal = 'letters';
            state.activeStoryLetter = letter.id;
            const letterIndex = typeof STORY_LETTERS !== 'undefined' ? STORY_LETTERS.findIndex(item => item.id === letter.id) : -1;
            if (letterIndex >= 0) state.storyListPage = Math.floor(letterIndex / 6);
            closeStoryDom?.(true, false);
            state.activePanel = 'journal';
            state.settingsOpen = false;
            if (typeof markTutorialJournalOpened === 'function') markTutorialJournalOpened();
            if (typeof render === 'function') render(true);
        });
        const skipAll = createBitcnButton(queueCount > 0 ? `全部收下(${queueCount + 1})` : '全部收下', 'bitcn-mini-button', () => closeStoryDom?.(true, true));
        const take = createBitcnButton('收下', 'bitcn-mini-button', () => closeStoryDom?.(true));
        foot.append(note, open, skipAll, take);
        card.append(header, body, foot);
        storyModal.append(scrim, card);
        scrim.addEventListener('click', () => closeStoryDom?.(true));
        card.addEventListener('wheel', event => {
            event.stopPropagation();
            if (!event.target.closest('.bitcn-story-body')) {
                body.scrollTop += event.deltaY;
                if (typeof setStoryBodyScrollTop === 'function') setStoryBodyScrollTop(body.scrollTop);
                event.preventDefault();
            }
        }, { passive: false });
        ['pointerdown', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchmove', 'touchend'].forEach(type => {
            card.addEventListener(type, event => event.stopPropagation(), { passive: true });
        });
        requestAnimationFrame(() => {
            body.scrollTop = typeof getStoryBodyScrollTop === 'function' ? getStoryBodyScrollTop() : 0;
            body.focus({ preventScroll: true });
        });
        if (typeof shieldDomScroll === 'function') shieldDomScroll(card);
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.story = story;
})();
