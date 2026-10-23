const slug = new URLSearchParams(location.search).get('slug');
const API_BASE = 'https://api.clubcandela.com';
const _u = u => (!u ? '' : u.startsWith('http') ? u : API_BASE + u);

const TEMAS = {
    'melocoton':    ['#FFF4EE','#B5445C','#F2B8C8','#2D2D2D'],
    'rosa-venecia': ['#FFF0F5','#D4869D','#F7B8C8','#2D1530'],
    'lavanda':      ['#F7F2FF','#9B72CF','#BBA0E0','#1A0D3D'],
    'rojo-carmin':  ['#1A0A0A','#C0392B','#E74C3C','#F5E6E6'],
    'menta':        ['#F0FAF7','#2ECC71','#58D68D','#1A3D30'],
    'cielo':        ['#F0F8FF','#5DADE2','#85C1E9','#1A2D3D'],
    'dorada':       ['#FFFBF0','#D4AC0D','#F1C40F','#2D2410'],
    'nude':         ['#FAF7F4','#C4A882','#D4B896','#2D2018'],
    'noche-rosa':   ['#1A0D1A','#FF2D9B','#FF6FBF','#FFE0F4'],
    'coral':        ['#FFF5F2','#FF6B6B','#FF8E8E','#3D1010'],
    'esmeralda':    ['#0D1F19','#1ABC9C','#48C9B0','#D0F0EA'],
    'nube':         ['#FAFAFA','#95A5A6','#AEB6BF','#2D2D2D'],
};

let userBalance = 0;
let creadoraData = null;
let todoContenido = [];
let contenidoFiltrado = [];
let tabActual = 'fotos';
let contenidoSeleccionado = null;
let suscritoActualmente = false;
let trialStatus = null; // { vistas_esta_creadora, total_creadoras, puede_ver }
let siguiendoActualmente = false;
let bloqueoActual = false;

// ─── INIT ────────────────────────────────────────────────────
async function init() {
    if (!slug) { window.location.href = '../index.html'; return; }
    try {
        creadoraData = await candela.creadoras.ver(slug);
        aplicarTema(creadoraData.tema_color);
        renderHeader();
        cargarContenido();
        renderCarruselPublico();
        cargarPacksPublicos();
        cargarTopFans();
        cargarStories();
        initStickyBar();
    } catch(e) {
        toast('No se pudo cargar el perfil', 'error');
    }
    if (candela.auth.isLoggedIn()) {
        const _cached = parseFloat(candela.balance.cached() || 0);
        if (_cached > 0) { userBalance = _cached; candela.balance.showNav(); }
        try {
            const w = await candela.wallet.miSaldo();
            userBalance = w.balance || 0;
            candela.balance.cache(userBalance);
            candela.balance.showNav();
        } catch(e) {}
        try {
            trialStatus = await candela._req('GET', `/api/contenido/trial/estado?slug=${slug}`);
        } catch(e) {}
        // Estado suscripción
        try {
            const subs = await candela._req('GET', '/api/pagos/mis-suscripciones');
            if (Array.isArray(subs) && subs.some(s => s.creadora_slug === slug)) {
                suscritoActualmente = true;
                // Actualizar botón para suscrito (en creadoras gratis decía "Suscribirme gratis")
                const btnSub = document.getElementById('btn-sub-header');
                btnSub.textContent = 'Ver contenido';
                btnSub.onclick = () => document.getElementById('content-grid')?.scrollIntoView({ behavior: 'smooth' });
            }
        } catch(e) {}
        cargarEncuestas(); // necesita saber antes si esta suscrito
        // Estado follow
        try {
            const favIds = await candela._req('GET', '/api/fans/favoritos/ids');
            if (creadoraData && favIds.includes(creadoraData.id)) {
                siguiendoActualmente = true;
            }
        } catch(e) {}
        _renderFollowBtn();
        // Estado bloqueo
        try {
            const bloqueados = await candela._req('GET', '/api/fans/bloqueados');
            bloqueoActual = Array.isArray(bloqueados) && bloqueados.includes(creadoraData?.id);
        } catch(e) { bloqueoActual = false; }
        _renderBloqueoBtn();
        document.getElementById('bottom-nav').classList.remove('hidden');
    }
}

function _renderFollowBtn() {
    const btn = document.getElementById('btn-follow');
    if (!candela.auth.isLoggedIn() || !creadoraData) return;
    btn.classList.remove('hidden');
    if (siguiendoActualmente) {
        btn.classList.add('border-c-accent','text-c-accent');
        btn.classList.remove('border-c-border','text-c-soft');
        document.getElementById('follow-icon').textContent = 'favorite';
        document.getElementById('follow-label').textContent = 'Siguiendo';
    } else {
        btn.classList.remove('border-c-accent','text-c-accent');
        btn.classList.add('border-c-border','text-c-soft');
        document.getElementById('follow-icon').textContent = 'favorite_border';
        document.getElementById('follow-label').textContent = 'Seguir';
    }
}

async function toggleFollow() {
    if (!candela.auth.isLoggedIn()) { window.location.href = '../index.html'; return; }
    const creadoraId = creadoraData?.id;
    if (!creadoraId) return;
    try {
        if (siguiendoActualmente) {
            await candela._req('DELETE', '/api/fans/favoritos/' + creadoraId);
            siguiendoActualmente = false;
            toast('Dejaste de seguir a ' + creadoraData.nombre_artistico);
        } else {
            await candela._req('POST', '/api/fans/favoritos/' + creadoraId);
            siguiendoActualmente = true;
            toast('Ahora sigues a ' + creadoraData.nombre_artistico + '. Te avisaremos cuando publique.', 'success');
        }
        _renderFollowBtn();
    } catch(e) { toast('Error al cambiar estado', 'error'); }
}

function _renderBloqueoBtn() {
    const btn = document.getElementById('btn-bloquear');
    if (!candela.auth.isLoggedIn() || !creadoraData) return;
    btn.classList.remove('hidden');
    const icon = document.getElementById('bloquear-icon');
    if (bloqueoActual) {
        btn.classList.add('border-red-400','text-red-500');
        btn.classList.remove('border-c-border','text-c-soft');
        btn.title = 'Desbloquear creadora';
        icon.textContent = 'block';
    } else {
        btn.classList.remove('border-red-400','text-red-500');
        btn.classList.add('border-c-border','text-c-soft');
        btn.title = 'Bloquear creadora';
        icon.textContent = 'block';
    }
}

async function toggleBloqueo() {
    if (!candela.auth.isLoggedIn()) { window.location.href = '../index.html'; return; }
    const cid = creadoraData?.id;
    if (!cid) return;
    if (!bloqueoActual && !confirm('¿Bloquear a ' + creadoraData.nombre_artistico + '? No podrás ver su contenido ni recibirá notificaciones tuyas.')) return;
    try {
        if (bloqueoActual) {
            await candela._req('DELETE', '/api/fans/bloquear/' + cid);
            bloqueoActual = false;
            toast('Desbloqueaste a ' + creadoraData.nombre_artistico);
        } else {
            await candela._req('POST', '/api/fans/bloquear/' + cid);
            bloqueoActual = true;
            toast('Bloqueaste a ' + creadoraData.nombre_artistico, 'success');
        }
        _renderBloqueoBtn();
    } catch(e) { toast('Error al cambiar estado', 'error'); }
}

// ─── TEMA ────────────────────────────────────────────────────
function aplicarTema(tema) {
    const [bg, a, b, text] = TEMAS[tema] || TEMAS['melocoton'];
    const root = document.documentElement;
    root.style.setProperty('--t-bg', bg);
    root.style.setProperty('--t-a', a);
    root.style.setProperty('--t-b', b);
    root.style.setProperty('--t-text', text);
    document.getElementById('banner-wrap').style.background = `linear-gradient(140deg,${a},${b})`;
}

// ─── HEADER ──────────────────────────────────────────────────
function renderHeader() {
    const c = creadoraData;
    document.title = c.nombre_artistico + ' — Candela';
    document.querySelector('meta[name="description"]')?.setAttribute('content',
        `${c.nombre_artistico} en Candela. ${c.total_suscriptores} suscriptores. ${c.bio || 'Contenido exclusivo para sus fans.'}`);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', c.nombre_artistico + ' — Candela');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content',
        `Suscríbete a ${c.nombre_artistico} en Candela. ${c.bio || 'Contenido exclusivo.'}`);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content',
        c.banner_url || 'https://clubcandela.com/img/og-cover.jpg');
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', c.nombre_artistico + ' — Candela');
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content',
        c.banner_url || 'https://clubcandela.com/img/og-cover.jpg');
    document.getElementById('creadora-nombre').textContent = c.nombre_artistico;

    const inicial = c.nombre_artistico[0].toUpperCase();
    document.getElementById('avatar-initial').textContent = inicial;
    document.getElementById('banner-monogram').textContent = inicial;
    if (c.avatar_url) {
        const img = document.getElementById('avatar-img');
        img.src = c.avatar_url;
        img.classList.remove('hidden');
        document.getElementById('avatar-initial').classList.add('hidden');
    }
    if (c.banner_url) {
        const bImg = document.getElementById('banner-img');
        bImg.src = c.banner_url;
        bImg.classList.remove('hidden');
        document.getElementById('banner-monogram').classList.add('hidden');
    }

    const paisEl = document.getElementById('creadora-pais');
    if (c.pais) { paisEl.querySelector('span').textContent = c.pais; paisEl.classList.remove('hidden'); }

    const subsEl = document.getElementById('creadora-subs');
    subsEl.querySelector('span').textContent = c.total_suscriptores;
    subsEl.classList.remove('hidden');

    // Toda creadora publica esta "activa" = admin verifico su identidad y edad
    document.getElementById('badge-verif').classList.remove('hidden');

    if (c.bio) {
        const bioEl = document.getElementById('creadora-bio');
        bioEl.textContent = c.bio;
        bioEl.classList.remove('hidden');
    }

    if (c.precio_suscripcion > 0) {
        document.getElementById('precio-val').innerHTML = `${Number(c.precio_suscripcion) || 0} <span class="text-lg font-bold text-c-soft">USDT/mes</span>`;
        document.getElementById('precio-box').classList.remove('hidden');
    } else {
        // Gratis: mostrar "Suscribirme gratis" por defecto.
        // Si ya está suscrito, init() lo cambiará a "Ver contenido".
        document.getElementById('btn-sub-header').textContent = 'Suscribirme gratis';
        document.getElementById('btn-sub-header').onclick = () => abrirSub();
    }

    // Boton mensaje directo — solo si la creadora acepta
    if (c.acepta_mensajes) {
        document.getElementById('btn-msg').classList.remove('hidden');
    }
    // Boton chat privado — solo si la creadora acepta sesiones
    if (c.acepta_chat_sesion) {
        document.getElementById('btn-chat-sesion').classList.remove('hidden');
    }

    // Sticky bar
    document.getElementById('sticky-nombre').textContent = c.nombre_artistico;
    document.getElementById('sticky-precio').textContent = c.precio_suscripcion > 0
        ? `$${c.precio_suscripcion}/mes · contenido exclusivo`
        : 'Suscribete gratis';

    document.getElementById('sub-titulo').textContent = `Suscribirte a ${c.nombre_artistico}`;
    document.getElementById('sub-precio-modal').textContent = `$${c.precio_suscripcion}`;
    document.getElementById('sub-costo-btn').textContent = `$${c.precio_suscripcion}`;
}

// ─── CONTENIDO ───────────────────────────────────────────────
async function cargarContenido() {
    try {
        todoContenido = await candela.contenido.listarCreadora(slug);
        if (todoContenido.length) {
            const postsEl = document.getElementById('creadora-posts');
            postsEl.querySelector('span').textContent = todoContenido.length;
            postsEl.classList.remove('hidden');
        }
        filtrarContenido();
    } catch(e) {
        document.getElementById('content-grid').innerHTML =
            '<p class="col-span-3 text-center text-c-soft text-sm py-8">No se pudo cargar el contenido.</p>';
    }
}

function filtrarContenido() {
    if (tabActual === 'fotos') contenidoFiltrado = todoContenido.filter(c => c.tipo === 'foto');
    else if (tabActual === 'videos') contenidoFiltrado = todoContenido.filter(c => c.tipo === 'video');
    else contenidoFiltrado = [...todoContenido];
    // update count badges
    const nFotos = todoContenido.filter(c => c.tipo === 'foto').length;
    const nVideos = todoContenido.filter(c => c.tipo === 'video').length;
    const el = (id, n) => { const e = document.getElementById(id); if (e) e.textContent = n ? n : ''; };
    el('tab-count-fotos', nFotos);
    el('tab-count-videos', nVideos);
    el('tab-count-medios', todoContenido.length);
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('content-grid');
    const empty = document.getElementById('empty-content');

    if (!contenidoFiltrado.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    // Trial: solo aplica a contenido suscriptores (precio=0, no es_gratis, no desbloqueado)
    const trialDisponible = trialStatus && trialStatus.puede_ver;
    const trialRestantes = trialStatus
        ? Math.max(0, 2 - (trialStatus.vistas_esta_creadora || 0))
        : 0;

    grid.innerHTML = contenidoFiltrado.map(item => {
        const bloqueado = !item.desbloqueado && !item.es_gratis;
        const esPPV = bloqueado && item.precio > 0;
        const esSoloSubs = bloqueado && item.precio === 0;
        const puedeTrialEste = esSoloSubs && trialDisponible && candela.auth.isLoggedIn();

        return `
        <div class="content-item relative overflow-hidden rounded-xl cursor-pointer"
            style="aspect-ratio:1"
            data-on-click="clicContenido('${String(item.id).replace(/[^a-z0-9-]/gi,'')}',${Number(item.precio)||0},${item.desbloqueado===true},${item.es_gratis===true})">

            <div class="absolute inset-0 overflow-hidden">
                ${item.preview_url
                    ? `<img src="${_u(item.preview_url)}" alt="" class="w-full h-full object-cover ${bloqueado ? 'ct-blur' : ''}" draggable="false" data-on-contextmenu="return false">`
                    : `<div class="ct-fallback"></div>`
                }
            </div>

            ${bloqueado ? `
                <div class="ct-scrim"></div>
                <div class="ct-lock">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">
                        <rect x="5" y="11" width="14" height="10" rx="2"></rect>
                        <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
                    </svg>
                </div>
                <div class="ct-cta">
                    ${esPPV
                        ? `<span class="ct-chip ct-chip--ppv">Ver por $${item.precio}</span>`
                        : puedeTrialEste
                            ? `<span class="ct-chip ct-chip--trial">Ver gratis · ${trialRestantes} ${trialRestantes === 1 ? 'restante' : 'restantes'}</span>`
                            : `<span class="ct-chip ct-chip--subs">Suscríbete para ver</span>`
                    }
                </div>` : ''}

            ${item.tipo === 'video' && !bloqueado ? `
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background:rgba(0,0,0,.5)">
                        <span class="ms ms-fill" style="color:#fff;font-size:20px;">play_arrow</span>
                    </div>
                </div>` : ''}
        </div>`;
    }).join('');

    // Agregar watermarks a todo contenido desbloqueado
    aplicarWatermarks();
}

async function clicContenido(id, precio, desbloqueado, esGratis) {
    if (desbloqueado || esGratis) {
        const item = todoContenido.find(c => c.id == id);
        if (item) abrirVisor(item);
        return;
    }
    if (!candela.auth.isLoggedIn()) { window.location.href = '../index.html'; return; }
    if (precio > 0) {
        contenidoSeleccionado = { id, precio };
        document.getElementById('compra-precio-modal').textContent = `$${precio}`;
        document.getElementById('compra-costo-btn').textContent = `$${precio}`;
        document.getElementById('compra-balance-disp').textContent = `$${userBalance.toFixed(2)}`;
        const insuf = userBalance < precio;
        document.getElementById('compra-saldo-insuf').classList.toggle('hidden', !insuf);
        if (insuf) document.getElementById('compra-falta').textContent = `$${(precio - userBalance).toFixed(2)}`;
        abrirModal('modal-compra');
        return;
    }
    // Contenido solo suscriptores — intentar trial
    if (trialStatus && trialStatus.puede_ver) {
        try {
            const res = await candela._req('POST', `/api/contenido/${id}/trial-view`);
            // Actualizar trialStatus localmente
            if (trialStatus) {
                trialStatus.vistas_esta_creadora = (trialStatus.vistas_esta_creadora || 0) + 1;
                trialStatus.puede_ver = trialStatus.vistas_esta_creadora < 2 &&
                    (trialStatus.total_creadoras < 2 || trialStatus.vistas_esta_creadora > 0);
            }
            const item = todoContenido.find(c => c.id == id);
            if (item && res.url_archivo) {
                abrirVisor({ ...item, url_archivo: res.url_archivo, desbloqueado: true });
                // Refrescar grid para actualizar badge restantes
                filtrarContenido();
                if (res.trial_restantes === 0) {
                    setTimeout(() => toast('Prueba completada. Suscribete para ver mas contenido.', 'info'), 800);
                }
            }
        } catch(e) {
            // Trial agotado o error
            _mostrarBloqueTrialAgotado();
        }
    } else {
        _mostrarBloqueTrialAgotado();
    }
}

function _mostrarBloqueTrialAgotado() {
    if (trialStatus && trialStatus.total_creadoras >= 2 && trialStatus.vistas_esta_creadora === 0) {
        // Limite de creadoras alcanzado
        toast('Has usado tus pruebas gratuitas. Suscribete para continuar.', 'info');
    }
    abrirSub();
}

// ─── TABS ────────────────────────────────────────────────────
function switchTab(tab, btn) {
    tabActual = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    filtrarContenido();
}

// ─── SUSCRIPCION ─────────────────────────────────────────────
let _planes = [];
let _planSel = 1;      // meses elegidos
let _planCosto = 0;    // costo total del plan elegido

async function abrirSub() {
    if (!candela.auth.isLoggedIn()) {
        sessionStorage.setItem('candela_return', location.href);
        window.location.href = '../index.html?login=1';
        return;
    }
    // cargar planes (1/3/6/12 con descuento)
    try {
        const data = await candela.pagos.planes(slug);
        _planes = data.planes || [];
    } catch(_) {
        _planes = [{ meses: 1, total: creadoraData.precio_suscripcion || 0, descuento: 0, precio_mes: creadoraData.precio_suscripcion || 0, ahorro: 0 }];
    }
    _planSel = 1;
    renderPlanes();
    document.getElementById('sub-balance-disp').textContent = `$${userBalance.toFixed(2)}`;
    abrirModal('modal-sub');
}

function renderPlanes() {
    const cont = document.getElementById('sub-planes');
    if (_planes.length <= 1) { cont.classList.add('hidden'); }
    else { cont.classList.remove('hidden'); }
    cont.innerHTML = _planes.map(p => `
        <div class="plan-opt ${p.meses === _planSel ? 'sel' : ''}" data-on-click="seleccionarPlan(${p.meses})">
            ${p.descuento > 0 ? `<span class="pd">-${p.descuento}%</span>` : ''}
            <div class="pm">${p.meses === 1 ? '1 mes' : p.meses + ' meses'}</div>
            <div class="pt">$${Number(p.precio_mes).toFixed(2)}/mes${p.meses > 1 ? ` · $${Number(p.total).toFixed(0)} total` : ''}</div>
        </div>`).join('');
    seleccionarPlan(_planSel, true);
}

function seleccionarPlan(meses, soloActualizar) {
    _planSel = meses;
    const p = _planes.find(x => x.meses === meses) || _planes[0];
    _planCosto = Number(p.total) || 0;
    if (!soloActualizar) {
        document.querySelectorAll('#sub-planes .plan-opt').forEach((el, i) => {
            el.classList.toggle('sel', _planes[i] && _planes[i].meses === meses);
        });
    }
    document.getElementById('sub-precio-modal').textContent = `$${_planCosto.toFixed(2)}`;
    document.getElementById('sub-costo-btn').textContent = `$${_planCosto.toFixed(2)}`;
    const insuf = userBalance < _planCosto;
    const box = document.getElementById('sub-saldo-insuf');
    box.classList.toggle('hidden', !insuf);
    if (insuf) document.getElementById('sub-falta').textContent = `$${(_planCosto - userBalance).toFixed(2)}`;
    document.getElementById('btn-confirmar-sub').disabled = insuf;
}

async function confirmarSub() {
    if (userBalance < _planCosto) {
        sessionStorage.setItem('candela_return', location.href);
        window.location.href = 'wallet.html';
        return;
    }
    const btn = document.getElementById('btn-confirmar-sub');
    btn.textContent = 'Procesando...'; btn.disabled = true;
    try {
        const r = await candela.pagos.confirmarSuscripcion({ creadora_slug: slug, meses: _planSel });
        userBalance = r.nuevo_balance != null ? r.nuevo_balance : Math.max(0, userBalance - _planCosto);
        cerrarModal('modal-sub');
        toast(r.mensaje || 'Suscripcion activada', 'success');
        setTimeout(() => location.reload(), 2000);
    } catch(err) {
        toast(err.message, 'error');
        btn.textContent = `Suscribirme por $${_planCosto.toFixed(2)} USDT`; btn.disabled = false;
    }
}

async function confirmarCompra() {
    if (!contenidoSeleccionado) return;
    const precio = contenidoSeleccionado.precio;
    if (userBalance < precio) { window.location.href = 'wallet.html'; return; }
    const btn = document.getElementById('btn-confirmar-compra');
    btn.textContent = 'Desbloqueando...'; btn.disabled = true;
    try {
        const r = await candela.contenido.comprar(contenidoSeleccionado.id);
        userBalance = r.nuevo_balance ?? Math.max(0, userBalance - precio);
        cerrarModal('modal-compra');
        toast('Contenido desbloqueado', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch(err) {
        toast(err.message, 'error');
        btn.textContent = `Desbloquear por $${precio} USDT`; btn.disabled = false;
    }
}

// ─── STICKY BAR ──────────────────────────────────────────────
function initStickyBar() {
    const bar = document.getElementById('sticky-sub');
    if (!creadoraData?.precio_suscripcion) return;
    const observer = new IntersectionObserver(([e]) => {
        bar.classList.toggle('visible', !e.isIntersecting);
    }, { threshold: 0 });
    observer.observe(document.getElementById('precio-box'));
    if (!document.getElementById('precio-box').classList.contains('hidden') === false) {
        // No hay precio, no mostrar sticky bar
    }
}

// elegirRed y copiarWallet ya no se usan en los modales (wallet-based flow)

function compartir() {
    if (navigator.share) {
        navigator.share({ title: creadoraData?.nombre_artistico || 'Candela', url: location.href });
    } else {
        navigator.clipboard.writeText(location.href);
        toast('Enlace copiado', 'success');
    }
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// --- Propinas ---
let propinaMonto = 5;
function setPropinaMonto(v) { propinaMonto = parseFloat(v) || 0; limpiarBtnsPropina(); }

function abrirPropina() {
    if (!candela.auth.isLoggedIn()) { toast('Inicia sesion para enviar una propina', 'info'); return; }
    document.getElementById('propina-nombre-creadora').textContent = creadoraData?.nombre_artistico || '';
    document.getElementById('propina-monto-custom').value = '';
    document.getElementById('propina-mensaje').value = '';
    propinaMonto = 5;
    limpiarBtnsPropina();
    document.querySelectorAll('.propina-monto-btn').forEach(b => {
        if (parseFloat(b.dataset.monto) === 5) {
            b.classList.add('border-c-accent','text-c-accent');
            b.classList.remove('border-c-border','text-c-soft');
        }
    });
    _actualizarModalPropina();
    document.getElementById('modal-propina').classList.add('open');
}

function _actualizarModalPropina() {
    const m = propinaMonto || parseFloat(document.getElementById('propina-monto-custom').value) || 0;
    document.getElementById('propina-total-display').textContent = `$${m}`;
    document.getElementById('propina-costo-btn').textContent = `$${m}`;
    document.getElementById('propina-balance-disp').textContent = `$${userBalance.toFixed(2)}`;
    const insuf = m > 0 && userBalance < m;
    document.getElementById('propina-saldo-insuf').classList.toggle('hidden', !insuf);
    if (insuf) document.getElementById('propina-falta').textContent = `$${(m - userBalance).toFixed(2)}`;
}

function limpiarBtnsPropina() {
    document.querySelectorAll('.propina-monto-btn').forEach(b => {
        b.classList.remove('border-c-accent','text-c-accent','bg-c-accent','text-white');
        b.classList.add('border-c-border','text-c-soft');
    });
}

function elegirMontoPropina(monto) {
    propinaMonto = monto;
    limpiarBtnsPropina();
    document.getElementById('propina-monto-custom').value = '';
    document.querySelectorAll('.propina-monto-btn').forEach(b => {
        if (parseFloat(b.dataset.monto) === monto) {
            b.classList.add('border-c-accent','text-c-accent');
            b.classList.remove('border-c-border','text-c-soft');
        }
    });
    _actualizarModalPropina();
}

async function confirmarPropina() {
    if (!candela.auth.isLoggedIn()) { toast('Inicia sesion primero', 'info'); return; }
    const monto = propinaMonto || parseFloat(document.getElementById('propina-monto-custom').value);
    if (!monto || monto < 1) { toast('Elige un monto valido (minimo $1)', 'error'); return; }
    if (userBalance < monto) { window.location.href = 'wallet.html'; return; }
    const mensaje = document.getElementById('propina-mensaje').value.trim();

    const btn = document.getElementById('btn-confirmar-propina');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
        const r = await candela.propinas.enviar({
            creadora_slug: creadoraData.slug,
            monto,
            mensaje: mensaje || null,
        });
        userBalance = r.nuevo_balance ?? Math.max(0, userBalance - monto);
        cerrarModal('modal-propina');
        toast(`Propina de $${monto} enviada a ${creadoraData.nombre_artistico}`, 'success');
    } catch (e) {
        toast(e.message || 'Error al enviar propina', 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = `Enviar propina de <span id="propina-costo-btn">$${monto}</span> USDT`;
    }
}

// --- Chat por sesion ---
let _chatSesionDuracion = 5;
let _chatSesionWs = null;
let _chatSesionTimer = null;

function abrirChatSesion() {
    if (!candela.auth.isLoggedIn()) { toast('Inicia sesion para solicitar un chat privado', 'info'); return; }
    const pMin = creadoraData?.precio_chat_minuto || 5;
    document.getElementById('chat-sesion-nombre-creadora').textContent = creadoraData?.nombre_artistico || '';
    document.getElementById('chat-sesion-precio-info').textContent = `$${pMin.toFixed(2)} por minuto`;
    document.getElementById('chat-sesion-balance').textContent = `$${(userBalance || 0).toFixed(2)}`;
    document.getElementById('chat-sesion-msg-inicial').value = '';
    selDuracion(5);
    document.getElementById('modal-chat-sesion').style.display = 'flex';
}

function selDuracion(min) {
    _chatSesionDuracion = min;
    [5, 10, 15, 30].forEach(m => {
        const btn = document.getElementById(`dur-${m}`);
        if (btn) btn.classList.toggle('c-btn', m === min);
    });
    const precio = ((creadoraData?.precio_chat_minuto || 5) * min).toFixed(2);
    const res = document.getElementById('chat-sesion-resumen');
    res.textContent = `Total: $${precio} USDT por ${min} minutos`;
    res.classList.remove('hidden');
}

async function confirmarChatSesion() {
    const duracion = _chatSesionDuracion;
    const pMin = creadoraData?.precio_chat_minuto || 5;
    const total = pMin * duracion;
    if ((userBalance || 0) < total) {
        toast(`Saldo insuficiente. Necesitas $${total.toFixed(2)}`, 'error'); return;
    }
    const msg = document.getElementById('chat-sesion-msg-inicial').value.trim();
    const btn = document.getElementById('btn-confirmar-chat-sesion');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
        const r = await candela._req('POST', '/api/chat-sesion/solicitar', {
            creadora_slug: creadoraData.slug,
            duracion_minutos: duracion,
            mensaje_inicial: msg || null,
        });
        userBalance = r.nuevo_balance ?? userBalance;
        cerrarModal('modal-chat-sesion');
        toast('Solicitud enviada. Esperando que la creadora acepte...', 'success');
        // Pollear hasta que la sesion sea aceptada o rechazada
        _esperarAceptacion(r.sesion_id);
    } catch (e) {
        toast(e.message || 'Error al solicitar sesion', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Solicitar sesión';
    }
}

async function _esperarAceptacion(sesionId) {
    let intentos = 0;
    const intervalo = setInterval(async () => {
        intentos++;
        if (intentos > 60) { clearInterval(intervalo); toast('La creadora no respondio la solicitud', 'error'); return; }
        try {
            const sesiones = await candela._req('GET', '/api/chat-sesion/mis-sesiones');
            const s = sesiones.find(x => x.id === sesionId);
            if (!s) return;
            if (s.estado === 'activa') {
                clearInterval(intervalo);
                _abrirVentanaChat(sesionId, s);
            } else if (s.estado === 'rechazada' || s.estado === 'expirada') {
                clearInterval(intervalo);
                toast('La creadora no acepto la solicitud. Tu saldo fue devuelto.', 'info');
            }
        } catch (_) {}
    }, 5000);
}

function _abrirVentanaChat(sesionId, sesionInfo) {
    document.getElementById('chat-activo-titulo').textContent = `Chat con ${creadoraData?.nombre_artistico || ''}`;
    document.getElementById('chat-activo-mensajes').innerHTML = '';
    document.getElementById('modal-chat-activo').style.display = 'flex';

    // la sesion viaja en la cookie HttpOnly: el WebSocket la envia solo, no hay token que mandar
    _chatSesionWs = new WebSocket(`${candela._wsBase()}/api/chat-sesion/${encodeURIComponent(sesionId)}/ws`);

    _chatSesionWs.onmessage = e => {
        const d = JSON.parse(e.data);
        if (d.tipo === 'sesion_info') {
            _iniciarTimerChat(d.segundos_restantes);
        } else if (d.tipo === 'heartbeat') {
            _actualizarTimerChat(d.segundos_restantes);
        } else if (d.tipo === 'chat') {
            _agregarMensajeChat(d.usuario, d.texto, d.role === 'fan');
        } else if (d.tipo === 'sesion_fin') {
            clearInterval(_chatSesionTimer);
            document.getElementById('chat-activo-timer').textContent = 'Sesion terminada';
            toast('La sesion de chat ha terminado', 'info');
            setTimeout(() => cerrarModal('modal-chat-activo'), 3000);
        }
    };

    _chatSesionWs.onerror = () => toast('Error de conexion en el chat', 'error');

    // Heartbeat cada 30s
    const hb = setInterval(() => {
        if (_chatSesionWs && _chatSesionWs.readyState === WebSocket.OPEN) {
            _chatSesionWs.send(JSON.stringify({ tipo: 'heartbeat' }));
        } else {
            clearInterval(hb);
        }
    }, 30000);
}

function _iniciarTimerChat(segundos) {
    _actualizarTimerChat(segundos);
    _chatSesionTimer = setInterval(() => {
        segundos = Math.max(0, segundos - 1);
        _actualizarTimerChat(segundos);
    }, 1000);
}

function _actualizarTimerChat(segundos) {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    document.getElementById('chat-activo-timer').textContent = `${m}:${String(s).padStart(2, '0')} restantes`;
}

function _agregarMensajeChat(usuario, texto, esFan) {
    const cont = document.getElementById('chat-activo-mensajes');
    const div = document.createElement('div');
    div.className = esFan ? 'text-right' : 'text-left';
    div.innerHTML = `<span class="inline-block max-w-xs px-3 py-2 rounded-2xl text-sm ${esFan ? 'bg-c-accent text-white ml-auto' : 'bg-c-border text-c-text'}">${esc(texto)}</span>`;
    cont.appendChild(div);
    cont.scrollTop = cont.scrollHeight;
}

function chatActivoEnviar() {
    if (!_chatSesionWs || _chatSesionWs.readyState !== WebSocket.OPEN) return;
    const inp = document.getElementById('chat-activo-inp');
    const texto = inp.value.trim();
    if (!texto) return;
    _chatSesionWs.send(JSON.stringify({ tipo: 'chat', texto }));
    _agregarMensajeChat('Tu', texto, true);
    inp.value = '';
}

function terminarChatSesion() {
    if (_chatSesionWs && _chatSesionWs.readyState === WebSocket.OPEN) {
        _chatSesionWs.send(JSON.stringify({ tipo: 'terminar' }));
    }
}

// --- Mensajes directos ---
function abrirMensaje() {
    if (!candela.auth.isLoggedIn()) { toast('Inicia sesion para enviar un mensaje', 'info'); return; }
    const precio = creadoraData?.precio_mensaje || 5;
    document.getElementById('dm-nombre-creadora').textContent = creadoraData?.nombre_artistico || '';
    document.getElementById('dm-precio-display').textContent = `$${precio}`;
    document.getElementById('dm-costo-btn').textContent = `$${precio}`;
    document.getElementById('dm-balance-disp').textContent = `$${userBalance.toFixed(2)}`;
    document.getElementById('dm-contenido').value = '';
    document.getElementById('dm-char-count').textContent = '0';
    const insuf = userBalance < precio;
    document.getElementById('dm-saldo-insuf').classList.toggle('hidden', !insuf);
    if (insuf) document.getElementById('dm-falta').textContent = `$${(precio - userBalance).toFixed(2)}`;
    document.getElementById('modal-dm').classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
    const dmTA = document.getElementById('dm-contenido');
    if (dmTA) dmTA.addEventListener('input', () => {
        document.getElementById('dm-char-count').textContent = dmTA.value.length;
    });
});

async function confirmarMensaje() {
    const contenido = document.getElementById('dm-contenido').value.trim();
    if (!contenido || contenido.length < 5) { toast('El mensaje debe tener al menos 5 caracteres', 'error'); return; }
    const precio = creadoraData?.precio_mensaje || 5;
    if (userBalance < precio) { window.location.href = 'wallet.html'; return; }

    const btn = document.getElementById('btn-confirmar-dm');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
        const r = await candela.mensajes.enviar({
            creadora_slug: creadoraData.slug,
            contenido,
        });
        userBalance = r.nuevo_balance ?? Math.max(0, userBalance - precio);
        cerrarModal('modal-dm');
        toast(`Mensaje enviado a ${creadoraData.nombre_artistico}`, 'success');
        setTimeout(() => { window.location.href = 'mensajes.html?con=' + encodeURIComponent(creadoraData.id); }, 900);
    } catch (e) {
        toast(e.message || 'Error al enviar mensaje', 'error');
    } finally {
        btn.disabled = false; btn.textContent = `Enviar mensaje por $${precio} USDT`;
    }
}

function toast(msg, tipo = 'info') {
    const c = document.getElementById('toasts');
    const col = { error:'#e74c3c', success:'#2ecc71', info:'#B5445C' };
    const el = document.createElement('div');
    el.style.cssText = `background:#fff;border:1px solid #F5E8EF;border-left:4px solid ${col[tipo]||col.info};padding:.8rem 1rem;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.09);font-size:.85rem;max-width:280px;pointer-events:auto;opacity:0;transform:translateX(100%);transition:all .25s ease;`;
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateX(0)'; });
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(100%)'; setTimeout(()=>el.remove(),300); }, 3800);
}

// ─── PROTECCION DE CONTENIDO ─────────────────────────────────

function wmLabel() {
    const u = candela.auth.user();
    // Si quien mira es la propia creadora de esta pagina, nunca estampar su
    // nombre real: esta marca es para rastrear filtraciones de FANS, no para
    // exponer la identidad real de la creadora en su propio contenido.
    if (u?.slug && creadoraData?.slug && u.slug === creadoraData.slug) {
        return 'clubcandela.com';
    }
    if (u?.nombre) return u.nombre + ' · candela';
    if (u?.email) return u.email.split('@')[0] + ' · candela';
    return 'clubcandela.com';
}

function crearWmLayer(label, oscuro) {
    const layer = document.createElement('div');
    layer.className = 'wm-layer';
    // Grid 3x3 de textos diagonales
    const cols = 3, rows = 3;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const span = document.createElement('span');
            span.className = 'wm-text';
            span.style.left = (c * 34 + 4) + '%';
            span.style.top  = (r * 34 + 8) + '%';
            span.style.color = oscuro
                ? 'rgba(255,255,255,.17)'
                : 'rgba(0,0,0,.1)';
            span.textContent = label;
            layer.appendChild(span);
        }
    }
    return layer;
}

function aplicarWatermarks() {
    const label = wmLabel();
    document.querySelectorAll('#content-grid .content-item').forEach(item => {
        // Solo contenido visible (no bloqueado) — los bloqueados ya tienen blur
        if (item.querySelector('.wm-layer')) return;
        const esBloqueado = !!item.querySelector('.ms');  // lock icon = bloqueado
        if (!esBloqueado) {
            const oscuro = !!item.querySelector('img');
            item.style.position = 'relative';
            item.appendChild(crearWmLayer(label, oscuro));
        }
    });
}

// Bloquear clic derecho en zona de contenido
document.addEventListener('contextmenu', e => {
    if (e.target.closest('#content-grid') || e.target.closest('#visor')) {
        e.preventDefault();
    }
});

// Privacy mode: blur cuando la pestaña no esta visible
document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('privacy-mode', document.hidden);
});
window.addEventListener('blur', () => document.body.classList.add('privacy-mode'));
window.addEventListener('focus', () => document.body.classList.remove('privacy-mode'));

// Bloquear Ctrl+S (guardar pagina con recursos)
document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    }
});

// ─── VISOR ───────────────────────────────────────────────────
function abrirVisor(item) {
    const visor = document.getElementById('visor');
    const img = document.getElementById('visor-img');
    const vid = document.getElementById('visor-video');
    const wm  = document.getElementById('visor-wm');

    img.style.display = 'none';
    vid.style.display = 'none';
    vid.pause && vid.pause();

    if (item.tipo === 'video' && item.url_archivo) {
        vid.src = _u(item.url_archivo);
        vid.style.display = 'block';
    } else {
        img.src = _u(item.url_archivo || item.preview_url || '');
        img.style.display = 'block';
    }

    // Watermark en visor
    wm.innerHTML = '';
    const label = wmLabel();
    const cols = 4, rows = 4;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const span = document.createElement('span');
            span.className = 'wm-text';
            span.style.left = (c * 25 + 2) + '%';
            span.style.top  = (r * 25 + 4) + '%';
            span.style.color = 'rgba(255,255,255,.2)';
            span.textContent = label;
            wm.appendChild(span);
        }
    }

    visor.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarVisor(e) {
    if (e && e.target !== document.getElementById('visor') && !e.target.closest('button')) return;
    const visor = document.getElementById('visor');
    const vid = document.getElementById('visor-video');
    vid.pause && vid.pause();
    vid.src = '';
    visor.classList.remove('open');
    document.body.style.overflow = '';
}

// ─── CARRUSEL ────────────────────────────────────────────────
function renderCarruselPublico() {
    const fotos = creadoraData?.fotos_carrusel;
    if (!fotos || !fotos.length) return;

    const sec = document.getElementById('carrusel-section');
    const wrap = document.getElementById('carrusel-items');
    sec.classList.remove('hidden');

    const logueado = candela.auth.isLoggedIn();

    wrap.innerHTML = fotos.map(item => {
        const url = (item && typeof item === 'object') ? item.url : item;
        if (logueado) {
            return `<div class="shrink-0 rounded-2xl overflow-hidden" style="width:200px;height:260px;scroll-snap-align:start">
                <img src="${_u(url)}" class="w-full h-full object-cover" draggable="false" data-on-contextmenu="return false">
            </div>`;
        } else {
            return `<div class="shrink-0 rounded-2xl overflow-hidden relative" style="width:200px;height:260px;scroll-snap-align:start">
                <img src="${_u(url)}" class="w-full h-full object-cover" style="filter:blur(18px);transform:scale(1.1)" draggable="false" data-on-contextmenu="return false">
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2" style="background:rgba(45,20,10,.3)">
                    <span class="ms" style="color:#fff;font-size:28px">lock</span>
                    <span class="text-white text-xs font-bold text-center px-3">Inicia sesion para ver</span>
                </div>
            </div>`;
        }
    }).join('');

    if (!logueado) {
        wrap.insertAdjacentHTML('afterend', `
            <button data-on-click="window.location.href='../index.html'" class="mt-3 w-full c-btn text-white py-2.5 rounded-xl text-sm font-bold shadow-md">
                Iniciar sesion o registrarse
            </button>`);
    }
}

// ─── PACKS PUBLICOS ──────────────────────────────────────────
let packSeleccionado = null;
let packsCreadora = [];

async function cargarPacksPublicos() {
    try {
        const packs = await candela._req('GET', `/api/packs/creadora/${encodeURIComponent(slug)}`);
        packsCreadora = packs || [];
        if (!packs?.length) return;

        const sec = document.getElementById('packs-section');
        const lista = document.getElementById('packs-list');
        sec.classList.remove('hidden');

        lista.innerHTML = packs.map(pk => {
            const precioFan = Number(pk.precio_fan || 0).toFixed(2);
            const modoBadge = pk.modo === 'venta'
                ? '<span class="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-1">Descargable</span>'
                : '<span class="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full ml-1">PPV</span>';
            const archivos = pk.total_archivos || 0;
            return `<div class="bg-white border border-c-border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1 flex-wrap">
                        <p class="font-bold text-sm">${esc(pk.titulo)}</p>${modoBadge}
                    </div>
                    ${pk.descripcion ? `<p class="text-xs text-c-soft mt-0.5 line-clamp-2">${esc(pk.descripcion)}</p>` : '<p class="text-xs text-c-soft mt-0.5 italic">Contenido exclusivo</p>'}
                    <p class="text-xs text-c-soft mt-1">${archivos} archivo${archivos !== 1 ? 's' : ''}</p>
                </div>
                <div class="shrink-0 text-right">
                    <p class="text-lg font-bold text-c-text mb-1">$${precioFan}</p>
                    <button data-on-click="abrirCompraPack('${String(pk.id).replace(/[^a-z0-9-]/gi,'')}',${Number(pk.precio_fan)||0},'${pk.modo === 'venta' ? 'venta' : 'ppv'}')"
                        class="c-btn text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                        Comprar
                    </button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        // Silencioso — si falla (no auth, sin packs) no mostrar seccion
    }
}

function abrirCompraPack(id, precioFan, modo) {
    if (!candela.auth.isLoggedIn()) {
        window.location.href = '../index.html';
        return;
    }
    const pk = packsCreadora.find(p => p.id === id) || {};
    // precioFan ya incluye el recargo de los packs en venta: lo calcula el servidor
    packSeleccionado = { id, precioFan };
    document.getElementById('pack-modal-titulo').textContent = pk.titulo || 'Pack';
    document.getElementById('pack-modal-desc').textContent = pk.descripcion || 'Pack exclusivo';
    document.getElementById('pack-precio-modal').textContent = `$${precioFan.toFixed(2)}`;
    document.getElementById('pack-costo-btn').textContent = `$${precioFan.toFixed(2)}`;
    document.getElementById('pack-balance-disp').textContent = `$${userBalance.toFixed(2)}`;
    const insuf = userBalance < precioFan;
    document.getElementById('pack-saldo-insuf').classList.toggle('hidden', !insuf);
    if (insuf) document.getElementById('pack-falta').textContent = `$${(precioFan - userBalance).toFixed(2)}`;
    document.getElementById('pack-modo-info').textContent = modo === 'venta'
        ? 'Este pack incluye descarga permanente de todos los archivos.'
        : 'Este pack permite ver el contenido desde la plataforma. No incluye descarga.';
    abrirModal('modal-pack');
}

// ─── STORIES VIEWER ──────────────────────────────────────────
let storyData = [];
let storyIdx = 0;
let storyTimer = null;
let storyInterval = null;

async function cargarStories() {
    try {
        if (!candela.auth.isLoggedIn()) return;
        const feed = await candela._req('GET', '/api/stories/feed');
        if (!feed?.length) return;
        const grupo = feed.find(g => g.creadora_slug === slug);
        if (!grupo?.stories?.length) return;
        storyData = grupo.stories;
        document.getElementById('story-ring-wrap').classList.add('has-story');
    } catch(e) { /* silencioso */ }
}

function abrirStories() {
    if (!storyData.length) return;
    if (!candela.auth.isLoggedIn()) { window.location.href = '../index.html'; return; }
    storyIdx = 0;
    // Rellenar header
    document.getElementById('sv-nombre').textContent = creadoraData?.nombre_artistico || '';
    const svAvatar = document.getElementById('sv-avatar');
    if (creadoraData?.avatar_url) {
        svAvatar.innerHTML = `<img src="${creadoraData.avatar_url}" class="w-full h-full object-cover">`;
    } else {
        svAvatar.textContent = (creadoraData?.nombre_artistico || '?')[0].toUpperCase();
        svAvatar.style.background = 'linear-gradient(135deg,#FAF2F5,#B5445C)';
        svAvatar.style.display = 'flex';
        svAvatar.style.alignItems = 'center';
        svAvatar.style.justifyContent = 'center';
        svAvatar.style.color = '#fff';
        svAvatar.style.fontWeight = 'bold';
    }
    document.getElementById('modal-story-viewer').classList.add('open');
    document.body.style.overflow = 'hidden';
    _mostrarStory(storyIdx);
}

function cerrarStories() {
    clearTimeout(storyTimer); clearInterval(storyInterval);
    document.getElementById('modal-story-viewer').classList.remove('open');
    document.body.style.overflow = '';
    const vid = document.getElementById('sv-video');
    vid.pause(); vid.src = '';
}

function _mostrarStory(idx) {
    clearTimeout(storyTimer); clearInterval(storyInterval);
    if (idx >= storyData.length) { cerrarStories(); return; }
    const s = storyData[idx];
    const img = document.getElementById('sv-img');
    const vid = document.getElementById('sv-video');
    if (s.tipo === 'video') {
        img.classList.add('hidden');
        vid.classList.remove('hidden');
        vid.src = s.url; vid.currentTime = 0; vid.play().catch(() => {});
    } else {
        vid.pause(); vid.src = ''; vid.classList.add('hidden');
        img.src = s.url; img.classList.remove('hidden');
    }
    const bars = document.getElementById('story-progress-bars');
    bars.innerHTML = storyData.map((_,i) => `<div class="story-progress-bar"><div class="fill" id="spbar-${i}" style="width:${i<idx?'100':'0'}%"></div></div>`).join('');
    candela._req('POST', `/api/stories/${s.id}/vista`).catch(() => {});
    const durMs = (s.tipo === 'video' ? (s.duracion || 15) : 5) * 1000;
    const bar = document.getElementById(`spbar-${idx}`);
    if (bar) {
        const t0 = Date.now();
        storyInterval = setInterval(() => {
            const pct = Math.min(100, ((Date.now() - t0) / durMs) * 100);
            bar.style.width = pct + '%';
            if (pct >= 100) clearInterval(storyInterval);
        }, 50);
    }
    storyTimer = setTimeout(() => { storyIdx++; _mostrarStory(storyIdx); }, durMs);
}

function avanzarStory(e) {
    e.stopPropagation();
    clearTimeout(storyTimer); clearInterval(storyInterval);
    storyIdx++; _mostrarStory(storyIdx);
}

function retrocederStory(e) {
    e.stopPropagation();
    clearTimeout(storyTimer); clearInterval(storyInterval);
    storyIdx = Math.max(0, storyIdx - 1); _mostrarStory(storyIdx);
}

// ─── ENCUESTAS ───────────────────────────────────────────────
async function cargarEncuestas() {
    try {
        if (!candela.auth.isLoggedIn() || !suscritoActualmente) return;
        const lista = await candela._req('GET', `/api/encuestas/creadora/${slug}`);
        if (!lista?.length) return;
        const sec = document.getElementById('encuestas-section');
        const cont = document.getElementById('encuestas-list');
        sec.classList.remove('hidden');
        renderEncuestas(lista);
    } catch(e) { /* silencioso si no es suscriptor */ }
}

function renderEncuestas(lista) {
    const cont = document.getElementById('encuestas-list');
    cont.innerHTML = lista.map(e => {
        const yaVoto = e.mi_voto !== null && e.mi_voto !== undefined;
        const barras = e.opciones.map((op, i) => {
            const pct = e.total_votos > 0 ? Math.round((e.conteo[i] / e.total_votos) * 100) : 0;
            const esElMio = e.mi_voto === i;
            return `
            <button data-on-click="votarEncuesta('${e.id}',${i})" ${yaVoto ? 'disabled' : ''}
                class="w-full text-left rounded-xl border transition-all mb-2 overflow-hidden ${esElMio ? 'border-c-accent bg-orange-50' : 'border-c-border bg-white hover:border-c-accent'}"
                style="${yaVoto ? 'cursor:default' : ''}">
                <div class="px-3 py-2.5 relative">
                    ${yaVoto ? `<div class="absolute inset-0 rounded-xl bg-c-accent/10" style="width:${pct}%"></div>` : ''}
                    <div class="relative flex justify-between items-center">
                        <span class="text-sm ${esElMio ? 'font-bold text-c-accent' : 'text-c-text'}">${esc(op)}</span>
                        ${yaVoto ? `<span class="text-xs text-c-soft">${pct}%</span>` : ''}
                    </div>
                </div>
            </button>`;
        }).join('');
        return `
        <div class="bg-white border border-c-border rounded-2xl p-4 shadow-sm" data-encuesta-id="${e.id}">
            <p class="font-semibold text-sm mb-3">${esc(e.pregunta)}</p>
            <div class="encuesta-opciones">${barras}</div>
            <p class="text-[10px] text-c-soft mt-1">${e.total_votos} voto${e.total_votos!==1?'s':''}</p>
        </div>`;
    }).join('');
}

async function votarEncuesta(encuestaId, opcionIdx) {
    try {
        const result = await candela._req('POST', `/api/encuestas/${encuestaId}/votar?opcion_idx=${opcionIdx}`);
        // Actualizar solo esa encuesta en el DOM
        const cont = document.getElementById('encuestas-list');
        const card = cont.querySelector(`[data-encuesta-id="${encuestaId}"]`);
        if (card && result) {
            // Re-render solo esa card actualizando result
            const tmp = document.createElement('div');
            tmp.innerHTML = renderEncuestaCard(result);
            card.replaceWith(tmp.firstElementChild);
        }
        toast('Voto registrado', 'success');
    } catch(e) { toast(e.message || 'Ya votaste', 'error'); }
}

function renderEncuestaCard(e) {
    const barras = e.opciones.map((op, i) => {
        const pct = e.total_votos > 0 ? Math.round((e.conteo[i] / e.total_votos) * 100) : 0;
        const esElMio = e.mi_voto === i;
        return `<button disabled class="w-full text-left rounded-xl border mb-2 overflow-hidden ${esElMio ? 'border-c-accent bg-orange-50' : 'border-c-border bg-white'}" style="cursor:default">
            <div class="px-3 py-2.5 relative">
                <div class="absolute inset-0 rounded-xl bg-c-accent/10" style="width:${pct}%"></div>
                <div class="relative flex justify-between items-center">
                    <span class="text-sm ${esElMio ? 'font-bold text-c-accent' : 'text-c-text'}">${esc(op)}</span>
                    <span class="text-xs text-c-soft">${pct}%</span>
                </div>
            </div>
        </button>`;
    }).join('');
    return `<div class="bg-white border border-c-border rounded-2xl p-4 shadow-sm" data-encuesta-id="${e.id}">
        <p class="font-semibold text-sm mb-3">${esc(e.pregunta)}</p>
        <div class="encuesta-opciones">${barras}</div>
        <p class="text-[10px] text-c-soft mt-1">${e.total_votos} voto${e.total_votos!==1?'s':''}</p>
    </div>`;
}

// ─── TOP FANS ────────────────────────────────────────────────
async function cargarTopFans() {
    if (!candela.auth.isLoggedIn()) return; // el ranking solo lo ven usuarios con sesion
    try {
        const fans = await candela._req('GET', `/api/creadoras/${slug}/top-fans`);
        if (!fans?.length) return;
        const sec = document.getElementById('top-fans-section');
        const lista = document.getElementById('top-fans-list');
        sec.classList.remove('hidden');
        const medals = ['🥇','🥈','🥉'];
        lista.innerHTML = fans.map((f, i) => `
            <div class="flex items-center justify-between bg-white border border-c-border rounded-xl px-4 py-2.5 shadow-sm">
                <div class="flex items-center gap-2">
                    <span class="text-base">${medals[i] || (i+1)}</span>
                    <p class="text-sm font-semibold">${esc(f.nombre)}</p>
                </div>
                <p class="text-xs font-bold text-c-accent">$${f.total} USDT</p>
            </div>`).join('');
    } catch(e) { /* silencioso */ }
}

async function confirmarCompraPack() {
    if (!packSeleccionado) return;
    const btn = document.getElementById('btn-confirmar-pack');
    btn.disabled = true; btn.textContent = 'Procesando...';
    try {
        const r = await candela._req('POST', `/api/packs/${packSeleccionado.id}/comprar`);
        cerrarModal('modal-pack');
        toast('Pack comprado. Revisa tu seccion de compras.', 'success');
        userBalance = r.nuevo_balance ?? Math.max(0, userBalance - packSeleccionado.precioFan);
    } catch(e) {
        toast(e.message || 'Error al comprar', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Comprar por <span id="pack-costo-btn">$' + (packSeleccionado?.precioFan?.toFixed(2)||'0') + '</span> USDT';
    }
}

init();
