const TEMAS_DEF = [
    { id:'melocoton',    label:'Melocoton',   g:'linear-gradient(135deg,#FFF4EE,#B5445C)' },
    { id:'rosa-venecia', label:'Rosa Venecia', g:'linear-gradient(135deg,#FFF0F5,#D4869D)' },
    { id:'lavanda',      label:'Lavanda',      g:'linear-gradient(135deg,#F7F2FF,#9B72CF)' },
    { id:'rojo-carmin',  label:'Carmin',       g:'linear-gradient(135deg,#3D0A0A,#C0392B)' },
    { id:'menta',        label:'Menta',        g:'linear-gradient(135deg,#F0FAF7,#2ECC71)' },
    { id:'cielo',        label:'Cielo',        g:'linear-gradient(135deg,#F0F8FF,#5DADE2)' },
    { id:'dorada',       label:'Dorada',       g:'linear-gradient(135deg,#FFFBF0,#D4AC0D)' },
    { id:'nude',         label:'Nude',         g:'linear-gradient(135deg,#FAF7F4,#C4A882)' },
    { id:'noche-rosa',   label:'Noche Rosa',   g:'linear-gradient(135deg,#2D0A2D,#FF2D9B)' },
    { id:'coral',        label:'Coral',        g:'linear-gradient(135deg,#FFF5F2,#FF6B6B)' },
    { id:'esmeralda',    label:'Esmeralda',    g:'linear-gradient(135deg,#0D1F19,#1ABC9C)' },
    { id:'nube',         label:'Nube',         g:'linear-gradient(135deg,#F5F5F5,#95A5A6)' },
];

let perfilData = null;

// ─── INIT ────────────────────────────────────────────────────
async function init() {
    if (!requireAuth('creadora')) return;
    const secInicial = location.hash.replace('#','') || 'inicio';
    history.replaceState({section: secInicial}, '', '#' + secInicial);
    if (secInicial !== 'inicio') _activarSeccion(secInicial);
    const user = candela.auth.user();
    refrescarQuienAparece();
    cargarColaboradores();

    // Topbar
    document.getElementById('topbar-avatar').textContent = (user.nombre||'C')[0].toUpperCase();
    document.getElementById('topbar-avatar').title = 'Salir (' + (user.nombre||'') + ')';
    if (user.slug) {
        const link = document.getElementById('link-ver-pagina');
        link.href = `creadora.html?slug=${user.slug}`;
        link.classList.remove('hidden');
        const linkMobile = document.getElementById('link-ver-pagina-mobile');
        linkMobile.href = `creadora.html?slug=${user.slug}`;
        linkMobile.classList.remove('hidden');
    }

    renderTemaGrid('melocoton');
    cargarPerfil();
    cargarGanancias();
    cargarMisPosts();
    cargarScore('inicio');
    cargarNotificaciones();
    _setupVerifInput('v-doc',     'v-doc-icon',     'v-doc-prev',     'v-doc-txt');
    _setupVerifInput('v-doc-rev', 'v-doc-rev-icon', 'v-doc-rev-prev', 'v-doc-rev-txt');
    _setupSelfieInputs();

    // File inputs — setup via addEventListener (display:none breaks mobile)
    const archivoInput = document.getElementById('archivo-input');
    if (archivoInput) archivoInput.addEventListener('change', function() { previewArchivo(this); });

    const avatarInput = document.getElementById('input-avatar');
    if (avatarInput) avatarInput.addEventListener('change', function() { subirAvatar(this); });

    const bannerInput = document.getElementById('input-banner');
    if (bannerInput) bannerInput.addEventListener('change', function() { subirBanner(this); });

    const carruselInput = document.getElementById('input-carrusel');
    if (carruselInput) carruselInput.addEventListener('change', function() { subirFotoCarrusel(this); });

    const pkArchivos = document.getElementById('pk-archivos');
    if (pkArchivos) pkArchivos.addEventListener('change', function() { previewPackArchivos(this); });
}

// ─── 2FA ─────────────────────────────────────────────────────
let _2faActivo = false;

async function cargarEstado2FA() {
    try {
        const p = await candela._req('GET', '/api/auth/me');
        _2faActivo = !!p.dos_fa_activo;
    } catch(_) { _2faActivo = false; }
    const label = document.getElementById('2fa-estado-label');
    const btn = document.getElementById('btn-toggle-2fa');
    if (!label || !btn) return;
    if (_2faActivo) {
        label.textContent = 'Activo — tu cuenta esta protegida con verificacion de dos pasos';
        label.className = 'text-xs mt-1 font-semibold text-green-600';
        btn.textContent = 'Desactivar';
    } else {
        label.textContent = 'Inactivo — solo necesitas email y contrasena para entrar';
        label.className = 'text-xs mt-1 font-semibold text-c-soft';
        btn.textContent = 'Activar';
    }
}

function toggle2FA() {
    const box = document.getElementById('2fa-confirm-box');
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
        document.getElementById('2fa-password-inp').focus();
    }
}

async function confirmarToggle2FA() {
    const pwd = document.getElementById('2fa-password-inp').value;
    if (!pwd) return toast('Ingresa tu contrasena', 'error');
    try {
        const r = await candela._req('POST', '/api/auth/toggle-2fa', { password: pwd });
        _2faActivo = r.dos_fa_activo;
        document.getElementById('2fa-password-inp').value = '';
        document.getElementById('2fa-confirm-box').classList.add('hidden');
        await cargarEstado2FA();
        toast(_2faActivo ? 'Verificacion en dos pasos activada' : 'Verificacion en dos pasos desactivada', 'success');
    } catch(e) { toast(e.message || 'Contrasena incorrecta', 'error'); }
}

// ─── PERFIL ──────────────────────────────────────────────────
async function cargarPerfil() {
    try {
        perfilData = await candela.creadoras.miPerfil();
        const user = candela.auth.user();

        document.getElementById('bienvenida-nombre').textContent = `Hola, ${user.nombre || perfilData.nombre_artistico}!`;

        // Estado badge
        const estadoBadge = { pendiente:'badge-pendiente', activa:'badge-activa', rechazada:'badge-rechazada' };
        const estadoLabel = { pendiente:'Pendiente de aprobacion', activa:'Cuenta activa', rechazada:'Rechazada' };
        const badgeEl = document.getElementById('topbar-estado');
        badgeEl.textContent = estadoLabel[perfilData.estado] || perfilData.estado;
        badgeEl.className = `hidden px-3 py-1 rounded-full text-xs font-bold ${estadoBadge[perfilData.estado]||''}`;
        badgeEl.classList.remove('hidden');

        // Alerta si pendiente o rechazada
        const alerta = document.getElementById('alerta-estado');
        if (perfilData.estado === 'pendiente') {
            alerta.className = 'rounded-2xl p-4 mb-5 text-sm border badge-pendiente';
            alerta.innerHTML = `⏳ <strong>Tu cuenta esta pendiente.</strong> Sube tu verificacion de CI para que podamos activarla. <button data-on-click="mostrar('verificacion')" class="underline font-bold ml-1">Ir a verificacion</button>`;
            alerta.classList.remove('hidden');
        } else if (perfilData.estado === 'rechazada') {
            alerta.className = 'rounded-2xl p-4 mb-5 text-sm border badge-rechazada';
            alerta.innerHTML = '❌ <strong>Tu cuenta fue rechazada.</strong> Contacta a soporte para mas informacion.';
            alerta.classList.remove('hidden');
        } else {
            document.getElementById('bienvenida-estado').textContent = `${perfilData.nombre_artistico} · Todo listo para brillar 🔥`;
        }

        // Pre-rellenar formulario personalizar
        document.getElementById('p-bio').value = perfilData.bio || '';
        document.getElementById('p-precio').value = perfilData.precio_suscripcion || 0;
        if (perfilData.fuente) document.getElementById('p-fuente').value = perfilData.fuente;
        if (perfilData.layout_grid) document.getElementById('p-layout').value = perfilData.layout_grid;
        if (perfilData.rango_edad) document.getElementById('p-rango-edad').value = perfilData.rango_edad;
        if (perfilData.intereses?.length) document.getElementById('p-intereses').value = perfilData.intereses.join(', ');
        if (perfilData.tipos_contenido?.length) document.getElementById('p-tipos').value = perfilData.tipos_contenido.join(', ');
        renderCarrusel(perfilData.fotos_carrusel || []);

        // Mostrar avatar y banner actuales
        if (perfilData.avatar_url) {
            const ai = document.getElementById('prev-avatar-img');
            ai.src = _url(perfilData.avatar_url);
            ai.classList.remove('hidden');
            document.getElementById('prev-avatar-init').classList.add('hidden');
        } else {
            const u = candela.auth.user();
            document.getElementById('prev-avatar-init').textContent = (u?.nombre || 'C')[0].toUpperCase();
        }
        if (perfilData.banner_url) {
            const bi = document.getElementById('prev-banner-img');
            bi.src = _url(perfilData.banner_url);
            bi.classList.remove('hidden');
        }

        if (perfilData.tema_color) {
            document.getElementById('p-tema').value = perfilData.tema_color;
            renderTemaGrid(perfilData.tema_color);
        }

        // Estado persistente de verificacion (sobrevive a un reload)
        const v = perfilData.verificacion;
        const vBox = document.getElementById('ver-estado-box');
        const vFormCard = document.getElementById('ver-form-card');
        if (v && (v.estado === 'pendiente' || v.estado === 'aprobado')) {
            vBox.className = `rounded-2xl p-4 mb-5 border text-sm ${v.estado === 'aprobado' ? 'badge-activa' : 'badge-pendiente'}`;
            vBox.innerHTML = v.estado === 'aprobado'
                ? '✅ Tu identidad ya fue verificada.'
                : '⏳ Documentos enviados. Revisaremos en 24-48h y te notificaremos.';
            vBox.classList.remove('hidden');
            vFormCard.classList.add('hidden');
        } else if (v && v.estado === 'rechazado') {
            vBox.className = 'rounded-2xl p-4 mb-5 border text-sm badge-rechazada';
            vBox.innerHTML = `❌ Tu verificacion fue rechazada${v.notas_admin ? ': ' + esc(v.notas_admin) : '.'} Podes volver a enviar tus documentos.`;
            vBox.classList.remove('hidden');
        }
    } catch(e) { console.error('cargarPerfil:', e); }
}

async function cargarGanancias() {
    try {
        const [g, p] = await Promise.all([
            candela.creadoras.ganancias(),
            candela.creadoras.miPerfil(),
        ]);
        _perfilCreadora = p;
        const fmt = v => '$' + (v||0).toFixed(2);
        document.getElementById('s-balance').textContent = fmt(g.balance_disponible);
        document.getElementById('s-subs').textContent = g.total_suscriptores;
        document.getElementById('s-total').textContent = fmt(g.total_ganancias);
        document.getElementById('g-balance').textContent = fmt(g.balance_disponible);
        document.getElementById('g-total').textContent = fmt(g.total_ganancias);
        document.getElementById('g-subs').textContent = g.suscripciones_activas;

        // Mostrar metodo de retiro configurado
        const metodo = p.metodo_retiro;
        const desc = document.getElementById('ret-metodo-desc');
        const sinMetodo = document.getElementById('retiro-sin-metodo');
        const retiroForm = document.getElementById('retiro-form');
        if (!metodo) {
            sinMetodo?.classList.remove('hidden');
            retiroForm?.classList.add('hidden');
        } else {
            sinMetodo?.classList.add('hidden');
            retiroForm?.classList.remove('hidden');
            const etiquetas = {
                trc20: `USDT TRC20 — ${p.wallet_trc20 ? p.wallet_trc20.slice(0,8) + '...' + p.wallet_trc20.slice(-4) : 'sin wallet'}`,
                polygon: `USDT Polygon — ${p.wallet_polygon ? p.wallet_polygon.slice(0,8) + '...' + p.wallet_polygon.slice(-4) : 'sin wallet'}`,
            };
            if (desc) desc.textContent = etiquetas[metodo] || metodo;
        }
    } catch(e) {}
}

let _postsCount = 0;
let _perfilCompleto100 = false;

function _evaluarCardCompartir() {
    const card = document.getElementById('card-compartir');
    if (!card || card.dataset.listo) return;
    if (_postsCount < 1 && !_perfilCompleto100) return;
    const user = candela.auth.user();
    if (!user?.slug) return;
    card.dataset.listo = '1';
    const link = `${location.origin}/pages/creadora.html?slug=${user.slug}`;
    document.getElementById('compartir-link').value = link;
    if (navigator.share) document.getElementById('btn-compartir-general').classList.remove('hidden');
    card.classList.remove('hidden');
}

function copiarLinkCompartir() {
    const val = document.getElementById('compartir-link').value;
    navigator.clipboard.writeText(val).then(() => toast('Enlace copiado', 'success'))
        .catch(() => toast('No se pudo copiar', 'error'));
}

function compartirWhatsapp() {
    const link = document.getElementById('compartir-link').value;
    const msg = `Mira mi contenido exclusivo en Candela 🔥 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function compartirGeneral() {
    const link = document.getElementById('compartir-link').value;
    if (!navigator.share) return;
    navigator.share({ title: 'Candela', text: 'Mira mi contenido exclusivo en Candela 🔥', url: link }).catch(() => {});
}

async function cargarMisPosts() {
    try {
        const lista = await candela.contenido.misContenidos();
        const visibles = lista.filter(c => c.visible !== false).length;
        const ocultos = lista.length - visibles;
        document.getElementById('s-posts').textContent = lista.length;
        const countEl = document.getElementById('posts-count');
        if (countEl) countEl.textContent = ocultos > 0 ? `${visibles} visible${visibles!==1?'s':''} · ${ocultos} oculto${ocultos!==1?'s':''}` : `${lista.length} publicacion${lista.length!==1?'es':''}`;
        _postsCount = lista.length;
        _evaluarCardCompartir();
        const grid = document.getElementById('grid-mis-posts');
        const empty = document.getElementById('posts-empty');

        if (!lista.length) { empty.classList.remove('hidden'); grid.innerHTML = ''; return; }
        empty.classList.add('hidden');

        grid.innerHTML = lista.map(c => {
            const oculto = c.visible === false;
            const tipoIcon = c.tipo === 'video' ? '🎬' : '📸';
            const accesoLabel = c.precio > 0 ? `$${c.precio}` : c.es_gratis ? 'Gratis' : 'Subs';
            return `
            <div class="relative rounded-xl overflow-hidden group" style="aspect-ratio:1;background:#FAF2F5${oculto?';opacity:.5':''}">
                ${c.preview_url
                    ? `<img src="${c.preview_url}" alt="" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center text-3xl">${tipoIcon}</div>`}
                ${oculto ? `<div class="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">OCULTO</div>` : ''}
                ${c.mod_estado === 'pendiente' ? `<div class="absolute top-1.5 right-1.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full" style="background:rgba(217,119,6,.92)" title="${esc(c.mod_razon || 'Pendiente de revisión')}">${c.mod_razon ? 'ESPERANDO COLABORADOR' : 'EN REVISIÓN'}</div>` : ''}
                ${c.mod_estado === 'rechazado' ? `<div class="absolute top-1.5 right-1.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full" style="background:rgba(220,38,38,.92)" title="${esc(c.mod_razon || 'No cumple las normas de contenido')}">RECHAZADO</div>` : ''}
                <!-- Acciones al hover -->
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                    <button data-on-click="toggleOcultar('${c.id}',${oculto})" class="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style="background:${oculto?'rgba(34,197,94,.8)':'rgba(251,191,36,.8)'}">
                        ${oculto ? 'Mostrar' : 'Ocultar'}
                    </button>
                    ${c.precio === 0 ? `<button data-on-click="toggleMuestra('${c.id}',${!!c.es_gratis})" class="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style="background:${c.es_gratis?'rgba(251,191,36,.85)':'rgba(99,102,241,.85)'}">
                        ${c.es_gratis ? 'Quitar muestra' : 'Muestra gratis'}
                    </button>` : ''}
                    <button data-on-click="eliminarPost('${c.id}')" class="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style="background:rgba(239,68,68,.8)">
                        Eliminar
                    </button>
                </div>
                <div class="absolute bottom-0 left-0 right-0 px-2 py-1.5" style="background:linear-gradient(transparent,rgba(0,0,0,.65))">
                    <p class="text-white text-[9px] font-bold">${accesoLabel}</p>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error('cargarMisPosts:', e); }
}

// ─── ACCIONES ────────────────────────────────────────────────
async function subirContenido(e) {
    e.preventDefault();
    const archivo = document.getElementById('archivo-input').files[0];
    if (!archivo) { toast('Selecciona un archivo primero', 'error'); return; }
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const acceso = document.querySelector('input[name="acceso"]:checked').value;
    const precio = acceso === 'ppv' ? parseFloat(document.getElementById('sub-precio').value) || 0 : 0;
    const esGratis = acceso === 'gratis';
    let interpretesIds;
    try { interpretesIds = leerQuienAparece('qa-contenido'); } catch (err) { toast(err.message, 'error'); return; }
    const btn = document.getElementById('btn-subir');
    const progressEl = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressTxt = document.getElementById('upload-progress-txt');
    btn.innerHTML = '<span class="ms" style="font-size:18px">hourglass_top</span> Subiendo...';
    btn.disabled = true;
    progressEl.style.display = 'block';
    let pct = 0;
    const iv = setInterval(() => {
        pct = Math.min(pct + (Math.random() * 6 + 2), 88);
        progressBar.style.width = pct + '%';
        progressTxt.textContent = pct < 30 ? 'Subiendo...' : pct < 65 ? 'Procesando...' : 'Casi listo...';
    }, 400);
    try {
        const resp = await candela.contenido.subir(
            tipo,
            document.getElementById('sub-titulo').value,
            document.getElementById('sub-desc').value,
            precio, esGratis, archivo, undefined, interpretesIds
        );
        const enRevision = resp && resp.mod_estado === 'pendiente';
        clearInterval(iv);
        progressBar.style.width = '100%';
        progressTxt.textContent = enRevision ? 'Recibido!' : 'Publicado!';
        await new Promise(r => setTimeout(r, 600));
        document.getElementById('form-subir').reset();
        document.getElementById('archivo-nombre').textContent = 'Haz clic para seleccionar archivo';
        document.getElementById('upload-hint').textContent = 'JPG, PNG, MP4, MOV — max 100MB';
        const prev = document.getElementById('upload-preview');
        if (prev) { prev.style.display = 'none'; prev.src = ''; }
        document.getElementById('upload-icon').style.display = '';
        toast(enRevision ? (resp.mensaje || 'Recibimos tu contenido. Queda en revisión y se publica al aprobarlo, normalmente en menos de 24 horas.') : 'Contenido publicado! Ya aparece en tu perfil.', 'success');
        refrescarQuienAparece();
        mostrar('inicio');
        cargarMisPosts();
    } catch(err) {
        clearInterval(iv);
        toast(err.message || 'Error al subir. Intenta de nuevo.', 'error');
    } finally {
        progressEl.style.display = 'none';
        progressBar.style.width = '0%';
        btn.innerHTML = '<span class="ms" style="font-size:18px">upload</span> Publicar';
        btn.disabled = false;
    }
}

async function guardarPerfil(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-perfil');
    const txt = document.getElementById('btn-guardar-txt');
    txt.textContent = 'Guardando...'; btn.disabled = true;
    try {
        const precio = parseFloat(document.getElementById('p-precio').value);
        const interesesRaw = document.getElementById('p-intereses').value;
        const tiposRaw = document.getElementById('p-tipos').value;
        const intereses = interesesRaw ? interesesRaw.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10) : undefined;
        const tipos_contenido = tiposRaw ? tiposRaw.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10) : undefined;
        const rango_edad = document.getElementById('p-rango-edad').value || undefined;
        await candela.creadoras.actualizarPerfil({
            bio: document.getElementById('p-bio').value || undefined,
            precio_suscripcion: isNaN(precio) ? undefined : precio,
            tema_color: document.getElementById('p-tema').value || undefined,
            fuente: document.getElementById('p-fuente').value || undefined,
            layout_grid: document.getElementById('p-layout').value || undefined,
            rango_edad,
            intereses,
            tipos_contenido,
        });
        txt.textContent = 'Guardado!';
        setTimeout(() => { txt.textContent = 'Guardar cambios'; btn.disabled = false; }, 1500);
        toast('Cambios guardados. Visita tu pagina para verlos.', 'success');
    } catch(err) {
        toast(err.message || 'Error al guardar', 'error');
        txt.textContent = 'Guardar cambios'; btn.disabled = false;
    }
}

async function solicitarRetiro() {
    const monto = parseFloat(document.getElementById('ret-monto').value);
    if (!monto || monto < 30) { toast('Minimo $30', 'error'); return; }
    const p = _perfilCreadora;
    const metodo = p?.metodo_retiro || 'trc20';
    let wallet = null;
    if (metodo === 'trc20') wallet = p?.wallet_trc20;
    else if (metodo === 'polygon') wallet = p?.wallet_polygon;
    if (metodo !== 'qr' && !wallet) {
        toast('Configura tu wallet primero', 'error');
        mostrar('metodos-pago');
        return;
    }
    if (metodo === 'qr' && !p?.qr_pago_url) {
        toast('Sube tu QR primero', 'error');
        mostrar('metodos-pago');
        return;
    }
    const btn = document.getElementById('btn-solicitar-retiro');
    btn.disabled = true;
    const txt = btn.textContent;
    btn.textContent = 'Procesando...';
    try {
        const r = await candela.pagos.solicitarRetiro(monto, wallet, metodo);
        toast(r.mensaje, 'success');
        cargarGanancias();
    } catch(err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = txt;
    }
}

let _perfilCreadora = null;

async function cargarDatosRetiro() {
    try {
        _perfilCreadora = await candela.creadoras.miPerfil();
        const p = _perfilCreadora;
        document.getElementById('w-trc20').value = p.wallet_trc20 || '';
        document.getElementById('w-polygon').value = p.wallet_polygon || '';


        if (p.qr_pago_url && document.getElementById('qr-preview-box')) {
            document.getElementById('qr-preview-box').innerHTML =
                `<img src="${_url(p.qr_pago_url)}" class="w-full h-full object-contain">`;
        }

        if (p.metodo_retiro) {
            const radio = document.querySelector(`input[name="metodo_retiro"][value="${p.metodo_retiro}"]`);
            if (radio) { radio.checked = true; actualizarMetodoOpt(); }
        }
    } catch(e) { console.error(e); }
}

function actualizarMetodoOpt() {
    document.querySelectorAll('.metodo-opt-box').forEach(b => b.classList.remove('border-c-accent', 'bg-orange-50'));
    const checked = document.querySelector('input[name="metodo_retiro"]:checked');
    if (checked) checked.closest('label')?.querySelector('.metodo-opt-box')?.classList.add('border-c-accent', 'bg-orange-50');
}

function previsualizarQr(input) {
    const file = input.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    document.getElementById('qr-preview-box').innerHTML =
        `<img src="${url}" class="w-full h-full object-contain">`;
}

async function guardarDatosRetiro(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-pago');
    btn.textContent = 'Guardando...'; btn.disabled = true;
    const metodo = document.querySelector('input[name="metodo_retiro"]:checked')?.value;
    const trc20 = document.getElementById('w-trc20').value.trim();
    const polygon = document.getElementById('w-polygon').value.trim();
    const qrInput = document.getElementById('qr-input');
    try {
        // el cobro por QR ya no esta en la pantalla: sin este campo no hay nada que subir
        if (qrInput && qrInput.files[0]) {
            await candela.creadoras.subirQrPago(qrInput.files[0]);
        }
        await candela.creadoras.actualizarDatosRetiro(trc20 || undefined, polygon || undefined, metodo || undefined);
        _perfilCreadora = await candela.creadoras.miPerfil();
        toast('Metodos de pago guardados', 'success');
    } catch(err) { toast(err.message, 'error'); }
    finally { btn.textContent = 'Guardar metodos de pago'; btn.disabled = false; }
}

async function eliminarCuentaCreadora() {
    const ok = confirm('¿Estas segura de que quieres eliminar tu cuenta?\n\nEsta accion es permanente. Tus datos personales se eliminaran en 30 dias. Si tienes balance debes retirarlo primero.\n\nEscribe ELIMINAR en el siguiente cuadro para confirmar.');
    if (!ok) return;
    const conf = prompt('Escribe ELIMINAR para confirmar:');
    if (conf !== 'ELIMINAR') { toast('Cancelado. No escribiste ELIMINAR.', 'error'); return; }
    try {
        await candela.auth.eliminarCuenta();
        toast('Cuenta eliminada. Cerrando sesion...', 'success');
        setTimeout(() => { candela.auth.logout(true); window.location.href = '../index.html'; }, 2000);
    } catch(err) { toast(err.message, 'error'); }
}

async function enviarVerificacion(e) {
    e.preventDefault();
    const doc     = document.getElementById('v-doc').files[0];
    const docRev  = document.getElementById('v-doc-rev').files[0];
    const selfie  = document.getElementById('v-selfie').files[0];
    if (!doc || !docRev || !selfie) { toast('Sube las tres fotos (frente, dorso y selfie)', 'error'); return; }
    const btn = document.getElementById('btn-verificar');
    btn.textContent = 'Enviando...'; btn.disabled = true;
    try {
        const r = await candela.creadoras.enviarVerificacion(document.getElementById('v-tipo').value, doc, selfie, docRev);
        toast(r.mensaje, 'success');
        const box = document.getElementById('ver-estado-box');
        box.className = 'rounded-2xl p-4 mb-5 border text-sm badge-pendiente';
        box.innerHTML = '⏳ Documentos enviados. Revisaremos en 24-48h y te notificaremos.';
        box.classList.remove('hidden');
    } catch(err) { toast(err.message, 'error'); }
    finally { btn.textContent = 'Enviar para revision'; btn.disabled = false; }
}

async function toggleOcultar(id, estaOculto) {
    try {
        await candela.contenido.toggleVisibilidad(id, estaOculto);
        toast(estaOculto ? 'Contenido visible en tu pagina' : 'Contenido oculto de tu pagina', 'success');
        cargarMisPosts();
    } catch(err) { toast(err.message, 'error'); }
}

async function toggleMuestra(id, esGratis) {
    try {
        const res = await candela._req('PATCH', `/api/contenido/${id}/muestra`);
        toast(res.es_gratis ? 'Marcado como muestra gratuita' : 'Muestra removida', 'success');
        cargarMisPosts();
    } catch(err) { toast(err.message || 'Error', 'error'); }
}

async function eliminarPost(id) {
    if (!confirm('Eliminar permanentemente esta publicacion? Esta accion no se puede deshacer.')) return;
    try {
        await candela.contenido.eliminar(id);
        toast('Publicacion eliminada', 'success');
        cargarMisPosts();
    } catch(err) { toast(err.message, 'error'); }
}

// ─── BANNER AUTO-GENERADO ─────────────────────────────────────
async function generarBannerAuto() {
    const canvas = document.getElementById('banner-canvas');
    const ctx = canvas.getContext('2d');
    const nombre = perfilData?.nombre_artistico || candela.auth.user()?.nombre || 'Mi Pagina';
    const temaId = document.getElementById('p-tema').value || 'melocoton';
    const tema = TEMAS_DEF.find(t => t.id === temaId) || TEMAS_DEF[0];

    // Fondo con gradiente del tema
    const [c1, c2] = tema.g.match(/#[0-9a-fA-F]{6}/g) || ['#FFF4EE', '#B5445C'];
    const grad = ctx.createLinearGradient(0, 0, 1200, 300);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 300);

    // Circulos decorativos
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(1050, 50, 180, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(150, 280, 120, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Nombre de la creadora
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const maxW = 800;
    let fs = 72;
    while (ctx.measureText(nombre).width > maxW && fs > 24) {
        fs -= 4;
        ctx.font = `bold ${fs}px system-ui, -apple-system, sans-serif`;
    }
    ctx.fillText(nombre, 72, 145);

    // "en Candela" subtitulo
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('en Candela', 76, 145 + fs * 0.75);

    // Logo mark en la esquina
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('CANDELA', 1128, 270);

    // Convertir a blob y subir
    canvas.toBlob(async (blob) => {
        if (!blob) { toast('Error generando banner', 'error'); return; }
        const file = new File([blob], 'banner-auto.jpg', { type: 'image/jpeg' });
        try {
            const r = await candela.creadoras.subirBanner(file);
            const img = document.getElementById('prev-banner-img');
            img.src = r.banner_url;
            img.classList.remove('hidden');
            toast('Banner generado y guardado', 'success');
        } catch(err) { toast(err.message, 'error'); }
    }, 'image/jpeg', 0.92);
}

// ─── TEMA GRID ───────────────────────────────────────────────
function renderTemaGrid(seleccionado) {
    const grid = document.getElementById('tema-grid');
    grid.innerHTML = TEMAS_DEF.map(t => `
        <button type="button" class="tema-opt ${t.id===seleccionado?'selected':''}" style="background:${t.g}" data-on-click="seleccionarTema('${t.id}',this)" title="${t.label}">
        </button>`).join('');
    const t = TEMAS_DEF.find(x => x.id === seleccionado);
    if (t) { const bar = document.getElementById('color-preview-bar'); if (bar) bar.style.background = t.g; }
}

function seleccionarTema(id, el) {
    document.querySelectorAll('.tema-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('p-tema').value = id;
    const t = TEMAS_DEF.find(x => x.id === id);
    if (t) document.getElementById('color-preview-bar').style.background = t.g;
}

// ─── COLABORADORES (registro 2257) ───────────────────────────
let colaboradores = [];
const ESTADO_COLAB = {
    aprobado:   ['Aprobado', 'bg-green-100 text-green-700'],
    pendiente:  ['En revisión', 'bg-amber-100 text-amber-700'],
    invitado:   ['Esperando su registro', 'bg-gray-100 text-gray-600'],
    procesando: ['Procesando', 'bg-gray-100 text-gray-600'],
    rechazado:  ['Rechazado', 'bg-red-100 text-red-700'],
    retirado:   ['Retiró su consentimiento', 'bg-red-100 text-red-700'],
};
function chipColab(c) {
    const par = c.vencido ? ['Enlace vencido', 'bg-gray-100 text-gray-600'] : (ESTADO_COLAB[c.estado] || [c.estado, 'bg-gray-100 text-gray-600']);
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${par[1]}">${esc(par[0])}</span>`;
}
async function cargarColaboradores() {
    try { colaboradores = await candela.interpretes.misColaboradores(); } catch (e) { colaboradores = []; }
    renderColaboradores();
    refrescarQuienAparece();
}
function renderColaboradores() {
    const el = document.getElementById('lista-colaboradores');
    if (!el) return;
    if (!colaboradores.length) { el.innerHTML = '<p class="text-c-soft text-sm py-6 text-center">Aún no has invitado a nadie.</p>'; return; }
    el.innerHTML = colaboradores.map(c => `
        <div class="bg-white border border-c-border rounded-xl p-3 mb-2 flex items-center gap-3">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate">${esc(c.alias)}</p>
                <p class="text-[11px] text-c-soft truncate">${esc(c.email)}${c.codigo ? ' · ' + esc(c.codigo) : ''}</p>
            </div>
            ${chipColab(c)}
            ${c.estado === 'invitado' ? `
                <button type="button" data-on-click="reenviarColab('${esc(c.id)}')" class="text-[11px] font-bold text-c-accent hover:underline">Reenviar</button>
                <button type="button" data-on-click="cancelarColab('${esc(c.id)}')" class="text-[11px] font-bold text-c-soft hover:underline">Cancelar</button>` : ''}
        </div>`).join('');
}
async function invitarColaborador(e) {
    e.preventDefault();
    const btn = document.getElementById('colab-btn');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
        const r = await candela.interpretes.invitar(document.getElementById('colab-email').value, document.getElementById('colab-alias').value);
        toast(r.mensaje || 'Invitación enviada', 'success');
        document.getElementById('form-invitar').reset();
        await cargarColaboradores();
    } catch (err) { toast(err.message || 'No pudimos enviar la invitación', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Enviar invitación'; }
}
async function reenviarColab(id) {
    try { const r = await candela.interpretes.reenviar(id); toast(r.mensaje || 'Invitación reenviada', 'success'); await cargarColaboradores(); }
    catch (err) { toast(err.message || 'No pudimos reenviarla', 'error'); }
}
async function cancelarColab(id) {
    if (!confirm('¿Cancelar esta invitación? El enlace dejará de funcionar.')) return;
    try { await candela.interpretes.cancelar(id); toast('Invitación cancelada', 'success'); await cargarColaboradores(); }
    catch (err) { toast(err.message || 'No pudimos cancelarla', 'error'); }
}

// Selector "¿Quién aparece?" de los formularios de contenido y de pack.
function montarQuienAparece(id) {
    const box = document.getElementById(id);
    if (!box) return;
    const esPack = id === 'qa-pack';
    const sel = box.querySelector('input[type=radio]:checked');
    const modo = sel ? sel.value : 'solo';
    const marcados = new Set(Array.from(box.querySelectorAll('input[data-colab]:checked')).map(x => x.value));
    const vigentes = colaboradores.filter(c => ['invitado', 'pendiente', 'aprobado'].includes(c.estado));
    const filas = vigentes.map(c => {
        const bloqueado = (esPack && c.estado !== 'aprobado') || c.vencido;
        return `<label class="flex items-center gap-2 py-1 text-sm ${bloqueado ? 'opacity-50' : 'cursor-pointer'}">
            <input type="checkbox" data-colab value="${esc(c.id)}" ${marcados.has(c.id) ? 'checked' : ''} ${bloqueado ? 'disabled' : ''} class="accent-orange-400">
            <span class="font-semibold text-c-text">${esc(c.alias)}</span>${chipColab(c)}
        </label>`;
    }).join('');
    const notaLista = esPack
        ? 'Los packs solo admiten colaboradores ya aprobados.'
        : 'Si alguien aún no completó su registro, tu contenido queda en espera y sigue su curso cuando lo haga y sea aprobado.';
    const declara = modo === 'otros'
        ? 'Al publicar declaras que las personas marcadas, además de ti, son todas las que aparecen.'
        : 'Al publicar declaras que eres la única persona que aparece.';
    box.innerHTML = `
        <div class="rounded-xl bg-c-bg border border-c-border p-3 text-xs text-c-soft leading-relaxed">
            <p class="font-bold text-c-text mb-2">¿Quién aparece en este contenido?</p>
            <label class="flex items-center gap-2 cursor-pointer text-sm mb-1">
                <input type="radio" name="${id}-modo" value="solo" ${modo === 'solo' ? 'checked' : ''} data-on-change="montarQuienAparece('${id}')" class="accent-orange-400">
                <span class="font-semibold text-c-text">Solo yo</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="${id}-modo" value="otros" ${modo === 'otros' ? 'checked' : ''} data-on-change="montarQuienAparece('${id}')" class="accent-orange-400">
                <span class="font-semibold text-c-text">Yo y otras personas</span>
            </label>
            <div class="${modo === 'otros' ? '' : 'hidden'} mt-3 pt-3 border-t border-c-border">
                ${filas || '<p class="mb-1">Aún no tienes colaboradores.</p>'}
                <button type="button" data-on-click="mostrar('colaboradores')" class="text-c-accent font-bold hover:underline mt-1">Invitar a alguien</button>
                <p class="mt-2">${notaLista}</p>
            </div>
            <p class="mt-2">${declara} <a href="normas.html#participantes" target="_blank" rel="noopener" class="text-c-accent font-bold hover:underline">Ver reglas</a></p>
        </div>`;
}
function refrescarQuienAparece() { montarQuienAparece('qa-contenido'); montarQuienAparece('qa-pack'); }
function leerQuienAparece(id) {
    const box = document.getElementById(id);
    const sel = box ? box.querySelector('input[type=radio]:checked') : null;
    if (!sel || sel.value === 'solo') return [];
    const ids = Array.from(box.querySelectorAll('input[data-colab]:checked')).map(x => x.value);
    if (!ids.length) throw new Error('Marca a las personas que aparecen, o elige "Solo yo".');
    return ids;
}

// ─── NAVIGATION ──────────────────────────────────────────────
function _activarSeccion(sec) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + sec)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', !!n.getAttribute('data-on-click')?.includes("'"+sec+"'"));
    });
    window.scrollTo(0, 0);
    if (sec === 'ganancias') cargarGanancias();
    if (sec === 'inicio') { cargarGanancias(); cargarMisPosts(); cargarScore('inicio'); }
    if (sec === 'packs') cargarMisPacks();
    if (sec === 'colaboradores') cargarColaboradores();
    if (sec === 'stories') cargarMisStories();
    if (sec === 'encuestas') cargarMisEncuestas();
    if (sec === 'personalizar') { cargarScore('personalizar'); renderCarrusel(perfilData?.fotos_carrusel || []); }
    if (sec === 'referidas') cargarReferidas();
    if (sec === 'metodos-pago') cargarDatosRetiro();
    if (sec === 'propinas') cargarPropinas();
    if (sec === 'stream') cargarStreamActivo();
    if (sec === 'analitica') cargarAnalitica();
    if (sec === 'medios') cargarMisMedios();
    if (sec === 'seguridad') cargarEstado2FA();
    if (sec === 'mensajes') { cargarMensajes(); cargarBroadcasts(); if (perfilData) { document.getElementById('toggle-acepta-msg').checked = perfilData.acepta_mensajes; document.getElementById('msg-precio-input').value = perfilData.precio_mensaje || 5; document.getElementById('msg-precio-desc').textContent = `Precio por mensaje: $${perfilData.precio_mensaje || 5}`; } }
    if (sec === 'chat-sesion') {
        cargarSolicitudesChat();
        if (perfilData) {
            document.getElementById('toggle-acepta-chat').checked = !!perfilData.acepta_chat_sesion;
            document.getElementById('chat-precio-min').value = perfilData.precio_chat_minuto || 5;
            document.getElementById('chat-precio-desc').textContent = `Precio actual: $${perfilData.precio_chat_minuto || 5}/min`;
        }
    }
}

function mostrar(sec) {
    history.pushState({section: sec}, '', '#' + sec);
    _activarSeccion(sec);
    document.getElementById('mobile-menu')?.classList.add('hidden');
}

function toggleMenuMobile() {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
}

// ─── NOTIFICACIONES ─────────────────────────────────────────
async function cargarNotificaciones() {
    try {
        const data = await candela._req('GET', '/api/notificaciones');
        const badge = document.getElementById('notif-badge');
        if (data.no_leidas > 0) {
            badge.textContent = data.no_leidas > 9 ? '9+' : data.no_leidas;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        const lista = document.getElementById('notif-lista');
        if (!data.items || data.items.length === 0) {
            lista.innerHTML = '<p class="text-center text-c-soft text-xs py-6">Sin notificaciones</p>';
            return;
        }
        const iconos = { nueva_suscripcion: 'favorite', nueva_propina: 'attach_money', nuevo_mensaje: 'chat', broadcast_pagado: 'lock_open' };
        lista.innerHTML = data.items.map(n => `
            <div class="flex items-start gap-3 px-4 py-3 border-b border-c-border last:border-0 ${n.leida ? 'opacity-60' : 'bg-c-surface'}">
                <span class="ms text-c-accent mt-0.5" style="font-size:18px">${iconos[n.tipo] || 'notifications'}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold leading-snug">${esc(n.titulo)}</p>
                    ${n.mensaje ? `<p class="text-[11px] text-c-soft mt-0.5 truncate">${esc(n.mensaje)}</p>` : ''}
                </div>
                ${!n.leida ? '<span class="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>' : ''}
            </div>`).join('');
    } catch(e) { console.error('notificaciones:', e); }
}

async function leerTodasNotifs() {
    await candela._req('PATCH', '/api/notificaciones/leer-todas');
    document.getElementById('notif-badge').classList.add('hidden');
    document.querySelectorAll('#notif-lista .bg-c-surface').forEach(el => el.classList.remove('bg-c-surface'));
    document.querySelectorAll('#notif-lista .w-2.h-2.rounded-full.bg-red-500').forEach(el => el.remove());
}

function toggleNotificaciones() {
    const dd = document.getElementById('notif-dropdown');
    dd.classList.toggle('hidden');
    if (!dd.classList.contains('hidden')) cargarNotificaciones();
}

document.addEventListener('click', e => {
    const wrap = document.getElementById('notif-wrap');
    if (wrap && !wrap.contains(e.target)) document.getElementById('notif-dropdown')?.classList.add('hidden');
});

window.addEventListener('popstate', e => _activarSeccion(e.state?.section || 'inicio'));

// ─── REFERIDAS ───────────────────────────────────────────────
async function cargarReferidas() {
    try {
        const data = await candela.creadoras.misReferidas();
        const baseUrl = window.location.origin + window.location.pathname.replace('dashboard-creadora.html','') + '../pages/registro-creadora.html';
        document.getElementById('link-ref').value = `${baseUrl}?ref=${data.codigo_referido}`;
        document.getElementById('ref-total').textContent = data.total_referidas;
        const activas = data.referidas.filter(r => r.estado === 'activa').length;
        document.getElementById('ref-activas').textContent = activas;
        document.getElementById('ref-balance').textContent = `$${(data.balance_referidos||0).toFixed(2)}`;
        const lista = document.getElementById('lista-referidas');
        if (!data.referidas.length) {
            lista.innerHTML = '<p class="text-center text-c-soft text-sm py-8">Aun no tienes referidas. Comparte tu enlace para empezar a ganar.</p>';
            return;
        }
        lista.innerHTML = data.referidas.map(r => `
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-c-border last:border-0">
                <div>
                    <p class="font-semibold text-sm">${esc(r.nombre_artistico)}</p>
                    <p class="text-xs text-c-soft">@${esc(r.slug)}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold text-c-accent">$${(Number(r.total_comision_generada)||0).toFixed(2)}</p>
                    <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${r.estado==='activa'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}">${esc(r.estado)}</span>
                </div>
            </div>
        `).join('');
    } catch(e) {
        document.getElementById('lista-referidas').innerHTML = '<p class="text-center text-c-soft text-sm py-8">Error al cargar referidas</p>';
    }
}

function copiarLink() {
    const inp = document.getElementById('link-ref');
    navigator.clipboard.writeText(inp.value).then(() => toast('Enlace copiado!', 'success'));
}

// ─── PROPINAS ────────────────────────────────────────────────
async function cargarPropinas() {
    try {
        const data = await candela.propinas.misPropinas();
        document.getElementById('prop-total').textContent = `$${(data.total_recibido||0).toFixed(2)}`;
        document.getElementById('prop-count').textContent = data.propinas.length;
        const lista = document.getElementById('lista-propinas');
        if (!data.propinas.length) {
            lista.innerHTML = '<p class="text-center text-c-soft text-sm py-8">Aun no recibiste propinas.</p>';
            return;
        }
        const badges = { confirmada: 'bg-green-100 text-green-700', pendiente: 'bg-amber-100 text-amber-700', rechazada: 'bg-red-100 text-red-700' };
        lista.innerHTML = data.propinas.map(p => `
            <div class="flex items-start gap-3 px-5 py-4 border-b border-c-border last:border-0">
                <span class="ms text-c-accent shrink-0 mt-0.5" style="font-size:20px">volunteer_activism</span>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2 mb-0.5">
                        <p class="font-semibold text-sm">${esc(p.remitente_nombre)}</p>
                        <p class="font-bold text-c-accent text-sm shrink-0">$${p.monto.toFixed(2)}</p>
                    </div>
                    ${p.mensaje ? `<p class="text-xs text-c-soft italic">"${esc(p.mensaje)}"</p>` : ''}
                    <div class="flex items-center gap-2 mt-1">
                        <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badges[p.estado]||'bg-gray-100 text-gray-600'}">${p.estado}</span>
                        <span class="text-[10px] text-c-soft">${p.fecha ? new Date(p.fecha).toLocaleDateString('es') : ''}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch(e) {
        document.getElementById('lista-propinas').innerHTML = '<p class="text-center text-c-soft text-sm py-8">Error al cargar propinas</p>';
    }
}

// ─── BROADCASTS ──────────────────────────────────────────────
async function cargarBroadcasts() {
    try {
        const lista = await candela._req('GET', '/api/broadcasts/mis-broadcasts');
        const el = document.getElementById('lista-broadcasts');
        if (!lista.length) {
            el.innerHTML = '<p class="text-center text-c-soft text-sm py-6">Aun no has enviado mensajes masivos.</p>';
            return;
        }
        el.innerHTML = lista.map(bc => `
            <div class="px-5 py-4 border-b border-c-border last:border-0">
                <div class="flex items-start justify-between gap-3">
                    <p class="text-sm text-c-text flex-1 leading-snug">${bc.texto}</p>
                    <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${bc.precio>0?'bg-green-100 text-green-700':'bg-c-champagne text-c-soft'}">
                        ${bc.precio>0?'$'+bc.precio+' USDT':'Gratis'}
                    </span>
                </div>
                <p class="text-[10px] text-c-soft mt-1">${bc.total_pagos} pago${bc.total_pagos!==1?'s':''} · ${new Date(bc.creado_en).toLocaleDateString('es')}</p>
            </div>`).join('');
    } catch(e) { console.error('cargarBroadcasts:', e); }
}

async function crearBroadcast() {
    const texto = document.getElementById('bc-texto').value.trim();
    const precio = parseFloat(document.getElementById('bc-precio').value) || 0;
    if (!texto) { toast('Escribe un mensaje primero', 'error'); return; }
    try {
        await candela._req('POST', '/api/broadcasts', { texto, precio });
        toast('Mensaje enviado a todos tus fans', 'success');
        document.getElementById('bc-texto').value = '';
        document.getElementById('bc-precio').value = '0';
        cargarBroadcasts();
    } catch(err) { toast(err.message || 'Error al enviar', 'error'); }
}

// ─── MENSAJES ────────────────────────────────────────────────
async function cargarMensajes() {
    try {
        const data = await candela.mensajes.miBandeja();
        const badge = document.getElementById('msg-badge');
        if (data.no_leidos > 0) {
            badge.textContent = data.no_leidos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        const lista = document.getElementById('lista-mensajes');
        if (!data.mensajes.length) {
            lista.innerHTML = '<p class="text-center text-c-soft text-sm py-8">No tienes mensajes aun.</p>';
            return;
        }
        const badges = { confirmado: 'bg-green-100 text-green-700', pendiente: 'bg-amber-100 text-amber-700', rechazado: 'bg-red-100 text-red-700' };
        lista.innerHTML = data.mensajes.map(m => `
            <div class="px-5 py-4 border-b border-c-border last:border-0 ${!m.leido && m.estado==='confirmado' ? 'bg-orange-50' : ''}">
                <div class="flex items-center justify-between mb-1">
                    <p class="font-semibold text-sm">${esc(m.remitente_nombre)}</p>
                    <div class="flex items-center gap-2">
                        <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badges[m.estado]||'bg-gray-100 text-gray-600'}">${m.estado}</span>
                        <span class="text-[10px] text-c-soft">${m.fecha ? new Date(m.fecha).toLocaleDateString('es') : ''}</span>
                    </div>
                </div>
                <p class="text-sm text-c-text leading-relaxed">${esc(m.contenido)}</p>
                ${!m.leido && m.estado==='confirmado' ? `<button data-on-click="marcarMsgLeido('${m.id}')" class="text-xs text-c-accent font-semibold mt-2">Marcar como leido</button>` : ''}
            </div>
        `).join('');
    } catch(e) {
        document.getElementById('lista-mensajes').innerHTML = '<p class="text-center text-c-soft text-sm py-8">Error al cargar mensajes</p>';
    }
}

async function marcarMsgLeido(id) {
    try {
        await candela.mensajes.marcarLeido(id);
        cargarMensajes();
    } catch(e) {}
}

async function guardarConfigMsg() {
    const acepta = document.getElementById('toggle-acepta-msg').checked;
    try {
        await candela.creadoras.actualizarPerfil({ acepta_mensajes: acepta });
        toast(acepta ? 'Mensajes activados' : 'Mensajes desactivados', 'success');
    } catch(e) { toast('Error al guardar', 'error'); }
}

async function guardarPrecioMsg() {
    const precio = parseFloat(document.getElementById('msg-precio-input').value);
    if (!precio || precio < 1) { toast('Precio minimo: $1', 'error'); return; }
    try {
        await candela.creadoras.actualizarPerfil({ precio_mensaje: precio });
        document.getElementById('msg-precio-desc').textContent = `Precio por mensaje: $${precio}`;
        toast('Precio guardado', 'success');
    } catch(e) { toast('Error al guardar', 'error'); }
}

// ─── CHAT SESION (creadora) ───────────────────────────────────
let _chatCrWs = null;
let _chatCrTimer = null;

async function cargarSolicitudesChat() {
    try {
        const lista = await candela.chatSesion.pendientes();
        const cont = document.getElementById('chat-solicitudes-lista');
        if (!lista.length) {
            cont.innerHTML = '<p class="text-c-soft text-sm">No hay solicitudes pendientes.</p>';
            return;
        }
        cont.innerHTML = lista.map(s => `
            <div class="bg-white border border-c-border rounded-2xl p-4 shadow-sm flex items-start gap-4">
                <div class="flex-1">
                    <p class="font-semibold text-sm">${esc(s.fan_nombre)}</p>
                    <p class="text-xs text-c-soft">${s.duracion_minutos} min — $${s.precio_total.toFixed(2)}</p>
                    ${s.mensaje_inicial ? `<p class="text-sm text-c-text mt-1 italic">"${esc(s.mensaje_inicial)}"</p>` : ''}
                </div>
                <div class="flex gap-2">
                    <button data-nombre="${esc(s.fan_nombre)}" data-on-click="aceptarSolicitudChat('${s.id}',this.dataset.nombre)" class="c-btn text-white px-3 py-1.5 rounded-full text-xs font-bold">Aceptar</button>
                    <button data-on-click="rechazarSolicitudChat('${s.id}')" class="c-btn-outline px-3 py-1.5 rounded-full text-xs font-bold text-red-500 border-red-300">Rechazar</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

async function aceptarSolicitudChat(sesionId, fanNombre) {
    try {
        const r = await candela.chatSesion.aceptar(sesionId);
        toast('Sesion aceptada. Conectando...', 'success');
        await cargarSolicitudesChat();
        _abrirChatCr(sesionId, fanNombre, r.expires_at);
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

async function rechazarSolicitudChat(sesionId) {
    try {
        await candela.chatSesion.rechazar(sesionId);
        toast('Solicitud rechazada. Saldo devuelto al fan.', 'info');
        await cargarSolicitudesChat();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

function _abrirChatCr(sesionId, fanNombre, expiresAt) {
    document.getElementById('chat-sesion-fan-nombre').textContent = fanNombre;
    document.getElementById('chat-sesion-msgs-cr').innerHTML = '';
    document.getElementById('chat-sesion-activa-panel').classList.remove('hidden');

    // la sesion viaja en la cookie HttpOnly: el WebSocket la envia solo, no hay token que mandar
    const wsBase = candela._wsBase();
    _chatCrWs = new WebSocket(`${wsBase}/api/chat-sesion/${encodeURIComponent(sesionId)}/ws`);

    _chatCrWs.onmessage = e => {
        const d = JSON.parse(e.data);
        if (d.tipo === 'sesion_info') _iniciarTimerCr(d.segundos_restantes);
        else if (d.tipo === 'heartbeat') _actualizarTimerCr(d.segundos_restantes);
        else if (d.tipo === 'chat') _agregarMsgCr(d.usuario, d.texto, d.role === 'creadora');
        else if (d.tipo === 'sesion_fin') {
            clearInterval(_chatCrTimer);
            document.getElementById('chat-sesion-timer-cr').textContent = 'Sesion terminada';
            document.getElementById('chat-sesion-activa-panel').classList.add('hidden');
            toast('Sesion terminada', 'info');
        }
    };

    const hb = setInterval(() => {
        if (_chatCrWs && _chatCrWs.readyState === WebSocket.OPEN) _chatCrWs.send(JSON.stringify({ tipo: 'heartbeat' }));
        else clearInterval(hb);
    }, 30000);
}

function _iniciarTimerCr(segundos) {
    _actualizarTimerCr(segundos);
    _chatCrTimer = setInterval(() => { _actualizarTimerCr(Math.max(0, --segundos)); }, 1000);
}

function _actualizarTimerCr(s) {
    const m = Math.floor(s / 60);
    document.getElementById('chat-sesion-timer-cr').textContent = `${m}:${String(s % 60).padStart(2,'0')} restantes`;
}

function _agregarMsgCr(usuario, texto, esCr) {
    const cont = document.getElementById('chat-sesion-msgs-cr');
    const div = document.createElement('div');
    div.className = esCr ? 'text-right' : 'text-left';
    div.innerHTML = `<span class="inline-block max-w-xs px-3 py-2 rounded-2xl text-sm ${esCr ? 'bg-c-accent text-white ml-auto' : 'bg-c-border text-c-text'}">${esc(texto)}</span>`;
    cont.appendChild(div);
    cont.scrollTop = cont.scrollHeight;
}

function chatCrEnviar() {
    if (!_chatCrWs || _chatCrWs.readyState !== WebSocket.OPEN) return;
    const inp = document.getElementById('chat-sesion-inp-cr');
    const texto = inp.value.trim();
    if (!texto) return;
    _chatCrWs.send(JSON.stringify({ tipo: 'chat', texto }));
    _agregarMsgCr('Tu', texto, true);
    inp.value = '';
}

function terminarChatCr() {
    if (_chatCrWs && _chatCrWs.readyState === WebSocket.OPEN) _chatCrWs.send(JSON.stringify({ tipo: 'terminar' }));
}

async function guardarAceptaChat() {
    const acepta = document.getElementById('toggle-acepta-chat').checked;
    try {
        await candela.creadoras.actualizarPerfil({ acepta_chat_sesion: acepta });
        toast(acepta ? 'Chat privado activado' : 'Chat privado desactivado', 'success');
    } catch(e) { toast('Error al guardar', 'error'); }
}

async function guardarPrecioChat() {
    const precio = parseFloat(document.getElementById('chat-precio-min').value);
    if (!precio || precio < 1) { toast('Precio minimo: $1/min', 'error'); return; }
    try {
        await candela.creadoras.actualizarPerfil({ precio_chat_minuto: precio });
        document.getElementById('chat-precio-desc').textContent = `Precio actual: $${precio}/min`;
        toast('Precio guardado', 'success');
    } catch(e) { toast('Error al guardar', 'error'); }
}

// ─── HELPERS ─────────────────────────────────────────────────
function togglePrecio(show) {
    document.getElementById('precio-ppv').classList.toggle('hidden', !show);
}

function previewArchivo(input) {
    const f = input.files[0]; if (!f) return;
    const p = document.getElementById('archivo-nombre');
    const hint = document.getElementById('upload-hint');
    if (p) p.textContent = `✓ ${f.name}`;
    if (hint) hint.textContent = `${(f.size/1024/1024).toFixed(1)} MB — listo para publicar`;
    if (f.type.startsWith('image/')) {
        const prev = document.getElementById('upload-preview');
        const icon = document.getElementById('upload-icon');
        if (prev) { prev.src = URL.createObjectURL(f); prev.style.display = 'block'; }
        if (icon) icon.style.display = 'none';
    }
}

function mostrarNombre(input, id) {
    document.getElementById(id).textContent = input.files[0]?.name || '';
}

function _setupVerifInput(inputId, iconId, prevId, txtId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        const icon = document.getElementById(iconId);
        const prev = document.getElementById(prevId);
        const txt  = document.getElementById(txtId);
        const url  = URL.createObjectURL(file);
        prev.src = url;
        prev.style.display = 'block';
        if (icon) icon.style.display = 'none';
        if (txt)  txt.textContent = '✓ ' + file.name;
    });
}

function _setupSelfieInputs() {
    function _onSelfieChange(file) {
        if (!file) return;
        const prev = document.getElementById('v-selfie-prev');
        const icon = document.getElementById('v-selfie-icon');
        const txt  = document.getElementById('v-selfie-txt');
        prev.src = URL.createObjectURL(file);
        prev.style.display = 'block';
        if (icon) icon.style.display = 'none';
        if (txt)  txt.textContent = '✓ ' + file.name;
        // Copiar al input "required" que valida el form
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('v-selfie').files = dt.files;
    }
    const cam = document.getElementById('v-selfie-cam');
    const gal = document.getElementById('v-selfie-gal');
    if (cam) cam.addEventListener('change', function() { _onSelfieChange(this.files[0]); });
    if (gal) gal.addEventListener('change', function() { _onSelfieChange(this.files[0]); });
}

function requireAuth(tipo) {
    if (!candela.auth.isLoggedIn()) { window.location.href = '../index.html'; return false; }
    if (tipo) {
        const u = candela.auth.user();
        if (u?.tipo !== tipo) { window.location.href = '../index.html'; return false; }
    }
    return true;
}

// Resuelve URLs relativas (Railway) y absolutas (Supabase) uniformemente
function _url(u) {
    if (!u) return '';
    if (u.startsWith('http')) return u;
    return 'https://api.clubcandela.com' + u;
}

// ─── AVATAR / BANNER ─────────────────────────────────────────
async function subirAvatar(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Imagen muy grande (max 5MB)', 'error'); return; }
    try {
        const r = await candela.creadoras.subirAvatar(file);
        const img = document.getElementById('prev-avatar-img');
        img.src = _url(r.avatar_url);
        img.classList.remove('hidden');
        document.getElementById('prev-avatar-init').classList.add('hidden');
        toast('Foto de perfil actualizada', 'success');
    } catch(err) { toast(err.message, 'error'); }
}

async function subirBanner(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('Imagen muy grande (max 10MB)', 'error'); return; }
    try {
        const r = await candela.creadoras.subirBanner(file);
        const img = document.getElementById('prev-banner-img');
        img.src = _url(r.banner_url);
        img.classList.remove('hidden');
        toast('Banner actualizado', 'success');
    } catch(err) { toast(err.message, 'error'); }
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

init();

// ------------------------------------------------------------------ //
// LIVE — flujo TikTok
// ------------------------------------------------------------------ //
let streamActivoId = null;
let _streamHlsUrl = null;
let _localStream = null;
let _whipPc = null;
let _monitorWs = null;
let _currentFacing = 'user';
let _ingresosInterval = null;
let _wsReconnect = null;

async function cargarStreamActivo() {
    try {
        const r = await candela._req('GET', '/api/streams/mis-streams');
        const activo = r.find(s => s.estado === 'preparando' || s.estado === 'live');
        if (activo) {
            streamActivoId = activo.id;
            _streamHlsUrl = activo.url_hls;
            document.getElementById('stream-sin-activo').style.display = 'none';
            document.getElementById('stream-activo').style.display = '';
            document.getElementById('stream-activo-titulo').textContent = activo.titulo;
            document.getElementById('stream-activo-ingresos').textContent = `$${(activo.total_ingresos || 0).toFixed(2)}`;
            document.getElementById('stream-fan-url').textContent = `${location.origin}/pages/stream.html?id=${activo.id}`;
            if (activo.rtmp_url) document.getElementById('stream-rtmp-url').textContent = activo.rtmp_url;
            if (activo.stream_key) document.getElementById('stream-key-val').textContent = activo.stream_key;
            if (activo.estado === 'live') {
                document.getElementById('monitor-badge').style.display = '';
                document.getElementById('monitor-connecting').style.display = 'none';
                conectarMonitorWs(activo.id);
                _ingresosInterval = setInterval(actualizarIngresos, 30000);
            }
        } else {
            streamActivoId = null;
            document.getElementById('stream-sin-activo').style.display = '';
            document.getElementById('stream-activo').style.display = 'none';
            cargarHistorialStreams(r.filter(s => s.estado === 'terminado'));
        }
    } catch(e) {}
}

function cargarHistorialStreams(lista) {
    const el = document.getElementById('stream-historial');
    if (!lista || !lista.length) { el.textContent = 'Sin lives anteriores.'; return; }
    el.innerHTML = lista.slice(0, 5).map(s => `
        <div class="flex items-center justify-between py-2 border-b border-c-border last:border-0">
            <div>
                <p class="font-semibold text-c-text text-sm">${esc(s.titulo)}</p>
                <p class="text-xs text-c-soft">${s.started_at ? new Date(s.started_at).toLocaleDateString('es') : 'No iniciado'}</p>
            </div>
            <span class="text-sm font-bold text-c-accent">$${(s.total_ingresos || 0).toFixed(2)}</span>
        </div>
    `).join('');
}

async function irEnVivo() {
    const titulo = document.getElementById('stream-titulo-inp').value.trim();
    const precio = parseFloat(document.getElementById('stream-precio-inp').value) || 0;
    if (!titulo) { toast('Escribe un titulo para el live', 'error'); return; }
    if (!confirm('Activar el live descuenta $1.00 USDT de tu balance.\n\n¿Continuar?')) return;

    let localStream;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch(e) {
        toast('Permite el acceso a camara y microfono en el navegador', 'error');
        return;
    }

    _localStream = localStream;
    const previewEl = document.getElementById('monitor-preview');
    previewEl.srcObject = localStream;
    previewEl.play().catch(() => {});
    document.getElementById('stream-sin-activo').style.display = 'none';
    document.getElementById('stream-activo').style.display = '';
    document.getElementById('stream-activo-titulo').textContent = titulo;

    try {
        const d = await candela._req('POST', '/api/streams/crear', { titulo, precio_entrada: precio });
        streamActivoId = d.stream_id;
        _streamHlsUrl = d.url_hls;
        document.getElementById('stream-fan-url').textContent = `${location.origin}/pages/stream.html?id=${d.stream_id}`;
        document.getElementById('stream-rtmp-url').textContent = d.rtmp_url || '';
        document.getElementById('stream-key-val').textContent = d.stream_key || '';
        document.getElementById('stream-activo-ingresos').textContent = '$0.00';

        await startWhip(d.url_hls, localStream, d.stream_pass);

        await candela._req('POST', `/api/streams/${d.stream_id}/iniciar`);
        document.getElementById('monitor-badge').style.display = '';
        document.getElementById('monitor-connecting').style.display = 'none';
        document.getElementById('btn-flip-cam').style.display = 'flex';

        conectarMonitorWs(d.stream_id);
        _ingresosInterval = setInterval(actualizarIngresos, 30000);
        toast('Estas en vivo!', 'success');
    } catch(e) {
        if (streamActivoId) {
            candela._req('POST', `/api/streams/${streamActivoId}/terminar`).catch(() => {});
            streamActivoId = null;
        }
        detenerCamara();
        document.getElementById('stream-sin-activo').style.display = '';
        document.getElementById('stream-activo').style.display = 'none';
        toast(e.message || 'Error al iniciar live', 'error');
    }
}

async function startWhip(hlsUrl, localStream, pass) {
    const whipUrl = hlsUrl.replace('/index.m3u8', '/whip');
    _whipPc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    localStream.getTracks().forEach(t => {
        const tc = _whipPc.addTransceiver(t, { streams: [localStream] });
        if (t.kind === 'video') {
            const caps = RTCRtpSender.getCapabilities('video');
            if (caps) {
                const h264 = caps.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
                const rest = caps.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264');
                if (h264.length) tc.setCodecPreferences([...h264, ...rest]);
            }
        }
    });
    const offer = await _whipPc.createOffer();
    await _whipPc.setLocalDescription(offer);
    await new Promise(resolve => {
        if (_whipPc.iceGatheringState === 'complete') { resolve(); return; }
        _whipPc.onicegatheringstatechange = () => {
            if (_whipPc.iceGatheringState === 'complete') resolve();
        };
        setTimeout(resolve, 4000);
    });
    // WHIP va a otro host (stream.*) y no puede usar la cookie de api.*: se autentica con la clave del stream.
    const resp = await fetch(whipUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/sdp',
            'Authorization': 'Basic ' + btoa('candela:' + pass),
        },
        body: _whipPc.localDescription.sdp,
    });
    if (!resp.ok) throw new Error('Error WebRTC (' + resp.status + '). Usa OBS/Streamlabs como alternativa.');
    const answerSdp = await resp.text();
    await _whipPc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
}

function conectarMonitorWs(streamId) {
    if (_monitorWs) { try { _monitorWs.close(); } catch(_) {} }
    // la sesion viaja en la cookie HttpOnly: el WebSocket la envia solo, no hay token que mandar
    const wsBase = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    _monitorWs = new WebSocket(`${wsBase}/api/streams/${encodeURIComponent(streamId)}/ws`);
    _monitorWs.onmessage = e => {
        const d = JSON.parse(e.data);
        const chat = document.getElementById('monitor-chat');
        if (d.tipo === 'chat') {
            const div = document.createElement('div');
            div.innerHTML = `<span class="font-semibold text-c-accent">${esc(d.usuario||'')}</span>: <span class="text-c-text">${esc(d.texto||'')}</span>`;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        } else if (d.tipo === 'obsequio') {
            const div = document.createElement('div');
            div.innerHTML = `<span class="text-yellow-500 font-semibold">${esc(d.obsequio_emoji||'')} ${esc(d.remitente||'Fan')}</span> envio ${esc(d.obsequio_nombre||'')} <span class="text-c-accent font-bold">+$${(d.monto||0).toFixed(2)}</span>`;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
            toast(`${d.obsequio_emoji} ${d.remitente} envio ${d.obsequio_nombre}!`, 'success');
            actualizarIngresos();
        } else if (d.tipo === 'viewers') {
            document.getElementById('monitor-viewers').textContent = d.count || 0;
        }
    };
    _monitorWs.onclose = () => {
        if (streamActivoId) _wsReconnect = setTimeout(() => conectarMonitorWs(streamId), 3000);
    };
}

function monitorEnviarChat() {
    if (!_monitorWs || _monitorWs.readyState !== WebSocket.OPEN) return;
    const inp = document.getElementById('monitor-chat-inp');
    const texto = inp.value.trim();
    if (!texto) return;
    _monitorWs.send(JSON.stringify({ tipo: 'chat', texto }));
    inp.value = '';
}

async function actualizarIngresos() {
    if (!streamActivoId) return;
    try {
        const r = await candela._req('GET', '/api/streams/mis-streams');
        const s = r.find(x => x.id === streamActivoId);
        if (s) document.getElementById('stream-activo-ingresos').textContent = `$${(s.total_ingresos||0).toFixed(2)}`;
    } catch(_) {}
}

function detenerCamara() {
    if (_localStream) { _localStream.getTracks().forEach(t => t.stop()); _localStream = null; }
    if (_whipPc) { _whipPc.close(); _whipPc = null; }
    const v = document.getElementById('monitor-preview');
    if (v) { v.srcObject = null; v.style.transform = 'scaleX(-1)'; }
    const flip = document.getElementById('btn-flip-cam');
    if (flip) flip.style.display = 'none';
    _currentFacing = 'user';
}

function toggleMonitorFullscreen() {
    const el = document.getElementById('monitor-preview');
    if (!document.fullscreenElement) {
        (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen).call(el).catch(() => {});
    } else {
        document.exitFullscreen();
    }
}
document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('monitor-fs-icon');
    if (icon) icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
});

async function cambiarCamara() {
    if (!_whipPc) return;
    const newFacing = _currentFacing === 'user' ? 'environment' : 'user';
    let newStream;
    try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
    } catch(e) {
        toast('No se pudo cambiar la camara', 'error');
        return;
    }
    const newVideoTrack = newStream.getVideoTracks()[0];
    const sender = _whipPc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender) await sender.replaceTrack(newVideoTrack);
    const oldTrack = _localStream.getVideoTracks()[0];
    if (oldTrack) { oldTrack.stop(); _localStream.removeTrack(oldTrack); }
    _localStream.addTrack(newVideoTrack);
    const previewEl = document.getElementById('monitor-preview');
    previewEl.srcObject = _localStream;
    previewEl.style.transform = newFacing === 'user' ? 'scaleX(-1)' : 'none';
    _currentFacing = newFacing;
}

async function terminarStream() {
    if (!streamActivoId) return;
    if (!confirm('Terminar el live?')) return;
    try { await candela._req('POST', `/api/streams/${streamActivoId}/terminar`); } catch(_) {}
    detenerCamara();
    if (_monitorWs) { try { _monitorWs.close(); } catch(_) {} _monitorWs = null; }
    if (_ingresosInterval) { clearInterval(_ingresosInterval); _ingresosInterval = null; }
    if (_wsReconnect) { clearTimeout(_wsReconnect); _wsReconnect = null; }
    streamActivoId = null;
    document.getElementById('stream-sin-activo').style.display = '';
    document.getElementById('stream-activo').style.display = 'none';
    document.getElementById('stream-titulo-inp').value = '';
    document.getElementById('stream-precio-inp').value = '0';
    document.getElementById('monitor-chat').innerHTML = '';
    document.getElementById('monitor-badge').style.display = 'none';
    document.getElementById('monitor-connecting').style.display = '';
    toast('Live terminado', 'success');
    cargarStreamActivo();
}

async function crearStreamExterno() {
    const titulo = document.getElementById('stream-titulo-inp').value.trim();
    const precio = parseFloat(document.getElementById('stream-precio-inp').value) || 0;
    if (!titulo) { toast('Escribe un titulo para el stream', 'error'); return; }
    if (!confirm('Activar el stream descuenta $1.00 USDT de tu balance.\n\n¿Continuar?')) return;
    try {
        const d = await candela._req('POST', '/api/streams/crear', { titulo, precio_entrada: precio });
        streamActivoId = d.stream_id;
        _streamHlsUrl = d.url_hls;
        document.getElementById('stream-rtmp-url').textContent = d.rtmp_url || '';
        document.getElementById('stream-key-val').textContent = d.stream_key || '';
        document.getElementById('stream-fan-url').textContent = `${location.origin}/pages/stream.html?id=${d.stream_id}`;
        document.getElementById('stream-activo-titulo').textContent = d.titulo;
        document.getElementById('stream-activo-ingresos').textContent = '$0.00';
        document.getElementById('monitor-connecting').innerHTML = '<p class="text-white text-sm font-semibold text-center px-4">Conecta tu app (OBS/Streamlabs) y presiona "Ir en vivo" cuando estes listo.<br><button data-on-click="iniciarStreamExterno()" class="mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Ir en vivo</button></p>';
        document.getElementById('stream-sin-activo').style.display = 'none';
        document.getElementById('stream-activo').style.display = '';
        toast('Stream creado. Conecta tu app y presiona Ir en vivo.', 'success');
    } catch(e) { toast(e.message || 'Error al crear stream', 'error'); }
}

async function iniciarStreamExterno() {
    if (!streamActivoId) return;
    try {
        await candela._req('POST', `/api/streams/${streamActivoId}/iniciar`);
        document.getElementById('monitor-badge').style.display = '';
        document.getElementById('monitor-connecting').style.display = 'none';
        conectarMonitorWs(streamActivoId);
        _ingresosInterval = setInterval(actualizarIngresos, 30000);
        toast('Stream en vivo!', 'success');
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

function compartirLink() {
    const url = document.getElementById('stream-fan-url').textContent.trim();
    if (navigator.share) {
        navigator.share({ title: document.getElementById('stream-activo-titulo').textContent, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => toast('Link copiado', 'success')).catch(() => {});
    }
}

function copiar(elementId) {
    const texto = document.getElementById(elementId).textContent.trim();
    navigator.clipboard.writeText(texto).then(() => toast('Copiado', 'success')).catch(() => {});
}

// ─── PROTECCION DE CONTENIDO ──────────────────────────────────
document.addEventListener('contextmenu', e => { if (e.target.matches('img,video')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (e.target.matches('img,video')) e.preventDefault(); });

// ─── SCORE DE COMPLETITUD ─────────────────────────────────────
async function cargarScore(contexto) {
    try {
        const s = await candela._req('GET', '/api/creadoras/mi-perfil/score');
        const pct = s.score || 0;
        const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#B5445C' : '#ef4444';
        _perfilCompleto100 = pct === 100;
        _evaluarCardCompartir();

        const barEl = document.getElementById(`score-bar-${contexto}`);
        const pctEl = document.getElementById(`score-pct-${contexto}`);
        const fillEl = document.getElementById(`score-fill-${contexto}`);
        const hintEl = document.getElementById(`score-hint-${contexto}`) || document.getElementById(`score-faltantes-${contexto}`);
        if (!barEl) return;
        barEl.classList.remove('hidden');
        pctEl.textContent = pct + '%';
        pctEl.style.color = color;
        fillEl.style.width = pct + '%';
        fillEl.style.background = color;
        if (hintEl) {
            if (pct < 80 && s.faltantes?.length) {
                hintEl.innerHTML = 'Falta: ' + s.faltantes.map(f => {
                    const label = esc(f.label || f);
                    const campo = f.campo ? esc(f.campo) : '';
                    return campo
                        ? `<a href="#" data-on-click="irACompletar('${campo}');return false" style="color:#B5445C;font-weight:700;text-decoration:underline;text-underline-offset:2px">${label}</a>`
                        : label;
                }).join(', ');
            } else if (pct >= 80) {
                hintEl.textContent = 'Perfil completo. Tus fans te encontraran mas facil.';
            }
        }
    } catch(e) { /* silencioso */ }
}

// Mapa de que campo del score va a que seccion/input del formulario
const CAMPO_A_DESTINO = {
    avatar:           { seccion: 'personalizar', focus: 'input-avatar', scrollTo: 'prev-avatar' },
    banner:           { seccion: 'personalizar', focus: 'input-banner', scrollTo: 'prev-banner' },
    bio:              { seccion: 'personalizar', focus: 'p-bio' },
    pais:             { seccion: 'personalizar' }, // sin campo editable todavia
    rango_edad:       { seccion: 'personalizar', focus: 'p-rango-edad' },
    intereses:        { seccion: 'personalizar', focus: 'p-intereses' },
    tipos_contenido:  { seccion: 'personalizar', focus: 'p-tipos' },
    fotos_carrusel:   { seccion: 'personalizar', scrollTo: 'carrusel-add-btn' },
    precio_suscrip:   { seccion: 'personalizar', focus: 'p-precio' },
    al_menos_3_posts: { seccion: 'subir' },
};

function irACompletar(campo) {
    const destino = CAMPO_A_DESTINO[campo];
    if (!destino) return;
    mostrar(destino.seccion);
    setTimeout(() => {
        const scrollId = destino.scrollTo || destino.focus;
        const scrollEl = scrollId && document.getElementById(scrollId);
        if (!scrollEl) return;
        scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (destino.focus) {
            const focusEl = document.getElementById(destino.focus);
            setTimeout(() => { try { focusEl && focusEl.focus({ preventScroll: true }); } catch (e) {} }, 350);
        }
    }, 200);
}

// ─── CARRUSEL ─────────────────────────────────────────────────
function renderCarrusel(fotos) {
    fotos = fotos || [];
    const grid = document.getElementById('carrusel-grid');
    const addBtn = document.getElementById('carrusel-add-btn');
    if (!grid) return;
    grid.innerHTML = '';
    fotos.forEach((item, idx) => {
        const url = (item && typeof item === 'object') ? item.url : item;
        const div = document.createElement('div');
        div.className = 'relative rounded-xl overflow-hidden aspect-square bg-gray-100';
        div.innerHTML = `
            <img src="${_url(url)}" class="w-full h-full object-cover">
            <button data-on-click="eliminarFotoCarrusel(${idx})" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors" style="font-size:14px">
                <span class="ms" style="font-size:14px">close</span>
            </button>`;
        grid.appendChild(div);
    });
    if (addBtn) addBtn.classList.toggle('hidden', fotos.length >= 6);
}

async function subirFotoCarrusel(input) {
    if (!input.files[0]) return;
    const fd = new FormData();
    fd.append('archivo', input.files[0]);
    try {
        toast('Subiendo foto...', 'info');
        const res = await candela._req('POST', '/api/creadoras/mi-perfil/carrusel', fd, true);
        perfilData = perfilData || {};
        perfilData.fotos_carrusel = res.fotos_carrusel;
        renderCarrusel(res.fotos_carrusel);
        toast('Foto agregada al carrusel', 'success');
    } catch(e) { toast(e.message || 'Error al subir', 'error'); }
    input.value = '';
}

async function eliminarFotoCarrusel(idx) {
    try {
        const res = await candela._req('DELETE', `/api/creadoras/mi-perfil/carrusel/${idx}`);
        perfilData = perfilData || {};
        perfilData.fotos_carrusel = res.fotos_carrusel;
        renderCarrusel(res.fotos_carrusel);
        toast('Foto eliminada', 'success');
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

// ─── PACKS ────────────────────────────────────────────────────
function previewPackArchivos(input) {
    const preview = document.getElementById('pk-preview');
    if (!input.files.length) { preview.classList.add('hidden'); return; }
    const files = Array.from(input.files).slice(0, 10);
    preview.innerHTML = files.map((f, i) => {
        const isImg = f.type.startsWith('image/');
        const icon = isImg ? 'image' : 'videocam';
        return `<div class="rounded-xl bg-gray-100 aspect-square flex flex-col items-center justify-center text-c-soft p-2 overflow-hidden relative">
            <span class="ms" style="font-size:24px">${icon}</span>
            <span class="text-[10px] text-center mt-1 truncate w-full text-center">${f.name.slice(0,20)}</span>
        </div>`;
    }).join('');
    preview.classList.remove('hidden');
}

async function crearPack(e) {
    e.preventDefault();
    const archivos = document.getElementById('pk-archivos').files;
    if (!archivos.length) { toast('Selecciona al menos un archivo', 'error'); return; }
    if (archivos.length > 10) { toast('Maximo 10 archivos', 'error'); return; }

    let interpretesIds;
    try { interpretesIds = leerQuienAparece('qa-pack'); } catch (err) { toast(err.message, 'error'); return; }
    const btn = document.getElementById('btn-crear-pack');
    btn.disabled = true;
    btn.textContent = 'Creando...';
    const wrap = document.getElementById('pk-progress-wrap');
    const bar = document.getElementById('pk-progress-bar');
    const txt = document.getElementById('pk-progress-txt');
    wrap.classList.remove('hidden');

    const fd = new FormData();
    fd.append('titulo', document.getElementById('pk-titulo').value);
    fd.append('descripcion', document.getElementById('pk-desc').value);
    fd.append('precio_base', document.getElementById('pk-precio').value);
    fd.append('modo', document.getElementById('pk-modo').value);
    fd.append('declara_solo_yo', interpretesIds.length ? 'false' : 'true');
    if (interpretesIds.length) fd.append('interpretes_ids', interpretesIds.join(','));
    Array.from(archivos).forEach(f => fd.append('archivos', f));

    try {
        // XHR para progreso
        const respPack = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_URL + '/api/packs');
            xhr.withCredentials = true;  // cookie de sesion
            xhr.upload.onprogress = ev => {
                if (ev.lengthComputable) {
                    const pct = Math.round(ev.loaded / ev.total * 100);
                    bar.style.width = pct + '%';
                    txt.textContent = `Subiendo... ${pct}%`;
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
                else reject(new Error(JSON.parse(xhr.responseText).detail || 'Error'));
            };
            xhr.onerror = () => reject(new Error('Error de red'));
            xhr.send(fd);
        });
        toast((respPack && respPack.mensaje) || 'Pack creado exitosamente', 'success');
        document.getElementById('form-pack').reset();
        refrescarQuienAparece();
        document.getElementById('pk-preview').classList.add('hidden');
        cargarMisPacks();
    } catch(err) { toast(err.message || 'Error al crear pack', 'error'); }
    finally {
        btn.disabled = false;
        btn.textContent = 'Crear pack';
        wrap.classList.add('hidden');
        bar.style.width = '0%';
    }
}

async function cargarMisPacks() {
    const lista = document.getElementById('lista-mis-packs');
    if (!lista) return;
    lista.innerHTML = '<p class="text-c-soft text-sm text-center py-4">Cargando...</p>';
    try {
        const packs = await candela._req('GET', '/api/packs/mis-packs');
        if (!packs.length) {
            lista.innerHTML = '<p class="text-c-soft text-sm text-center py-8" id="packs-empty-msg">Aun no tienes packs creados.</p>';
            return;
        }
        lista.innerHTML = packs.map(pk => {
            const precio = pk.modo === 'venta' ? (pk.precio_base * 1.20).toFixed(2) : pk.precio_base.toFixed(2);
            const origen = window.location.origin + window.location.pathname.replace(/\/pages\/.*/, '');
            const linkPack = `${origen}/pages/pack.html?p=${pk.enlace_slug}`;
            return `<div class="bg-white border border-c-border rounded-2xl p-4 mb-3 shadow-sm">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-sm truncate">${esc(pk.titulo)}
                            ${pk.mod_estado === 'pendiente' ? '<span class="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">EN REVISIÓN</span>' : ''}
                            ${pk.mod_estado === 'rechazado' ? '<span class="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700" title="' + esc(pk.mod_razon || '') + '">RECHAZADO</span>' : ''}
                        </p>
                        ${pk.mod_estado === 'pendiente' ? '<p class="text-[11px] text-amber-700 mt-0.5">El link funcionará cuando el equipo lo apruebe.</p>' : ''}
                        ${pk.mod_estado === 'rechazado' && pk.mod_razon ? '<p class="text-[11px] text-red-600 mt-0.5">Motivo: ' + esc(pk.mod_razon) + '</p>' : ''}
                        <p class="text-xs text-c-soft mt-0.5">${pk.total_archivos || 0} archivo(s) · ${pk.modo === 'venta' ? 'Venta' : 'PPV'} · $${precio}</p>
                        ${pk.descripcion ? `<p class="text-xs text-c-soft mt-1 line-clamp-2">${esc(pk.descripcion)}</p>` : ''}
                    </div>
                    <button data-on-click="eliminarPack('${String(pk.id).replace(/[^a-z0-9-]/gi,'')}')" class="text-c-soft hover:text-red-500 transition-colors shrink-0 p-1">
                        <span class="ms" style="font-size:18px">delete</span>
                    </button>
                </div>
                <div class="mt-3 flex items-center gap-2">
                    <input type="text" value="${linkPack}" readonly class="flex-1 text-xs px-3 py-1.5 rounded-lg border border-c-border bg-gray-50 text-c-soft truncate min-w-0">
                    <button data-on-click="navigator.clipboard.writeText('${linkPack}').then(()=>toast('Link copiado','success'))" class="text-xs font-bold text-c-accent border border-c-champagne px-3 py-1.5 rounded-lg hover:bg-c-champagne transition-all shrink-0">
                        Copiar link
                    </button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        lista.innerHTML = '<p class="text-red-500 text-sm text-center py-4">Error cargando packs.</p>';
    }
}

async function eliminarPack(id) {
    if (!confirm('Eliminar este pack? No podra recuperarlo.')) return;
    try {
        await candela._req('DELETE', `/api/packs/${id}`);
        toast('Pack eliminado', 'success');
        cargarMisPacks();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

// ─── STORIES ─────────────────────────────────────────────────
function previewStory(input) {
    const label = document.getElementById('story-upload-label');
    const nameEl = document.getElementById('story-file-name');
    if (!input.files[0]) return;
    nameEl.textContent = input.files[0].name;
    nameEl.classList.remove('hidden');
    label.querySelector('span.ms').textContent = 'check_circle';
}

async function subirStory() {
    const input = document.getElementById('story-archivo');
    if (!input.files[0]) { toast('Selecciona un archivo primero', 'error'); return; }
    const btn = document.getElementById('btn-story-subir');
    const prog = document.getElementById('story-progress');
    const bar = document.getElementById('story-progress-bar');
    btn.disabled = true; btn.textContent = 'Subiendo...';
    prog.classList.remove('hidden');

    const fd = new FormData();
    fd.append('archivo', input.files[0]);

    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_URL + '/api/stories');
        xhr.withCredentials = true;  // cookie de sesion
        xhr.upload.onprogress = e => { if (e.lengthComputable) bar.style.width = Math.round(e.loaded/e.total*100)+'%'; };
        xhr.onload = () => { if (xhr.status < 300) resolve(); else reject(new Error(JSON.parse(xhr.responseText).detail || 'Error')); };
        xhr.onerror = () => reject(new Error('Error de red'));
        xhr.send(fd);
    }).then(() => {
        toast('Story publicada. Dura 24 horas.', 'success');
        input.value = '';
        document.getElementById('story-file-name').classList.add('hidden');
        document.getElementById('story-upload-label').querySelector('span.ms').textContent = 'add_photo_alternate';
        bar.style.width = '0%';
        cargarMisStories();
    }).catch(e => toast(e.message, 'error'));

    btn.disabled = false; btn.textContent = 'Publicar story';
    prog.classList.add('hidden');
}

async function cargarMisStories() {
    try {
        const lista = await candela._req('GET', '/api/stories/mis-stories');
        const el = document.getElementById('lista-mis-stories');
        if (!lista.length) {
            el.innerHTML = '<p class="text-center text-c-soft text-sm py-8">No tienes stories activas.</p>';
            return;
        }
        el.innerHTML = lista.map(s => {
            const expira = new Date(s.expira_en);
            const ahoraMs = Date.now();
            const diffH = Math.max(0, Math.round((expira - ahoraMs) / 3600000 * 10) / 10);
            return `
            <div class="flex items-center gap-3 px-4 py-3 border-b border-c-border last:border-0">
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-c-champagne shrink-0">
                    ${s.tipo === 'imagen'
                        ? `<img src="${s.url}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full flex items-center justify-center"><span class="ms text-c-soft">videocam</span></div>`}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold capitalize">${s.tipo}</p>
                    <p class="text-[11px] text-c-soft">${s.vistas_count} vista${s.vistas_count!==1?'s':''} · expira en ${diffH}h</p>
                </div>
                <div class="flex gap-1">
                    <button data-on-click="verVistasStory('${s.id}')" class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-c-champagne text-c-soft hover:bg-orange-100 transition-colors">
                        Ver vistas
                    </button>
                    <button data-on-click="eliminarStory('${s.id}')" class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        Borrar
                    </button>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error('cargarMisStories:', e); }
}

async function verVistasStory(id) {
    try {
        const vistas = await candela._req('GET', `/api/stories/${id}/vistas`);
        if (!vistas.length) { toast('Nadie ha visto esta story aun', 'success'); return; }
        const lineas = vistas.map((v,i) => {
            const medal = ['🥇','🥈','🥉'][i] || (i+1)+'.';
            const aporte = v.aporte_total > 0 ? ` · $${v.aporte_total} aportados` : '';
            return `${medal} ${v.nombre}${aporte}`;
        }).join('\n');
        alert(`Vistas (${vistas.length}):\n\n${lineas}`);
    } catch(e) { toast('Error al cargar vistas', 'error'); }
}

// ─── ENCUESTAS ───────────────────────────────────────────────
function agregarOpcion() {
    const cont = document.getElementById('enc-opciones');
    const inputs = cont.querySelectorAll('.enc-opcion');
    if (inputs.length >= 4) return;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'enc-opcion border border-c-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-c-accent transition-all';
    inp.placeholder = `Opcion ${inputs.length + 1}`;
    inp.maxLength = 100;
    cont.appendChild(inp);
    if (inputs.length + 1 >= 4) document.getElementById('btn-add-opcion').classList.add('hidden');
}

async function crearEncuesta() {
    const pregunta = document.getElementById('enc-pregunta').value.trim();
    const opciones = [...document.querySelectorAll('.enc-opcion')].map(i => i.value.trim()).filter(Boolean);
    if (!pregunta) { toast('Escribe la pregunta', 'error'); return; }
    if (opciones.length < 2) { toast('Agrega al menos 2 opciones', 'error'); return; }
    try {
        await candela._req('POST', '/api/encuestas', { pregunta, opciones });
        toast('Encuesta publicada', 'success');
        document.getElementById('enc-pregunta').value = '';
        document.querySelectorAll('.enc-opcion').forEach((el, i) => {
            if (i >= 2) el.remove(); else el.value = '';
        });
        document.getElementById('btn-add-opcion').classList.remove('hidden');
        cargarMisEncuestas();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

async function cargarMisEncuestas() {
    try {
        const lista = await candela._req('GET', '/api/encuestas/mis-encuestas');
        const el = document.getElementById('lista-encuestas');
        if (!lista.length) {
            el.innerHTML = '<p class="text-center text-c-soft text-sm py-8">Aun no tienes encuestas.</p>';
            return;
        }
        el.innerHTML = lista.map(e => {
            const barras = e.opciones.map((op, i) => {
                const pct = e.total_votos > 0 ? Math.round((e.conteo[i] / e.total_votos) * 100) : 0;
                return `<div class="mb-2">
                    <div class="flex justify-between text-[11px] mb-0.5">
                        <span class="font-medium text-c-text">${esc(op)}</span>
                        <span class="text-c-soft">${e.conteo[i]} (${pct}%)</span>
                    </div>
                    <div class="h-2 bg-c-champagne rounded-full overflow-hidden">
                        <div class="h-full bg-c-accent rounded-full transition-all" style="width:${pct}%"></div>
                    </div>
                </div>`;
            }).join('');
            return `<div class="px-5 py-4 border-b border-c-border last:border-0">
                <div class="flex items-start justify-between gap-2 mb-3">
                    <p class="text-sm font-semibold flex-1">${esc(e.pregunta)}</p>
                    ${e.activa
                        ? `<button data-on-click="cerrarEncuesta('${e.id}')" class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100 shrink-0">Cerrar</button>`
                        : '<span class="text-[10px] text-c-soft shrink-0">Cerrada</span>'}
                </div>
                ${barras}
                <p class="text-[10px] text-c-soft mt-2">${e.total_votos} voto${e.total_votos!==1?'s':''}</p>
            </div>`;
        }).join('');
    } catch(e) { console.error('cargarMisEncuestas:', e); }
}

async function cerrarEncuesta(id) {
    if (!confirm('Cerrar esta encuesta? Los fans ya no podran votar.')) return;
    try {
        await candela._req('DELETE', `/api/encuestas/${id}`);
        toast('Encuesta cerrada', 'success');
        cargarMisEncuestas();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

async function eliminarStory(id) {
    if (!confirm('Eliminar esta story?')) return;
    try {
        await candela._req('DELETE', `/api/stories/${id}`);
        toast('Story eliminada', 'success');
        cargarMisStories();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

// ─── ANALITICA ───────────────────────────────────────────────
async function cargarAnalitica() {
    try {
        const data = await candela.creadoras.analitica();
        document.getElementById('an-mes').textContent = '$' + (data.ingresos_mes || 0).toFixed(2);
        document.getElementById('an-subs-mes').textContent = data.subs_nuevas_mes || 0;
        _renderChartMensual(data.ingresos_por_mes || []);
        _renderChartBarras(data.ingresos_por_dia || []);
        _renderTopFans(data.top_fans || []);
    } catch(e) {
        document.getElementById('an-chart-empty').classList.remove('hidden');
        document.getElementById('an-chart-mes-empty').classList.remove('hidden');
    }
}

function _renderChartBarras(dias) {
    const canvas = document.getElementById('an-chart');
    if (!canvas) return;
    if (!dias.length) {
        canvas.classList.add('hidden');
        document.getElementById('an-chart-empty').classList.remove('hidden');
        return;
    }
    const ctx = canvas.getContext('2d');
    const W = canvas.parentElement.offsetWidth || 500;
    canvas.width = W; canvas.height = 120;
    const max = Math.max(...dias.map(d => d.total), 0.01);
    const N = dias.length;
    const barW = Math.max(4, Math.floor((W - 20) / N) - 2);
    const gap = Math.floor((W - 20) / N);
    ctx.clearRect(0, 0, W, 120);
    dias.forEach((d, i) => {
        const h = Math.max(3, Math.round((d.total / max) * 90));
        const x = 10 + i * gap;
        const y = 110 - h;
        // bar
        ctx.fillStyle = '#B5445C';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, h, 3) : ctx.rect(x, y, barW, h);
        ctx.fill();
        // value label on tallest bar
        if (d.total === max && max > 0) {
            ctx.fillStyle = '#B5445C';
            ctx.font = '10px DM Sans, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('$' + d.total.toFixed(0), x + barW / 2, y - 4);
        }
    });
    // x-axis dates (first and last)
    ctx.fillStyle = '#9B8E8A';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'left';
    if (dias[0]) ctx.fillText(dias[0].dia.slice(5), 10, 118);
    if (dias[dias.length-1]) {
        ctx.textAlign = 'right';
        ctx.fillText(dias[dias.length-1].dia.slice(5), W - 10, 118);
    }
}

function _renderChartMensual(meses) {
    const canvas = document.getElementById('an-chart-mes');
    if (!canvas) return;
    if (!meses.length) {
        canvas.classList.add('hidden');
        document.getElementById('an-chart-mes-empty').classList.remove('hidden');
        return;
    }
    const ctx = canvas.getContext('2d');
    const W = canvas.parentElement.offsetWidth || 500;
    canvas.width = W; canvas.height = 120;
    const max = Math.max(...meses.map(m => m.total), 0.01);
    const N = meses.length;
    const barW = Math.max(20, Math.floor((W - 40) / N) - 6);
    const gap = Math.floor((W - 40) / N);
    ctx.clearRect(0, 0, W, 120);
    const LABEL_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    meses.forEach((m, i) => {
        const h = Math.max(3, Math.round((m.total / max) * 85));
        const x = 20 + i * gap + (gap - barW) / 2;
        const y = 100 - h;
        ctx.fillStyle = '#F4A261';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barW, h, 4) : ctx.rect(x, y, barW, h);
        ctx.fill();
        // value on tallest
        if (m.total === max) {
            ctx.fillStyle = '#F4A261';
            ctx.font = 'bold 10px DM Sans, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('$' + m.total.toFixed(0), x + barW / 2, y - 4);
        }
        // month label
        const monthIdx = parseInt(m.mes.slice(5), 10) - 1;
        ctx.fillStyle = '#9B8E8A';
        ctx.font = '10px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(LABEL_NAMES[monthIdx] || m.mes.slice(5), x + barW / 2, 116);
    });
}

function _renderTopFans(fans) {
    const el = document.getElementById('an-top-fans');
    if (!fans.length) { el.innerHTML = '<p class="text-c-soft text-sm text-center py-4">Sin datos todavía.</p>'; return; }
    const max = fans[0].total;
    el.innerHTML = fans.map((f, i) => `
        <div class="flex items-center gap-3 py-2 ${i < fans.length-1 ? 'border-b border-c-border' : ''}">
            <span class="text-c-soft text-xs w-5 text-right">${i+1}</span>
            <div class="flex-1">
                <div class="text-sm font-semibold text-c-text">${esc(f.nombre)}</div>
                <div class="h-1.5 bg-c-bg rounded-full mt-1 overflow-hidden">
                    <div class="h-full rounded-full" style="width:${Math.round(f.total/max*100)}%;background:#B5445C"></div>
                </div>
            </div>
            <span class="text-sm font-bold text-c-accent">$${f.total.toFixed(2)}</span>
        </div>
    `).join('');
}

// ─── MIS MEDIOS ──────────────────────────────────────────────
async function cargarMisMedios() {
    const grid = document.getElementById('medios-grid');
    const empty = document.getElementById('medios-empty');
    try {
        const data = await candela._req('GET', '/api/contenido/mis-contenidos');
        const items = Array.isArray(data) ? data : (data.contenido || []);
        if (!items.length) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        grid.innerHTML = items.map(item => `
            <div class="relative rounded-xl overflow-hidden cursor-pointer group" style="aspect-ratio:1"
                data-url="${esc(_url(item.preview_url||''))}" data-on-click="copiarUrlMedio('${String(item.id).replace(/[^a-z0-9-]/gi,'')}',this.dataset.url)"
                title="Clic para copiar URL">
                ${item.preview_url
                    ? `<img src="${_url(item.preview_url)}" alt="" class="w-full h-full object-cover" draggable="false" data-on-contextmenu="return false">`
                    : `<div class="w-full h-full bg-c-bg flex items-center justify-center"><span class="ms text-c-soft" style="font-size:28px">${item.tipo==='video'?'videocam':'photo_camera'}</span></div>`
                }
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <span class="ms text-white opacity-0 group-hover:opacity-100 transition-opacity" style="font-size:22px">content_copy</span>
                </div>
                ${item.tipo==='video'?`<span class="absolute top-1.5 right-1.5 bg-black/60 rounded px-1 py-0.5"><span class="ms text-white" style="font-size:12px">videocam</span></span>`:''}
                ${item.precio>0?`<span class="absolute bottom-1.5 left-1.5 bg-c-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded">$${item.precio}</span>`:''}
            </div>
        `).join('');
    } catch(e) {
        grid.innerHTML = '<p class="col-span-4 text-center text-c-soft text-sm py-8">No se pudo cargar el contenido.</p>';
    }
}

function copiarUrlMedio(id, previewUrl) {
    const url = previewUrl || '';
    if (!url) { toast('Este elemento no tiene URL de vista previa', 'error'); return; }
    navigator.clipboard.writeText(url).then(() => {
        toast('URL copiada al portapapeles', 'success');
    }).catch(() => {
        toast('No se pudo copiar: ' + url);
    });
}
