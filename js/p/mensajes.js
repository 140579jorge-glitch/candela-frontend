const GRAD = {
    'melocoton':['#B5445C','#F2B8C8'], 'rosa-venecia':['#D4869D','#F7B8C8'],
    'lavanda':['#9B72CF','#BBA0E0'], 'rojo-carmin':['#C0392B','#E74C3C'],
    'menta':['#2ECC71','#58D68D'], 'cielo':['#5DADE2','#85C1E9'],
    'dorada':['#D4AC0D','#F1C40F'], 'nude':['#C4A882','#D4B896'],
    'noche-rosa':['#FF2D9B','#FF6FBF'], 'coral':['#FF6B6B','#FF8E8E'],
    'esmeralda':['#1ABC9C','#48C9B0'], 'nube':['#95A5A6','#AEB6BF'],
    default:['#B5445C','#F2B8C8'],
};
let ROL = null;           // 'fan' | 'creadora'
let HILO_ACTUAL = null;   // otro_id abierto
let CABECERA = null;
let pollTimer = null;

function hace(iso) {
    if (!iso) return '';
    const d = new Date(iso), ahora = new Date();
    const seg = (ahora - d) / 1000;
    if (seg < 60) return 'ahora';
    if (seg < 3600) return `hace ${Math.floor(seg/60)} min`;
    if (seg < 86400) return `hace ${Math.floor(seg/3600)} h`;
    if (seg < 604800) return `hace ${Math.floor(seg/86400)} d`;
    return d.toLocaleDateString('es', { day:'numeric', month:'short' });
}

function monograma(nombre) { return (nombre || '?').trim()[0].toUpperCase(); }

function avatarHtml(nombre, avatarUrl, temaColor) {
    const [c1, c2] = GRAD[temaColor] || GRAD.default;
    if (avatarUrl) return `<img src="${esc(avatarUrl)}" class="w-full h-full object-cover" alt="">`;
    return `<span>${esc(monograma(nombre))}</span>`;
}
function avatarBg(temaColor) {
    const [c1, c2] = GRAD[temaColor] || GRAD.default;
    return `background:linear-gradient(135deg,${c1},${c2})`;
}

async function cargarLista(silencioso) {
    try {
        const data = await candela.mensajes.conversaciones();
        ROL = data.rol;
        document.getElementById('conv-skel').classList.add('hidden');
        const lista = document.getElementById('conv-lista');
        const vacio = document.getElementById('conv-vacio');

        if (!data.conversaciones.length) {
            lista.classList.add('hidden');
            vacio.classList.remove('hidden');
            document.getElementById('conv-vacio-txt').textContent = ROL === 'creadora'
                ? 'Cuando un fan te escriba, la conversación aparece aquí. Puedes responder gratis.'
                : 'Escribe a una creadora desde su perfil para empezar una conversación.';
            const cta = document.getElementById('conv-vacio-cta');
            if (ROL !== 'creadora') cta.classList.remove('hidden');
            return;
        }
        vacio.classList.add('hidden');
        lista.classList.remove('hidden');
        lista.innerHTML = data.conversaciones.map(c => {
            const activo = c.otro_id === HILO_ACTUAL ? ' active' : '';
            const preview = (c.ultimo_emisor === (ROL === 'creadora' ? 'creadora' : 'fan') ? 'Tú: ' : '') + c.ultimo_mensaje;
            return `
            <div class="conv-row${activo}" data-on-click="abrirHilo('${esc(c.otro_id)}')">
                <div class="avatar" style="${avatarBg(c.tema_color)}">${avatarHtml(c.nombre, c.avatar_url, c.tema_color)}</div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-2">
                        <p class="font-bold text-c-text text-sm truncate flex-1">${esc(c.nombre)}</p>
                        <span class="text-[10px] text-c-soft shrink-0">${hace(c.fecha)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <p class="text-xs text-c-soft truncate flex-1">${esc(preview)}</p>
                        ${c.no_leidos ? `<span class="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-c-accent text-white text-[10px] font-bold flex items-center justify-center">${c.no_leidos}</span>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        if (!silencioso) {
            document.getElementById('conv-skel').classList.add('hidden');
            document.getElementById('conv-vacio').classList.remove('hidden');
            document.getElementById('conv-vacio-txt').textContent = 'No se pudieron cargar los mensajes.';
        }
    }
}

async function abrirHilo(otroId) {
    HILO_ACTUAL = otroId;
    document.querySelectorAll('.conv-row').forEach(r => r.classList.remove('active'));
    document.getElementById('hilo-placeholder').style.display = 'none';
    const ha = document.getElementById('hilo-activo');
    ha.hidden = false; ha.style.display = 'flex';
    document.getElementById('panel-hilo').classList.add('open');
    document.getElementById('hilo-msgs').innerHTML = '<p class="text-center text-xs text-c-soft py-4">Cargando…</p>';
    await refrescarHilo();
    cargarLista(true);
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible' && HILO_ACTUAL) { refrescarHilo(true); cargarLista(true); }
    }, 15000);
}

function cerrarHilo() {
    HILO_ACTUAL = null;
    clearInterval(pollTimer);
    document.getElementById('panel-hilo').classList.remove('open');
    const ha = document.getElementById('hilo-activo');
    ha.hidden = true; ha.style.display = 'none';
    document.getElementById('hilo-placeholder').style.display = '';
    cargarLista(true);
}

async function refrescarHilo(silencioso) {
    if (!HILO_ACTUAL) return;
    try {
        const data = await candela.mensajes.hilo(HILO_ACTUAL);
        CABECERA = data.cabecera;
        ROL = data.rol;

        document.getElementById('hilo-nombre').textContent = data.cabecera.nombre;
        const av = document.getElementById('hilo-avatar');
        av.style.cssText = 'width:36px;height:36px;font-size:.8rem;' + avatarBg(data.cabecera.tema_color);
        av.innerHTML = avatarHtml(data.cabecera.nombre, data.cabecera.avatar_url, data.cabecera.tema_color);

        const link = document.getElementById('hilo-perfil-link');
        if (data.cabecera.slug) {
            link.href = 'creadora.html?slug=' + encodeURIComponent(data.cabecera.slug);
            link.classList.remove('hidden');
        } else {
            link.classList.add('hidden');
        }

        // composer: costo para fan
        const costoEl = document.getElementById('hilo-costo');
        if (ROL === 'fan') {
            const precio = Number(data.cabecera.precio_mensaje) || 0;
            if (data.cabecera.acepta_mensajes === false) {
                costoEl.textContent = 'Esta creadora tiene los mensajes desactivados por ahora.';
                costoEl.classList.remove('hidden');
                document.getElementById('hilo-inp').disabled = true;
                document.getElementById('hilo-send').disabled = true;
            } else {
                costoEl.textContent = precio > 0
                    ? `Cada mensaje que envías cuesta $${precio} USDT.`
                    : 'Mensajes gratis con esta creadora.';
                costoEl.classList.remove('hidden');
            }
        } else {
            costoEl.classList.add('hidden');
        }
        // boton de adjuntar foto: solo la creadora
        document.getElementById('hilo-attach').classList.toggle('hidden', ROL !== 'creadora');

        const cont = document.getElementById('hilo-msgs');
        const alFinal = cont.scrollHeight - cont.scrollTop - cont.clientHeight < 80;
        cont.innerHTML = data.mensajes.map(m => {
            const cls = m.mio ? 'mine' : 'theirs';
            const ts = `<div class="text-[10px] text-c-soft mt-0.5 ${m.mio ? 'text-right' : ''}">${hace(m.fecha)}</div>`;

            if (m.adjunto_retirado) {
                return `<div><div class="bubble ${cls}" style="font-style:italic;opacity:.7">Imagen retirada</div>${ts}</div>`;
            }
            if (m.adjunto_tipo) {
                const bloqueado = !m.desbloqueado && !m.mio && Number(m.precio_desbloqueo) > 0;
                const src = esc(m.adjunto_url || m.adjunto_preview_url || '');
                const cap = m.contenido ? `<div class="bubble ${cls}" style="margin-top:.3rem">${esc(m.contenido)}</div>` : '';
                const media = `<div class="msg-media ${m.mio ? 'mine' : ''} ${bloqueado ? 'locked' : ''}">
                    ${src ? `<img src="${src}" alt="" draggable="false" data-on-contextmenu="return false">` : '<div style="height:200px;background:#F5E8EF"></div>'}
                    ${bloqueado ? `<div class="msg-lock-cta">
                        <span class="material-symbols-outlined text-white" style="font-size:26px">lock</span>
                        <button data-on-click="desbloquearMsg('${esc(m.id)}', this)">Desbloquear por $${Number(m.precio_desbloqueo)}</button>
                    </div>` : ''}
                </div>`;
                return `<div>${media}${cap}${ts}</div>`;
            }

            const pago = (m.emisor === 'fan' && Number(m.monto) > 0)
                ? `<span class="block text-[10px] mt-1 ${m.mio ? 'text-white/70' : 'text-c-soft'}">$${Number(m.monto)} USDT</span>` : '';
            return `<div><div class="bubble ${cls}">${esc(m.contenido)}${pago}</div>${ts}</div>`;
        }).join('');
        if (alFinal || !silencioso) cont.scrollTop = cont.scrollHeight;
    } catch (err) {
        if (!silencioso) {
            document.getElementById('hilo-msgs').innerHTML =
                '<p class="text-center text-xs text-red-500 py-4">No se pudo cargar la conversación.</p>';
        }
    }
}

let _adjunto = null;   // File pendiente (solo creadora)

function elegirAdjunto(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('Solo se pueden adjuntar imágenes', 'error'); input.value = ''; return; }
    if (f.size > 15 * 1024 * 1024) { toast('La imagen supera 15 MB', 'error'); input.value = ''; return; }
    _adjunto = f;
    document.getElementById('adj-thumb').src = URL.createObjectURL(f);
    document.getElementById('adj-nombre').textContent = f.name;
    document.getElementById('adj-precio').value = 0;
    document.getElementById('adj-preview').classList.remove('hidden');
}
function cancelarAdjunto() {
    _adjunto = null;
    document.getElementById('adj-file').value = '';
    document.getElementById('adj-preview').classList.add('hidden');
}

const _desbloqueosEnCurso = new Set();

async function desbloquearMsg(id, btn) {
    if (_desbloqueosEnCurso.has(id)) return;
    _desbloqueosEnCurso.add(id);
    if (btn) btn.disabled = true;
    try {
        const r = await candela.mensajes.desbloquear(id);
        if (r && r.nuevo_balance != null) toast('Foto desbloqueada', 'success');
        await refrescarHilo();
        cargarLista(true);
    } catch (err) {
        const msg = err?.message || 'No se pudo desbloquear';
        if (/saldo insuficiente/i.test(msg)) {
            const box = document.getElementById('hilo-saldo-insuf');
            box.innerHTML = esc(msg) + ' <a href="wallet.html" class="underline">Recargar</a>';
            box.classList.remove('hidden');
        } else { toast(msg, 'error'); }
        if (btn) btn.disabled = false;
    } finally {
        _desbloqueosEnCurso.delete(id);
    }
}

async function enviar(e) {
    e.preventDefault();
    const inp = document.getElementById('hilo-inp');
    const txt = inp.value.trim();
    if (!HILO_ACTUAL) return;
    const btn = document.getElementById('hilo-send');
    document.getElementById('hilo-saldo-insuf').classList.add('hidden');

    // creadora con foto adjunta
    if (ROL === 'creadora' && _adjunto) {
        btn.disabled = true;
        try {
            const precio = Math.max(0, Number(document.getElementById('adj-precio').value) || 0);
            await candela.mensajes.responderMedia(HILO_ACTUAL, _adjunto, precio, txt);
            cancelarAdjunto();
            inp.value = ''; inp.style.height = 'auto';
            await refrescarHilo();
            cargarLista(true);
        } catch (err) {
            toast(err?.message || 'No se pudo enviar la foto', 'error');
        } finally { btn.disabled = false; }
        return;
    }

    if (!txt) return;
    btn.disabled = true;
    try {
        if (ROL === 'creadora') {
            await candela.mensajes.responder(HILO_ACTUAL, txt);
        } else {
            if (txt.length < 5) { toast('El mensaje debe tener al menos 5 caracteres', 'error'); btn.disabled = false; return; }
            if (!CABECERA?.slug) { toast('No se pudo identificar la creadora', 'error'); btn.disabled = false; return; }
            await candela.mensajes.enviar({ creadora_slug: CABECERA.slug, contenido: txt });
        }
        inp.value = '';
        inp.style.height = 'auto';
        await refrescarHilo();
        cargarLista(true);
    } catch (err) {
        const msg = err?.message || 'No se pudo enviar el mensaje';
        if (/saldo insuficiente/i.test(msg)) {
            const box = document.getElementById('hilo-saldo-insuf');
            box.innerHTML = esc(msg) + ' <a href="wallet.html" class="underline">Recargar</a>';
            box.classList.remove('hidden');
        } else {
            toast(msg, 'error');
        }
    } finally {
        btn.disabled = false;
    }
}

// textarea auto-grow
document.getElementById('hilo-inp').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 128) + 'px';
});
document.getElementById('hilo-inp').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(new Event('submit')); }
});

function init() {
    if (!candela.auth.isLoggedIn()) { window.location.href = '/index.html'; return; }
    const t = candela.auth.user()?.tipo;
    if (t !== 'suscriptor' && t !== 'creadora') { window.location.href = '/index.html'; return; }
    cargarLista();
    // abrir hilo directo por ?con=<id>
    const con = new URLSearchParams(location.search).get('con');
    if (con) abrirHilo(con);
}
init();
