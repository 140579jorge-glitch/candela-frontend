// Pagos a creadoras: muestra el resumen publico. Si no hay retiros pagados lo dice, nunca inventa cifras.
(async function () {
    const $ = id => document.getElementById(id);
    const fmtFecha = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
    try {
        const d = await candela._req('GET', '/api/pagos/transparencia');
        $('min-retiro').textContent = '$' + Number(d.min_retiro || 30);
        if (!d.retiros_pagados) {
            $('aviso-inicio').classList.remove('hidden');
            $('c-total').textContent = '$0';
            $('c-retiros').textContent = '0';
            $('c-creadoras').textContent = '0';
            $('c-horas').textContent = '-';
            return;
        }
        $('c-total').textContent = '$' + Number(d.total_usdt).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        $('c-retiros').textContent = d.retiros_pagados;
        $('c-creadoras').textContent = d.creadoras_pagadas;
        $('c-horas').textContent = d.horas_mediana != null ? (d.horas_mediana < 48 ? Math.max(1, Math.round(d.horas_mediana)) + ' h' : Math.round(d.horas_mediana / 24) + ' días') : '-';
        const partes = [];
        if (d.primer_pago) partes.push('Primer pago: ' + fmtFecha(d.primer_pago));
        if (d.ultimo_pago) partes.push('último pago: ' + fmtFecha(d.ultimo_pago));
        $('fechas').textContent = partes.join(', ') + '.';
    } catch (e) {
        ['c-total', 'c-retiros', 'c-creadoras', 'c-horas'].forEach(i => { $(i).textContent = '-'; });
        $('fechas').textContent = 'No pudimos cargar las cifras ahora. Intenta de nuevo en unos minutos.';
    }
})();
