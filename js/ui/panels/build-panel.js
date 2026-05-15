// Build panel boundary. Heavy build sections remain in the fallback renderer.
(function initBuildPanel() {
    function build(context) {
        const { content, renderBuildDomFallback } = context || {};
        if (typeof renderBuildDomFallback === 'function') renderBuildDomFallback(content);
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.build = build;
})();
