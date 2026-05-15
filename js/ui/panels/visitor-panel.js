// Visitor panel boundary plus visitor arrival modal renderer.
(function initVisitorPanel() {
    function visitor(context) {
        const { content, renderVisitorsDomFallback } = context || {};
        if (typeof renderVisitorsDomFallback === 'function') renderVisitorsDomFallback(content);
    }

    function visitorArrival(context) {
        const { force = false, npcArrivalModal, getNpcArrivalRenderKey, setNpcArrivalRenderKey, createBitcnButton, shieldDomScroll, closeNpcArrival } = context || {};
        if (!npcArrivalModal || typeof createBitcnButton !== 'function') return;

        const popup = window.uiState?.npcArrivalPopup;
        npcArrivalModal.classList.toggle('is-open', !!popup);
        if (!popup) {
            if (npcArrivalModal.firstChild) npcArrivalModal.innerHTML = '';
            if (typeof setNpcArrivalRenderKey === 'function') setNpcArrivalRenderKey('');
            return;
        }
        const config = VISITOR_CONFIG?.[popup.id];
        const key = `${popup.id || ''}:${popup.line || ''}`;
        if (!force && typeof getNpcArrivalRenderKey === 'function' && key === getNpcArrivalRenderKey() && npcArrivalModal.firstChild) return;
        if (typeof setNpcArrivalRenderKey === 'function') setNpcArrivalRenderKey(key);
        npcArrivalModal.innerHTML = '';

        const scrim = document.createElement('div');
        scrim.className = 'bitcn-npc-arrival-scrim';
        const card = document.createElement('article');
        card.className = 'bitcn-npc-arrival-card';
        card.setAttribute('role', 'dialog');

        const portrait = document.createElement('div');
        portrait.className = 'bitcn-visitor-portrait';
        if (config?.portrait) {
            const img = document.createElement('img');
            img.src = config.portrait;
            img.alt = config.name || popup.id || '';
            portrait.appendChild(img);
        } else {
            const icon = document.createElement('span');
            icon.textContent = config?.icon || '?';
            portrait.appendChild(icon);
        }

        const body = document.createElement('div');
        body.className = 'bitcn-npc-arrival-body';
        const title = document.createElement('strong');
        title.textContent = `${config?.icon || ''} ${config?.name || '新的访客'} 到访`;
        const role = document.createElement('span');
        role.textContent = config?.role || '访客';
        const line = document.createElement('p');
        line.textContent = popup.line || config?.unlockHint || '有人来到了农场。';
        const actions = document.createElement('footer');
        actions.className = 'bitcn-story-actions';
        actions.append(
            createBitcnButton('去打招呼', 'bitcn-mini-button', () => closeNpcArrival?.(true)),
            createBitcnButton('稍后', 'bitcn-mini-button', () => closeNpcArrival?.(false))
        );
        body.append(title, role, line, actions);
        card.append(portrait, body);
        npcArrivalModal.append(scrim, card);
        scrim.addEventListener('click', () => closeNpcArrival?.(false));
        if (typeof shieldDomScroll === 'function') shieldDomScroll(card);
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.visitor = visitor;
    window.BitcnPanels.visitorArrival = visitorArrival;
})();
