(function () {
  'use strict';
  var API = 'https://api.clubcandela.com';
  var TOKEN = new URLSearchParams(location.search).get('t') || '';
  function $(id) { return document.getElementById(id); }
  function ir(id) {
    document.querySelectorAll('.paso').forEach(function (s) { s.classList.toggle('on', s.id === id); });
    var h1 = document.querySelector('#' + id + ' h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  (async function () {
    if (!TOKEN) return ir('p-error');
    try {
      var r = await fetch(API + '/api/interpretes/retiro/' + encodeURIComponent(TOKEN));
      if (!r.ok) return ir('p-error');
      var d = await r.json();
      if (d.retirado) return ir('p-ya');
      $('n-creadora').textContent = d.creadora || 'la creadora';
      $('n-cont').textContent = d.contenidos === 1 ? '1 publicación' : d.contenidos + ' publicaciones';
      $('sub').textContent = 'Código de contrato ' + (d.codigo || '');
      ir('p-1');
    } catch (e) { ir('p-error'); }
  })();

  $('b-cancelar').addEventListener('click', function () { ir('p-cancelado'); });
  $('b-retirar').addEventListener('click', async function () {
    var btn = this; btn.disabled = true; btn.textContent = 'Retirando...';
    $('err').classList.remove('on');
    try {
      var r = await fetch(API + '/api/interpretes/retiro/' + encodeURIComponent(TOKEN), { method: 'POST' });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'No pudimos completar el retiro. Intenta de nuevo.');
      $('msg-listo').textContent = d.bajas === 1 ? 'Se dio de baja 1 publicación.' : 'Se dieron de baja ' + (d.bajas || 0) + ' publicaciones.';
      ir('p-listo');
    } catch (e) {
      $('err').textContent = e.message || 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.';
      $('err').classList.add('on');
      btn.disabled = false; btn.textContent = 'Retirar mi consentimiento';
    }
  });
})();
