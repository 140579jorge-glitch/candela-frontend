const API_BASE = 'https://api.clubcandela.com';
// las URLs firmadas del storage ya vienen completas; solo las rutas relativas llevan el prefijo de la API
const _abs = u => (!u ? '' : /^https?:/.test(u) ? u : API_BASE + u);
let feedData = [];

async function init() {
    if (!candela.auth.isLoggedIn()) { window.location.href = '../index.html'; return; }
    const u = candela.auth.user();
    // Avatar inicial
    const av = document.getElementById('btn-avatar');
    av.textContent = (u?.nombre || 'U')[0].toUpperCase();

    cargarFeed();
    cargarLives();
    cargarDescubrir();
    candela.balance.showNav();
    cargarRailSaldo();
}

async function cargarRailSaldo() {
    const el = document.getElementById('rail-saldo');
    if (!el) return;
    const cached = candela.balance.cached();
    if (cached !== null) el.textContent = '$' + cached;
    try {
        const s = await candela.wallet.miSaldo();
        const v = Number(s?.saldo ?? s?.balance ?? 0);
        el.textContent = '$' + v.toFixed(2);
        candela.balance.cache(v);
        candela.balance.showNav();
    } catch(_) {}
}

const _GRAD = {
    melocoton:'#FFF4EE,#F2B8C8','rosa-venecia':'#FFF0F5,#F7B8C8',lavanda:'#F7F2FF,#BBA0E0',
    'rojo-carmin':'#1A0A0A,#E74C3C',menta:'#F0FAF7,#58D68D',cielo:'#F0F8FF,#85C1E9',
    dorada:'#FFFBF0,#F1C40F',nude:'#FAF7F4,#D4B896','noche-rosa':'#1A0D1A,#FF6FBF',
    coral:'#FFF5F2,#FF8E8E',esmeralda:'#0D1F19,#48C9B0',nube:'#FAFAFA,#AEB6BF'
};

async function cargarDescubrir() {
    try {
        const lista = await candela.creadoras.explorar({ limit: 12 });
        if (!lista || !lista.length) return;
        const row = document.getElementById('descubrir-row');
        row.innerHTML = lista.map(c => {
            const gr = _GRAD[c.tema_color] || '#B5445C,#F2B8C8';
            const ini = esc((c.nombre_artistico || 'C')[0].toUpperCase());
            const inner = c.avatar_url
                ? `<img src="${esc(c.avatar_url)}" class="w-full h-full object-cover rounded-full" draggable="false">`
                : `<div class="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-lg" style="background:linear-gradient(135deg,${gr})">${ini}</div>`;
            return `<a href="creadora.html?slug=${encodeURIComponent(c.slug||'')}" class="flex flex-col items-center gap-1.5 shrink-0" style="width:66px">
                <div class="p-[2.5px] rounded-full" style="background:linear-gradient(135deg,#B5445C,#F2B8C8,#D4869D)">
                    <div class="w-14 h-14 rounded-full border-2 border-white overflow-hidden">${inner}</div>
                </div>
                <span class="text-[10px] font-semibold text-c-text text-center w-full truncate">${esc((c.nombre_artistico||'').split(' ')[0])}</span>
            </a>`;
        }).join('');
        document.getElementById('sec-descubrir').classList.remove('hidden');

        // Rail derecho (escritorio)
        const rail = document.getElementById('rail-sugeridas');
        if (rail) {
            rail.innerHTML = lista.slice(0, 5).map(c => {
                const gr = _GRAD[c.tema_color] || '#B5445C,#F2B8C8';
                const ini = esc((c.nombre_artistico || 'C')[0].toUpperCase());
                const av = c.avatar_url
                    ? `<img src="${esc(c.avatar_url)}" class="w-10 h-10 rounded-full object-cover shrink-0">`
                    : `<div class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold" style="background:linear-gradient(135deg,${gr})">${ini}</div>`;
                const precio = c.precio_suscripcion > 0 ? '$' + Number(c.precio_suscripcion) + '/mes' : 'Gratis';
                return `<a href="creadora.html?slug=${encodeURIComponent(c.slug||'')}" class="flex items-center gap-2.5">
                    ${av}
                    <div class="min-w-0 flex-1">
                        <p class="font-bold text-sm truncate">${esc(c.nombre_artistico||'Creadora')}</p>
                        <p class="text-[11px] text-c-soft">${esc(c.pais||'')} &middot; ${precio}</p>
                    </div>
                </a>`;
            }).join('');
        }
    } catch(_) {}
}

async function cargarSugeridas() {
    try {
        const lista = await candela.creadoras.explorar({ limit: 6 });
        if (!lista || !lista.length) return;
        const cont = document.getElementById('empty-sugeridas');
        cont.innerHTML =
            '<p class="text-xs font-bold text-c-soft uppercase tracking-wider mb-3 text-center">Creadoras para descubrir</p>' +
            '<div class="grid grid-cols-2 gap-3">' + lista.map(c => {
                const gr = _GRAD[c.tema_color] || '#B5445C,#F2B8C8';
                const ini = esc((c.nombre_artistico || 'C')[0].toUpperCase());
                const precio = c.precio_suscripcion > 0 ? '$' + Number(c.precio_suscripcion) + '/mes' : 'Gratis';
                const banner = c.banner_url
                    ? `<img src="${esc(c.banner_url)}" class="absolute inset-0 w-full h-full object-cover">`
                    : `<div class="absolute inset-0 flex items-center justify-center font-display text-3xl text-white/25" style="background:linear-gradient(135deg,${gr})">${ini}</div>`;
                return `<a href="creadora.html?slug=${encodeURIComponent(c.slug||'')}" class="block rounded-2xl overflow-hidden border border-c-border bg-white">
                    <div class="relative" style="aspect-ratio:16/10">${banner}</div>
                    <div class="p-2.5">
                        <p class="font-bold text-sm truncate">${esc(c.nombre_artistico||'Creadora')}</p>
                        <p class="text-[11px] text-c-accent font-bold">${precio}</p>
                    </div>
                </a>`;
            }).join('') + '</div>';
    } catch(_) {}
}

async function cargarLives() {
    try {
        const r = await fetch(`${API_BASE}/api/streams/activos`);
        if (!r.ok) return;
        const lives = await r.json();
        if (!lives.length) return;
        const row = document.getElementById('lives-row');
        row.innerHTML = lives.map(s => {
            const avatar = s.creadora_avatar
                ? `<img src="${s.creadora_avatar}" class="w-14 h-14 rounded-full object-cover border-2 border-red-500 shrink-0">`
                : `<div class="w-14 h-14 rounded-full border-2 border-red-500 flex items-center justify-center text-white font-bold text-lg shrink-0" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">${esc((s.creadora_nombre||'C')[0])}</div>`;
            return `<a href="stream.html?id=${esc(s.id)}" class="flex flex-col items-center gap-1 shrink-0" style="min-width:64px">
                <div class="relative">${avatar}<span class="absolute bottom-0 right-0 bg-red-500 text-white text-[8px] font-bold px-1 rounded">EN VIVO</span></div>
                <span class="text-[10px] font-semibold text-c-text text-center leading-tight max-w-[60px] truncate">${esc(s.creadora_nombre||'Creadora')}</span>
            </a>`;
        }).join('');
        document.getElementById('sec-lives').classList.remove('hidden');
    } catch(_) {}
}

async function cargarFeed() {
    try {
        feedData = await candela.contenido.feed();
        document.getElementById('feed-skeleton').classList.add('hidden');
        const lista = document.getElementById('feed-lista');
        const empty = document.getElementById('feed-empty');

        if (!feedData.length) { empty.classList.remove('hidden'); cargarSugeridas(); return; }

        lista.classList.remove('hidden');
        lista.innerHTML = feedData.map(item => renderCard(item)).join('');
        aplicarWatermarks();
    } catch(e) {
        document.getElementById('feed-skeleton').classList.add('hidden');
        document.getElementById('feed-empty').classList.remove('hidden');
        cargarSugeridas();
    }
}

function renderCard(item) {
    const bloqueado = !item.desbloqueado && !item.es_gratis;
    const esPPV = bloqueado && Number(item.precio) > 0;
    const mediaUrl = _abs(item.url_archivo);
    const previewUrl = _abs(item.preview_url);
    const esVideo = item.tipo === 'video';
    const nombre = esc(item.creadora_nombre || 'Creadora');
    const inicial = esc((item.creadora_nombre || '?')[0].toUpperCase());
    const slug = encodeURIComponent(item.creadora_slug || '');
    const id = encodeURIComponent(item.id || '');
    const tipo = esc(item.tipo || 'foto');
    const clickAttr = bloqueado
        ? `data-on-click="location.href='creadora.html?slug=${slug}'"`
        : `data-on-click="abrirVisor('${id}','${tipo}','${esc(mediaUrl)}')"`;

    return `
    <div class="feed-card">
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 pt-4 pb-3">
            <a href="creadora.html?slug=${slug}" class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">
                ${inicial}
            </a>
            <div class="flex-1 min-w-0">
                <a href="creadora.html?slug=${slug}" class="font-bold text-sm hover:text-c-accent transition-colors">${nombre}</a>
                <p class="text-xs text-c-soft">${esc(fmtFecha(item.publicado_en))}</p>
            </div>
            ${esVideo ? `<span class="ms text-c-soft" style="font-size:18px">videocam</span>` : ''}
        </div>

        <!-- Media -->
        <div class="media-wrap" style="aspect-ratio:4/5;cursor:pointer;" ${clickAttr}>
            ${previewUrl
                ? `<img src="${esc(previewUrl)}" alt="${esc(item.titulo||'')}" class="${bloqueado ? 'locked-blur' : ''}" style="width:100%;height:100%;object-fit:cover;" draggable="false" data-on-contextmenu="return false">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FFF4EE,#FAF2F5);font-size:3rem;">${esVideo ? '🎬' : '📸'}</div>`
            }
            ${bloqueado
                ? `<div class="locked-scrim">
                       <span class="ms" style="color:#fff;font-size:26px">lock</span>
                       <span class="locked-chip ${esPPV ? '' : 'locked-chip--subs'}">${esPPV ? `Desbloquear por $${Number(item.precio)}` : 'Solo suscriptoras'}</span>
                   </div>`
                : (esVideo ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"><div style="width:52px;height:52px;border-radius:50%;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;"><span class="ms ms-fill" style="color:#fff;font-size:26px">play_arrow</span></div></div>` : '')
            }
            <div class="wm-layer" id="wm-${id}"></div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3">
            ${item.titulo ? `<p class="font-semibold text-sm mb-0.5">${esc(item.titulo)}</p>` : ''}
            ${item.descripcion ? `<p class="text-xs text-c-soft leading-relaxed">${esc(item.descripcion)}</p>` : ''}
        </div>
    </div>`;
}

function aplicarWatermarks() {
    const u = candela.auth.user();
    const label = (u?.nombre || u?.email?.split('@')[0] || 'usuario') + ' · candela';
    feedData.forEach(item => {
        const wm = document.getElementById('wm-' + item.id);
        if (!wm || wm.children.length) return;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const span = document.createElement('span');
                span.className = 'wm-text';
                span.style.left = (c * 33 + 4) + '%';
                span.style.top  = (r * 33 + 8) + '%';
                span.textContent = label;
                wm.appendChild(span);
            }
        }
    });
}

// ─── SUSCRIPCIONES ───────────────────────────────────────────
async function cargarSuscripciones() {
    const lista = document.getElementById('subs-lista');
    const empty = document.getElementById('subs-empty');
    lista.innerHTML = '<div class="skeleton h-16 rounded-xl"></div><div class="skeleton h-16 rounded-xl mt-3"></div>';
    try {
        const subs = await candela.pagos.misSuscripciones();
        if (!subs.length) { lista.innerHTML = ''; empty.classList.remove('hidden'); return; }
        empty.classList.add('hidden');
        lista.innerHTML = subs.map(s => `
            <div class="bg-white border border-c-border rounded-xl p-4 flex items-center gap-3">
                <a href="creadora.html?slug=${encodeURIComponent(s.creadora_slug||'')}" class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">
                    ${esc((s.creadora_nombre||'?')[0].toUpperCase())}
                </a>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm">${esc(s.creadora_nombre||'-')}</p>
                    <p class="text-xs text-c-soft">Vence: ${esc(fmtFecha(s.fecha_fin))}</p>
                </div>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:rgba(46,204,113,.1);color:#27ae60;border:1px solid rgba(46,204,113,.3)">Activa</span>
            </div>`).join('');
    } catch(e) { lista.innerHTML = ''; empty.classList.remove('hidden'); }
}

// ─── TABS ─────────────────────────────────────────────────────
function mostrarTab(tab, btn) {
    document.getElementById('sec-feed').classList.toggle('hidden', tab !== 'feed');
    document.getElementById('sec-suscripciones').classList.toggle('hidden', tab !== 'suscripciones');
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.className = b.className.replace('bg-c-accent text-white', 'text-c-soft bg-white border border-c-border hover:border-c-accent hover:text-c-accent');
    });
    btn.className = btn.className.replace('text-c-soft bg-white border border-c-border hover:border-c-accent hover:text-c-accent', 'bg-c-accent text-white');
    if (tab === 'suscripciones') cargarSuscripciones();
}

// ─── VISOR ────────────────────────────────────────────────────
function abrirVisor(id, tipo, url) {
    const visor = document.getElementById('visor');
    const img   = document.getElementById('visor-img');
    const vid   = document.getElementById('visor-video');
    const wm    = document.getElementById('visor-wm');

    img.style.display = 'none';
    vid.style.display = 'none';
    vid.pause?.();

    if (tipo === 'video' && url) {
        vid.src = url;
        vid.style.display = 'block';
    } else if (url) {
        img.src = url;
        img.style.display = 'block';
    }

    // Watermark en visor
    wm.innerHTML = '';
    const u = candela.auth.user();
    const label = (u?.nombre || u?.email?.split('@')[0] || 'usuario') + ' · candela';
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const span = document.createElement('span');
            span.className = 'wm-text';
            span.style.left = (c * 25 + 2) + '%';
            span.style.top  = (r * 25 + 4) + '%';
            span.style.color = 'rgba(255,255,255,.2)';
            span.textContent = label;
            wm.appendChild(span);
        }
    }

    visor.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarVisor(e) {
    if (e && e.target !== document.getElementById('visor') && !e.target.closest('button')) return;
    const vid = document.getElementById('visor-video');
    vid.pause?.(); vid.src = '';
    document.getElementById('visor').style.display = 'none';
    document.body.style.overflow = '';
}

// ─── PROTECCIONES ─────────────────────────────────────────────
document.addEventListener('contextmenu', e => {
    if (e.target.closest('.media-wrap') || e.target.closest('#visor')) e.preventDefault();
});
document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('privacy-mode', document.hidden);
});
window.addEventListener('blur', () => document.body.classList.add('privacy-mode'));
window.addEventListener('focus', () => document.body.classList.remove('privacy-mode'));
document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S') && e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
});

// ─── UTILS ────────────────────────────────────────────────────
function fmtFecha(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const ahora = new Date();
    const diff = Math.floor((ahora - d) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
    if (diff < 604800) return `Hace ${Math.floor(diff/86400)} dias`;
    return d.toLocaleDateString('es-BO', { day:'2-digit', month:'short' });
}

function toast(msg, tipo='info') {
    const c = document.getElementById('toasts');
    const col = { error:'#e74c3c', success:'#2ecc71', info:'#B5445C' };
    const el = document.createElement('div');
    el.style.cssText = `background:#fff;border:1px solid #F5E8EF;border-left:4px solid ${col[tipo]||col.info};padding:.8rem 1rem;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.09);font-size:.85rem;max-width:280px;pointer-events:auto;opacity:0;transform:translateX(100%);transition:all .25s ease;`;
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateX(0)'; });
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(100%)'; setTimeout(()=>el.remove(),300); }, 3800);
}

init().then(() => {
    // Watermarks despues de que el DOM esta poblado
    setTimeout(aplicarWatermarks, 500);
});
