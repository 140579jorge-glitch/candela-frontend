/* Banner de instalacion PWA — Candela
   Reaparece en cada visita hasta que el usuario elige explicitamente
   "No instalar, no volver a mostrar". Un cierre normal (X) solo la
   oculta por esta visita; vuelve a aparecer la proxima vez.
*/
(function () {
  var KEY = 'candela_pwa_no_instalar';
  var deferredPrompt = null;

  function yaInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function esIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function injectStyles() {
    if (document.getElementById('pwa-ib-style')) return;
    var css = document.createElement('style');
    css.id = 'pwa-ib-style';
    css.textContent =
      '#pwa-ib{position:fixed;bottom:0;left:0;right:0;z-index:10000;' +
      'background:#fff;border-top:1px solid #F0E6E1;' +
      'padding:1rem 1.5rem;box-shadow:0 -8px 32px rgba(0,0,0,.07);' +
      'font-family:Nunito,system-ui,sans-serif}' +
      '#pwa-ib-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}' +
      '#pwa-ib-icon{width:40px;height:40px;border-radius:12px;flex-shrink:0;' +
      'background:linear-gradient(135deg,#B5445C,#F2B8C8);display:flex;' +
      'align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.1rem}' +
      '#pwa-ib-text{flex:1;min-width:180px}' +
      '#pwa-ib-text strong{display:block;font-size:.85rem;color:#2D2D2D}' +
      '#pwa-ib-text span{display:block;font-size:.78rem;color:#8B7D77;margin-top:.15rem;line-height:1.4}' +
      '#pwa-ib-btns{display:flex;align-items:center;gap:.6rem;flex-shrink:0;flex-wrap:wrap}' +
      '#pwa-ib-install{padding:.55rem 1.25rem;border-radius:999px;font-size:.8rem;' +
      'font-weight:700;cursor:pointer;font-family:inherit;border:none;white-space:nowrap;' +
      'background:linear-gradient(135deg,#B5445C,#F2B8C8);color:#fff;transition:filter .2s}' +
      '#pwa-ib-install:hover{filter:brightness(1.07)}' +
      '#pwa-ib-later{background:none;border:none;color:#8B7D77;font-size:.75rem;' +
      'cursor:pointer;font-family:inherit;text-decoration:underline;white-space:nowrap}' +
      '#pwa-ib-close{background:none;border:none;color:#B7A9A2;font-size:1.1rem;' +
      'cursor:pointer;line-height:1;padding:.25rem}';
    document.head.appendChild(css);
  }

  function ocultar(el) {
    if (el && el.parentNode) el.remove();
  }

  function mostrarBanner(opts) {
    injectStyles();
    if (document.getElementById('pwa-ib')) return;

    var el = document.createElement('div');
    el.id = 'pwa-ib';
    el.innerHTML =
      '<div id="pwa-ib-inner">' +
        '<div id="pwa-ib-icon">C</div>' +
        '<div id="pwa-ib-text">' +
          '<strong>Instala Candela en tu celular</strong>' +
          '<span>' + opts.mensaje + '</span>' +
        '</div>' +
        '<div id="pwa-ib-btns">' +
          (opts.mostrarBotonInstalar ? '<button id="pwa-ib-install">Instalar</button>' : '') +
          '<button id="pwa-ib-later">No instalar, no volver a mostrar</button>' +
          '<button id="pwa-ib-close" aria-label="Cerrar">✕</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    var btnInstall = document.getElementById('pwa-ib-install');
    if (btnInstall) {
      btnInstall.onclick = function () {
        if (!deferredPrompt) { ocultar(el); return; }
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () {
          deferredPrompt = null;
          ocultar(el);
        });
      };
    }

    document.getElementById('pwa-ib-later').onclick = function () {
      localStorage.setItem(KEY, '1');
      ocultar(el);
    };
    document.getElementById('pwa-ib-close').onclick = function () {
      ocultar(el); // solo esta visita; vuelve a aparecer la proxima
    };
  }

  function init() {
    if (yaInstalada()) return;
    if (localStorage.getItem(KEY) === '1') return;

    if (esIOS()) {
      // iOS no dispara beforeinstallprompt: instrucciones manuales.
      mostrarBanner({
        mostrarBotonInstalar: false,
        mensaje: 'Toca el boton compartir de Safari y elegi "Agregar a pantalla de inicio".',
      });
      return;
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      mostrarBanner({
        mostrarBotonInstalar: true,
        mensaje: 'Acceso mas rapido, notificaciones y una mejor experiencia sin ocupar espacio de una tienda de apps.',
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
