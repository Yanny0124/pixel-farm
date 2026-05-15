// Journal panel boundary. Heavy journal sections remain in the fallback renderer.
(function initJournalPanel() {
    function journal(context) {
        const { content, renderJournalDomFallback } = context || {};
        if (typeof renderJournalDomFallback === 'function') renderJournalDomFallback(content);
    }

    window.BitcnPanels = window.BitcnPanels || {};
    window.BitcnPanels.journal = journal;
})();
