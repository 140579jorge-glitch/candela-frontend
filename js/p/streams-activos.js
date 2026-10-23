const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://api.clubcandela.com';

const token = localStorage.getItem('candela_user') ? 'sesion' : null;  // la sesion real va en la cookie

async function init() {
    // nav user state
    if (token) {
        document.getElementById('nav-user').classList.remove('hidden');
        cargarBalance();
    } else {
        document.getElementById('nav-login').classList.remove('hidden');
    }
    await cargarStreams();
    // refrescar cada 30s
    setInterval(cargarStreams, 30000);
}

async function cargarBalance() {
    try {
        const r = await fetch(`${API}/api/wallet/mi-saldo`, { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            document.getElementById('nav-balance').textContent = (d.balance || 0).toFixed(2);
        }
    } catch(e) {}
}

async function cargarStreams() {
    try {
        const r = await fetch(`${API}/api/streams/activos`);
        if (!r.ok) throw new Error();
        const streams = await r.json();
        renderStreams(streams);
    } catch(e) {
        document.getElementById('streams-grid').innerHTML = '';
        document.getElementById('estado-vacio').classList.remove('hidden');
        document.getElementById('subtitulo').textContent = 'Error al cargar streams';
    }
}

function renderStreams(lista) {
    const grid = document.getElementById('streams-grid');
    const vacio = document.getElementById('estado-vacio');
    const banner = document.getElementById('banner-creadora');

    if (!lista.length) {
        grid.innerHTML = '';
        vacio.classList.remove('hidden');
        banner.classList.remove('hidden');
        document.getElementById('subtitulo').textContent = 'Ninguna creadora esta en vivo en este momento';
        return;
    }

    vacio.classList.add('hidden');
    banner.classList.remove('hidden');
    document.getElementById('subtitulo').textContent = `${lista.length} creadora${lista.length !== 1 ? 's' : ''} en vivo ahora`;

    grid.innerHTML = lista.map(s => {
        const avatar = s.creadora_avatar
            ? `<img src="${esc(s.creadora_avatar)}" class="stream-card-img" data-on-error="this.style.display='none'">`
            : `<div class="stream-card-img" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)"></div>`;

        const precioHtml = s.precio_entrada > 0
            ? `<div class="precio-badge"><span class="ms" style="font-size:12px">lock</span>$${s.precio_entrada.toFixed(2)}</div>`
            : `<div class="precio-badge" style="background:rgba(46,204,113,.15);border-color:rgba(46,204,113,.4);color:#27ae60"><span class="ms" style="font-size:12px">lock_open</span>Gratis</div>`;

        return `
        <div class="stream-card" data-on-click="entrarStream('${esc(s.id)}')">
            ${avatar}
            <div class="stream-card-grad"></div>
            <div class="stream-card-top">
                <div class="live-badge"><div class="live-dot"></div>EN VIVO</div>
                <div class="viewers-badge">
                    <span class="ms" style="font-size:13px">visibility</span>
                    ${s.viewers}
                </div>
            </div>
            <div class="stream-card-bottom">
                <div class="flex items-center gap-2.5 mb-2">
                    <img src="${esc(s.creadora_avatar || '')}" class="stream-avatar" data-on-error="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(s.creadora_nombre||'C')}&background=F4A261&color=fff&size=80'">
                    <div class="min-w-0">
                        <div class="stream-title">${esc(s.titulo)}</div>
                        <div class="stream-creadora">${esc(s.creadora_nombre)}</div>
                    </div>
                </div>
                ${precioHtml}
            </div>
        </div>`;
    }).join('');
}

function entrarStream(id) {
    location.href = `stream.html?id=${id}`;
}

function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
