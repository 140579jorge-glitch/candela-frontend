const API_URL = 'https://api.clubcandela.com';

// Escapa HTML para prevenir XSS — usar en todo dato de usuario insertado via innerHTML
function esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// La sesion vive en una cookie HttpOnly que pone la API: el JavaScript no puede leerla ni robarla.
// Aqui solo se guarda el perfil basico (candela_user) para pintar la interfaz.
try { localStorage.removeItem('candela_token'); } catch (_) {}  // limpia tokens de la version anterior

const candela = {
    _headers(extra = {}) {
        return { 'Content-Type': 'application/json', ...extra };
    },

    _wsBase: () => API_URL.replace(/^https/, 'wss').replace(/^http/, 'ws'),

    async _req(method, path, body = null, form = false) {
        const opts = { method, credentials: 'include', headers: form ? {} : this._headers() };
        if (body) opts.body = form ? body : JSON.stringify(body);
        const res = await fetch(`${API_URL}${path}`, opts);
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 && localStorage.getItem('candela_user')) {
            localStorage.removeItem('candela_user'); localStorage.removeItem('candela_balance');
            // Si varias llamadas en paralelo reciben 401 a la vez (ej. al cargar el
            // dashboard), solo la primera dispara el redirect -- evita parpadeo.
            if (!sessionStorage.getItem('candela_return')) {
                sessionStorage.setItem('candela_return', location.href);
                const inPages = location.pathname.includes('/pages/');
                window.location.href = inPages ? '../index.html?sesion=expirada' : '/index.html?sesion=expirada';
            }
            throw new Error('Sesion expirada');
        }
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
        return data;
    },

    auth: {
        async login(email, password) {
            const data = await candela._req('POST', '/api/auth/login', { email, password });
            if (data.requires_otp) return data;
            if (data.tipo_usuario) {
                localStorage.setItem('candela_user', JSON.stringify({
                    tipo: data.tipo_usuario,
                    nombre: data.nombre,
                    slug: data.creadora_slug,
                    email: data.email,
                    email_verificado: data.email_verificado !== false,
                }));
            }
            return data;
        },
        async registroSuscriptor(email, password, nombre, fecha_nacimiento, website) {
            const data = await candela._req('POST', '/api/auth/registro/suscriptor', { email, password, nombre, fecha_nacimiento, website });
            localStorage.setItem('candela_user', JSON.stringify({
                tipo: data.tipo_usuario, nombre: data.nombre,
                email: data.email,
                email_verificado: data.email_verificado !== false,
            }));
            return data;
        },
        async registroCreadora(form) {
            const data = await candela._req('POST', '/api/auth/registro/creadora', form);
            localStorage.setItem('candela_user', JSON.stringify({
                tipo: data.tipo_usuario, nombre: data.nombre, slug: data.creadora_slug,
                email: data.email,
                email_verificado: data.email_verificado !== false,
            }));
            return data;
        },
        config: () => candela._req('GET', '/api/auth/config'),
        async google(credential, fecha_nacimiento) {
            const data = await candela._req('POST', '/api/auth/google', { credential, fecha_nacimiento });
            localStorage.setItem('candela_user', JSON.stringify({
                tipo: data.tipo_usuario, nombre: data.nombre, slug: data.creadora_slug,
                email: data.email,
                email_verificado: data.email_verificado !== false,
            }));
            return data;
        },
        emailVerificado() {
            return candela.auth.user()?.email_verificado !== false;
        },
        reenviarVerificacion: (email) => candela._req('POST', '/api/auth/reenviar-verificacion', { email }),
        eliminarCuenta: () => candela._req('DELETE', '/api/auth/cuenta'),
        cambiarPassword: (password_actual, nueva_password) => candela._req('POST', '/api/auth/cambiar-password', { password_actual, nueva_password }),
        async logout(sinConfirmar = false) {
            if (!sinConfirmar && !confirm('¿Seguro que queres cerrar sesion?')) return;
            try { await candela._req('POST', '/api/auth/logout'); } catch (_) {}  // la API borra la cookie
            localStorage.removeItem('candela_user'); localStorage.removeItem('candela_balance');
            const isFile = location.protocol === 'file:';
            const inPages = location.pathname.includes('/pages/');
            window.location.href = isFile
                ? (inPages ? '../index.html' : 'index.html')
                : '/';
        },
        user() {
            try { return JSON.parse(localStorage.getItem('candela_user')); } catch { return null; }
        },
        isLoggedIn: () => !!localStorage.getItem('candela_user'),  // si la cookie venciera, la primera llamada da 401 y se cierra la sesion
    },

    creadoras: {
        explorar: (params = {}) => {
            const q = new URLSearchParams(params).toString();
            return candela._req('GET', `/api/creadoras/explorar${q ? '?' + q : ''}`);
        },
        buscar: (texto) => candela._req('GET', `/api/creadoras/explorar?q=${encodeURIComponent(texto)}`),
        ver: (slug) => candela._req('GET', `/api/creadoras/${slug}`),
        miPerfil: () => candela._req('GET', '/api/creadoras/mi-perfil/datos'),
        actualizarPerfil: (data) => candela._req('PATCH', '/api/creadoras/mi-perfil', data),
        ganancias: () => candela._req('GET', '/api/creadoras/mi-perfil/ganancias'),
        analitica: () => candela._req('GET', '/api/creadoras/mi-perfil/analitica'),
        async subirAvatar(file) {
            const fd = new FormData(); fd.append('imagen', file);
            return candela._req('POST', '/api/creadoras/mi-perfil/avatar', fd, true);
        },
        async subirBanner(file) {
            const fd = new FormData(); fd.append('imagen', file);
            return candela._req('POST', '/api/creadoras/mi-perfil/banner', fd, true);
        },
        async enviarVerificacion(docTipo, docFile, selfieFile, docReversoFile) {
            const fd = new FormData();
            fd.append('doc_tipo', docTipo);
            fd.append('doc_imagen', docFile);
            fd.append('selfie', selfieFile);
            if (docReversoFile) fd.append('doc_imagen_reverso', docReversoFile);
            return candela._req('POST', '/api/creadoras/verificacion/enviar', fd, true);
        },
        misReferidas: () => candela._req('GET', '/api/creadoras/mi-perfil/referidas'),
        pedirCodigoRetiro: () => candela._req('POST', '/api/creadoras/mi-perfil/codigo-retiro'),
        actualizarDatosRetiro(walletTrc20, walletPolygon, metodoRetiro, codigo) {
            const body = {};
            if (walletTrc20 !== undefined) body.wallet_trc20 = walletTrc20;
            if (walletPolygon !== undefined) body.wallet_polygon = walletPolygon;
            if (metodoRetiro !== undefined) body.metodo_retiro = metodoRetiro;
            if (codigo) body.codigo = codigo;
            return candela._req('PUT', '/api/creadoras/mi-perfil/datos-retiro', body);
        },
        async subirQrPago(file) {
            const fd = new FormData(); fd.append('imagen', file);
            return candela._req('POST', '/api/creadoras/mi-perfil/qr-pago', fd, true);
        },
    },

    contenido: {
        listarCreadora: (slug) => candela._req('GET', `/api/contenido/creadora/${slug}`),
        ver: (id) => candela._req('GET', `/api/contenido/${id}`),
        comprar: (id) => candela._req('POST', `/api/contenido/${id}/confirmar-pago`),
        feed: () => candela._req('GET', '/api/contenido/feed'),
        misContenidos: () => candela._req('GET', '/api/contenido/mis-contenidos'),
        eliminar: (id) => candela._req('DELETE', `/api/contenido/${id}`),
        toggleVisibilidad: (id, visible) => candela._req('PATCH', `/api/contenido/${id}/visibilidad?visible=${visible}`),
        async subir(tipo, titulo, descripcion, precio, esGratis, archivoFile, previewFile, interpretesIds = []) {
            const fd = new FormData();
            fd.append('tipo', tipo);
            if (titulo) fd.append('titulo', titulo);
            if (descripcion) fd.append('descripcion', descripcion);
            fd.append('precio', precio);
            fd.append('es_gratis', esGratis);
            fd.append('declara_solo_yo', interpretesIds.length ? 'false' : 'true');
            if (interpretesIds.length) fd.append('interpretes_ids', interpretesIds.join(','));
            fd.append('archivo', archivoFile);
            if (previewFile) fd.append('preview', previewFile);
            return candela._req('POST', '/api/contenido/subir', fd, true);
        },
    },

    interpretes: {
        invitar: (email, alias) => candela._req('POST', '/api/interpretes/invitar', { email, alias }),
        misColaboradores: () => candela._req('GET', '/api/interpretes/mis-colaboradores'),
        reenviar: (id) => candela._req('POST', `/api/interpretes/${encodeURIComponent(id)}/reenviar`),
        cancelar: (id) => candela._req('DELETE', `/api/interpretes/${encodeURIComponent(id)}`),
    },

    pagos: {
        instrucciones: (slug) => candela._req('GET', `/api/pagos/instrucciones-pago/${slug}`),
        confirmarSuscripcion: (data) => candela._req('POST', '/api/pagos/confirmar-suscripcion', data),
        planes: (slug) => candela._req('GET', `/api/pagos/planes/${encodeURIComponent(slug)}`),
        solicitarRetiro: (monto, wallet, metodoRed = 'trc20') => candela._req('POST', '/api/pagos/solicitar-retiro', { monto, wallet_destino: wallet, metodo_red: metodoRed, metodo: 'usdt' }),
        misSuscripciones: () => candela._req('GET', '/api/pagos/mis-suscripciones'),
        cancelarSuscripcion: (slug) => candela._req('DELETE', `/api/pagos/suscripciones/${encodeURIComponent(slug)}`),
    },

    wallet: {
        miSaldo: () => candela._req('GET', '/api/wallet/mi-saldo'),
        crearPago: (data) => candela._req('POST', '/api/wallet/crear-pago', data),
        estadoPago: (id) => candela._req('GET', `/api/wallet/estado-pago/${id}`),
        movimientos: (limit = 50, offset = 0) => candela._req('GET', `/api/wallet/movimientos?limit=${limit}&offset=${offset}`),
        codigoRecarga: () => candela._req('POST', '/api/wallet/codigo-recarga'),
        tasasRecarga: () => candela._req('GET', '/api/wallet/tasas-recarga'),
    },

    balance: {
        cache: (v) => { try { localStorage.setItem('candela_balance', parseFloat(v).toFixed(2)); } catch(e) {} },
        cached: () => { try { return localStorage.getItem('candela_balance'); } catch(e) { return null; } },
        showNav: () => {
            const b = candela.balance.cached();
            const el = document.getElementById('nav-saldo-label');
            if (el && b !== null) el.textContent = '$' + b;
        },
    },

    propinas: {
        enviar: (data) => candela._req('POST', '/api/propinas', data),
        misPropinas: () => candela._req('GET', '/api/propinas/mis-propinas'),
    },

    mensajes: {
        enviar: (data) => candela._req('POST', '/api/mensajes', data),
        miBandeja: () => candela._req('GET', '/api/mensajes/mi-bandeja'),
        marcarLeido: (id) => candela._req('PATCH', `/api/mensajes/${id}/leer`),
        conversaciones: () => candela._req('GET', '/api/mensajes/conversaciones'),
        hilo: (otroId) => candela._req('GET', `/api/mensajes/hilo/${encodeURIComponent(otroId)}`),
        responder: (fanId, contenido) => candela._req('POST', '/api/mensajes/responder', { fan_id: fanId, contenido }),
        async responderMedia(fanId, archivo, precio, contenido) {
            const fd = new FormData();
            fd.append('fan_id', fanId);
            fd.append('precio', precio || 0);
            fd.append('declara_solo_yo', 'true');
            if (contenido) fd.append('contenido', contenido);
            fd.append('archivo', archivo);
            return candela._req('POST', '/api/mensajes/responder-media', fd, true);
        },
        desbloquear: (mensajeId) => candela._req('POST', `/api/mensajes/${encodeURIComponent(mensajeId)}/desbloquear`),
    },

    chatSesion: {
        solicitar: (data) => candela._req('POST', '/api/chat-sesion/solicitar', data),
        cancelar: (id) => candela._req('POST', `/api/chat-sesion/${id}/cancelar`),
        misSesiones: () => candela._req('GET', '/api/chat-sesion/mis-sesiones'),
        pendientes: () => candela._req('GET', '/api/chat-sesion/pendientes'),
        aceptar: (id) => candela._req('POST', `/api/chat-sesion/${id}/aceptar`),
        rechazar: (id) => candela._req('POST', `/api/chat-sesion/${id}/rechazar`),
    },

    admin: {
        dashboard: () => candela._req('GET', '/api/admin/dashboard'),
        verificacionesPendientes: () => candela._req('GET', '/api/admin/verificaciones-pendientes'),
        revisarVerificacion: (id, accion, notas) => candela._req('POST', `/api/admin/verificaciones/${id}`, { accion, notas }),
        retirosPendientes: () => candela._req('GET', '/api/admin/retiros-pendientes'),
        procesarRetiro: (id, accion, notas) => candela._req('POST', `/api/admin/retiros/${id}`, { accion, notas }),
        destacarCreadora: (id, destacada) => candela._req('PATCH', `/api/admin/creadoras/${id}/destacar?destacada=${destacada}`),
        comprasPendientes: () => candela._req('GET', '/api/admin/compras-pendientes'),
        confirmarCompra: (id, accion) => candela._req('POST', `/api/admin/compras/${id}`, { accion }),
        creadoras_pendientes: () => candela._req('GET', '/api/admin/creadoras-pendientes'),
        depositosPendientes: () => candela._req('GET', '/api/admin/depositos-pendientes'),
        procesarDeposito: (id, accion) => candela._req('POST', `/api/admin/depositos/${id}`, { accion }),
        propinasPendientes: () => candela._req('GET', '/api/admin/propinas-pendientes'),
        procesarPropina: (id, accion) => candela._req('POST', `/api/admin/propinas/${id}`, { accion }),
        mensajesPendientes: () => candela._req('GET', '/api/admin/mensajes-pendientes'),
        procesarMensaje: (id, accion) => candela._req('POST', `/api/admin/mensajes/${id}`, { accion }),
        reclamosPendientes: () => candela._req('GET', '/api/admin/reclamos'),
        actualizarReclamo: (id, estado, notas) => candela._req('POST', `/api/admin/reclamos/${id}`, { estado, notas }),
        depositoManual: (email_usuario, monto, nota, codigo, confirmar_monto_alto = false) => candela._req('POST', '/api/admin/deposito-manual', { email_usuario, monto, nota, codigo, confirmar_monto_alto }),
        actualizarTasasRecarga: (tasas) => candela._req('PUT', '/api/admin/tasas-recarga', tasas),
        buscarCodigoRecarga: (codigo) => candela._req('GET', `/api/admin/codigo-recarga/${encodeURIComponent(codigo)}`),
        listarRecargadores: () => candela._req('GET', '/api/admin/recargadores'),
        toggleRecargador: (id, es_recargador) => candela._req('PATCH', `/api/admin/recargadores/${id}`, { es_recargador }),
        aprobarRecargadorEmail: (email, es_recargador) => candela._req('POST', '/api/admin/recargadores/por-email', { email, es_recargador }),
        listarAdmins: () => candela._req('GET', '/api/admin/admins'),
        crearAdmin: (email, nombre, password) => candela._req('POST', '/api/admin/admins/crear', { email, nombre, password }),
        revocarAdmin: (id) => candela._req('DELETE', `/api/admin/admins/${id}`),
        comisiones: (params = {}) => {
            const q = new URLSearchParams(params).toString();
            return candela._req('GET', `/api/admin/comisiones${q ? '?' + q : ''}`);
        },
    },

    recargadores: {
        miBalance:            () => candela._req('GET', '/api/recargadores/mi-balance'),
        crearVoucher:         (monto) => candela._req('POST', '/api/recargadores/crear-voucher', { monto }),
        transferirAMiCuenta:  (monto) => candela._req('POST', '/api/recargadores/transferir-a-mi-cuenta', { monto }),
        canjearVoucher:       (codigo) => candela._req('POST', '/api/recargadores/canjear-voucher', { codigo }),
    },

    fans: {
        favoritos:       () => candela._req('GET', '/api/fans/favoritos'),
        favoritosIds:    () => candela._req('GET', '/api/fans/favoritos/ids'),
        agregarFavorito: (id) => candela._req('POST', `/api/fans/favoritos/${id}`, {}),
        quitarFavorito:  (id) => candela._req('DELETE', `/api/fans/favoritos/${id}`),
    },
};

// Toast global
function toast(msg, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'c-toast-container';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `c-toast ${tipo}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// Redirigir si no esta logueado
function requireAuth(tipo = null) {
    if (!candela.auth.isLoggedIn()) {
        window.location.href = '/index.html';
        return false;
    }
    if (tipo) {
        const user = candela.auth.user();
        if (user?.tipo !== tipo) {
            window.location.href = '/index.html';
            return false;
        }
    }
    return true;
}

// En computador no hay "deslizar": un carrusel con elementos cortados debe mostrar flechas y dejarse arrastrar con el mouse.
function habilitarRail(rail) {
    if (!rail || rail.dataset.rail) return;
    rail.dataset.rail = '1';
    if (!document.getElementById('estilo-rail')) {
        const st = document.createElement('style');
        st.id = 'estilo-rail';
        st.textContent = '.rail-flecha{position:absolute;top:calc(50% - 20px);width:40px;height:40px;border-radius:999px;border:0;background:rgba(255,255,255,.96);color:#B5445C;font:700 24px/1 Nunito,system-ui,sans-serif;box-shadow:0 6px 18px rgba(90,20,45,.28);cursor:pointer;z-index:8;display:none;align-items:center;justify-content:center;padding:0 0 3px}' +
            '.rail-flecha.on{display:flex}.rail-flecha:hover{background:#fff;transform:scale(1.06)}.rail-flecha.izq{left:-6px}.rail-flecha.der{right:-6px}' +
            '.rail-arrastrable{cursor:grab}.rail-arrastrable.arrastrando{cursor:grabbing;scroll-snap-type:none!important;scroll-behavior:auto!important}';
        document.head.appendChild(st);
    }
    const padre = rail.parentElement;
    if (getComputedStyle(padre).position === 'static') padre.style.position = 'relative';
    const flecha = (dir) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rail-flecha ' + (dir < 0 ? 'izq' : 'der');
        b.setAttribute('aria-label', dir < 0 ? 'Anterior' : 'Siguiente');
        b.textContent = dir < 0 ? '‹' : '›';
        b.addEventListener('click', () => rail.scrollBy({ left: dir * Math.max(160, rail.clientWidth * 0.8), behavior: 'smooth' }));
        padre.appendChild(b);
        return b;
    };
    const izq = flecha(-1), der = flecha(1);
    const actualizar = () => {
        const sobra = rail.scrollWidth - rail.clientWidth;
        izq.classList.toggle('on', sobra > 6 && rail.scrollLeft > 6);
        der.classList.toggle('on', sobra > 6 && rail.scrollLeft < sobra - 6);
    };
    rail.addEventListener('scroll', actualizar, { passive: true });
    window.addEventListener('resize', actualizar);
    [150, 600, 1500].forEach(t => setTimeout(actualizar, t));  // las imagenes cargan despues
    // arrastrar con el mouse (en pantallas tactiles ya se desliza con el dedo)
    rail.classList.add('rail-arrastrable');
    let x0 = null, s0 = 0, movido = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; x0 = e.clientX; s0 = rail.scrollLeft; movido = false; });
    window.addEventListener('pointermove', e => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 5) { movido = true; rail.classList.add('arrastrando'); }
        if (movido) rail.scrollLeft = s0 - dx;
    });
    window.addEventListener('pointerup', () => { if (x0 === null) return; x0 = null; rail.classList.remove('arrastrando'); });
    rail.addEventListener('click', e => { if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; } }, true);
}

// Vitrina: miniaturas de lo mas nuevo (lo de pago llega difuminado desde el servidor). Pensada para que el fan se tiente a entrar.
function cargarVitrina(idContenedor, limite, modo) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return Promise.resolve();
    if (!document.getElementById('estilo-vitrina')) {
        const st = document.createElement('style');
        st.id = 'estilo-vitrina';
        st.textContent =
            '.vt-rail{display:flex;justify-content:safe center;gap:.75rem;overflow-x:auto;padding:.25rem .25rem .75rem;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none}' +
            '.vt-rail::-webkit-scrollbar{display:none}' +
            '.vt-card .ms{font-family:"Material Symbols Outlined";font-style:normal;font-weight:normal;line-height:1;letter-spacing:normal;white-space:nowrap}' +
            '.vt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.9rem}.vt-grid .vt-card{flex:none;aspect-ratio:3/4}' +
            '.vt-card{position:relative;flex:0 0 150px;aspect-ratio:3/4;border-radius:18px;overflow:hidden;scroll-snap-align:start;background:#2a1520;display:block;box-shadow:0 8px 22px -10px rgba(90,20,45,.55);transition:transform .25s}' +
            '.vt-card:hover{transform:translateY(-3px)}' +
            '.vt-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.04)}' +
            '.vt-vel{position:absolute;inset:0;background:linear-gradient(to top,rgba(26,10,15,.92) 0%,rgba(26,10,15,.25) 48%,rgba(181,68,92,.10) 100%)}' +
            '.vt-lock{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.2);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;color:#fff}' +
            '.vt-pie{position:absolute;left:0;right:0;bottom:0;padding:.6rem .6rem .7rem;color:#fff}' +
            '.vt-nom{display:flex;align-items:center;gap:.4rem;font-weight:800;font-size:.72rem;margin-bottom:.4rem;text-shadow:0 1px 4px rgba(0,0,0,.6)}' +
            '.vt-nom img{position:static;width:20px;height:20px;border-radius:999px;border:1.5px solid #fff;transform:none}' +
            '.vt-precio{display:inline-flex;align-items:center;gap:.25rem;font-weight:800;font-size:.7rem;padding:.3rem .65rem;border-radius:999px;background:linear-gradient(135deg,#B5445C,#F2B8C8);color:#fff;box-shadow:0 4px 12px rgba(181,68,92,.5)}' +
            '.vt-precio.libre{background:rgba(255,255,255,.92);color:#B5445C}';
        document.head.appendChild(st);
    }
    return candela._req('GET', '/api/contenido/destacados?limit=' + (limite || 12)).then(items => {
        if (!items || !items.length) { cont.classList.add('hidden'); return; }
        cont.innerHTML = '<div class="' + (modo === 'grid' ? 'vt-grid' : 'vt-rail') + '">' + items.map(it => {
            const href = 'creadora.html?slug=' + encodeURIComponent(it.creadora_slug || '');
            const gratis = it.es_gratis || !(it.precio > 0);
            const precio = gratis ? '<span class="vt-precio libre">Gratis</span>'
                : '<span class="vt-precio"><span class="ms" style="font-size:13px">lock_open</span>Desbloquear $' + esc(Number(it.precio)) + '</span>';
            const av = it.creadora_avatar ? '<img src="' + esc(it.creadora_avatar) + '" alt="" loading="lazy">' : '';
            return '<a class="vt-card" href="' + href + '">' +
                '<img src="' + esc(it.preview_url) + '" alt="" loading="lazy" draggable="false">' +
                '<div class="vt-vel"></div>' +
                (gratis ? '' : '<span class="vt-lock"><span class="ms" style="font-size:15px">lock</span></span>') +
                '<div class="vt-pie"><div class="vt-nom">' + av + '<span>' + esc(it.creadora_nombre || '') + '</span></div>' + precio + '</div>' +
            '</a>';
        }).join('') + '</div>';
        cont.classList.remove('hidden');
        habilitarRail(cont.querySelector('.vt-rail'));
    }).catch(() => { cont.classList.add('hidden'); });
}

// Aviso fijo cuando el correo aun no esta confirmado (la persona entra a su cuenta sin enterarse de que falta ese paso)
function reenviarAvisoVerificacion(btn) {
    const u = candela.auth.user();
    if (!u || !u.email) return;
    btn.disabled = true;
    candela.auth.reenviarVerificacion(u.email)
        .then(() => toast('Te reenviamos el correo de confirmacion. Revisa tambien spam.', 'success'))
        .catch(e => toast(e.message || 'No pudimos reenviarlo ahora', 'error'));
    setTimeout(() => { btn.disabled = false; }, 60000);
}

(function avisoVerificacion() {
    if (/verificar-email|login|registro|terminos|privacidad|normas|cookies|2257|dmca|aviso-legal|reporte-abuso|retiro-contenido/.test(location.pathname)) return;
    async function revisar() {
        const u = candela.auth.user();
        if (!u || (u.tipo !== 'suscriptor' && u.tipo !== 'creadora')) return;
        let verificado = true;
        try {
            const c = JSON.parse(sessionStorage.getItem('cdl_ev') || 'null');
            if (c && Date.now() - c.t < 120000) verificado = c.v;
            else {
                const me = await candela._req('GET', '/api/auth/me');
                verificado = me.email_verificado !== false;
                sessionStorage.setItem('cdl_ev', JSON.stringify({ t: Date.now(), v: verificado }));
                if (me.marca) sessionStorage.setItem('cdl_marca', me.marca);
                if (u.email_verificado !== verificado) { u.email_verificado = verificado; localStorage.setItem('candela_user', JSON.stringify(u)); }
            }
        } catch (_) { return; }
        const previo = document.getElementById('aviso-verificar');
        if (verificado) { if (previo) previo.remove(); return; }
        if (previo) return;
        const d = document.createElement('div');
        d.id = 'aviso-verificar';
        d.setAttribute('role', 'status');
        d.style.cssText = 'position:sticky;top:0;z-index:60;background:#FFF3CD;border-bottom:1px solid #F0D98A;color:#664D03;padding:.6rem 1rem;font:600 .8rem Nunito,system-ui,sans-serif;display:flex;gap:.75rem;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center';
        const t = document.createElement('span');
        t.textContent = 'Falta confirmar tu correo' + (u.email ? ' (' + u.email + ')' : '') + '. Sin confirmarlo no puedes depositar ni comprar. Revisa tu bandeja y el spam.';
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Reenviar correo';
        b.setAttribute('data-on-click', 'reenviarAvisoVerificacion(this)');
        b.style.cssText = 'background:#B5445C;color:#fff;border:0;border-radius:999px;padding:.35rem .9rem;font:700 .75rem Nunito,system-ui,sans-serif;cursor:pointer';
        d.append(t, b);
        document.body.insertBefore(d, document.body.firstChild);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revisar); else revisar();
})();

// ui-events.js resuelve los nombres de los data-on-* contra window; una const no es propiedad de window
window.candela = candela;
