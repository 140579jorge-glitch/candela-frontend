/* GDPR Cookie Consent — Candela
   Conditions Google Analytics loading on explicit user consent.
   Equal-prominence Accept/Reject buttons per GDPR Art.7 & Recital 32.
*/
(function () {
  var KEY = 'candela_cookies';
  var GA_ID = 'G-HNJ89RN59N';

  function injectGA() {
    if (window._ga_injected) return;
    window._ga_injected = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function showBanner() {
    var css = document.createElement('style');
    css.textContent =
      '#ccb{position:fixed;bottom:0;left:0;right:0;z-index:10000;' +
      'background:#fff;border-top:1px solid #F0E6E1;' +
      'padding:1rem 1.5rem;box-shadow:0 -8px 32px rgba(0,0,0,.07);' +
      'font-family:Nunito,system-ui,sans-serif}' +
      '#ccb-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}' +
      '#ccb p{flex:1;font-size:.8rem;color:#8B7D77;line-height:1.55;margin:0;min-width:180px}' +
      '#ccb p a{color:#F4A261;font-weight:700;text-decoration:none}' +
      '#ccb-btns{display:flex;gap:.75rem;flex-shrink:0}' +
      '#ccb-accept,#ccb-reject{' +
      'padding:.55rem 1.25rem;border-radius:999px;font-size:.8rem;' +
      'font-weight:700;cursor:pointer;font-family:inherit;' +
      'transition:all .2s;border:2px solid #F4A261;white-space:nowrap}' +
      '#ccb-accept{background:linear-gradient(135deg,#F4A261,#E8A598);color:#fff}' +
      '#ccb-accept:hover{filter:brightness(1.07)}' +
      '#ccb-reject{background:#fff;color:#F4A261}' +
      '#ccb-reject:hover{background:#FFF8F5}';
    document.head.appendChild(css);

    var el = document.createElement('div');
    el.id = 'ccb';
    el.innerHTML =
      '<div id="ccb-inner">' +
      '<p>Usamos Google Analytics (cookie analítica) para mejorar la plataforma. ' +
      'Puedes aceptar o rechazar. ' +
      '<a href="/pages/cookies.html">Política de Cookies</a>.</p>' +
      '<div id="ccb-btns">' +
      '<button id="ccb-reject">Rechazar</button>' +
      '<button id="ccb-accept">Aceptar</button>' +
      '</div></div>';
    document.body.appendChild(el);

    document.getElementById('ccb-accept').onclick = function () {
      localStorage.setItem(KEY, '1');
      el.remove();
      injectGA();
    };
    document.getElementById('ccb-reject').onclick = function () {
      localStorage.setItem(KEY, '0');
      el.remove();
    };
  }

  function init() {
    var consent = localStorage.getItem(KEY);
    if (consent === '1') { injectGA(); return; }
    if (consent === '0') return;
    // No decision yet — show banner
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
