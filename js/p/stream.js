function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
}
document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('fs-icon');
    if (icon) icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
});

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://api.clubcandela.com';
const WS = API.replace('https://', 'wss://').replace('http://', 'ws://');

const params = new URLSearchParams(location.search);
const STREAM_ID = params.get('id');
const token = localStorage.getItem('candela_user') ? 'sesion' : null;  // la sesion real va en la cookie
const _cu = (() => { try { return JSON.parse(localStorage.getItem('candela_user') || '{}'); } catch(e) { return {}; } })();
const miNombre = _cu.nombre || 'Fan';

let ws = null;
let streamInfo = null;
let miBalance = 0;
let hls = null;

// ------------------------------------------------------------------ //
// Init
// ------------------------------------------------------------------ //
async function init() {
    if (!STREAM_ID) { location.href = '../index.html'; return; }

    try {
        const r = await fetch(`${API}/api/streams/${STREAM_ID}`);
        if (!r.ok) { mostrarError('Stream no disponible'); return; }
        streamInfo = await r.json();
    } catch(e) { mostrarError('Error de conexion'); return; }

    if (streamInfo.estado !== 'live') { mostrarError('Este stream ha terminado'); return; }

    document.getElementById('stream-titulo').textContent = streamInfo.titulo;
    document.getElementById('creadora-nombre').textContent = streamInfo.creadora_nombre;
    document.getElementById('viewers-count').textContent = streamInfo.viewers;
    if (streamInfo.creadora_avatar) {
        document.getElementById('creadora-avatar').src = streamInfo.creadora_avatar;
    }

    if (!token) { mostrarLoginPrompt(); return; }

    await cargarBalance();
    await intentarUnirse();
}

async function cargarBalance() {
    try {
        const r = await fetch(`${API}/api/wallet/mi-saldo`, { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            miBalance = d.balance || 0;
            actualizarBalance(miBalance);
        }
    } catch(e) {}
}

async function intentarUnirse() {
    try {
        const r = await fetch(`${API}/api/streams/${STREAM_ID}/unirse`, {
            method: 'POST',
            credentials: 'include',
        });
        const d = await r.json();
        if (r.ok) {
            arrancarStream(d.url_hls, d.hls_token);
        } else if (r.status === 400 && streamInfo.precio_entrada > 0) {
            mostrarModalEntrada();
        } else {
            mostrarError(d.detail || 'No se pudo acceder al stream');
        }
    } catch(e) { mostrarError('Error de conexion'); }
}

// ------------------------------------------------------------------ //
// Modal entrada
// ------------------------------------------------------------------ //
function mostrarModalEntrada() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('modal-titulo').textContent = streamInfo.titulo;
    document.getElementById('modal-creadora').textContent = streamInfo.creadora_nombre;
    document.getElementById('modal-precio').textContent = `$${streamInfo.precio_entrada.toFixed(2)}`;
    document.getElementById('modal-balance').textContent = `$${miBalance.toFixed(2)}`;
    if (streamInfo.creadora_avatar) {
        document.getElementById('modal-avatar').src = streamInfo.creadora_avatar;
    }
    document.getElementById('modal-entrada').style.display = 'flex';
}

async function pagarEntrada() {
    const btn = document.getElementById('btn-pagar');
    btn.textContent = 'Procesando...';
    btn.disabled = true;
    try {
        const r = await fetch(`${API}/api/streams/${STREAM_ID}/unirse`, {
            method: 'POST',
            credentials: 'include',
        });
        const d = await r.json();
        if (r.ok) {
            document.getElementById('modal-entrada').style.display = 'none';
            document.getElementById('loading').style.display = 'flex';
            miBalance = d.nuevo_balance ?? Math.max(0, miBalance - streamInfo.precio_entrada);
            actualizarBalance(miBalance);
            arrancarStream(d.url_hls, d.hls_token);
        } else {
            btn.textContent = d.detail || 'Error';
            btn.disabled = false;
        }
    } catch(e) {
        btn.textContent = 'Error de conexion';
        btn.disabled = false;
    }
}

// ------------------------------------------------------------------ //
// Player
// ------------------------------------------------------------------ //
function arrancarStream(hlsUrl, hlsToken) {
    document.getElementById('loading').style.display = 'none';
    const video = document.getElementById('video-el');

    if (Hls.isSupported()) {
        // el servidor de video exige el pase en cada peticion (lista y segmentos)
        const cred = 'Basic ' + btoa('viewer:' + hlsToken);
        hls = new Hls({ maxBufferLength: 8, lowLatencyMode: false, xhrSetup: (xhr) => xhr.setRequestHeader('Authorization', cred) });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, d) => {
            if (d.fatal) setTimeout(() => hls.loadSource(hlsUrl), 3000);
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari nativo no deja poner headers: el pase va como credencial de la URL
        video.src = hlsUrl.replace('https://', 'https://viewer:' + encodeURIComponent(hlsToken) + '@');
        video.play().catch(() => {});
    }

    cargarObsequios();
    conectarWS();
}

// ------------------------------------------------------------------ //
// WebSocket
// ------------------------------------------------------------------ //
function conectarWS() {
    ws = new WebSocket(`${WS}/api/streams/${STREAM_ID}/ws`);
    // El token va en el primer mensaje, NO en la URL (evita fuga en logs de proxy).
    // la sesion viaja en la cookie HttpOnly: el WebSocket la envia solo, no hay token que mandar
    ws.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (ev.tipo === 'chat')      agregarChat(ev.usuario, ev.texto);
        else if (ev.tipo === 'obsequio') manejarObsequio(ev);
        else if (ev.tipo === 'viewers')  document.getElementById('viewers-count').textContent = ev.count;
        else if (ev.tipo === 'stream_fin') mostrarError('El stream ha terminado');
    };
    ws.onclose = () => { if (streamInfo?.estado === 'live') setTimeout(conectarWS, 3000); };
}

// ------------------------------------------------------------------ //
// Chat
// ------------------------------------------------------------------ //
const chatArea = document.getElementById('chat-area');

function agregarChat(usuario, texto) {
    const msgs = chatArea.querySelectorAll('.chat-msg');
    if (msgs.length >= 14) msgs[0].remove();
    const el = document.createElement('div');
    el.className = 'chat-msg';
    el.innerHTML = `<span class="chat-uname">${esc(usuario)}</span><span>${esc(texto)}</span>`;
    chatArea.appendChild(el);
    setTimeout(() => el.remove(), 9000);
}

function enviarChat() {
    const inp = document.getElementById('chat-input');
    const texto = inp.value.trim();
    if (!texto || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ tipo: 'chat', usuario: miNombre, texto }));
    inp.value = '';
}

document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') enviarChat(); });

// ------------------------------------------------------------------ //
// Obsequios
// ------------------------------------------------------------------ //
async function cargarObsequios() {
    try {
        const r = await fetch(`${API}/api/streams/catalogo-obsequios`);
        const catalogo = await r.json();
        const panel = document.getElementById('gift-panel');
        catalogo.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'gift-btn';
            btn.innerHTML = `<span class="gift-emoji">${g.emoji}</span><span class="gift-name">${g.nombre}</span><span class="gift-price">$${g.precio.toFixed(2)}</span>`;
            btn.onclick = () => enviarObsequio(g);
            panel.appendChild(btn);
        });
    } catch(e) {}
}

let _obsequioEnCurso = false;

async function enviarObsequio(g) {
    if (!token) { location.href = '../index.html?login=1'; return; }
    if (miBalance < g.precio) {
        mostrarToast(`Saldo insuficiente`, '#E8413E');
        return;
    }
    if (_obsequioEnCurso) return;
    _obsequioEnCurso = true;
    try {
        const r = await fetch(`${API}/api/streams/${STREAM_ID}/obsequio`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ obsequio_id: g.id, cantidad: 1 }),
        });
        const d = await r.json();
        if (r.ok) {
            miBalance = d.nuevo_balance;
            actualizarBalance(miBalance);
        } else {
            mostrarToast(d.detail || 'Error al enviar obsequio', '#E8413E');
        }
    } catch(e) {
    } finally {
        _obsequioEnCurso = false;
    }
}

function manejarObsequio(ev) {
    const layer = document.getElementById('anim-layer');

    // emoji flotante
    const el = document.createElement('div');
    el.className = 'gift-float';
    el.textContent = ev.obsequio_emoji;
    el.style.cssText = `left:${25 + Math.random() * 40}%;bottom:100px`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2200);

    // toast
    const toast = document.createElement('div');
    toast.className = 'ev-toast';
    toast.innerHTML = `<span style="color:#B5445C">${esc(ev.remitente)}</span> envio ${ev.obsequio_emoji} ${esc(ev.obsequio_nombre)}`;
    layer.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);

    agregarChat(ev.remitente, `envio ${ev.obsequio_emoji} ${ev.obsequio_nombre}`);
}

function mostrarToast(msg, color) {
    const layer = document.getElementById('anim-layer');
    const toast = document.createElement('div');
    toast.className = 'ev-toast';
    toast.style.borderColor = color || '#B5445C';
    toast.textContent = msg;
    layer.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

// ------------------------------------------------------------------ //
// Util
// ------------------------------------------------------------------ //
function actualizarBalance(b) {
    document.getElementById('balance-display').textContent = b.toFixed(2);
    document.getElementById('modal-balance').textContent = `$${b.toFixed(2)}`;
}

function mostrarLoginPrompt() {
    document.getElementById('loading').innerHTML = `
        <div style="font-size:48px;margin-bottom:16px">ðŸ”’</div>
        <p style="color:rgba(255,255,255,.8);font-size:15px;font-weight:700;margin-bottom:4px">Inicia sesion para ver este stream</p>
        <p style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:24px">${streamInfo.precio_entrada > 0 ? 'Este stream tiene precio de entrada' : ''}</p>
        <button data-on-click="location.href='../index.html?login=1'" style="background:linear-gradient(135deg,#B5445C,#F2B8C8);color:#fff;font-weight:800;padding:13px 32px;border-radius:20px;font-size:15px;border:none;cursor:pointer;font-family:Nunito,sans-serif">
            Iniciar sesion
        </button>
        <button data-on-click="volverAtras()" style="background:none;border:none;color:rgba(255,255,255,.3);font-size:13px;cursor:pointer;margin-top:12px;font-family:Nunito,sans-serif">Volver</button>
    `;
}

function mostrarError(msg) {
    if (hls) { hls.destroy(); hls = null; }
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('loading').innerHTML = `
        <div style="font-size:48px;margin-bottom:14px">ðŸ“º</div>
        <p style="color:rgba(255,255,255,.85);font-size:16px;font-weight:700">${esc(msg)}</p>
        <button data-on-click="volverAtras()" style="margin-top:22px;color:#B5445C;font-size:14px;background:none;border:none;cursor:pointer;font-family:Nunito,sans-serif">Volver</button>
    `;
}

function volverAtras() {
    if (hls) { hls.destroy(); hls = null; }
    if (ws) ws.close();
    history.back();
}

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

init();
