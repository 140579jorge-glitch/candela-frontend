function calcular() {
    const inv = Number(document.getElementById('sl-inv').value);
    const mk = Number(document.getElementById('sl-mk').value) / 100;
    const creditos = inv * 1.10;
    const venta = creditos * (1 + mk);
    const ganancia = venta - inv;
    const roi = (ganancia / inv * 100).toFixed(0);

    document.getElementById('lbl-inv').textContent = '$' + inv;
    document.getElementById('lbl-mk').textContent = Math.round(mk * 100) + '%';
    document.getElementById('res-bonus').textContent = '$' + creditos.toFixed(0);
    document.getElementById('res-venta').textContent = '$' + venta.toFixed(0);
    document.getElementById('res-ganancia').textContent = '$' + ganancia.toFixed(0);
    document.getElementById('res-roi').textContent = roi + '%';
}

function toggleFaq(btn) {
    const a = btn.nextElementSibling;
    const open = a.classList.toggle('open');
    btn.classList.toggle('open', open);
}

// Si volvemos a la landing con una sesión de modal pendiente
window.addEventListener('load', () => {
    calcular();
    const modal = sessionStorage.getItem('openModal');
    if (modal) {
        sessionStorage.removeItem('openModal');
        // No aplica aqui, se maneja en index.html
    }
});
