const GRADIENTES = {
    naranja: ['#B5445C','#CF6278'], rosa: ['#F2B8C8','#D4869D'],
    dorado: ['#FAF2F5','#F2B8C8'], champagne: ['#F9EBE0','#E8C9B5'],
    coral: ['#FF6B6B','#F2B8C8'], default: ['#FAF2F5','#F2B8C8'],
};

function estadoBadge(estado) {
    if (estado === 'activa') return `<span class="estado-activa text-[10px] font-bold px-2 py-0.5 rounded-full">Activa</span>`;
    if (estado === 'vencida') return `<span class="estado-vencida text-[10px] font-bold px-2 py-0.5 rounded-full">Vencida</span>`;
    return `<span class="estado-otro text-[10px] font-bold px-2 py-0.5 rounded-full">${esc(estado)}</span>`;
}

function fmtFecha(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function init() {
    if (!requireAuth('suscriptor')) return;
    try {
        const subs = await candela.pagos.misSuscripciones();
        document.getElementById('skel').classList.add('hidden');
        if (!subs.length) {
            document.getElementById('vacio').classList.remove('hidden');
            return;
        }
        const lista = document.getElementById('lista');
        lista.classList.remove('hidden');
        lista.innerHTML = subs.map(s => {
            const [c1, c2] = GRADIENTES[s.creadora_color] || GRADIENTES.default;
            const inicial = (s.creadora_nombre || '?')[0].toUpperCase();
            const vence = s.fecha_fin ? `Vence ${fmtFecha(s.fecha_fin)}` : '';
            const puedeCancelar = s.estado === 'activa';
            return `
            <div class="sub-card flex items-center gap-3 p-4" data-slug="${esc(s.creadora_slug)}">
                <a href="creadora.html?slug=${esc(s.creadora_slug)}" class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg"
                        style="background:linear-gradient(135deg,${c1},${c2})">
                        ${s.creadora_avatar
                            ? `<img src="${esc(s.creadora_avatar)}" class="w-full h-full object-cover rounded-full" alt="">`
                            : inicial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                            <p class="font-bold text-c-text truncate">${esc(s.creadora_nombre || 'Creadora')}</p>
                            ${estadoBadge(s.estado)}
                        </div>
                        <p class="text-xs text-c-soft cancel-status">${s.monto} USDT/mes${vence ? ' · ' + vence : ''}</p>
                    </div>
                </a>
                ${puedeCancelar
                    ? `<button type="button" class="btn-cancelar shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border border-c-border text-c-soft hover:border-red-300 hover:text-red-600 transition-colors">Cancelar</button>`
                    : ''}
            </div>`;
        }).join('');

        lista.querySelectorAll('.btn-cancelar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.sub-card');
                const slug = card.dataset.slug;
                if (!confirm('¿Cancelar esta suscripción? Mantienes acceso hasta la fecha de vencimiento y no se te cobrará de nuevo.')) return;
                btn.disabled = true;
                btn.textContent = 'Cancelando...';
                try {
                    const res = await candela.pagos.cancelarSuscripcion(slug);
                    btn.remove();
                    const status = card.querySelector('.cancel-status');
                    const hasta = res.acceso_hasta ? fmtFecha(res.acceso_hasta) : '';
                    if (status) status.textContent = hasta ? `Cancelada · Acceso hasta ${hasta}` : 'Cancelada';
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Cancelar';
                    alert('No pudimos cancelar la suscripción. Intenta de nuevo o escribe a soporte@clubcandela.com');
                }
            });
        });
    } catch(err) {
        document.getElementById('skel').classList.add('hidden');
        document.getElementById('vacio').classList.remove('hidden');
    }
}

init();
