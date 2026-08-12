(function () {
    if (localStorage.getItem('candela_18')) return;

    function mount() {
        var s = document.createElement('style');
        s.textContent =
            '#ag{position:fixed;inset:0;z-index:9999;background:rgba(20,8,2,.97);' +
            'display:flex;align-items:center;justify-content:center;padding:1rem;' +
            'font-family:Nunito,sans-serif}' +
            '#ag-box{background:#fff;border-radius:2rem;padding:2.5rem 2rem;' +
            'width:100%;max-width:370px;text-align:center;' +
            'box-shadow:0 32px 80px rgba(0,0,0,.5)}' +
            '#ag h2{font-size:1.45rem;font-weight:700;color:#2D2D2D;' +
            'margin:.75rem 0 .5rem;font-family:"Playfair Display",Georgia,serif}' +
            '#ag p{color:#8B7D77;font-size:.875rem;line-height:1.65;margin-bottom:1.75rem}' +
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
            'Debes tener <strong style="color:#2D2D2D">18 a\xF1os o m\xE1s</strong> para acceder.</p>' +
            '<button id="ag-yes">Soy mayor de 18 a\xF1os — Entrar</button>' +
            '<button id="ag-no">No tengo 18 a\xF1os</button>' +
            '<p id="ag-legal">Al continuar aceptas los ' +
            '<a href="/pages/terminos.html">t\xE9rminos de servicio</a>.</p>' +
            '</div>';
        document.body.appendChild(el);
        document.body.style.overflow = 'hidden';

        document.getElementById('ag-yes').onclick = function () {
            localStorage.setItem('candela_18', '1');
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
