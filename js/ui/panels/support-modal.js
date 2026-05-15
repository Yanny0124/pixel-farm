// Support modal renderer extracted from bitcn-dom-ui.js.
(function initSupportModal() {
    function support(context) {
        const {
            force = false,
            supportModal,
            getSupportOpen,
            setSupportOpen,
            getSupportRenderKey,
            setSupportRenderKey,
            supportGithubUrl,
            createBitcnButton,
            shieldDomScroll,
            renderSupportModal
        } = context || {};
        if (!supportModal || typeof createBitcnButton !== 'function') return;

        const supportOpen = typeof getSupportOpen === 'function' ? getSupportOpen() : false;
        supportModal.classList.toggle('is-open', !!supportOpen);
        if (!supportOpen) {
            if (supportModal.firstChild) supportModal.innerHTML = '';
            if (typeof setSupportRenderKey === 'function') setSupportRenderKey('');
            return;
        }
        const key = supportGithubUrl;
        if (!force && typeof getSupportRenderKey === 'function' && key === getSupportRenderKey() && supportModal.firstChild) return;
        if (typeof setSupportRenderKey === 'function') setSupportRenderKey(key);
        supportModal.innerHTML = '';
        const scrim = document.createElement('div');
        scrim.className = 'bitcn-support-scrim';
        const card = document.createElement('article');
        card.className = 'bitcn-support-card';
        const header = document.createElement('header');
        header.className = 'bitcn-panel-header';
        const title = document.createElement('strong');
        title.textContent = '支持 Pixel Farm';
        const hint = document.createElement('span');
        hint.textContent = '收藏项目，后续更新会更容易找到。';
        const close = createBitcnButton('×', 'bitcn-close-button', () => { if (typeof setSupportOpen === 'function') setSupportOpen(false); if (typeof renderSupportModal === 'function') renderSupportModal(true); });
        header.append(title, hint, close);
        const body = document.createElement('div');
        body.className = 'bitcn-support-body';
        ['如果你喜欢这个小游戏，欢迎给项目点一个 Star ⭐', '你的支持会让我更有动力继续更新内容和修复 Bug。'].forEach(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            body.appendChild(paragraph);
        });
        const actions = document.createElement('footer');
        actions.className = 'bitcn-story-actions';
        actions.append(
            createBitcnButton('去 GitHub 收藏', 'bitcn-mini-button', () => { window.open(supportGithubUrl, '_blank', 'noopener'); }),
            createBitcnButton('关闭', 'bitcn-mini-button', () => { if (typeof setSupportOpen === 'function') setSupportOpen(false); if (typeof renderSupportModal === 'function') renderSupportModal(true); })
        );
        card.append(header, body, actions);
        supportModal.append(scrim, card);
        scrim.addEventListener('click', () => { if (typeof setSupportOpen === 'function') setSupportOpen(false); if (typeof renderSupportModal === 'function') renderSupportModal(true); });
        if (typeof shieldDomScroll === 'function') shieldDomScroll(card);
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.support = support;
})();
