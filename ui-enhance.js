/* =========================================================================
   UI enhancement layer — purely presentational.
   Loaded AFTER app.js. Never redefines calculation/business-logic functions;
   only improves how feedback is shown to the user (toasts) and adds the
   sidebar collapse affordance for desktop.
   ========================================================================= */
(function () {
    "use strict";

    /* ---------------- Toast notifications (replaces window.alert) ---------------- */
    function iconFor(type) {
        if (type === 'success') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
        if (type === 'error') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>';
    }

    function classifyMessage(msg) {
        var s = String(msg || '');
        var negativeHints = ['خطا', 'نامعتبر', 'اشتباه', 'وارد کنید', 'نیاز است', 'ناموفق', 'برقرار نشد', 'مطابقت ندارند', 'دقیقاً', 'قابل بررسی نبود'];
        for (var i = 0; i < negativeHints.length; i++) {
            if (s.indexOf(negativeHints[i]) !== -1) return 'error';
        }
        return 'success';
    }

    function showToast(message, type) {
        var stack = document.getElementById('toastStack');
        if (!stack) { return; }
        type = type || classifyMessage(message);
        var el = document.createElement('div');
        el.className = 'toast-item toast-' + type;
        el.innerHTML =
            '<span class="toast-icon">' + iconFor(type) + '</span>' +
            '<span class="toast-msg"></span>';
        el.querySelector('.toast-msg').textContent = String(message);
        stack.appendChild(el);
        var ttl = setTimeout(remove, 3800);
        el.addEventListener('click', remove);
        function remove() {
            clearTimeout(ttl);
            el.classList.add('leaving');
            setTimeout(function () { el.remove(); }, 220);
        }
    }

    window.showToast = showToast;

    var nativeAlert = window.alert.bind(window);
    window.alert = function (message) {
        try { showToast(message); } catch (e) { nativeAlert(message); }
    };

    /* ---------------- Sidebar collapse (desktop only) ---------------- */
    var SIDEBAR_KEY = 'karshenas_sidebar_collapsed';
    function applySidebarState() {
        var shell = document.getElementById('appShell');
        if (!shell) return;
        var collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
        shell.setAttribute('data-sidebar-collapsed', collapsed ? 'true' : 'false');
    }
    window.toggleSidebarCollapse = function () {
        var current = localStorage.getItem(SIDEBAR_KEY) === '1';
        localStorage.setItem(SIDEBAR_KEY, current ? '0' : '1');
        applySidebarState();
    };
    applySidebarState();

    /* ---------------- Close side menu / modals with Escape ---------------- */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.modal-overlay.active').forEach(function (m) {
            if (typeof closeModal === 'function') closeModal(m.id);
        });
    });

    /* ---------------- Header shadow-on-scroll + back-to-top visibility ---------------- */
    var topBar = document.querySelector('.top-nav-bar');
    var backToTop = document.getElementById('backToTopBtn');
    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        if (topBar) topBar.classList.toggle('is-scrolled', y > 4);
        if (backToTop) backToTop.classList.toggle('visible', y > 420);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------------- Scroll-reveal for calculator steps ---------------- */
    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
        document.querySelectorAll('.step.reveal').forEach(function (el) { revealObserver.observe(el); });
    } else {
        document.querySelectorAll('.step.reveal').forEach(function (el) { el.classList.add('in-view'); });
    }

    /* ---------------- Result panel: pulse highlight when the total changes ---------------- */
    var totalEl = document.getElementById('totalFeeVal');
    if (totalEl && 'MutationObserver' in window) {
        var lastText = totalEl.textContent;
        var flashObserver = new MutationObserver(function () {
            if (totalEl.textContent === lastText) return;
            lastText = totalEl.textContent;
            totalEl.classList.remove('flash');
            void totalEl.offsetWidth; /* restart animation */
            totalEl.classList.add('flash');
        });
        flashObserver.observe(totalEl, { childList: true, characterData: true, subtree: true });
    }

    /* ---------------- Light haptic feedback on touch devices ---------------- */
    if ('vibrate' in navigator) {
        document.addEventListener('click', function (e) {
            var el = e.target.closest('.bn-item, .fab-add, .tab-btn, .btn-action');
            if (el) { try { navigator.vibrate(8); } catch (e2) { /* ignore */ } }
        });
    }

    /* ---------------- Offline banner — makes connection problems visible
       instead of the app just silently failing to sync/log in ---------------- */
    function updateOnlineBanner() {
        var existing = document.getElementById('offlineBanner');
        if (navigator.onLine) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;
        var bar = document.createElement('div');
        bar.id = 'offlineBanner';
        bar.textContent = 'اتصال اینترنت قطع است — تغییرات فقط روی همین گوشی ذخیره می‌شود.';
        bar.style.cssText = 'position:fixed;top:0;inset-inline:0;z-index:2000;background:var(--accent-amber);' +
            'color:#1a1200;font-size:0.72rem;font-weight:700;text-align:center;padding:6px 10px;' +
            'padding-top:calc(6px + env(safe-area-inset-top,0px));';
        document.body.prepend(bar);
    }
    window.addEventListener('online', updateOnlineBanner);
    window.addEventListener('offline', updateOnlineBanner);
    updateOnlineBanner();

    /* ---------------- Copy final amount to clipboard ---------------- */
    window.copyTotalAmount = function () {
        var totalNode = document.getElementById('totalFeeVal');
        var tomanNode = document.getElementById('tomanVal');
        if (!totalNode) return;
        var text = totalNode.textContent + (tomanNode && tomanNode.textContent ? ' — ' + tomanNode.textContent : '');
        function done(ok) { showToast(ok ? 'مبلغ نهایی کپی شد.' : 'کپی انجام نشد.', ok ? 'success' : 'error'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () { done(false); });
        } else {
            try {
                var ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); ta.remove();
                done(true);
            } catch (e) { done(false); }
        }
    };
})();
