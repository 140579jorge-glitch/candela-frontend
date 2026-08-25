/* Age Gate — Candela
   Requires user to enter birth year (calculates age >= 18).
   Stores confirmed year (not just a flag) in localStorage.
*/
(function () {
  var stored = localStorage.getItem('candela_18');
  if (stored) {
    // If old flag ('1') or valid year stored, let through
    var year = parseInt(stored, 10);
    if (stored === '1' || (year > 1900 && (new Date().getFullYear() - year) >= 18)) return;
    // Otherwise fall through to show gate
    localStorage.removeItem('candela_18');
  }

  function mount() {
    var s = document.createElement('style');
    s.textContent =
      '#ag{position:fixed;inset:0;z-index:9999;background:rgba(20,8,2,.97);' +
      'display:flex;align-items:center;justify-content:center;padding:1rem;' +
      'font-family:Nunito,sans-serif}' +
      '#ag-box{background:#fff;border-radius:2rem;padding:2.5rem 2rem;' +
      'width:100%;max-width:380px;text-align:center;' +
      'box-shadow:0 32px 80px rgba(0,0,0,.5)}' +
      '#ag h2{font-size:1.45rem;font-weight:700;color:#2D2D2D;' +
      'margin:.75rem 0 .5rem;font-family:"Playfair Display",Georgia,serif}' +
      '#ag p{color:#8B7D77;font-size:.875rem;line-height:1.65;margin-bottom:1rem}' +
      '#ag-year-wrap{position:relative;margin-bottom:1rem}' +
      '#ag-year{width:100%;padding:.75rem 1rem;border:2px solid #F0E6E1;' +
      'border-radius:12px;font-size:1rem;font-family:Nunito,sans-serif;' +
      'color:#2D2D2D;text-align:center;transition:border-color .18s,box-shadow .18s}' +
      '#ag-year:focus{outline:none;border-color:#F4A261;box-shadow:0 0 0 3px rgba(244,162,97,.15)}' +
      '#ag-err{color:#e74c3c;font-size:.78rem;margin-bottom:.75rem;min-height:1.1rem}' +
      '#ag-yes{display:block;width:100%;' +
      'background:linear-gradient(135deg,#F4A261,#E8A598);' +
      'color:#fff;padding:.9rem;border-radius:12px;font-weight:700;' +
      'font-size:.95rem;margin-bottom:.75rem;cursor:pointer;border:none;' +
      'font-family:inherit;transition:filter .2s}' +
      '#ag-yes:hover{filter:brightness(1.07)}' +
      '#ag-no{display:block;width:100%;background:transparent;color:#8B7D77;' +
      'padding:.9rem;border-radius:12px;font-weight:600;font-size:.875rem;' +
      'cursor:pointer;border:1px solid #F0E6E1;font-family:inherit}' +
      '#ag-legal{color:#c9b9b3;font-size:.72rem;margin-top:1rem}' +
      '#ag-legal a{color:#F4A261;text-decoration:none}';
    document.head.appendChild(s);

    var el = document.createElement('div');
    el.id = 'ag';
    el.innerHTML =
      '<div id="ag-box">' +
      '<div style="font-size:2.5rem">🔞</div>' +
      '<h2>Contenido para adultos</h2>' +
      '<p>Esta plataforma contiene material de naturaleza adulta.<br>' +
      'Solo para mayores de <strong style="color:#2D2D2D">18 a\xF1os</strong>.</p>' +
      '<div id="ag-year-wrap">' +
      '<input id="ag-year" type="number" min="1900" max="' + (new Date().getFullYear() - 18) + '" ' +
      'placeholder="A\xF1o de nacimiento (ej: 1995)">' +
      '</div>' +
      '<div id="ag-err"></div>' +
      '<button id="ag-yes">Confirmar y entrar</button>' +
      '<button id="ag-no">No tengo 18 a\xF1os</button>' +
      '<p id="ag-legal">Al continuar declaras tener 18+ a\xF1os y aceptas los ' +
      '<a href="/pages/terminos.html">t\xE9rminos de servicio</a> · ' +
      '<a href="/pages/verificacion-edad.html">Pol\xEDtica de verificaci\xF3n</a>.</p>' +
      '</div>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    document.getElementById('ag-year').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('ag-yes').click();
    });

    document.getElementById('ag-yes').onclick = function () {
      var yearInput = document.getElementById('ag-year');
      var errEl = document.getElementById('ag-err');
      var year = parseInt(yearInput.value, 10);
      var currentYear = new Date().getFullYear();

      if (!year || year < 1900 || year > currentYear) {
        errEl.textContent = 'Ingresa un a\xF1o de nacimiento v\xE1lido.';
        yearInput.focus();
        return;
      }
      if (currentYear - year < 18) {
        errEl.textContent = 'Debes tener al menos 18 a\xF1os para acceder.';
        yearInput.focus();
        return;
      }
      localStorage.setItem('candela_18', year.toString());
      el.remove();
      document.body.style.overflow = '';
    };

    document.getElementById('ag-no').onclick = function () {
      window.location.href = 'https://www.google.com';
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}());
