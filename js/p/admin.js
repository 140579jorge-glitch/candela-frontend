async function init() {
    const user = candela.auth.user();
    if (!user || user.tipo !== 'admin') { window.location.href = '../index.html'; return; }
    document.getElementById('admin-email').textContent = user.nombre || user.email || 'Admin';
    // Mostrar seccion de admins solo a super_admin
    if (user.es_super_admin) {
        document.getElementById('nav-admins').style.display = '';
    }
    // Registrar estado inicial en history para que "atras" no salga del panel
    const secInicial = location.hash.replace('#', '') || 'dashboard';
    history.replaceState({section: secInicial}, '', '#' + secInicial);
    if (secInicial !== 'dashboard') _activarSeccion(secInicial);
    cargarTodo();
}

async function cargarTodo() {
    cargarDashboard();
    candela.admin.comprasPendientes().then(l => {
        document.getElementById('badge-pagos').textContent = l.length;
    }).catch(()=>{});
    candela.admin.depositosPendientes().then(l => {
        document.getElementById('badge-dep').textContent = l.length;
    }).catch(()=>{});
    if (document.getElementById('sec-verificaciones').classList.contains('active')) cargarVerificaciones();
    if (document.getElementById('sec-retiros').classList.contains('active')) cargarRetiros();
    if (document.getElementById('sec-pagos').classList.contains('active')) cargarPagosPPV();
    if (document.getElementById('sec-depositos').classList.contains('active')) cargarDepositos();
    if (document.getElementById('sec-propinas').classList.contains('active')) cargarPropinas();
    if (document.getElementById('sec-mensajes').classList.contains('active')) cargarMensajesAdmin();
}

async function cargarDashboard() {
    try {
        const d = await candela.admin.dashboard();
        document.getElementById('d-activas').textContent = d.creadoras_activas ?? '-';
        document.getElementById('d-pendientes').textContent = d.creadoras_pendientes ?? '-';
        document.getElementById('d-suscriptores').textContent = d.total_suscriptores ?? '-';
        document.getElementById('d-retiros').textContent = d.retiros_pendientes ?? '-';
        document.getElementById('d-verificaciones').textContent = d.verificaciones_pendientes ?? '-';
        document.getElementById('d-pagos').textContent = d.pagos_pendientes ?? '-';
        document.getElementById('d-depositos').textContent = d.depositos_pendientes ?? '-';
        document.getElementById('d-balance-fans').textContent = d.total_balance_fans != null ? `$${d.total_balance_fans.toFixed(2)}` : '-';
        document.getElementById('badge-ver').textContent = d.verificaciones_pendientes ?? 0;
        const bi = document.getElementById('badge-int'); if (bi) bi.textContent = d.interpretes_pendientes ?? 0;
        const bm = document.getElementById('badge-mod'); if (bm) bm.textContent = d.moderacion_pendiente ?? 0;
        document.getElementById('badge-ret').textContent = d.retiros_pendientes ?? 0;
        document.getElementById('badge-dep').textContent = d.depositos_pendientes ?? 0;
    } catch(e) { toast('Error al cargar dashboard: ' + (e.message || 'Error'), 'error'); }
}

async function cargarVerificaciones() {
    const cont = document.getElementById('lista-verificaciones');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.admin.verificacionesPendientes();
        if (!lista.length) {
            cont.innerHTML = '<div class="text-center py-12"><span class="ms" style="font-size:3rem;color:#FAF2F5">check_circle</span><p class="text-c-soft mt-2">Sin verificaciones pendientes</p></div>';
            return;
        }
        cont.innerHTML = lista.map(v => `
            <div class="ver-card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <p class="font-bold text-sm">${esc(v.nombre_artistico || v.email || v.creadora_id)}</p>
                            <span class="badge badge-pendiente">${esc(v.doc_tipo || 'CI')}</span>
                        </div>
                        <p class="text-xs text-c-soft mb-1">${esc(v.email || '')}</p>
                        <div class="bg-c-bg border border-c-border rounded-xl p-3 mb-3 grid grid-cols-2 gap-2">
                            <div>
                                <p class="text-[10px] font-bold text-c-soft uppercase tracking-wide">Nombre registrado en la cuenta</p>
                                <p class="text-sm font-bold text-c-text">${esc(v.nombre_real || 'Sin nombre registrado')}</p>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-c-soft uppercase tracking-wide">Fecha de nacimiento declarada</p>
                                <p class="text-sm font-bold text-c-text">${fmt_fecha(v.fecha_nacimiento_declarada)}</p>
                            </div>
                        </div>
                        <p class="text-xs text-c-soft mb-3">Enviado: ${fmt_fecha(v.fecha_solicitud)}</p>
                        <div class="flex gap-2 flex-wrap mb-4">
                            ${v.doc_imagen_url ? `<button data-url="${esc(v.doc_imagen_url)}" data-on-click="verImg(this.dataset.url)" class="text-xs font-bold text-c-accent border border-c-champagne px-3 py-1.5 rounded-full hover:bg-c-champagne transition-all flex items-center gap-1"><span class="ms" style="font-size:14px">badge</span>CI frente</button>` : ''}
                            ${v.doc_imagen_reverso_url ? `<button data-url="${esc(v.doc_imagen_reverso_url)}" data-on-click="verImg(this.dataset.url)" class="text-xs font-bold text-c-accent border border-c-champagne px-3 py-1.5 rounded-full hover:bg-c-champagne transition-all flex items-center gap-1"><span class="ms" style="font-size:14px">flip_to_back</span>CI dorso</button>` : ''}
                            ${v.selfie_url ? `<button data-url="${esc(v.selfie_url)}" data-on-click="verImg(this.dataset.url)" class="text-xs font-bold text-c-accent border border-c-champagne px-3 py-1.5 rounded-full hover:bg-c-champagne transition-all flex items-center gap-1"><span class="ms" style="font-size:14px">selfie</span>Selfie</button>` : ''}
                        </div>
                        <!-- Checklist KYC -->
                        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-1">
                            <p class="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-2">Checklist de revision</p>
                            <div class="flex flex-col gap-1.5" id="chk-${v.verificacion_id}">
                                <label class="flex items-center gap-2 text-xs text-c-text cursor-pointer">
                                    <input type="checkbox" class="kyc-check accent-green-500" data-id="${v.verificacion_id}">
                                    Documento legible, no vencido y sin alteraciones visibles
                                </label>
                                <label class="flex items-center gap-2 text-xs text-c-text cursor-pointer">
                                    <input type="checkbox" class="kyc-check accent-green-500" data-id="${v.verificacion_id}">
                                    Nombre en el documento coincide con el nombre de la cuenta
                                </label>
                                <label class="flex items-center gap-2 text-xs text-c-text cursor-pointer">
                                    <input type="checkbox" class="kyc-check accent-green-500" data-id="${v.verificacion_id}">
                                    Selfie tomada en ese momento (no foto de foto), cara visible
                                </label>
                                <label class="flex items-center gap-2 text-xs text-c-text cursor-pointer">
                                    <input type="checkbox" class="kyc-check accent-green-500" data-id="${v.verificacion_id}">
                                    Cara en selfie coincide con la foto del documento
                                </label>
                                <label class="flex items-center gap-2 text-xs text-c-text cursor-pointer">
                                    <input type="checkbox" class="kyc-check accent-green-500" data-id="${v.verificacion_id}">
                                    Persona aparenta ser mayor de edad
                                </label>
                            </div>
                            <p class="text-[11px] text-amber-600 mt-2 hidden" id="chk-warn-${v.verificacion_id}">Marca todos los puntos antes de aprobar.</p>
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button data-on-click="accionVer('${v.verificacion_id}','rechazar',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1">
                            <span class="ms" style="font-size:16px">close</span>Rechazar
                        </button>
                        <button data-on-click="intentarAprobarVer('${v.verificacion_id}',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1">
                            <span class="ms" style="font-size:16px">check</span>Aprobar
                        </button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar</p>'; }
}

async function cargarRetiros() {
    const cont = document.getElementById('lista-retiros');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.admin.retirosPendientes();
        if (!lista.length) {
            cont.innerHTML = '<div class="text-center py-12"><span class="ms" style="font-size:3rem;color:#FAF2F5">check_circle</span><p class="text-c-soft mt-2">Sin retiros pendientes</p></div>';
            return;
        }
        cont.innerHTML = lista.map(r => `
            <div class="ver-card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-sm mb-1">${esc(r.creadora || '?')}</p>
                        <div class="flex items-center gap-3 flex-wrap mb-2">
                            <span class="text-lg font-bold text-c-accent">$${(r.monto||0).toFixed(2)}</span>
                            <span class="text-xs text-c-soft">${r.metodo_red === 'qr' ? 'QR Pago' : r.metodo_red === 'polygon' ? 'USDT Polygon' : 'USDT TRC20'}</span>
                            ${r.creadora_pais ? `<span class="text-xs text-c-soft">&#183; ${esc(r.creadora_pais)}</span>` : ''}
                        </div>
                        <div class="bg-c-bg rounded-xl px-3 py-2 text-xs font-mono break-all text-c-text border border-c-border mb-2">
                            ${esc(r.wallet_destino || '-')}
                        </div>
                        <p class="text-xs text-c-soft">Solicitado: ${fmt_fecha(r.fecha_solicitud)}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button data-on-click="accionRet('${r.retiro_id}','rechazar',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1">
                            <span class="ms" style="font-size:16px">close</span>Rechazar
                        </button>
                        <button data-on-click="accionRet('${r.retiro_id}','procesar',this)" class="c-btn text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm">
                            <span class="ms" style="font-size:16px">send</span>Procesar
                        </button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar</p>'; }
}

function intentarAprobarVer(id, btn) {
    const checks = document.querySelectorAll(`#chk-${id} .kyc-check`);
    const todas = [...checks].every(c => c.checked);
    if (!todas) {
        document.getElementById(`chk-warn-${id}`).classList.remove('hidden');
        return;
    }
    accionVer(id, 'aprobar', btn);
}

async function accionVer(id, accion, btn) {
    if (accion === 'aprobar' && !confirm(`Aprobar esta verificacion? Esto activara a la creadora.`)) return;
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        const r = await candela.admin.revisarVerificacion(id, accion);
        toast(r.mensaje || 'Listo!', 'success');
        cargarVerificaciones();
        cargarDashboard();
    } catch(e) { toast(e.message, 'error'); btn.disabled=false; btn.style.opacity='1'; }
}

async function accionRet(id, accion, btn) {
    if (accion === 'procesar' && !confirm('Confirmar que ya enviaste el USDT a la creadora?')) return;
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        const r = await candela.admin.procesarRetiro(id, accion);
        toast(r.mensaje || 'Listo!', 'success');
        cargarRetiros();
        cargarDashboard();
    } catch(e) { toast(e.message, 'error'); btn.disabled=false; btn.style.opacity='1'; }
}

const API_BASE = 'https://api.clubcandela.com';

function verImg(url) {
    const src = url.startsWith('http') ? url : API_BASE + url;
    document.getElementById('modal-img-src').src = src;
    const modal = document.getElementById('modal-img');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function cerrarModalImg() {
    const modal = document.getElementById('modal-img');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('modal-img-src').src = '';
}

function _activarSeccion(sec) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + sec)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', !!n.getAttribute('data-on-click')?.includes("'" + sec + "'"));
    });
    window.scrollTo(0, 0);
    if (sec === 'verificaciones') cargarVerificaciones();
    if (sec === 'moderacion') cargarModeracion('pendiente');
    if (sec === 'interpretes') cargarInterpretes('pendiente');
    if (sec === 'retiros') cargarRetiros();
    if (sec === 'dashboard') cargarDashboard();
    if (sec === 'creadoras') cargarCreadoras();
    if (sec === 'pagos') cargarPagosPPV();
    if (sec === 'comisiones') cargarComisiones();
    if (sec === 'depositos') cargarDepositos();
    if (sec === 'propinas') cargarPropinas();
    if (sec === 'mensajes') cargarMensajesAdmin();
    if (sec === 'reclamos') cargarReclamos();
    if (sec === 'reportes-abuso') cargarReportesAbuso();
    if (sec === 'recargadores') cargarRecargadores();
    if (sec === 'admins') cargarAdmins();
    if (sec === 'calculadora') cargarTasasRecarga();
}

function mostrar(sec, navBtn) {
    history.pushState({section: sec}, '', '#' + sec);
    _activarSeccion(sec);
    document.getElementById('mobile-menu')?.classList.add('hidden');
}

function toggleMenuMobile() {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
}

window.addEventListener('popstate', e => {
    const sec = e.state?.section || 'dashboard';
    _activarSeccion(sec);
});

// ─── REGISTRO DE INTERPRETES ─────────────────────────────────
function _edadDe(iso) {
    if (!iso) return '?';
    const n = new Date(iso + 'T00:00:00'), h = new Date();
    return h.getFullYear() - n.getFullYear() - ((h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) ? 1 : 0);
}
async function cargarInterpretes(estado) {
    estado = estado || 'pendiente';
    ['pendiente', 'aprobado', 'rechazado', 'retirado'].forEach(e => {
        const b = document.getElementById('ifil-' + e);
        if (!b) return;
        b.classList.toggle('bg-c-accent', e === estado);
        b.classList.toggle('text-white', e === estado);
        b.classList.toggle('text-c-soft', e !== estado);
    });
    const cont = document.getElementById('lista-interpretes');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        if (estado !== 'pendiente') {
            const lista = await candela._req('GET', `/api/admin/interpretes?estado=${estado}`);
            const bd = document.getElementById('badge-int'); void bd;
            if (!lista.length) { cont.innerHTML = `<p class="text-c-soft text-sm text-center py-10">Sin registros ${esc(estado)}s</p>`; return; }
            cont.innerHTML = lista.map(i => `
                <div class="ver-card" id="int-${esc(i.id)}">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="min-w-0">
                            <p class="font-bold text-sm">${esc(i.nombre_legal || '(sin nombre)')} <span class="text-c-soft font-normal">con ${esc(i.creadora)}</span></p>
                            <p class="text-[11px] text-c-soft">${esc(i.codigo || '')} · ${i.firmado_en ? fmt_fecha(i.firmado_en) : ''}</p>
                        </div>
                        ${estado === 'aprobado' ? `<button data-on-click="retirarInterprete('${esc(i.id)}',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all">Retirar consentimiento</button>` : ''}
                    </div>
                </div>`).join('');
            return;
        }
        const lista = await candela._req('GET', '/api/admin/interpretes/pendientes');
        const bd = document.getElementById('badge-int');
        if (bd) bd.textContent = lista.length;
        if (!lista.length) {
            cont.innerHTML = '<div class="text-center py-12"><span class="ms" style="font-size:3rem;color:#FAF2F5">check_circle</span><p class="text-c-soft mt-2">Sin registros pendientes</p></div>';
            return;
        }
        const imagen = (url, etq) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="block"><p class="text-[10px] font-bold text-c-soft uppercase mb-1">${etq}</p><img src="${esc(url)}" alt="${etq}" class="w-full max-h-64 object-contain rounded-xl bg-c-bg border border-c-border"></a>` : '';
        cont.innerHTML = lista.map(i => `
            <div class="ver-card" id="int-${esc(i.id)}">
                <div class="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div class="min-w-0">
                        <p class="font-bold text-sm">${esc(i.nombre_legal)} <span class="text-c-soft font-normal">· ${_edadDe(i.fecha_nacimiento)} años</span></p>
                        <p class="text-xs text-c-soft">Invitada por <b>${esc(i.creadora)}</b>${i.alias_visible ? ' como "' + esc(i.alias_visible) + '"' : ''} · ${esc(i.email)}</p>
                        <p class="text-xs text-c-soft">Nacimiento ${esc(i.fecha_nacimiento)} · ${esc(i.doc_tipo)} · otros nombres: ${esc(i.otros_nombres || 'ninguno')}</p>
                        <p class="text-[11px] text-c-soft">${esc(i.codigo)} · firmado ${fmt_fecha(i.firmado_en)} · IP ${esc(i.firma_ip || '-')} · contenido en espera: ${i.contenidos_en_espera}</p>
                        ${i.pdf_url ? `<a href="${esc(i.pdf_url)}" target="_blank" rel="noopener" class="text-xs font-bold text-c-accent hover:underline">Ver contrato firmado (PDF)</a>` : ''}
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button data-on-click="revisarInterprete('${esc(i.id)}','rechazar',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1"><span class="ms" style="font-size:16px">close</span>Rechazar</button>
                        <button data-on-click="revisarInterprete('${esc(i.id)}','aprobar',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1"><span class="ms" style="font-size:16px">check</span>Aprobar</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${imagen(i.doc_url, 'Documento (frente)')}
                    ${imagen(i.reverso_url, 'Documento (reverso)')}
                    ${imagen(i.selfie_url, 'Selfie')}
                    ${imagen(i.firma_url, 'Firma')}
                </div>
            </div>`).join('');
    } catch (e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar</p>'; }
}

async function revisarInterprete(id, accion, btn) {
    let notas = '';
    if (accion === 'rechazar') {
        notas = (prompt('Motivo del rechazo (se le envía a la persona):') || '').trim();
        if (!notas) { toast('Escribe un motivo para rechazar', 'error'); return; }
    } else if (!confirm('¿Confirmas que el documento y la selfie corresponden a la misma persona, mayor de 18, y que los datos coinciden?')) {
        return;
    }
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        await candela._req('POST', `/api/admin/interpretes/${id}/revisar`, { accion, notas });
        toast(accion === 'aprobar' ? 'Registro aprobado' : 'Registro rechazado', 'success');
        document.getElementById('int-' + id)?.remove();
        const bd = document.getElementById('badge-int');
        if (bd && Number(bd.textContent) > 0) bd.textContent = Number(bd.textContent) - 1;
    } catch (e) { toast(e.message || 'Error', 'error'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function retirarInterprete(id, btn) {
    const motivo = (prompt('Retiro de consentimiento. Motivo o referencia de la solicitud (comprueba antes que quien escribe es la persona):') || '').trim();
    if (!motivo) { toast('Escribe el motivo', 'error'); return; }
    if (!confirm('Se dará de baja TODO el contenido y los packs con esta persona. El registro y sus archivos se conservan por ley. ¿Continuar?')) return;
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        const r = await candela._req('POST', `/api/admin/interpretes/${id}/retirar`, { motivo });
        toast(`Consentimiento retirado. Dados de baja: ${r.bajas}`, 'success');
        document.getElementById('int-' + id)?.remove();
    } catch (e) { toast(e.message || 'Error', 'error'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function cargarModeracionPacks(estado) {
    const cont = document.getElementById('lista-mod-packs');
    if (!cont) return;
    try {
        const lista = await candela._req('GET', `/api/admin/packs-moderacion?estado=${estado}&limit=50`);
        if (!lista.length) { cont.innerHTML = `<p class="text-c-soft text-sm text-center py-6">Sin packs ${estado === 'pendiente' ? 'pendientes de revisión' : 'rechazados'}</p>`; return; }
        cont.innerHTML = lista.map(p => {
            const miniaturas = (p.archivos || []).map(a => a.tipo === 'video'
                ? `<video src="${esc(a.url)}" controls preload="metadata" class="w-full h-32 object-cover rounded-lg bg-black"></video>`
                : `<a href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.url)}" alt="" class="w-full h-32 object-cover rounded-lg bg-c-bg"></a>`).join('');
            const quienes = (p.interpretes && p.interpretes.length) ? `Aparece con: ${p.interpretes.map(x => esc(x.alias) + ' (' + esc(x.estado) + ')').join(', ')}` : 'Declara que aparece solo ella';
            const botones = estado === 'pendiente'
                ? `<button data-on-click="moderarPack('${esc(p.id)}','rechazado',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all">Rechazar</button>
                   <button data-on-click="moderarPack('${esc(p.id)}','aprobado',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all">Aprobar</button>`
                : `<button data-on-click="moderarPack('${esc(p.id)}','aprobado',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all">Revertir y aprobar</button>`;
            return `<div class="ver-card" id="modpk-${esc(p.id)}">
                <div class="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div class="min-w-0">
                        <p class="font-bold text-sm">${esc(p.creadora_nombre)}</p>
                        <p class="text-xs text-c-soft">${esc(p.titulo)} · ${p.modo === 'venta' ? 'Venta' : 'PPV'} · $${Number(p.precio_base).toFixed(2)} · ${(p.archivos || []).length} archivo(s)</p>
                        <p class="text-xs text-c-soft">${quienes}</p>
                        ${p.mod_razon ? `<p class="text-xs text-red-500 mt-1">Motivo: ${esc(p.mod_razon)}</p>` : ''}
                    </div>
                    <div class="flex gap-2 shrink-0">${botones}</div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2">${miniaturas}</div>
            </div>`;
        }).join('');
    } catch (e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-6">Error al cargar los packs</p>'; }
}

async function moderarPack(id, estado, btn) {
    let razon = null;
    if (estado === 'rechazado') {
        razon = (prompt('Motivo del rechazo (la creadora lo verá):') || '').trim();
        if (!razon) { toast('Escribe un motivo para rechazar', 'error'); return; }
    }
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        await candela._req('PATCH', `/api/admin/packs/${id}/moderar`, { estado, razon });
        toast(estado === 'aprobado' ? 'Pack aprobado' : 'Pack rechazado', 'success');
        document.getElementById('modpk-' + id)?.remove();
    } catch (e) { toast(e.message || 'Error', 'error'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function cargarDmFotos() {
    const cont = document.getElementById('lista-dm-fotos');
    if (!cont) return;
    try {
        const lista = await candela._req('GET', '/api/admin/dm-fotos?dias=7&limit=60');
        if (!lista.length) { cont.innerHTML = '<p class="text-c-soft text-sm col-span-full text-center py-6">Sin fotos de chat en los últimos 7 días</p>'; return; }
        cont.innerHTML = lista.map(f => `
            <div class="ver-card" id="dm-${esc(f.id)}" style="padding:.6rem">
                <a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="" class="w-full h-40 object-cover rounded-lg bg-c-bg ${f.retirada ? 'opacity-30' : ''}"></a>
                <p class="text-xs font-bold mt-2 truncate">${esc(f.creadora_nombre)}</p>
                <p class="text-[11px] text-c-soft">${fmt_fecha(f.fecha)}${f.precio > 0 ? ' · $' + Number(f.precio).toFixed(0) : ''}</p>
                ${f.retirada ? '<p class="text-[11px] text-red-500 font-bold mt-1">Retirada</p>'
                             : `<button data-on-click="retirarDmFoto('${esc(f.id)}',this)" class="mt-2 w-full bg-red-50 text-red-500 border border-red-200 text-[11px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-100 transition-all">Retirar</button>`}
            </div>`).join('');
    } catch (e) { cont.innerHTML = '<p class="text-red-400 text-sm col-span-full text-center py-6">Error al cargar</p>'; }
}

async function retirarDmFoto(id, btn) {
    const motivo = (prompt('Motivo del retiro (la creadora lo verá):') || '').trim();
    if (!motivo) { toast('Escribe un motivo', 'error'); return; }
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        await candela._req('POST', `/api/admin/dm-fotos/${id}/retirar`, { motivo });
        toast('Foto retirada', 'success');
        cargarDmFotos();
    } catch (e) { toast(e.message || 'Error', 'error'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function cargarModeracion(estado) {
    estado = estado || 'pendiente';
    cargarModeracionPacks(estado);
    if (estado === 'pendiente') cargarDmFotos();
    ['pendiente', 'rechazado'].forEach(e => {
        const b = document.getElementById('mfil-' + e);
        if (!b) return;
        b.classList.toggle('bg-c-accent', e === estado);
        b.classList.toggle('text-white', e === estado);
        b.classList.toggle('text-c-soft', e !== estado);
    });
    const cont = document.getElementById('lista-moderacion');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela._req('GET', `/api/admin/contenido-pendiente?estado=${estado}&limit=50`);
        if (estado === 'pendiente') {
            const bd = document.getElementById('badge-mod');
            if (bd) bd.textContent = lista.length;
        }
        if (!lista.length) {
            cont.innerHTML = `<div class="text-center py-12"><span class="ms" style="font-size:3rem;color:#FAF2F5">check_circle</span><p class="text-c-soft mt-2">Sin contenido ${estado === 'pendiente' ? 'pendiente de revisión' : 'rechazado'}</p></div>`;
            return;
        }
        cont.innerHTML = lista.map(c => {
            const media = !c.archivo_url ? '<p class="text-xs text-c-soft">Sin archivo</p>'
                : c.tipo === 'video'
                    ? `<video src="${esc(c.archivo_url)}" controls preload="metadata" class="w-full max-h-80 rounded-xl bg-black"></video>`
                    : `<img src="${esc(c.archivo_url)}" alt="" class="w-full max-h-80 object-contain rounded-xl bg-c-bg">`;
            const acceso = c.es_gratis ? 'Muestra gratis' : (c.precio > 0 ? '$' + Number(c.precio).toFixed(2) + ' (PPV)' : 'Solo suscriptoras');
            const razon = c.mod_razon ? `<p class="text-xs text-red-500 mt-1">Motivo: ${esc(c.mod_razon)}</p>` : '';
            const quienes = (c.interpretes && c.interpretes.length) ? `<p class="text-xs text-c-soft mt-1">Aparece con: ${c.interpretes.map(x => esc(x.alias) + ' (' + esc(x.estado) + ')').join(', ')}</p>` : '<p class="text-xs text-c-soft mt-1">Declara que aparece solo ella</p>';
            const botones = estado === 'pendiente'
                ? `<button data-on-click="moderarContenido('${c.id}','rechazado',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1"><span class="ms" style="font-size:16px">close</span>Rechazar</button>
                   <button data-on-click="moderarContenido('${c.id}','aprobado',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1"><span class="ms" style="font-size:16px">check</span>Aprobar</button>`
                : `<button data-on-click="moderarContenido('${c.id}','aprobado',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1"><span class="ms" style="font-size:16px">undo</span>Revertir y aprobar</button>`;
            return `
            <div class="ver-card" id="mod-${c.id}">
                <div class="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div class="min-w-0">
                        <p class="font-bold text-sm">${esc(c.creadora_nombre)}</p>
                        <p class="text-xs text-c-soft">${esc(c.titulo || '(sin título)')} · ${esc(c.tipo)} · ${acceso}</p>
                        <p class="text-[11px] text-c-soft">${fmt_fecha(c.publicado_en)}</p>
                        ${razon}
                        ${quienes}
                    </div>
                    <div class="flex gap-2 shrink-0">${botones}</div>
                </div>
                ${media}
            </div>`;
        }).join('');
    } catch(e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar</p>'; }
}

async function moderarContenido(id, estado, btn) {
    let razon = null;
    if (estado === 'rechazado') {
        razon = (prompt('Motivo del rechazo (la creadora lo verá):') || '').trim();
        if (!razon) { toast('Escribe un motivo para rechazar', 'error'); return; }
    }
    btn.disabled = true; btn.style.opacity = '.5';
    try {
        await candela._req('PATCH', `/api/admin/contenido/${id}/moderar`, { estado, razon });
        toast(estado === 'aprobado' ? 'Contenido aprobado' : 'Contenido rechazado', 'success');
        document.getElementById('mod-' + id)?.remove();
        const bd = document.getElementById('badge-mod');
        if (bd && Number(bd.textContent) > 0) bd.textContent = Number(bd.textContent) - 1;
    } catch(e) { toast(e.message || 'Error', 'error'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function cargarDepositos() {
    const cont = document.getElementById('lista-depositos');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.admin.depositosPendientes();
        if (!lista.length) {
            cont.innerHTML = '<div class="text-center py-12"><span class="ms" style="font-size:3rem;color:#FAF2F5">check_circle</span><p class="text-c-soft mt-2">Sin depositos pendientes</p></div>';
            return;
        }
        cont.innerHTML = lista.map(d => `
            <div class="ver-card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-sm mb-1">${esc(d.usuario_nombre)} <span class="text-c-soft font-normal">${esc(d.usuario_email)}</span></p>
                        <div class="flex items-center gap-3 flex-wrap mb-2">
                            <span class="text-xl font-bold text-c-accent">$${(d.monto||0).toFixed(2)}</span>
                            ${d.monto_bonus > 0 ? `<span class="text-xs text-green-600 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">+$${d.monto_bonus.toFixed(2)} bonus</span>` : ''}
                            <span class="text-xs text-c-soft">${_labelMetodo(d.metodo_red)}</span>
                        </div>
                        <div class="bg-c-bg rounded-xl px-3 py-2 text-xs font-mono break-all text-c-text border border-c-border mb-1">
                            ${esc(d.referencia_pago||'-')}
                        </div>
                        <p class="text-[11px] text-c-soft">${fmt_fecha(d.fecha)}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button data-on-click="accionDeposito('${d.deposito_id}','rechazar',this)" class="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1">
                            <span class="ms" style="font-size:16px">close</span>Rechazar
                        </button>
                        <button data-on-click="accionDeposito('${d.deposito_id}','confirmar',this)" class="bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1">
                            <span class="ms" style="font-size:16px">check</span>Confirmar
                        </button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar</p>'; }
}

async function accionDeposito(id, accion, btn) {
    btn.disabled = true; btn.textContent = '...';
    try {
        await candela.admin.procesarDeposito(id, accion);
        toast(accion === 'confirmar' ? 'Deposito confirmado y saldo acreditado' : 'Deposito rechazado', accion === 'confirmar' ? 'success' : 'info');
        cargarDepositos();
        cargarDashboard();
    } catch(e) {
        toast(e.message || 'Error', 'error');
        btn.disabled = false; btn.textContent = accion === 'confirmar' ? 'Confirmar' : 'Rechazar';
    }
}

async function cargarPropinas() {
    const lista = document.getElementById('lista-propinas');
    try {
        const propinas = await candela.admin.propinasPendientes();
        document.getElementById('badge-prop').textContent = propinas.length;
        if (!propinas.length) { lista.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Sin propinas registradas</p>'; return; }
        lista.innerHTML = propinas.map(p => `
            <div class="bg-white border border-c-border rounded-2xl p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <p class="font-bold text-base">${esc(p.remitente_nombre)} <span class="font-normal text-c-soft text-sm">&rarr;</span> ${esc(p.creadora_nombre)}</p>
                        <p class="text-xs text-c-soft">${esc(p.remitente_email)}</p>
                        ${p.mensaje ? `<p class="text-sm text-c-text italic mt-1">"${esc(p.mensaje)}"</p>` : ''}
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-bold text-xl text-c-accent">$${p.monto.toFixed(2)}</p>
                        <p class="text-xs text-c-soft">Para creadora: $${p.monto_creadora.toFixed(2)}</p>
                    </div>
                </div>
                <div class="bg-c-bg rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2">
                    <span class="ms text-c-soft" style="font-size:16px">tag</span>
                    <span class="font-mono text-xs break-all">${esc(p.referencia_pago || '—')}</span>
                    <span class="ml-auto bg-c-border rounded px-2 py-0.5 text-[10px] font-bold text-c-soft">${p.metodo_red || 'trc20'}</span>
                </div>
                <div class="flex items-center gap-2 pt-1">
                    <span class="ms text-green-500" style="font-size:16px">check_circle</span>
                    <span class="text-xs text-green-600 font-semibold">Procesada automaticamente</span>
                    <span class="ml-auto text-xs text-c-soft">${p.fecha ? new Date(p.fecha).toLocaleDateString('es-BO') : ''}</span>
                </div>
            </div>
        `).join('');
    } catch(e) { lista.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Error al cargar</p>'; }
}


async function cargarMensajesAdmin() {
    const lista = document.getElementById('lista-mensajes');
    try {
        const mensajes = await candela.admin.mensajesPendientes();
        document.getElementById('badge-msg').textContent = mensajes.length;
        if (!mensajes.length) { lista.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Sin mensajes registrados</p>'; return; }
        lista.innerHTML = mensajes.map(m => `
            <div class="bg-white border border-c-border rounded-2xl p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <p class="font-bold text-base">${esc(m.remitente_nombre)} <span class="font-normal text-c-soft text-sm">&rarr;</span> ${esc(m.creadora_nombre)}</p>
                        <p class="text-xs text-c-soft">${esc(m.remitente_email)}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-bold text-xl text-c-accent">$${(m.monto||0).toFixed(2)}</p>
                    </div>
                </div>
                <div class="bg-c-bg rounded-xl px-4 py-2.5 mb-2 text-sm text-c-text">${esc(m.contenido_preview)}</div>
                <div class="bg-c-bg rounded-xl px-4 py-2 mb-3 flex items-center gap-2">
                    <span class="font-mono text-xs break-all">${esc(m.referencia_pago || '—')}</span>
                    <span class="ml-auto bg-c-border rounded px-2 py-0.5 text-[10px] font-bold text-c-soft">${m.metodo_red || 'trc20'}</span>
                </div>
                <div class="flex items-center gap-2 pt-1">
                    <span class="ms text-green-500" style="font-size:16px">check_circle</span>
                    <span class="text-xs text-green-600 font-semibold">Procesado automaticamente</span>
                    <span class="ml-auto text-xs text-c-soft">${m.fecha ? new Date(m.fecha).toLocaleDateString('es-BO') : ''}</span>
                </div>
            </div>
        `).join('');
    } catch(e) { lista.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Error al cargar</p>'; }
}


async function cargarCreadoras() {
    const cont = document.getElementById('lista-creadoras');
    cont.innerHTML = '<p class="col-span-3 text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.creadoras.explorar();
        if (!lista.length) { cont.innerHTML = '<p class="col-span-3 text-c-soft text-sm text-center py-8">Sin creadoras aun</p>'; return; }
        cont.innerHTML = lista.map(c => `
            <div class="bg-white border border-c-border rounded-2xl p-4">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">
                        ${(c.nombre_artistico||'?')[0].toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-sm truncate">${esc(c.nombre_artistico)}</p>
                        <p class="text-xs text-c-soft">${esc(c.pais || '-')}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="badge badge-${c.estado||'pendiente'}">${c.estado||'pendiente'}</span>
                    <a href="creadora.html?slug=${c.slug}" target="_blank" class="text-xs text-c-soft hover:text-c-accent transition-colors flex items-center gap-0.5">
                        <span class="ms" style="font-size:14px">open_in_new</span>Ver
                    </a>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="col-span-3 text-red-400 text-sm text-center py-8">Error al cargar creadoras</p>'; }

    // Creadoras pendientes
    const pendCont = document.getElementById('lista-creadoras-pendientes');
    try {
        const pendientes = await candela.admin.creadoras_pendientes();
        if (!pendientes.length) { pendCont.innerHTML = '<p class="text-c-soft text-sm text-center py-4">Sin creadoras pendientes</p>'; return; }
        pendCont.innerHTML = pendientes.map(c => `
            <div class="bg-white border border-c-border rounded-2xl p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style="background:linear-gradient(135deg,#c9b9b4,#a89898)">
                    ${(c.nombre_artistico||'?')[0].toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm">${esc(c.nombre_artistico)}</p>
                    <p class="text-xs text-c-soft">${esc(c.email)} &bull; ${esc(c.pais||'-')}</p>
                </div>
                <span class="badge badge-${c.estado}">${c.estado}</span>
            </div>`).join('');
    } catch(e) { pendCont.innerHTML = '<p class="text-red-400 text-sm text-center py-4">Error al cargar pendientes</p>'; }
}

async function cargarPagosPPV() {
    const cont = document.getElementById('lista-pagos');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.admin.comprasPendientes();
        document.getElementById('badge-pagos').textContent = lista.length;
        if (!lista.length) {
            cont.innerHTML = '<div class="text-center py-12"><span class="ms" style="font-size:3rem;color:#FAF2F5">check_circle</span><p class="text-c-soft mt-2">Sin pagos PPV pendientes</p></div>';
            return;
        }
        cont.innerHTML = lista.map(p => `
            <div class="bg-white border border-c-border rounded-2xl p-4" id="pago-${p.compra_id}">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="flex-1">
                        <p class="font-bold text-sm">${esc(p.creadora_nombre)} &mdash; ${esc(p.titulo_contenido||'Sin titulo')}</p>
                        <p class="text-xs text-c-soft mt-0.5">Suscriptor: ${esc(p.suscriptor_email)}</p>
                        <p class="text-xs text-c-soft mt-0.5">Monto: <strong>$${p.monto} USDT</strong></p>
                        <p class="text-xs text-c-soft mt-0.5 font-mono break-all">Hash: ${esc(p.referencia_pago)}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button data-on-click="accionPago('${p.compra_id}','confirmar')" class="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm" style="background:#2ecc71">Confirmar</button>
                        <button data-on-click="accionPago('${p.compra_id}','rechazar')" class="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm" style="background:#e74c3c">Rechazar</button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Error al cargar pagos</p>'; }
}

async function accionPago(id, accion) {
    try {
        await candela.admin.confirmarCompra(id, accion);
        document.getElementById('pago-'+id)?.remove();
        toast(accion === 'confirmar' ? 'Pago confirmado - acceso activado' : 'Pago rechazado', accion === 'confirmar' ? 'success' : 'error');
        const actual = parseInt(document.getElementById('badge-pagos').textContent) - 1;
        document.getElementById('badge-pagos').textContent = Math.max(0, actual);
    } catch(e) { toast(e.message, 'error'); }
}

let _comOffset = 0;
const _comLimit = 20;

async function cargarComisiones() {
    _comOffset = 0;
    await _fetchComisiones();
}

async function comPaginar(dir) {
    _comOffset = Math.max(0, _comOffset + dir * _comLimit);
    await _fetchComisiones();
}

async function _fetchComisiones() {
    const tipo = document.getElementById('fil-tipo')?.value || '';
    const params = { limit: _comLimit, offset: _comOffset };
    if (tipo) params.tipo = tipo;
    const tabla = document.getElementById('com-tabla');
    tabla.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-c-soft text-sm">Cargando...</td></tr>';
    try {
        const d = await candela.admin.comisiones(params);
        document.getElementById('com-total-ingreso').textContent = `$${(d.total_ingreso_candela||0).toFixed(2)}`;
        document.getElementById('com-total').textContent = d.total ?? '-';
        if (!d.comisiones?.length) {
            tabla.innerHTML = '';
            document.getElementById('com-vacio').classList.remove('hidden');
            document.getElementById('com-paginacion').classList.add('hidden');
            return;
        }
        document.getElementById('com-vacio').classList.add('hidden');
        tabla.innerHTML = d.comisiones.map(c => `
            <tr class="border-b border-c-border hover:bg-c-bg transition-colors">
                <td class="px-4 py-3 text-xs text-c-soft whitespace-nowrap">${fmt_fecha(c.fecha)}</td>
                <td class="px-4 py-3"><span class="badge ${c.tipo==='suscripcion'?'badge-activa':'badge-pendiente'}">${esc(c.tipo)}</span></td>
                <td class="px-4 py-3">
                    <p class="font-semibold text-xs">${esc(c.creadora_nombre||'-')}</p>
                    <p class="text-[10px] text-c-soft">${esc(c.creadora_pais||'')}</p>
                </td>
                <td class="px-4 py-3 text-xs text-c-soft">${esc(c.suscriptor_nombre||'-')}</td>
                <td class="px-4 py-3 text-right text-xs font-mono tabular-nums">$${(c.monto_bruto||0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-xs font-mono tabular-nums font-bold" style="color:#9B72CF">$${(c.monto_comision||0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-xs font-mono tabular-nums font-bold text-c-accent">$${(c.monto_creadora||0).toFixed(2)}</td>
            </tr>`).join('');
        const total = d.total || 0;
        const pag = document.getElementById('com-paginacion');
        if (total > _comLimit) {
            pag.classList.remove('hidden');
            const desde = _comOffset + 1;
            const hasta = Math.min(_comOffset + _comLimit, total);
            document.getElementById('com-pag-info').textContent = `${desde}–${hasta} de ${total}`;
            document.getElementById('com-pag-prev').disabled = _comOffset === 0;
            document.getElementById('com-pag-next').disabled = _comOffset + _comLimit >= total;
        } else {
            pag.classList.add('hidden');
        }
    } catch(e) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-400 text-sm">Error al cargar comisiones</td></tr>';
    }
}

function _labelMetodo(red) {
    const m = {
        trc20:   'USDT TRC20',
        polygon: 'USDT Polygon',
    };
    return m[red] || (red ? esc(red.toUpperCase()) : 'USDT');
}

function fmt_fecha(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function toast(msg, tipo='info') {
    const c = document.getElementById('toasts');
    const col = { error:'#e74c3c', success:'#2ecc71', info:'#B5445C' };
    const el = document.createElement('div');
    el.style.cssText = `background:#fff;border:1px solid #F5E8EF;border-left:4px solid ${col[tipo]||col.info};padding:.8rem 1rem;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.09);font-size:.85rem;max-width:300px;pointer-events:auto;opacity:0;transform:translateX(100%);transition:all .25s ease;`;
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateX(0)'; });
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(100%)'; setTimeout(()=>el.remove(),300); }, 3800);
}

// RECLAMOS
let _reclamosFiltro = '';
async function cargarReclamos(filtro) {
    if (filtro !== undefined) _reclamosFiltro = filtro;
    const cont = document.getElementById('lista-reclamos');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const qs = _reclamosFiltro ? `?estado=${_reclamosFiltro}` : '';
        const lista = await candela._req('GET', `/api/admin/reclamos${qs}`);
        document.getElementById('badge-rec').textContent = lista.filter(r => r.estado === 'nuevo').length;
        if (!lista.length) { cont.innerHTML = '<p class="text-c-soft text-sm text-center py-12">Sin reclamos</p>'; return; }
        const LABS = { cobro_no_autorizado:'Cobro no autorizado', contenido_no_recibido:'Contenido no recibido', acceso_denegado:'Acceso denegado', stream_problema:'Problema con stream', pago_no_acreditado:'Pago no acreditado', otro:'Otro' };
        const BCLS = { nuevo:'badge-pendiente', en_revision:'badge-aprobada', resuelto:'badge-activa', rechazado:'badge-rechazada' };
        cont.innerHTML = lista.map(r => `
            <div class="ver-card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <p class="font-bold text-sm">${esc(r.usuario_email||r.usuario_id)}</p>
                            <span class="badge ${BCLS[r.estado]||'badge-pendiente'}">${esc(r.estado)}</span>
                        </div>
                        <p class="text-xs text-c-soft mb-1">${LABS[r.tipo_reclamo]||esc(r.tipo_reclamo)} ${r.referencia_id ? '— Ref: '+esc(r.referencia_id) : ''}</p>
                        <p class="text-sm text-c-text leading-relaxed mb-2">${esc(r.descripcion)}</p>
                        ${r.notas_admin ? `<p class="text-xs text-indigo-700 font-semibold">Respuesta admin: ${esc(r.notas_admin)}</p>` : ''}
                        <p class="text-[11px] text-c-soft mt-1">${r.fecha ? new Date(r.fecha).toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}) : ''}</p>
                    </div>
                    <div class="flex flex-col gap-2 shrink-0 min-w-[180px]">
                        <select id="sel-est-${r.id}" class="text-xs border border-c-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-c-accent">
                            <option value="nuevo" ${r.estado==='nuevo'?'selected':''}>Nuevo</option>
                            <option value="en_revision" ${r.estado==='en_revision'?'selected':''}>En revision</option>
                            <option value="resuelto" ${r.estado==='resuelto'?'selected':''}>Resuelto</option>
                            <option value="rechazado" ${r.estado==='rechazado'?'selected':''}>Rechazado</option>
                        </select>
                        <input id="nota-${r.id}" type="text" value="${esc(r.notas_admin||'')}" placeholder="Nota para el usuario..." class="text-xs border border-c-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-c-accent">
                        <button data-on-click="actualizarReclamo('${r.id}', this)" class="c-btn text-white text-xs font-bold px-3 py-1.5 rounded-xl">Guardar</button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar reclamos</p>'; }
}

function filtrarReclamos(estado) {
    _reclamosFiltro = estado;
    ['todos','nuevo','en_revision','resuelto'].forEach(k => {
        const btn = document.getElementById('rfil-'+k);
        if (!btn) return;
        if ((k === 'todos' && estado === '') || k === estado) {
            btn.classList.add('bg-c-accent','text-white'); btn.classList.remove('text-c-soft');
        } else {
            btn.classList.remove('bg-c-accent','text-white'); btn.classList.add('text-c-soft');
        }
    });
    cargarReclamos();
}

async function actualizarReclamo(id, btn) {
    btn.disabled = true; btn.textContent = '...';
    const estado = document.getElementById('sel-est-'+id).value;
    const notas = document.getElementById('nota-'+id).value.trim();
    try {
        await candela._req('POST', `/api/admin/reclamos/${id}`, { estado, notas: notas || null });
        toast('Reclamo actualizado', 'success');
        cargarReclamos();
    } catch(e) { toast(e.message||'Error', 'error'); btn.disabled=false; btn.textContent='Guardar'; }
}

let _reportesAbusoFiltro = '';
async function cargarReportesAbuso(filtro) {
    if (filtro !== undefined) _reportesAbusoFiltro = filtro;
    const cont = document.getElementById('lista-reportes-abuso');
    cont.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const qs = _reportesAbusoFiltro ? `?estado=${_reportesAbusoFiltro}` : '';
        const lista = await candela._req('GET', `/api/admin/reportes-abuso${qs}`);
        const badge = document.getElementById('badge-reportes');
        if (badge) badge.textContent = lista.filter(r => r.estado === 'pendiente').length;
        if (!lista.length) { cont.innerHTML = '<p class="text-c-soft text-sm text-center py-12">Sin reportes</p>'; return; }
        const LABS = { ncii:'Retiro de contenido intimo (48 h)', menor:'Menor de edad', 'no-consensual':'No consensual', violencia:'Violencia real', identidad:'Identidad falsa', acoso:'Acoso / Extorsion', otro:'Otro' };
        const BCLS = { pendiente:'badge-pendiente', en_revision:'badge-aprobada', resuelto:'badge-activa', descartado:'badge-rechazada' };
        cont.innerHTML = lista.map(r => `
            <div class="ver-card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <p class="font-bold text-sm">${LABS[r.tipo]||esc(r.tipo)}</p>
                            <span class="badge ${BCLS[r.estado]||'badge-pendiente'}">${esc(r.estado)}</span>
                            ${r.tipo === 'menor' ? '<span class="badge badge-rechazada">PRIORIDAD</span>' : ''}
                            ${r.tipo === 'ncii' && r.fecha_limite && r.estado !== 'resuelto' && r.estado !== 'descartado' ? `<span class="badge badge-rechazada">${(() => { const h = Math.round((new Date(r.fecha_limite) - Date.now()) / 3600000); return h >= 0 ? 'Quedan ' + h + ' h' : 'VENCIDO hace ' + (-h) + ' h'; })()}</span>` : ''}
                        </div>
                        <p class="text-xs text-c-soft mb-1 break-all">${esc(r.url)}</p>
                        <p class="text-sm text-c-text leading-relaxed mb-2">${esc(r.descripcion)}</p>
                        ${r.email_contacto ? `<p class="text-xs text-c-soft">Contacto: ${esc(r.email_contacto)}</p>` : ''}
                        ${r.notas_admin ? `<p class="text-xs text-indigo-700 font-semibold mt-1">Nota interna: ${esc(r.notas_admin)}</p>` : ''}
                        <p class="text-[11px] text-c-soft mt-1">${r.fecha ? new Date(r.fecha).toLocaleString('es',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</p>
                    </div>
                    <div class="flex flex-col gap-2 shrink-0 min-w-[180px]">
                        <select id="sel-ra-${r.id}" class="text-xs border border-c-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-c-accent">
                            <option value="pendiente" ${r.estado==='pendiente'?'selected':''}>Pendiente</option>
                            <option value="en_revision" ${r.estado==='en_revision'?'selected':''}>En revision</option>
                            <option value="resuelto" ${r.estado==='resuelto'?'selected':''}>Resuelto</option>
                            <option value="descartado" ${r.estado==='descartado'?'selected':''}>Descartado</option>
                        </select>
                        <input id="nota-ra-${r.id}" type="text" value="${esc(r.notas_admin||'')}" placeholder="Nota interna..." class="text-xs border border-c-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-c-accent">
                        <button data-on-click="actualizarReporteAbuso('${r.id}', this)" class="c-btn text-white text-xs font-bold px-3 py-1.5 rounded-xl">Guardar</button>
                    </div>
                </div>
            </div>`).join('');
    } catch(e) { cont.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Error al cargar reportes</p>'; }
}

function filtrarReportesAbuso(estado) {
    _reportesAbusoFiltro = estado;
    ['todos','pendiente','en_revision','resuelto'].forEach(k => {
        const btn = document.getElementById('rafil-'+k);
        if (!btn) return;
        if ((k === 'todos' && estado === '') || k === estado) {
            btn.classList.add('bg-c-accent','text-white'); btn.classList.remove('text-c-soft');
        } else {
            btn.classList.remove('bg-c-accent','text-white'); btn.classList.add('text-c-soft');
        }
    });
    cargarReportesAbuso();
}

async function actualizarReporteAbuso(id, btn) {
    btn.disabled = true; btn.textContent = '...';
    const estado = document.getElementById('sel-ra-'+id).value;
    const notas_admin = document.getElementById('nota-ra-'+id).value.trim();
    try {
        await candela._req('PATCH', `/api/admin/reportes-abuso/${id}`, { estado, notas_admin: notas_admin || null });
        toast('Reporte actualizado', 'success');
        cargarReportesAbuso();
    } catch(e) { toast(e.message||'Error', 'error'); btn.disabled=false; btn.textContent='Guardar'; }
}

async function ejecutarMantenimiento() {
    if (!confirm('Aplicar comision de inactividad a creadoras sin retiro en 90+ dias?\nEsta accion es irreversible.')) return;
    try {
        const r = await candela._req('POST', '/api/admin/run-maintenance', {});
        toast(`Mantenimiento: ${r.creadoras_cobradas} creadoras, $${(r.total_fee_cobrado||0).toFixed(2)} cobrado`, 'success');
    } catch(e) { toast(e.message||'Error en mantenimiento', 'error'); }
}

async function cargarRecargadores() {
    const c = document.getElementById('lista-recargadores');
    c.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.admin.listarRecargadores();
        if (!lista.length) { c.innerHTML = '<p class="text-c-soft text-sm text-center py-8">No hay recargadores registrados.</p>'; return; }
        c.innerHTML = lista.map(r => `
            <div class="card p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-c-champagne flex items-center justify-center shrink-0">
                    <span class="ms text-base text-c-accent">bolt</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-c-text text-sm">${esc(r.nombre || r.email)}</p>
                    <p class="text-xs text-c-soft">${esc(r.email)}</p>
                    <div class="flex gap-4 mt-1">
                        <span class="text-xs text-c-soft">Recargador: <strong class="text-c-accent">$${r.balance_recargador.toFixed(2)}</strong></span>
                        <span class="text-xs text-c-soft">Consumo: <strong>$${r.balance_consumo.toFixed(2)}</strong></span>
                    </div>
                </div>
                <button data-email="${esc(r.email)}" data-on-click="revocarRecargador('${r.id}',this.dataset.email)" class="text-xs text-red-400 hover:text-red-600 font-bold border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-xl transition-all">Revocar</button>
            </div>`).join('');
    } catch(e) { c.innerHTML = `<p class="text-red-400 text-sm text-center py-8">${e.message}</p>`; }
}

async function aprobarRecargador() {
    const email = document.getElementById('rec-email-new').value.trim();
    if (!email) { toast('Ingresa un email', 'error'); return; }
    try {
        await candela._req('POST', '/api/admin/recargadores/por-email', { email, es_recargador: true });
        toast(`${email} aprobado como recargador`, 'success');
        document.getElementById('rec-email-new').value = '';
        cargarRecargadores();
    } catch(e) { toast(e.message || 'Error al aprobar', 'error'); }
}

async function revocarRecargador(id, email) {
    if (!confirm(`Revocar acceso de recargador a ${email}?`)) return;
    try {
        await candela.admin.toggleRecargador(id, false);
        toast(`Acceso revocado para ${email}`, 'success');
        cargarRecargadores();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

async function buscarCodigoRecarga() {
    const input = document.getElementById('dm-codigo');
    const info = document.getElementById('dm-codigo-info');
    const codigo = input.value.trim().toUpperCase();
    input.value = codigo;
    if (!codigo) { info.classList.add('hidden'); return; }
    info.className = 'mt-2 p-3 rounded-xl text-xs bg-c-champagne text-c-soft';
    info.textContent = 'Buscando...';
    try {
        const d = await candela.admin.buscarCodigoRecarga(codigo);
        if (d.codigo_usado) {
            info.className = 'mt-2 p-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-800';
            info.innerHTML = `⚠ Este código ya fue usado el ${new Date(d.codigo_usado).toLocaleString('es')}. Verificá con el fan antes de acreditar de nuevo.`;
        } else if (d.codigo_expirado) {
            info.className = 'mt-2 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700';
            info.innerHTML = `⚠ Código vencido (generado el ${new Date(d.codigo_generado).toLocaleString('es')}). Pedile uno nuevo al fan.`;
        } else {
            info.className = 'mt-2 p-3 rounded-xl text-xs bg-green-50 border border-green-200 text-green-800';
            info.innerHTML = `✓ <strong>${esc(d.nombre || 'Sin nombre')}</strong> — ${esc(d.email)}<br>Tipo: ${esc(d.tipo)} · Balance actual: $${d.balance_actual.toFixed(2)} · ${d.activo ? 'Cuenta activa' : '⚠ Cuenta inactiva'}`;
            document.getElementById('dm-email').value = d.email;
        }
        info.classList.remove('hidden');
    } catch(e) {
        info.className = 'mt-2 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700';
        info.textContent = e.message === 'Codigo no encontrado' ? 'Código no encontrado — revisá que esté bien copiado.' : (e.message || 'Error al buscar el código');
        info.classList.remove('hidden');
    }
}

async function procesarDepositoManual() {
    const email = document.getElementById('dm-email').value.trim();
    const monto = parseFloat(document.getElementById('dm-monto').value);
    const nota = document.getElementById('dm-nota').value.trim();
    const codigo = document.getElementById('dm-codigo').value.trim().toUpperCase();
    if (!email || !monto || monto <= 0) { toast('Completa email y monto', 'error'); return; }
    if (!isFinite(monto)) { toast('Monto invalido', 'error'); return; }
    if (!confirm(`Acreditar $${monto.toFixed(2)} a ${email}?`)) return;
    let montoAlto = false;
    if (monto > 500) {
        if (!confirm(`ATENCION: $${monto.toFixed(2)} es un monto alto. ¿Comprobaste que ese dinero entró de verdad a la cuenta y que no es un error de tipeo?`)) return;
        montoAlto = true;
    }
    const btn = document.getElementById('btn-dm');
    btn.disabled = true; btn.textContent = 'Procesando...';
    try {
        const r = await candela.admin.depositoManual(email, monto, nota || null, codigo || null, montoAlto);
        document.getElementById('dm-resultado').classList.remove('hidden');
        document.getElementById('dm-resultado').textContent =
            `✓ Acreditado $${r.monto_acreditado.toFixed(2)} a ${r.email}. Balance nuevo: $${r.balance_nuevo.toFixed(2)}`;
        document.getElementById('dm-email').value = '';
        document.getElementById('dm-monto').value = '';
        document.getElementById('dm-nota').value = '';
        document.getElementById('dm-codigo').value = '';
        document.getElementById('dm-codigo-info').classList.add('hidden');
        toast('Credito acreditado correctamente', 'success');
    } catch(e) { toast(e.message || 'Error al acreditar', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Acreditar Credito'; }
}

async function cargarTasasRecarga() {
    try {
        const d = await candela.wallet.tasasRecarga();
        document.getElementById('calc-fee').value = d.fee_fijo;
        document.getElementById('calc-margen').value = d.margen_pct;
        Object.entries(d.paises).forEach(([pais, info]) => {
            const card = document.querySelector(`[data-pais="${pais}"]`);
            if (card) card.querySelector('.calc-tasa').value = info.tasa;
        });
        calcularRecargas();
    } catch (e) {
        toast('No se pudieron cargar las tasas guardadas, mostrando valores locales', 'error');
        calcularRecargas();
    }
}

async function guardarTasasRecarga() {
    const btn = document.getElementById('btn-guardar-tasas');
    const estado = document.getElementById('tasas-estado');
    btn.disabled = true; btn.textContent = 'Guardando...';
    const tasas = [...document.querySelectorAll('[data-pais]')].map(card => ({
        pais: card.dataset.pais,
        tasa: parseFloat(card.querySelector('.calc-tasa').value) || 0,
    }));
    try {
        await candela.admin.actualizarTasasRecarga(tasas);
        estado.textContent = '✓ Guardado — el fan ya ve estas tasas';
        estado.className = 'text-xs text-green-700 font-semibold';
        toast('Tasas actualizadas', 'success');
    } catch (e) {
        estado.textContent = '✗ Error al guardar: ' + (e.message || '');
        estado.className = 'text-xs text-red-600 font-semibold';
        toast(e.message || 'Error al guardar tasas', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar tasas del día';
    }
}

function calcPreset(v) {
    document.getElementById('calc-monto').value = v;
    calcularRecargas();
}

function calcularRecargas() {
    const monto = parseFloat(document.getElementById('calc-monto').value) || 0;
    const fee = parseFloat(document.getElementById('calc-fee').value) || 0;
    const margen = parseFloat(document.getElementById('calc-margen').value) || 0;
    const totalUsdEquiv = (monto + fee) * (1 + margen / 100);

    document.querySelectorAll('[data-pais]').forEach(card => {
        const tasa = parseFloat(card.querySelector('.calc-tasa').value) || 0;
        const montoLocal = totalUsdEquiv * tasa;
        const decimals = tasa > 100 ? 0 : 2;
        card.querySelector('.calc-resultado').textContent = montoLocal.toLocaleString('es', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    });
}

async function cargarAdmins() {
    const c = document.getElementById('lista-admins');
    c.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Cargando...</p>';
    try {
        const lista = await candela.admin.listarAdmins();
        if (!lista.length) { c.innerHTML = '<p class="text-c-soft text-sm text-center py-8">Sin admins adicionales.</p>'; return; }
        const user = candela.auth.user();
        c.innerHTML = lista.map(a => `
            <div class="card p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">
                    ${(a.nombre||'A')[0].toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm">${esc(a.nombre)} ${a.es_super_admin ? '<span class="badge badge-pendiente ml-1">SUPER</span>' : ''}</p>
                    <p class="text-xs text-c-soft">${esc(a.email)}</p>
                    <p class="text-xs text-c-soft">Ultimo acceso: ${a.ultimo_acceso ? new Date(a.ultimo_acceso).toLocaleDateString('es-BO') : 'Nunca'}</p>
                </div>
                ${!a.es_super_admin && a.id !== (user && user.id) ? `
                <button data-email="${esc(a.email)}" data-on-click="revocarAdmin('${a.id}',this.dataset.email)" class="text-xs text-red-400 hover:text-red-600 font-bold border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-xl transition-all shrink-0">Revocar</button>
                ` : ''}
            </div>`).join('');
    } catch(e) { c.innerHTML = `<p class="text-red-400 text-sm text-center py-8">${e.message}</p>`; }
}

async function crearAdmin() {
    const nombre = document.getElementById('adm-nombre').value.trim();
    const email = document.getElementById('adm-email').value.trim();
    const password = document.getElementById('adm-pass').value;
    if (!nombre || !email || !password) { toast('Completa todos los campos', 'error'); return; }
    if (password.length < 8) { toast('La contrasena debe tener al menos 8 caracteres', 'error'); return; }
    if (!confirm(`Crear admin para ${email}?`)) return;
    try {
        const r = await candela.admin.crearAdmin(email, nombre, password);
        toast(`Admin ${r.email} creado correctamente`, 'success');
        document.getElementById('adm-nombre').value = '';
        document.getElementById('adm-email').value = '';
        document.getElementById('adm-pass').value = '';
        cargarAdmins();
    } catch(e) { toast(e.message || 'Error al crear admin', 'error'); }
}

async function revocarAdmin(id, email) {
    if (!confirm(`Revocar acceso de admin a ${email}? La cuenta quedara desactivada.`)) return;
    try {
        await candela.admin.revocarAdmin(id);
        toast(`Acceso revocado para ${email}`, 'success');
        cargarAdmins();
    } catch(e) { toast(e.message || 'Error', 'error'); }
}

init();
