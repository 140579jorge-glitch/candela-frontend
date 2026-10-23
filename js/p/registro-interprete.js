(function () {
  'use strict';
  var API = 'https://api.clubcandela.com';
  var TOKEN = new URLSearchParams(location.search).get('t') || '';
  var permiso = null, creadora = '';
  var fotos = { doc: null, rev: null, selfie: null };
  var firmaTrazos = 0;
  var ORDEN = ['p-1', 'p-2', 'p-3', 'p-4'];

  function $(id) { return document.getElementById(id); }
  function ir(id) {
    document.querySelectorAll('.paso').forEach(function (s) { s.classList.toggle('on', s.id === id); });
    var i = ORDEN.indexOf(id);
    $('lbl-paso').textContent = i >= 0 ? 'Paso ' + (i + 1) + ' de ' + ORDEN.length : '';
    $('prog-barra').style.width = i >= 0 ? ((i + 1) / ORDEN.length * 100) + '%' : (id === 'p-5' ? '100%' : '0%');
    window.scrollTo(0, 0);
    var h1 = document.querySelector('#' + id + ' h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function falla(msg) { $('msg-error').textContent = msg || 'El enlace es inválido, venció o ya se usó.'; ir('p-error'); }
  function mostrarErr(id, msg) { var e = $(id); e.textContent = msg; e.classList.add('on'); e.scrollIntoView({ block: 'nearest' }); }
  function limpiarErr(id) { $(id).classList.remove('on'); }
  function norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // ── carga del enlace ────────────────────────────────────────────────
  (async function () {
    if (!TOKEN) return falla();
    try {
      var r = await fetch(API + '/api/interpretes/publico/' + encodeURIComponent(TOKEN));
      if (!r.ok) return falla();
      var d = await r.json();
      permiso = d.permiso; creadora = d.creadora || 'una creadora';
    } catch (e) { return falla('No pudimos conectar. Revisa tu conexión e intenta de nuevo.'); }
    $('titulo-inv').textContent = 'Hola, completa tu registro';
    $('sub-inv').textContent = creadora + ' te invitó a registrarte en Candela.';
    $('n-creadora-1').textContent = creadora;
    var cont = $('permiso-completo');
    permiso.secciones.forEach(function (s) {
      var h = document.createElement('h3'); h.textContent = s.titulo;
      var p = document.createElement('p'); p.textContent = s.texto;
      cont.appendChild(h); cont.appendChild(p);
    });
    $('t-c1').textContent = permiso.declaraciones[0];
    $('t-c2').textContent = permiso.declaraciones[1];
    $('t-c3').textContent = permiso.declaraciones[2];
    var hoy = new Date(); hoy.setFullYear(hoy.getFullYear() - 18);
    $('nacimiento').max = hoy.toISOString().slice(0, 10);
    ir('p-1');
  })();

  // el aviso rojo desaparece apenas la persona corrige algo
  [['f-datos', 'err-3'], ['f-firma', 'err-4']].forEach(function (par) {
    ['input', 'change'].forEach(function (ev) { $(par[0]).addEventListener(ev, function () { limpiarErr(par[1]); }); });
  });

  $('b-empezar').addEventListener('click', function () { ir('p-2'); });
  $('b-2').addEventListener('click', function () { ir('p-3'); });
  $('b-atras').addEventListener('click', function () { ir('p-3'); });

  // ── fotos: se reducen en el celular para que suban rápido ───────────
  function reducir(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var esc = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * esc); c.height = Math.round(img.naturalHeight * esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('sin blob')); }, 'image/jpeg', 0.9);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('imagen invalida')); };
      img.src = url;
    });
  }
  function enlazarFoto(inputId, cajaId, clave) {
    $(inputId).addEventListener('change', async function () {
      var f = this.files && this.files[0]; if (!f) return;
      var caja = $(cajaId);
      try {
        var blob = await reducir(f);
        fotos[clave] = blob;
        var img = caja.querySelector('img');
        if (img.dataset.u) URL.revokeObjectURL(img.dataset.u);
        img.dataset.u = URL.createObjectURL(blob); img.src = img.dataset.u;
        caja.classList.add('ok');
        caja.querySelector('[data-txt]').textContent = 'Listo. Toca para cambiarla';
        limpiarErr('err-3');
      } catch (e) {
        fotos[clave] = null; caja.classList.remove('ok');
        mostrarErr('err-3', 'No pudimos leer esa imagen. Prueba con otra foto (JPG o PNG).');
      }
    });
  }
  enlazarFoto('in-doc', 'foto-doc', 'doc');
  enlazarFoto('in-rev', 'foto-rev', 'rev');
  enlazarFoto('in-selfie', 'foto-selfie', 'selfie');

  // ── paso 3: validar datos ───────────────────────────────────────────
  $('f-datos').addEventListener('submit', function (e) {
    e.preventDefault(); limpiarErr('err-3');
    var nombre = $('nombre').value.replace(/\s+/g, ' ').trim();
    if (nombre.length < 5 || nombre.split(' ').length < 2) return mostrarErr('err-3', 'Escribe tu nombre legal completo, nombre y apellido, como aparece en tu documento.');
    var nac = $('nacimiento').value;
    if (!nac) return mostrarErr('err-3', 'Indica tu fecha de nacimiento.');
    var d = new Date(nac + 'T00:00:00'), hoy = new Date();
    var edad = hoy.getFullYear() - d.getFullYear() - ((hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate())) ? 1 : 0);
    if (edad < 18) return mostrarErr('err-3', 'Debes tener 18 años o más para aparecer en contenido de Candela.');
    if (!$('doctipo').value) return mostrarErr('err-3', 'Elige el tipo de documento.');
    if (!fotos.doc) return mostrarErr('err-3', 'Falta la foto del frente de tu documento.');
    if (!fotos.selfie) return mostrarErr('err-3', 'Falta tu selfie.');
    $('nombre-ref').textContent = nombre;
    ir('p-4'); iniciarLienzo();
  });

  // ── firma dibujada ──────────────────────────────────────────────────
  var lienzo, ctx, dibujando = false, listo = false;
  function iniciarLienzo() {
    lienzo = $('firma-lienzo');
    var r = lienzo.getBoundingClientRect(), k = window.devicePixelRatio || 1;
    if (!listo || lienzo.width !== Math.round(r.width * k)) {
      lienzo.width = Math.round(r.width * k); lienzo.height = Math.round(r.height * k);
      ctx = lienzo.getContext('2d'); ctx.scale(k, k);
      ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1A1A3C';
      firmaTrazos = 0;
    }
    if (listo) return; listo = true;
    function pos(ev) { var b = lienzo.getBoundingClientRect(); return { x: ev.clientX - b.left, y: ev.clientY - b.top }; }
    lienzo.addEventListener('pointerdown', function (ev) { dibujando = true; lienzo.setPointerCapture(ev.pointerId); var p = pos(ev); ctx.beginPath(); ctx.moveTo(p.x, p.y); ev.preventDefault(); });
    lienzo.addEventListener('pointermove', function (ev) { if (!dibujando) return; var p = pos(ev); ctx.lineTo(p.x, p.y); ctx.stroke(); firmaTrazos++; ev.preventDefault(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { lienzo.addEventListener(t, function () { dibujando = false; }); });
  }
  $('b-borrar').addEventListener('click', function () {
    if (!ctx) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, lienzo.width, lienzo.height); ctx.restore(); firmaTrazos = 0;
  });

  // ── paso 4: firmar y enviar ─────────────────────────────────────────
  $('f-firma').addEventListener('submit', async function (e) {
    e.preventDefault(); limpiarErr('err-4');
    if (!($('c1').checked && $('c2').checked && $('c3').checked)) return mostrarErr('err-4', 'Marca las tres declaraciones para poder firmar.');
    var nombre = $('nombre').value.replace(/\s+/g, ' ').trim(), fn = $('firma-nombre').value.replace(/\s+/g, ' ').trim();
    if (norm(fn) !== norm(nombre)) return mostrarErr('err-4', 'El nombre escrito debe coincidir con tu nombre legal: ' + nombre);
    if (firmaTrazos < 12) return mostrarErr('err-4', 'Dibuja tu firma en el recuadro.');
    var btn = $('b-firmar'); btn.disabled = true; btn.textContent = 'Enviando... no cierres esta página';
    try {
      var firma = await new Promise(function (res) { lienzo.toBlob(res, 'image/png'); });
      var fd = new FormData();
      fd.append('nombre_legal', nombre);
      fd.append('fecha_nacimiento', $('nacimiento').value);
      fd.append('otros_nombres', $('alias').value);
      fd.append('doc_tipo', $('doctipo').value);
      fd.append('firma_nombre', fn);
      fd.append('acepta_1', 'true'); fd.append('acepta_2', 'true'); fd.append('acepta_3', 'true');
      fd.append('doc_imagen', fotos.doc, 'documento.jpg');
      if (fotos.rev) fd.append('doc_imagen_reverso', fotos.rev, 'reverso.jpg');
      fd.append('selfie', fotos.selfie, 'selfie.jpg');
      fd.append('firma_imagen', firma, 'firma.png');
      var r = await fetch(API + '/api/interpretes/publico/' + encodeURIComponent(TOKEN) + '/registrar', { method: 'POST', body: fd });
      var data = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        if (r.status === 404 || r.status === 409) return falla('Este enlace ya fue usado o venció.');
        throw new Error(typeof data.detail === 'string' ? data.detail : 'No pudimos completar tu registro. Intenta de nuevo.');
      }
      $('codigo').textContent = data.codigo;
      ir('p-5');
    } catch (err) {
      mostrarErr('err-4', err.message || 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
      btn.disabled = false; btn.textContent = 'Firmar y enviar';
    }
  });
})();
