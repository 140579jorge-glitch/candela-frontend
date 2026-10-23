// Scroll reveals — IntersectionObserver (no scroll listener, no reflow)
(function(){
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

function calcular() {
    const subs = parseInt(document.getElementById('calc-subs').value);
    const precio = parseInt(document.getElementById('calc-precio').value);
    document.getElementById('calc-subs-val').textContent = subs;
    document.getElementById('calc-precio-val').textContent = '$' + precio;
    const ganancia = (subs * precio * 0.84).toFixed(0);
    const ganancia100 = (subs * precio).toFixed(0);
    document.getElementById('calc-resultado').textContent = '$' + ganancia + '/mes';
    document.getElementById('calc-detalle').textContent =
        `${subs} subs × $${precio} × 84% (tu parte)`;
}
calcular();
