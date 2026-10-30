const TEMA_GR = {
    melocoton:'#FFF4EE,#F2B8C8','rosa-venecia':'#FFF0F5,#F7B8C8',
    lavanda:'#F7F2FF,#BBA0E0','rojo-carmin':'#1A0A0A,#E74C3C',
    menta:'#F0FAF7,#58D68D',cielo:'#F0F8FF,#85C1E9',
    dorada:'#FFFBF0,#F1C40F',nude:'#FAF7F4,#D4B896',
    'noche-rosa':'#1A0D1A,#FF6FBF',coral:'#FFF5F2,#FF8E8E',
    esmeralda:'#0D1F19,#48C9B0',nube:'#FAFAFA,#AEB6BF'
};

let filtros = { pais:'', precio:'', interes:'', q:'' };
let skip = 0;
const LIMIT = 20;
let cargando = false;
let hayMas = true;
let _timer = null;

let totalMostradas = 0;

function toggleChip(el, tipo) {
    document.getElementById('chips-'+tipo).querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    filtros[tipo] = el.dataset.val;
    actualizarContadorFiltros();
    reiniciar();
}

function toggleFiltros() {
    document.getElementById('filtros-panel').classList.toggle('open');
    document.getElementById('btn-filtros').classList.toggle('active');
}

function actualizarContadorFiltros() {
    const n = ['precio','interes'].filter(k => filtros[k]).length;
    const badge = document.getElementById('filtros-count');
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
}

function hayFiltrosActivos() {
    return !!(filtros.pais || filtros.precio || filtros.interes || filtros.q);
}

function debounceSearch() {
    clearTimeout(_timer);
    _timer = setTimeout(() => { filtros.q = document.getElementById('inp-search').value.trim(); reiniciar(); }, 350);
}

function reiniciar() {
    skip = 0;
    hayMas = true;
    totalMostradas = 0;
    document.getElementById('grid-creadoras').innerHTML = '';
    document.getElementById('btn-mas').classList.add('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    const cta = document.getElementById('cta-creadora');
    if (cta) cta.remove();
    cargar();
}

async function cargar() {
    if (cargando || !hayMas) return;
    cargando = true;
    const esFirst = skip === 0;
    if (esFirst) document.getElementById('skeleton').classList.remove('hidden');
    else document.getElementById('loading-mas').classList.remove('hidden');

    const params = { skip, limit: LIMIT };
    if (filtros.pais)    params.pais    = filtros.pais;
    if (filtros.interes) params.interes = filtros.interes;
    if (filtros.q)       params.q       = filtros.q;
    if (filtros.precio === '0')       params.precio_max = 0;
    else if (filtros.precio)          params.precio_max = parseFloat(filtros.precio);

    try {
        const lista = await candela.creadoras.explorar(params);
        document.getElementById('skeleton').classList.add('hidden');
        document.getElementById('loading-mas').classList.add('hidden');
        if (!lista || lista.length === 0) {
            if (esFirst) document.getElementById('empty-state').classList.remove('hidden');
            hayMas = false;
            document.getElementById('btn-mas').classList.add('hidden');
            cargando = false;
            return;
        }
        renderCards(lista);
        skip += lista.length;
        totalMostradas += lista.length;
        hayMas = lista.length === LIMIT;
        document.getElementById('btn-mas').classList.toggle('hidden', !hayMas);
        if (!hayMas && !hayFiltrosActivos() && totalMostradas < 8) mostrarCtaCreadora();
    } catch(e) {
        document.getElementById('skeleton').classList.add('hidden');
        document.getElementById('loading-mas').classList.add('hidden');
        document.getElementById('btn-mas').classList.remove('hidden');
    }
    cargando = false;
}

function cargarMas() { if (hayMas && !cargando) cargar(); }

function mostrarCtaCreadora() {
    if (document.getElementById('cta-creadora')) return;
    const el = document.createElement('div');
    el.id = 'cta-creadora';
    el.className = 'card-creadora';
    el.style.background = 'linear-gradient(150deg,#1A0A06,#3D1A0A)';
    el.onclick = () => window.location.href = '../index.html';
    el.innerHTML =
        '<div class="p-5 text-center">' +
            '<span class="ms" style="font-size:30px;color:#B5445C">auto_awesome</span>' +
            '<p class="text-white font-bold text-sm mt-2 mb-1">&iquest;Eres creadora?</p>' +
            '<p class="text-white/60 text-xs mb-3">S&eacute; de las primeras de tu pa&iacute;s. 84% para ti.</p>' +
            '<span class="inline-block text-[11px] font-extrabold px-4 py-1.5 rounded-full" style="background:linear-gradient(135deg,#B5445C,#F2B8C8);color:#fff">Empezar gratis</span>' +
        '</div>';
    document.getElementById('grid-creadoras').appendChild(el);
}

const VERIF_SVG = '<svg class="card-verif" viewBox="0 0 24 24" width="18" height="18" fill="none" role="img" aria-label="Verificada"><circle cx="12" cy="12" r="10" fill="#B5445C"></circle><path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

function renderCards(lista) {
    const grid = document.getElementById('grid-creadoras');
    lista.forEach(c => {
        const precio = c.precio_suscripcion > 0 ? '$' + Number(c.precio_suscripcion) + '/mes' : 'Gratis';
        const subs   = c.total_suscriptores > 0 ? esc(c.total_suscriptores) + (c.total_suscriptores === 1 ? ' fan' : ' fans') : '';
        const gr     = TEMA_GR[c.tema_color] || '#FFF4EE,#F2B8C8';
        const nombre = esc(c.nombre_artistico || 'Creadora');
        const ini    = (c.nombre_artistico || 'C')[0].toUpperCase();
        const img    = c.preview_destacado || c.banner_url || c.card_preview_url;

        const el = document.createElement('div');
        el.className = 'card-creadora';
        el.onclick = () => window.location.href = 'creadora.html?slug=' + encodeURIComponent(c.slug || '');
        const tags = (c.intereses || []).slice(0, 2).map(i => '<span class="card-tag">' + esc(i) + '</span>').join('');
        el.innerHTML =
            '<div class="card-banner">' +
                (img
                    ? '<img src="' + esc(img) + '" alt="' + nombre + '" loading="lazy" draggable="false">'
                    : '<div class="w-full h-full" style="background:linear-gradient(135deg,' + gr + ')"></div><span class="card-mono">' + esc(ini) + '</span>') +
                '<div class="card-vel"></div>' +
                (c.destacada ? '<span class="badge-dest">Destacada</span>' : '') +
                '<div class="card-pie">' +
                    '<div class="flex items-center gap-2 mb-2">' +
                        '<div class="card-avatar">' +
                            (c.avatar_url
                                ? '<img src="' + esc(c.avatar_url) + '" alt="" loading="lazy">'
                                : '<span>' + esc(ini) + '</span>') +
                        '</div>' +
                        '<div class="min-w-0">' +
                            '<p class="card-nombre">' + nombre + VERIF_SVG + '</p>' +
                            '<p class="card-sub">' + esc(c.pais || '') + (subs ? ' · ' + subs : '') + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex items-center justify-between gap-2">' +
                        '<span class="card-precio">' + precio + '</span>' +
                        '<span class="card-ir">' + (c.precio_suscripcion > 0 ? 'Ver perfil' : 'Seguir gratis') + '</span>' +
                    '</div>' +
                    (tags ? '<div class="flex flex-wrap gap-1 mt-2">' + tags + '</div>' : '') +
                '</div>' +
            '</div>';
        grid.appendChild(el);
    });
}

// Scroll infinito
new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) cargarMas();
}, { rootMargin: '600px' }).observe(document.getElementById('scroll-sentinel'));

// Auth header
(function() {
    try {
        if (candela.auth.isLoggedIn()) {
            const u = candela.auth.user();
            const dest = u.tipo === 'creadora' ? 'dashboard-creadora.html' : 'fan-dashboard.html';
            document.getElementById('header-auth').innerHTML =
                '<a href="' + dest + '" class="text-sm font-semibold text-c-soft hover:text-c-accent transition-colors">Mi cuenta</a>' +
                '<a href="' + dest + '" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">' +
                (u.nombre || 'F')[0].toUpperCase() + '</a>';
            document.getElementById('bottom-nav').classList.remove('hidden');
            candela.balance.showNav();
        }
    } catch(e) {}
})();

cargar();
cargarVitrina('vitrina-explorar', 14);
