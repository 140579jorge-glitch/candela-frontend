/* Floating WhatsApp support button — shared across public pages. */
(function () {
    var NUMBER = '18457098595';
    var MSG = 'Hola, tengo una consulta sobre Candela';

    function inject() {
        var css = document.createElement('style');
        css.textContent =
            '#wa-float{position:fixed;right:18px;bottom:24px;z-index:9000;' +
            'width:52px;height:52px;border-radius:999px;background:#25D366;' +
            'display:flex;align-items:center;justify-content:center;' +
            'box-shadow:0 6px 20px rgba(0,0,0,.18);transition:bottom .25s ease;' +
            'text-decoration:none}' +
            '#wa-float:hover{filter:brightness(1.05)}' +
            '#wa-float svg{width:28px;height:28px}';
        document.head.appendChild(css);

        var a = document.createElement('a');
        a.id = 'wa-float';
        a.href = 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(MSG);
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', 'Escribinos por WhatsApp');
        a.innerHTML =
            '<svg viewBox="0 0 32 32" fill="#fff"><path d="M16.001 3C9.373 3 4 8.373 4 15.001c0 2.4.7 4.633 1.906 6.508L4 29l7.656-2.01A11.93 11.93 0 0 0 16.001 27C22.63 27 28 21.63 28 15.001 28 8.373 22.63 3 16.001 3zm6.89 16.98c-.293.824-1.45 1.51-2.374 1.705-.632.133-1.456.24-4.232-.908-3.55-1.47-5.834-5.07-6.012-5.306-.172-.236-1.44-1.918-1.44-3.657 0-1.74.912-2.59 1.236-2.945.293-.32.638-.4.85-.4.213 0 .426.002.613.011.197.01.46-.075.72.55.265.638.9 2.195.978 2.355.08.16.133.347.027.56-.107.213-.16.346-.32.532-.16.187-.335.417-.479.56-.16.16-.327.333-.14.654.187.32.83 1.37 1.782 2.22 1.224 1.09 2.256 1.428 2.576 1.588.32.16.507.133.693-.08.187-.213.8-.934.014-1.814-.787-.88-1.6-.746-.493-1.9z"/></svg>';
        document.body.appendChild(a);

        var banner = document.getElementById('ccb');
        if (banner) {
            a.style.bottom = '90px';
            var observer = new MutationObserver(function () {
                if (!document.getElementById('ccb')) {
                    a.style.bottom = '24px';
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
