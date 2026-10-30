const GRADIENTES = {
    'melocoton':    ['#FFF4EE','#B5445C'],
    'rosa-venecia': ['#FFF0F5','#D4869D'],
    'lavanda':      ['#F7F2FF','#9B72CF'],
    'rojo-carmin':  ['#3D0A0A','#C0392B'],
    'menta':        ['#F0FAF7','#2ECC71'],
    'cielo':        ['#F0F8FF','#5DADE2'],
    'dorada':       ['#FFFBF0','#D4AC0D'],
    'nude':         ['#FAF7F4','#C4A882'],
    'noche-rosa':   ['#2D0A2D','#FF2D9B'],
    'coral':        ['#FFF5F2','#FF6B6B'],
    'esmeralda':    ['#0D1F19','#1ABC9C'],
    'nube':         ['#F5F5F5','#95A5A6'],
};

// Darker gradients for preview cards (visible on light bg with depth)
const PREVIEW_GRAD = {
    'melocoton':    ['#2A1208','#B5445C'],
    'rosa-venecia': ['#2A0A1A','#D4869D'],
    'lavanda':      ['#16082A','#9B72CF'],
    'rojo-carmin':  ['#2A0808','#C0392B'],
    'menta':        ['#08180E','#2ECC71'],
    'cielo':        ['#081220','#5DADE2'],
    'dorada':       ['#181000','#D4AC0D'],
    'nude':         ['#180E08','#C4A882'],
    'noche-rosa':   ['#1A0420','#FF2D9B'],
    'coral':        ['#280808','#FF6B6B'],
    'esmeralda':    ['#060E0A','#1ABC9C'],
    'nube':         ['#10101C','#95A5A6'],
};

const FLAGS = {
    'Bolivia':'🇧🇴','Colombia':'🇨🇴','Mexico':'🇲🇽','México':'🇲🇽',
    'Argentina':'🇦🇷','Venezuela':'🇻🇪','Peru':'🇵🇪','Perú':'🇵🇪',
    'Chile':'🇨🇱','Uruguay':'🇺🇾','Ecuador':'🇪🇨','Panama':'🇵🇦'
};

let todasCreadoras = [];
let paisFiltro = '';

// ─── INIT ────────────────────────────────────────────────────────────
function init() {
    // Los logueados NO ven la landing: van directo a su home real.
    const u = candela.auth.user?.() || JSON.parse(localStorage.getItem('candela_user') || 'null');
    if (candela.auth.isLoggedIn()) {
        const _preview = new URLSearchParams(location.search).has('preview');
        if (u?.tipo === 'admin' && !_preview) { window.location.replace('pages/admin.html'); return; }
        if (u?.tipo === 'creadora')           { window.location.replace('pages/dashboard-creadora.html'); return; }
        if (u?.tipo !== 'admin')              { window.location.replace('pages/feed.html'); return; }
        // admin + ?preview=1: cae al flujo guest para ver el sitio normalmente
    }

    renderTopbar(false);
    renderNavLinks();
    verificarStreamsActivos();

    // Abrir modal si venimos de otra página (ej: gana-como-agente.html)
    const _pendingModal = sessionStorage.getItem('openModal');
    if (_pendingModal) { sessionStorage.removeItem('openModal'); setTimeout(() => abrirModal(_pendingModal), 400); }

    // Sesion vencida: avisar y abrir login directo (al volver a entrar, candela_return la lleva de nuevo a donde estaba)
    if (new URLSearchParams(location.search).get('sesion') === 'expirada') {
        history.replaceState(null, '', location.pathname);
        setTimeout(() => { toast('Tu sesión expiró. Iniciá sesión de nuevo para continuar.', 'info'); abrirModal('login'); }, 400);
    }

    document.getElementById('hero-guest').classList.remove('hidden');
    document.getElementById('stories-section').style.display = 'none';
    document.getElementById('chips-section').style.display = 'none';
    document.getElementById('feed-grid').style.display = 'none';
    cargarPreviewPublico();
    initScrollAnimations();
    initHeroCanvas();

    // DOB max = 18 years ago
    var dob = document.getElementById('r-dob');
    if (dob) {
        var max18 = new Date();
        max18.setFullYear(max18.getFullYear() - 18);
        dob.max = max18.toISOString().split('T')[0];
    }
}

// ─── TOPBAR ──────────────────────────────────────────────────────────
function renderTopbar(isDark = false) {
    const el = document.getElementById('topbar-right');
    const user = candela.auth.user();
    if (candela.auth.isLoggedIn() && user) {
        const inicial = (user.nombre || 'U')[0].toUpperCase();
        el.innerHTML = `
            <div class="flex items-center gap-2">
                ${user.tipo === 'creadora' ? `<a href="pages/dashboard-creadora.html" class="hidden md:inline text-xs font-bold text-c-accent">Mi panel</a>` : ''}
                ${user.tipo === 'suscriptor' ? `<a href="pages/fan-dashboard.html" class="hidden md:inline text-xs font-bold text-c-accent">Mi panel</a>` : ''}
                ${user.tipo === 'admin' ? `<a href="pages/admin.html" class="hidden md:inline text-xs font-bold text-c-accent">Admin</a>` : ''}
                <button data-on-click="candela.auth.logout()"
                    class="w-9 h-9 rounded-full c-btn text-white text-sm font-bold flex items-center justify-center shadow-sm" title="Salir">
                    ${inicial}
                </button>
            </div>`;
    } else if (isDark) {
        el.innerHTML = `
            <div class="flex items-center gap-2">
                <a href="pages/gana-con-candela.html" id="topbar-creadora-link"
                    class="hidden md:inline text-xs font-bold px-4 py-1.5 rounded-full transition-all"
                    style="color:rgba(255,248,245,.65);border:1px solid rgba(255,248,245,.2)">
                    Ser creadora
                </a>
                <button data-on-click="abrirModal('registro')" class="c-btn text-white px-5 py-2 rounded-full text-xs font-bold shadow-sm">
                    Registrarse
                </button>
            </div>`;
    } else {
        el.innerHTML = `
            <div class="flex items-center gap-2">
                <a href="pages/gana-con-candela.html"
                    class="hidden md:inline text-xs font-bold text-c-accent border border-c-accent px-4 py-1.5 rounded-full hover:bg-c-accent hover:text-white transition-all">
                    Ser creadora
                </a>
                <button data-on-click="abrirModal('login')" class="c-btn text-white px-5 py-2 rounded-full text-xs font-bold shadow-sm">
                    Entrar
                </button>
            </div>`;
    }
}

// ─── HERO CANVAS (silk waves) ────────────────────────────────────────
function initHeroCanvas() {
    const canvas = document.getElementById('hero-cvs');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, t = 0;
    function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
    window.addEventListener('resize', resize, { passive: true });
    resize();
    const layers = [
        {amp:55,freq:.0045,speed:.28,phase:0,r:242,g:176,b:200,alpha:.09},
        {amp:75,freq:.0035,speed:.2,phase:2.1,r:252,g:210,b:225,alpha:.07},
        {amp:45,freq:.006,speed:.4,phase:4.2,r:225,g:155,b:185,alpha:.07},
        {amp:65,freq:.003,speed:.16,phase:1.4,r:255,g:230,b:240,alpha:.06},
        {amp:40,freq:.007,speed:.35,phase:3.5,r:235,g:180,b:210,alpha:.05}
    ];
    function frame() {
        ctx.clearRect(0, 0, W, H);
        t += .003;
        layers.forEach(l => {
            ctx.beginPath();
            const mid = H * .5;
            for (let x = 0; x <= W; x += 6) {
                const y = mid + Math.sin(x * l.freq + t * l.speed + l.phase) * l.amp
                              + Math.cos(x * l.freq * 1.8 + t * l.speed * .9) * l.amp * .35;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fillStyle = `rgba(${l.r},${l.g},${l.b},${l.alpha})`;
            ctx.fill();
        });
        requestAnimationFrame(frame);
    }
    frame();
}

// ─── SCROLL ANIMATIONS ───────────────────────────────────────────────
function initScrollAnimations() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.s-anim').forEach(el => obs.observe(el));
}

// ─── STREAMS EN VIVO (strip) ─────────────────────────────────────────
async function verificarStreamsActivos() {
    try {
        const base = (typeof API_URL !== 'undefined' ? API_URL : '').replace(/\/$/, '');
        const resp = await fetch(`${base}/api/streams/activos`);
        if (!resp.ok) return;
        const lista = await resp.json();
        const n = Array.isArray(lista) ? lista.length : 0;
        if (n < 1) return;
        const c = document.getElementById('strip-streams-count');
        if (c) c.textContent = n === 1 ? '1 creadora' : `${n} creadoras`;
        document.getElementById('strip-streams').classList.remove('hidden');
    } catch (_) {}
}

// ─── PUBLIC TEASERS (guests) ─────────────────────────────────────────
function cargarPreviewPublico() {
    cargarVitrina('hero-vitrina', 6, 'grid');
    cargarVitrina('vitrina-home', 6, 'grid').then(() => {
        if (!document.getElementById('vitrina-home').classList.contains('hidden'))
            document.getElementById('preview-section')?.classList.remove('hidden');
    });
}

function animarContador(el, target, suffix) {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 25));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current + suffix;
        if (current >= target) clearInterval(timer);
    }, 45);
}

// ─── NAV ─────────────────────────────────────────────────────────────
function setNavItem(el, icon, label, href, onclick) {
    if (!el) return;
    el.href = href;
    el.onclick = onclick || null;
    el.querySelector('.nav-icon').textContent = icon;
    el.querySelector('.nav-label').textContent = label;
}

function renderNavLinks() {
    const user = candela.auth.user();
    const i3 = document.getElementById('nav-item3');
    const i4 = document.getElementById('nav-item4');
    const i5 = document.getElementById('nav-item5');
    if (user?.tipo === 'creadora') {
        setNavItem(i3, 'add_circle', 'Subir', 'pages/dashboard-creadora.html');
        setNavItem(i4, 'dashboard', 'Mi Panel', 'pages/dashboard-creadora.html');
        setNavItem(i5, 'account_balance_wallet', 'Billetera', 'pages/wallet.html');
    } else if (user?.tipo === 'suscriptor') {
        setNavItem(i3, 'forum', 'Mensajes', 'pages/mensajes.html');
        setNavItem(i4, 'dashboard', 'Mi Panel', 'pages/fan-dashboard.html');
        setNavItem(i5, 'account_balance_wallet', 'Billetera', 'pages/wallet.html');
    } else {
        setNavItem(i3, 'payments', 'Recargar', 'pages/como-recargar.html');
        setNavItem(i4, 'auto_awesome', 'Creadora', 'pages/gana-con-candela.html');
        setNavItem(i5, 'login', 'Entrar', '#', (e) => { e.preventDefault(); abrirModal('login'); });
    }
}

// ─── STORIES ─────────────────────────────────────────────────────────
async function cargarStories() {
    try {
        const lista = await candela.creadoras.explorar({ limit: 12 });
        const row = document.getElementById('stories-row');
        if (!lista.length) { row.innerHTML = ''; return; }
        row.innerHTML = lista.map((c, i) => {
            const [c1, c2] = GRADIENTES[c.tema_color] || ['#FAF2F5','#F2B8C8'];
            const ring = i < 5 ? 'story-ring-active' : 'bg-c-border';
            const nombre = esc(c.nombre_artistico || 'Creadora');
            const inicial = esc((c.nombre_artistico || 'C')[0].toUpperCase());
            const nombreCorto = esc((c.nombre_artistico || 'Creadora').split(' ')[0]);
            return `
                <a href="pages/creadora.html?slug=${encodeURIComponent(c.slug || '')}" class="flex flex-col items-center gap-1.5 w-[62px] shrink-0">
                    <div class="${ring} p-[2.5px] rounded-full">
                        <div class="w-14 h-14 rounded-full border-2 border-c-bg overflow-hidden flex items-center justify-center"
                            style="background:linear-gradient(135deg,${c1},${c2})">
                            ${c.avatar_url
                                ? `<img src="${esc(c.avatar_url)}" alt="${nombre}" class="w-full h-full object-cover">`
                                : `<span class="text-white font-bold text-xl select-none">${inicial}</span>`}
                        </div>
                    </div>
                    <span class="text-[10px] font-semibold text-c-text text-center w-full truncate">${nombreCorto}</span>
                </a>`;
        }).join('');
    } catch(e) {}
}

// ─── FEED ────────────────────────────────────────────────────────────
async function cargarFeed() {
    try {
        todasCreadoras = await candela.creadoras.explorar({ limit: 30 });
        renderFeed(todasCreadoras);
    } catch(e) {
        document.getElementById('feed-grid').innerHTML = `
            <div class="col-span-full text-center py-16">
                <p class="text-c-soft text-sm">No se pudo conectar con el servidor.</p>
                <button data-on-click="cargarFeed()" class="c-btn text-white px-5 py-2 rounded-full text-xs font-bold mt-4 shadow-sm">Reintentar</button>
            </div>`;
    }
}

function renderFeed(lista) {
    const grid = document.getElementById('feed-grid');
    const empty = document.getElementById('empty-state');
    if (!lista.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    grid.innerHTML = lista.map(c => {
        const [col1, col2] = GRADIENTES[c.tema_color] || ['#FAF2F5','#F2B8C8'];
        const nombre = esc(c.nombre_artistico || 'Creadora');
        const inicial = esc((c.nombre_artistico || 'C')[0].toUpperCase());
        const pais = esc(c.pais || 'Latam');
        const slug = encodeURIComponent(c.slug || '');
        const id = encodeURIComponent(c.id || '');
        const precio = c.precio_suscripcion > 0 ? `$${Number(c.precio_suscripcion)}/mes` : 'Gratis';
        const img = c.banner_url || c.card_preview_url;
        return `
        <article class="feed-card rounded-2xl overflow-hidden bg-white border border-c-border shadow-sm"
            style="cursor:pointer;" data-on-click="irACreadora('${slug}')">
            <div class="relative overflow-hidden" style="aspect-ratio:4/5">
                ${img
                    ? `<img src="${esc(img)}" alt="${nombre}" class="absolute inset-0 w-full h-full object-cover">`
                    : `<div class="absolute inset-0 flex items-center justify-center" style="background:linear-gradient(135deg,${col1},${col2})">
                            <span class="font-display select-none" style="font-size:5rem;color:rgba(255,255,255,0.22);">${inicial}</span>
                       </div>`}
                ${c.destacada ? `
                    <div class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/25"
                        style="background:rgba(255,255,255,0.18);backdrop-filter:blur(8px);">✨ Destacada</div>` : ''}
                <svg class="absolute top-3 right-3" viewBox="0 0 24 24" width="20" height="20" fill="none" role="img" aria-label="Verificada" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))"><circle cx="12" cy="12" r="10" fill="#B5445C"></circle><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                <div class="card-overlay absolute inset-0 flex flex-col justify-end p-4">
                    <div class="flex justify-between items-end gap-3">
                        <div class="flex-1 min-w-0">
                            <div class="w-10 h-10 rounded-full border-2 border-white/70 overflow-hidden flex items-center justify-center mb-2 shrink-0"
                                style="background:linear-gradient(135deg,${col1},${col2})">
                                ${c.avatar_url
                                    ? `<img src="${esc(c.avatar_url)}" alt="" class="w-full h-full object-cover">`
                                    : `<span class="text-white font-bold text-sm">${inicial}</span>`}
                            </div>
                            <h3 class="text-white font-bold text-[15px] leading-tight truncate">${nombre}</h3>
                            <p class="flex items-center gap-1.5 mt-0.5 text-white/65 text-xs">
                                <span class="w-2 h-2 rounded-full bg-white/30 inline-block"></span>${pais}
                            </p>
                        </div>
                        <div class="flex flex-col gap-2 shrink-0">
                            <button class="action-btn" data-on-click="toggleLike(event,'${id}')" title="Me gusta">
                                <span class="material-symbols-outlined" style="font-size:18px">favorite</span>
                            </button>
                            <button class="action-btn" data-on-click="event.stopPropagation();irACreadora('${slug}')" title="Ver perfil">
                                <span class="material-symbols-outlined" style="font-size:18px">chat_bubble</span>
                            </button>
                            <button class="sub-btn" data-on-click="event.stopPropagation();suscribirse('${slug}')" title="Suscribirse">
                                <span class="material-symbols-outlined" style="font-size:18px">favorite_border</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="p-3.5 flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                    ${c.bio ? `<p class="text-c-soft text-xs leading-relaxed line-clamp-1 mb-1">${esc(c.bio)}</p>` : ''}
                    <div class="flex items-center gap-2 text-xs text-c-soft">
                        <span>${Number(c.total_suscriptores) || 0} suscriptores</span>
                        ${c.pais ? `<span class="text-c-border">·</span><span>📍 ${pais}</span>` : ''}
                    </div>
                </div>
                <button data-on-click="event.stopPropagation();suscribirse('${slug}')"
                    class="c-btn text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm shrink-0">
                    ${precio}
                </button>
            </div>
        </article>`;
    }).join('');
}

// ─── FILTROS ─────────────────────────────────────────────────────────
function filtrar(btn) {
    document.querySelectorAll('.chip').forEach(b => {
        b.classList.remove('active');
        b.classList.add('text-c-soft','bg-white','border-c-border');
    });
    btn.classList.add('active');
    btn.classList.remove('text-c-soft','bg-white');
    paisFiltro = btn.dataset.pais;
    const lista = paisFiltro ? todasCreadoras.filter(c => c.pais === paisFiltro) : todasCreadoras;
    renderFeed(lista);
}

// ─── NAVEGACION ──────────────────────────────────────────────────────
function irACreadora(slug) { window.location.href = `pages/creadora.html?slug=${slug}`; }

function suscribirse(slug) {
    if (!candela.auth.isLoggedIn()) { abrirModal('login'); return; }
    irACreadora(slug);
}

async function toggleLike(e, id) {
    e.stopPropagation();
    if (!candela.auth.isLoggedIn()) { abrirModal('fan'); return; }
    const btn = e.currentTarget;
    const icon = btn.querySelector('.material-symbols-outlined');
    const wasLiked = btn.classList.contains('liked');
    btn.classList.toggle('liked');
    icon.style.fontVariationSettings = wasLiked ? "'FILL' 0" : "'FILL' 1";
    icon.style.color = wasLiked ? '' : '#B5445C';
    try {
        if (wasLiked) await candela.fans.quitarFavorito(id);
        else await candela.fans.agregarFavorito(id);
    } catch(_) {
        // revert on error
        btn.classList.toggle('liked');
        icon.style.fontVariationSettings = wasLiked ? "'FILL' 1" : "'FILL' 0";
        icon.style.color = wasLiked ? '#B5445C' : '';
    }
}

// ─── MODAL ───────────────────────────────────────────────────────────
function abrirModal(tab = '') {
    document.getElementById('modal-auth').classList.add('open');
    if (tab === 'login') {
        mostrarFormsFan('login');
    } else if (tab === 'fan' || tab === 'registro') {
        mostrarFormsFan('registro');
    } else {
        mostrarRoleSelector();
    }
}
function cerrarModal() { document.getElementById('modal-auth').classList.remove('open'); }
function mostrarRoleSelector() {
    document.getElementById('role-selector').classList.remove('hidden');
    document.getElementById('panel-creadora').classList.add('hidden');
    document.getElementById('forms-fan').classList.add('hidden');
}
function elegirRol(rol) {
    if (rol === 'fan') { mostrarFormsFan('registro'); }
    else if (rol === 'login') { mostrarFormsFan('login'); }
    else {
        document.getElementById('role-selector').classList.add('hidden');
        document.getElementById('panel-creadora').classList.remove('hidden');
    }
}
function mostrarFormsFan(tab) {
    document.getElementById('role-selector').classList.add('hidden');
    document.getElementById('panel-creadora').classList.add('hidden');
    document.getElementById('forms-fan').classList.remove('hidden');
    switchTab(tab || 'login');
}
let _modalDownOnBg = false;
document.getElementById('modal-auth').addEventListener('mousedown', e => {
    _modalDownOnBg = (e.target === e.currentTarget);
});
document.getElementById('modal-auth').addEventListener('click', e => {
    if (_modalDownOnBg && e.target === e.currentTarget) cerrarModal();
    _modalDownOnBg = false;
});

function switchTab(tab) {
    const isLogin = tab === 'login';
    const tLogin = document.getElementById('tab-login');
    const tReg   = document.getElementById('tab-reg');
    tLogin.className = `pb-3 px-4 text-sm font-${isLogin?'bold':'semibold'} ${isLogin?'text-c-accent border-b-2 border-c-accent':'text-c-soft border-b-2 border-transparent hover:text-c-accent'} transition-all`;
    tReg.className   = `pb-3 px-4 text-sm font-${!isLogin?'bold':'semibold'} ${!isLogin?'text-c-accent border-b-2 border-c-accent':'text-c-soft border-b-2 border-transparent hover:text-c-accent'} transition-all`;
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-login').classList.toggle('flex', isLogin);
    document.getElementById('form-registro').classList.toggle('hidden', isLogin);
    document.getElementById('form-registro').classList.toggle('flex', !isLogin);
}

// ─── AUTH ────────────────────────────────────────────────────────────
let _adminEmailPendiente = null;
let _otpTipoUsuario = 'admin';

async function hacerLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const email = document.getElementById('l-email').value;
    btn.textContent = 'Entrando...'; btn.disabled = true;
    try {
        const res = await candela.auth.login(email, document.getElementById('l-pass').value);
        if (res?.requires_otp) {
            _adminEmailPendiente = email;
            _otpTipoUsuario = res.tipo_usuario || 'admin';
            document.getElementById('form-login').classList.add('hidden');
            document.getElementById('form-otp').classList.remove('hidden');
            document.getElementById('form-otp').classList.add('flex');
            btn.textContent = 'Entrar'; btn.disabled = false;
            return;
        }
        cerrarModal();
        const returnUrl = sessionStorage.getItem('candela_return');
        if (returnUrl) { sessionStorage.removeItem('candela_return'); window.location.href = returnUrl; return; }
        const u = candela.auth.user();
        if (u?.tipo === 'admin') { window.location.href = 'pages/admin.html'; return; }
        if (u?.tipo === 'creadora') { window.location.href = 'pages/dashboard-creadora.html'; return; }
        window.location.href = 'pages/feed.html';  // fan -> feed de contenido
    } catch(err) {
        toast(err.message, 'error');
        btn.textContent = 'Entrar'; btn.disabled = false;
        if (/verificar tu email/i.test(err.message || '')) mostrarReenvioVerificacion(email);
    }
}

function mostrarReenvioVerificacion(email) {
    let box = document.getElementById('aviso-verif');
    if (!box) {
        box = document.createElement('div');
        box.id = 'aviso-verif';
        box.style.cssText = 'margin-top:.75rem;padding:.75rem;border-radius:12px;background:#FFF4F6;border:1px solid #F5E8EF;font-size:.78rem;color:#7B4D5E;text-align:center;line-height:1.5';
        document.getElementById('form-login').appendChild(box);
    }
    box.innerHTML = 'Falta confirmar tu correo. Revisa tu bandeja y la carpeta de spam. <button type="button" id="btn-reenv-verif" style="color:#B5445C;font-weight:700;background:none;border:none;cursor:pointer;text-decoration:underline">Reenviar correo</button>';
    document.getElementById('btn-reenv-verif').onclick = async function () {
        this.disabled = true; this.textContent = 'Enviando...';
        try {
            await candela.auth.reenviarVerificacion(email);
            box.textContent = 'Listo. Si el correo existe, te enviamos un nuevo enlace. Puede tardar unos minutos.';
        } catch (e) {
            box.textContent = e.message || 'No pudimos reenviarlo. Intenta de nuevo en unos minutos.';
        }
    };
}

async function reenviarOTP() {
    const btn = document.getElementById('btn-reenviar');
    btn.textContent = 'Enviando...'; btn.disabled = true;
    const endpoint = _otpTipoUsuario === 'creadora' ? '/api/auth/reenviar-otp-creadora' : '/api/auth/reenviar-otp-admin';
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: _adminEmailPendiente }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al reenviar');
        toast('Codigo reenviado a tu email', 'success');
        document.getElementById('otp-input').value = '';
        document.getElementById('otp-input').focus();
    } catch(err) {
        toast(err.message, 'error');
    } finally {
        setTimeout(() => { btn.textContent = 'No llego el codigo — Reenviar'; btn.disabled = false; }, 30000);
    }
}

async function verificarOTP(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-otp');
    const codigo = document.getElementById('otp-input').value.trim();
    btn.textContent = 'Verificando...'; btn.disabled = true;
    // Determina si es admin o creadora por el tipo pendiente
    const esCreadora = _otpTipoUsuario === 'creadora';
    const endpoint = esCreadora ? '/api/auth/verificar-otp-creadora' : '/api/auth/verificar-otp-admin';
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            credentials: 'include',  // para que el navegador guarde la cookie de sesion
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: _adminEmailPendiente, codigo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Codigo invalido');
        if (esCreadora) {
            localStorage.setItem('candela_user', JSON.stringify({ tipo: data.tipo_usuario, nombre: data.nombre, slug: data.creadora_slug, email: _adminEmailPendiente, email_verificado: true }));
            window.location.href = 'pages/dashboard-creadora.html';
        } else {
            localStorage.setItem('candela_user', JSON.stringify({ tipo: data.tipo_usuario, nombre: data.nombre, email: _adminEmailPendiente, es_super_admin: data.es_super_admin || false }));
            window.location.href = 'pages/admin.html';
        }
    } catch(err) {
        toast(err.message, 'error');
        btn.textContent = 'Verificar'; btn.disabled = false;
    }
}

async function hacerRegistro(e) {
    e.preventDefault();
    const dob = document.getElementById('r-dob').value;
    if (!dob) { toast('Ingresa tu fecha de nacimiento', 'error'); return; }
    const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
    if (age < 18) { toast('Debes tener al menos 18 años para registrarte', 'error'); return; }
    if (!document.getElementById('r-terms').checked) { toast('Debes aceptar los términos de servicio', 'error'); return; }

    const btn = document.getElementById('btn-reg');
    btn.textContent = 'Creando cuenta...'; btn.disabled = true;
    try {
        await candela.auth.registroSuscriptor(
            document.getElementById('r-email').value,
            document.getElementById('r-pass').value,
            document.getElementById('r-nombre').value,
            document.getElementById('r-dob').value,
            document.getElementById('r-website').value,
        );
        cerrarModal();
        toast('Cuenta creada. Revisa tu email para verificar tu cuenta.', 'info');
        const returnUrl = sessionStorage.getItem('candela_return');
        if (returnUrl) { sessionStorage.removeItem('candela_return'); window.location.href = returnUrl; return; }
        document.getElementById('hero-guest').classList.add('hidden');
        document.getElementById('stories-section').style.display = '';
        document.getElementById('chips-section').style.display = '';
        document.getElementById('feed-grid').style.display = '';
        renderTopbar(false);
        cargarStories();
        cargarFeed();
    } catch(err) {
        toast(err.message, 'error');
        btn.textContent = 'Crear cuenta gratis'; btn.disabled = false;
    }
}

// ─── TOAST ───────────────────────────────────────────────────────────
function toast(msg, tipo = 'info') {
    const c = document.getElementById('toasts');
    const colores = { error:'#e74c3c', success:'#2ecc71', info:'#B5445C' };
    const el = document.createElement('div');
    el.style.cssText = `
        background:#fff; border:1px solid #F5E8EF;
        border-left:4px solid ${colores[tipo]||colores.info};
        padding:0.85rem 1.1rem; border-radius:12px;
        box-shadow:0 6px 20px rgba(0,0,0,0.09);
        font-size:0.85rem; max-width:300px;
        pointer-events:auto; opacity:0;
        transform:translateX(100%);
        transition:all 0.25s ease;
    `;
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        el.style.opacity = '0'; el.style.transform = 'translateX(100%)';
        setTimeout(() => el.remove(), 300);
    }, 3800);
}

// ─── GOOGLE SIGN-IN ──────────────────────────────────────────────────
let _googleCredential = null;

async function initGoogleAuth() {
    let cfg;
    try { cfg = await candela.auth.config(); } catch(_) { return; }
    if (!cfg || !cfg.google_client_id) return;
    // Esperar a que cargue el script de Google (async)
    let intentos = 0;
    const espera = setInterval(() => {
        if (window.google && google.accounts && google.accounts.id) {
            clearInterval(espera);
            google.accounts.id.initialize({
                client_id: cfg.google_client_id,
                callback: onGoogleCredential,
                ux_mode: 'popup',
            });
            google.accounts.id.renderButton(document.getElementById('google-btn'), {
                theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 300, locale: 'es',
            });
            document.getElementById('google-wrap').classList.remove('hidden');
        } else if (++intentos > 40) {
            clearInterval(espera);
        }
    }, 150);
}

async function onGoogleCredential(resp) {
    _googleCredential = resp.credential;
    document.getElementById('google-err').classList.add('hidden');
    document.getElementById('google-dob').classList.add('hidden');
    await _enviarGoogle(null);
}

async function reintentarGoogleConDob() {
    const dob = document.getElementById('g-dob').value;
    if (!dob) return;
    await _enviarGoogle(dob);
}

async function _enviarGoogle(fecha_nacimiento) {
    try {
        const data = await candela.auth.google(_googleCredential, fecha_nacimiento);
        cerrarModal();
        const returnUrl = sessionStorage.getItem('candela_return');
        if (returnUrl) { sessionStorage.removeItem('candela_return'); window.location.href = returnUrl; return; }
        if (data.tipo_usuario === 'creadora') { window.location.href = 'pages/dashboard-creadora.html'; return; }
        window.location.href = 'pages/feed.html';
    } catch(err) {
        if (err.message === 'dob_required') {
            document.getElementById('google-dob').classList.remove('hidden');
            return;
        }
        const e = document.getElementById('google-err');
        e.textContent = err.message || 'No se pudo entrar con Google';
        e.classList.remove('hidden');
    }
}

init();
if (!candela.auth.isLoggedIn()) initGoogleAuth();

// Auto-open login modal if redirected from gated page
if (new URLSearchParams(window.location.search).get('login') === '1') {
    abrirModal('login');
}
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
