// Small DOM helpers for UI code. Declares utilities only; it does not attach
// them to the current interface unless callers opt in.
(function initUiHelpers() {
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function clear(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function safeCall(label, fn) {
        try {
            if (typeof fn === 'function') return fn();
        } catch (error) {
            console.error(`[UI] ${label || 'action'} failed`, error);
        }
        return undefined;
    }

    function button(label, className, onClick, disabled) {
        const node = el('button', className, label);
        node.type = 'button';
        node.disabled = !!disabled;
        node.addEventListener('pointerdown', event => event.stopPropagation());
        node.addEventListener('click', event => {
            event.stopPropagation();
            safeCall(label, () => onClick?.(event));
        });
        return node;
    }

    function img(src, className, alt) {
        const node = el('img', className);
        node.src = src || '';
        node.alt = alt || '';
        node.addEventListener('error', () => {
            node.hidden = true;
        }, { once: true });
        return node;
    }

    function safeRender(cache, key, renderFn) {
        if (!cache || typeof renderFn !== 'function') return false;
        if (cache.key === key) return false;
        cache.key = key;
        renderFn();
        return true;
    }

    window.UIHelpers = {
        el,
        clear,
        button,
        img,
        safeRender,
        safeCall
    };
})();
