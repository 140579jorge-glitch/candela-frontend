const params = new URLSearchParams(location.search);
const enlaceSlug = params.get('p');

let packData = null;
let userBalance = 0;

function toast(msg, tipo = 'info') {
    const d = document.createElement('div');
    const col = tipo === 'success' ? '#22c55e' : tipo === 'error' ? '#ef4444' : '#B5445C';
    d.className = 'toast pointer-events-auto px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg max-w-xs';
    d.style.cssText = `background:${col}`;
    d.textContent = msg;
    document.getElementById('toasts').appendChild(d);
    setTimeout(() => d.remove(), 3500);
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function cerrarModal() { document.getElementById('modal-compra').classList.remove('open'); document.body.style.overflow = ''; }

async function init() {
    if (!enlaceSlug) { mostrarError(); return; }

    try {
        packData = await candela._req('GET', `/api/packs/teaser/${enlaceSlug}`);
    } catch(e) {
        mostrarError();
        return;
    }

    document.getElementById('skeleton-wrap').classList.add('hidden');
    document.getElementById('pack-content').classList.remove('hidden');

    // Meta tags
    document.title = packData.titulo + ' — Candela';
    document.getElementById('og-title').content = packData.titulo + ' — Candela';
    document.getElementById('og-desc').content = packData.descripcion_teaser || 'Pack exclusivo en Candela';

    // Header
    document.getElementById('pack-titulo').textContent = packData.titulo;
    if (packData.descripcion) {
        const descEl = document.getElementById('pack-desc');
        descEl.textContent = packData.descripcion;
        descEl.classList.remove('hidden');
    }

    // Link a creadora
    if (packData.creadora_slug) {
        const link = document.getElementById('link-creadora');
        link.href = `creadora.html?slug=${packData.creadora_slug}`;
        document.getElementById('creadora-nombre').textContent = packData.creadora_nombre || packData.creadora_slug;
        if (packData.creadora_avatar) {
            const img = document.getElementById('avatar-img');
            img.src = packData.creadora_avatar;
            img.classList.remove('hidden');
            document.getElementById('avatar-init').classList.add('hidden');
        } else {
            document.getElementById('avatar-init').textContent = (packData.creadora_nombre || 'C')[0].toUpperCase();
        }
    }

    // Info
    const cant = packData.total_archivos || 0;
    document.getElementById('pack-archivos-count').textContent = `${cant} archivo${cant !== 1 ? 's' : ''}`;

    const modeEl = document.getElementById('pack-modo-badge');
    if (packData.modo === 'venta') {
        modeEl.textContent = 'Descargable';
        modeEl.className = 'text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700';
    } else {
        modeEl.textContent = 'PPV — Ver en plataforma';
        modeEl.className = 'text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-700';
    }

    // Preview — portada borrosa + placeholders para el resto
    const grid = document.getElementById('archivos-preview');
    const logueado = candela.auth.isLoggedIn();
    const totalCeldas = Math.min(Math.max(cant, 3), 9);
    grid.innerHTML = Array.from({length: totalCeldas}, (_, i) => {
        if (i === 0 && packData.portada_url) {
            return `<div class="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img src="${packData.portada_url}" class="w-full h-full object-cover archivo-blur" draggable="false" data-on-contextmenu="return false">
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="ms" style="color:rgba(255,255,255,.9);font-size:32px">lock</span>
                </div>
            </div>`;
        }
        return `<div class="aspect-square rounded-2xl flex items-center justify-center" style="background:linear-gradient(135deg,#FAF2F5,#F2B8C8)">
            <span class="ms" style="color:rgba(255,255,255,.7);font-size:32px">lock</span>
        </div>`;
    }).join('');

    // CTA
    const precio = packData.precio_fan || 0;
    document.getElementById('cta-precio').textContent = `$${Number(precio).toFixed(2)} USDT`;
    document.getElementById('cta-modo').textContent = packData.modo === 'venta'
        ? 'Incluye descarga permanente'
        : 'Acceso para ver en la plataforma';

    if (packData.comprado) {
        const btnCta = document.getElementById('btn-cta');
        btnCta.textContent = 'Ya tienes este pack';
        btnCta.disabled = true;
        btnCta.className = 'bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md';
    } else if (!logueado) {
        document.getElementById('btn-cta').textContent = 'Iniciar sesión para comprar';
    }

    // Balance si logueado
    if (logueado) {
        try {
            const w = await candela.wallet.miSaldo();
            userBalance = w.balance || 0;
        } catch(e) {}
    }
}

function accionPrincipal() {
    if (!candela.auth.isLoggedIn()) {
        window.location.href = '../index.html';
        return;
    }
    const precio = packData.precio_fan || 0;
    document.getElementById('modal-pack-titulo').textContent = packData.titulo;
    document.getElementById('modal-balance').textContent = `$${userBalance.toFixed(2)}`;
    document.getElementById('modal-precio').textContent = `$${Number(precio).toFixed(2)}`;
    document.getElementById('modal-costo').textContent = `$${Number(precio).toFixed(2)}`;
    const insuf = userBalance < precio;
    document.getElementById('modal-insuf').classList.toggle('hidden', !insuf);
    if (insuf) document.getElementById('modal-falta').textContent = `$${(precio - userBalance).toFixed(2)}`;
    abrirModal('modal-compra');
}

async function confirmarCompra() {
    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true; btn.textContent = 'Procesando...';
    try {
        await candela._req('POST', `/api/packs/${packData.id}/comprar`);
        cerrarModal();
        toast('Pack comprado. Busca tus compras en tu cuenta.', 'success');
        document.getElementById('btn-cta').textContent = 'Pack comprado';
        document.getElementById('btn-cta').disabled = true;
    } catch(e) {
        toast(e.message || 'Error al comprar', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Comprar por <span id="modal-costo">$' + (packData.precio_fan||0) + '</span> USDT';
    }
}

function mostrarError() {
    document.getElementById('skeleton-wrap').classList.add('hidden');
    document.getElementById('error-wrap').classList.remove('hidden');
}

function compartirPack() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: packData?.titulo || 'Pack en Candela', url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => toast('Link copiado', 'success')).catch(() => {});
    }
}

document.addEventListener('contextmenu', e => { if (e.target.matches('img,video')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (e.target.matches('img,video')) e.preventDefault(); });

init();
