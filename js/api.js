const API_URL = 'https://web-production-73189.up.railway.app';

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

const candela = {
    _token: () => localStorage.getItem('candela_token'),

    _headers(extra = {}) {
        const h = { 'Content-Type': 'application/json', ...extra };
        const t = this._token();
        if (t) h['Authorization'] = `Bearer ${t}`;
        return h;
    },

    async _req(method, path, body = null, form = false) {
        const opts = { method, headers: form ? { Authorization: `Bearer ${this._token()}` } : this._headers() };
        if (body) opts.body = form ? body : JSON.stringify(body);
        const res = await fetch(`${API_URL}${path}`, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
        return data;
    },

    auth: {
        async login(email, password) {
            const data = await candela._req('POST', '/api/auth/login', { email, password });
            if (data.requires_otp) return data;  // admin 2FA — no guardar token aun
            if (data.access_token) {
                localStorage.setItem('candela_token', data.access_token);
                localStorage.setItem('candela_user', JSON.stringify({
                    tipo: data.tipo_usuario,
                    nombre: data.nombre,
                    slug: data.creadora_slug,
                }));
            }
            return data;
        },
        async registroSuscriptor(email, password, nombre) {
            const data = await candela._req('POST', '/api/auth/registro/suscriptor', { email, password, nombre });
            localStorage.setItem('candela_token', data.access_token);
            localStorage.setItem('candela_user', JSON.stringify({ tipo: data.tipo_usuario, nombre: data.nombre }));
            return data;
        },
        async registroCreadora(form) {
            const data = await candela._req('POST', '/api/auth/registro/creadora', form);
            localStorage.setItem('candela_token', data.access_token);
            localStorage.setItem('candela_user', JSON.stringify({ tipo: data.tipo_usuario, nombre: data.nombre, slug: data.creadora_slug }));
            return data;
        },
        logout() {
            localStorage.removeItem('candela_token');
            localStorage.removeItem('candela_user');
            const isFile = location.protocol === 'file:';
            const inPages = location.pathname.includes('/pages/');
            window.location.href = isFile
                ? (inPages ? '../index.html' : 'index.html')
                : '/';
        },
        user() {
            try { return JSON.parse(localStorage.getItem('candela_user')); } catch { return null; }
        },
        isLoggedIn: () => !!localStorage.getItem('candela_token'),
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
        actualizarDatosRetiro(walletTrc20, walletPolygon, metodoRetiro) {
            const params = new URLSearchParams();
            if (walletTrc20 !== undefined) params.append('wallet_trc20', walletTrc20);
            if (walletPolygon !== undefined) params.append('wallet_polygon', walletPolygon);
            if (metodoRetiro !== undefined) params.append('metodo_retiro', metodoRetiro);
            return candela._req('PUT', `/api/creadoras/mi-perfil/datos-retiro?${params}`);
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
        async subir(tipo, titulo, descripcion, precio, esGratis, archivoFile, previewFile) {
            const fd = new FormData();
            fd.append('tipo', tipo);
            if (titulo) fd.append('titulo', titulo);
            if (descripcion) fd.append('descripcion', descripcion);
            fd.append('precio', precio);
            fd.append('es_gratis', esGratis);
            fd.append('archivo', archivoFile);
            if (previewFile) fd.append('preview', previewFile);
            return candela._req('POST', '/api/contenido/subir', fd, true);
        },
    },

    pagos: {
        instrucciones: (slug) => candela._req('GET', `/api/pagos/instrucciones-pago/${slug}`),
        confirmarSuscripcion: (data) => candela._req('POST', '/api/pagos/confirmar-suscripcion', data),
        solicitarRetiro: (monto, wallet, metodoRed = 'trc20') => candela._req('POST', '/api/pagos/solicitar-retiro', { monto, wallet_destino: wallet, metodo_red: metodoRed, metodo: 'usdt' }),
        misSuscripciones: () => candela._req('GET', '/api/pagos/mis-suscripciones'),
    },

    wallet: {
        miSaldo: () => candela._req('GET', '/api/wallet/mi-saldo'),
        crearPago: (data) => candela._req('POST', '/api/wallet/crear-pago', data),
        estadoPago: (id) => candela._req('GET', `/api/wallet/estado-pago/${id}`),
        movimientos: (limit = 50, offset = 0) => candela._req('GET', `/api/wallet/movimientos?limit=${limit}&offset=${offset}`),
    },

    propinas: {
        enviar: (data) => candela._req('POST', '/api/propinas', data),
        misPropinas: () => candela._req('GET', '/api/propinas/mis-propinas'),
    },

    mensajes: {
        enviar: (data) => candela._req('POST', '/api/mensajes', data),
        miBandeja: () => candela._req('GET', '/api/mensajes/mi-bandeja'),
        marcarLeido: (id) => candela._req('PATCH', `/api/mensajes/${id}/leer`),
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
        comisiones: (params = {}) => {
            const q = new URLSearchParams(params).toString();
            return candela._req('GET', `/api/admin/comisiones${q ? '?' + q : ''}`);
        },
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
