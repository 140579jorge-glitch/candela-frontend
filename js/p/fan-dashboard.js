if (!candela.auth.isLoggedIn()) window.location.href = '../index.html';
const user = candela.auth.user();

function esc(s) { const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML; }
function toast(msg, tipo='info') {
    const c = document.getElementById('toast-cnt');
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.style.background = tipo==='success'?'#27ae60':tipo==='error'?'#e74c3c':'#B5445C';
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(()=>el.remove(),300); }, 3500);
}
function fmt(v) { return parseFloat(v||0).toFixed(2); }
function fmtFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-BO', {day:'2-digit',month:'short',year:'numeric'});
}

// Navegacion
function _activarSeccion(sec) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-'+sec)?.classList.add('active');
    document.querySelectorAll('.nav-item,.bot-nav-item').forEach(n => {
        n.classList.toggle('active', !!n.getAttribute('data-on-click')?.includes("'"+sec+"'"));
    });
    window.scrollTo(0,0);
}
function mostrar(sec) {
    history.pushState({section:sec},'','#'+sec);
    _activarSeccion(sec);
}
window.addEventListener('popstate', e => _activarSeccion(e.state?.section || 'inicio'));

// Notificaciones
async function cargarNotif() {
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
        if (!data.items || !data.items.length) {
            lista.innerHTML = '<p class="text-center text-c-soft text-xs py-6">Sin notificaciones</p>';
            return;
        }
        const icons = { nueva_suscripcion:'favorite', nueva_propina:'attach_money', nuevo_mensaje:'chat', broadcast_pagado:'lock_open', nuevo_contenido:'photo_camera' };
        lista.innerHTML = data.items.map(n => `
            <div class="flex items-start gap-3 px-4 py-3 border-b border-c-border last:border-0 ${n.leida?'opacity-60':'bg-c-surface'}">
                <span class="ms text-c-accent mt-0.5" style="font-size:18px">${icons[n.tipo]||'notifications'}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold leading-snug">${esc(n.titulo)}</p>
                    ${n.mensaje ? `<p class="text-[11px] text-c-soft mt-0.5 truncate">${esc(n.mensaje)}</p>` : ''}
                </div>
                ${!n.leida ? '<span class="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>' : ''}
            </div>`).join('');
    } catch(e) {}
}
async function leerTodasNotif() {
    await candela._req('PATCH', '/api/notificaciones/leer-todas');
    document.getElementById('notif-badge').classList.add('hidden');
    document.querySelectorAll('#notif-lista .bg-c-surface').forEach(el => el.classList.remove('bg-c-surface'));
    document.querySelectorAll('#notif-lista .w-2.h-2.rounded-full.bg-red-500').forEach(el => el.remove());
}
function toggleNotif() {
    const dd = document.getElementById('notif-dropdown');
    dd.classList.toggle('hidden');
    if (!dd.classList.contains('hidden')) cargarNotif();
}
document.addEventListener('click', e => {
    if (!document.getElementById('notif-wrap')?.contains(e.target))
        document.getElementById('notif-dropdown')?.classList.add('hidden');
});

// Datos
let actData = null;

async function cargar() {
    const secInicial = location.hash.replace('#','') || 'inicio';
    history.replaceState({section:secInicial},'','#'+secInicial);
    if (secInicial !== 'inicio') _activarSeccion(secInicial);

    document.getElementById('topbar-avatar').textContent = (user.nombre||'F')[0].toUpperCase();
    cargarNotif();

    document.getElementById('bienvenida-sub').textContent = `Hola, ${user.nombre||'Fan'}! Todo tu historial en un lugar.`;

    try {
        actData = await candela._req('GET', '/api/fans/mi-actividad');
        candela.balance.cache(actData.balance || 0);
    } catch(e) {
        toast('Error al cargar tu actividad', 'error'); return;
    }
    document.getElementById('st-balance').textContent = '$' + fmt(actData.balance);
    document.getElementById('st-subs').textContent = actData.suscripciones_activas.filter(s => s.estado === 'activa').length;
    document.getElementById('st-compras').textContent = actData.compras_recientes.length;
    document.getElementById('st-following').textContent = (actData.followings||[]).length;
    document.getElementById('wallet-balance').textContent = '$' + fmt(actData.balance);

    if (!actData.email_verificado) document.getElementById('email-badge').classList.remove('hidden');

    renderMovs('movs-home', actData.movimientos_wallet.slice(0,5));
    renderMovs('movs-wallet', actData.movimientos_wallet);
    renderSiguiendo();
    renderSubs();
    renderCompras();
    renderPropinas();
    renderReclamos();
    renderCuenta();

    // Mostrar acceso al panel de agente si el usuario tiene rol recargador
    candela._req('GET', '/api/recargadores/mi-balance').then(() => {
        document.getElementById('nav-agente').style.display = 'flex';
    }).catch(() => {});
}

// Siguiendo
function renderSiguiendo() {
    const el = document.getElementById('lista-siguiendo');
    const list = actData.followings || [];
    if (!list.length) {
        el.innerHTML = `<div class="text-center py-10">
            <span class="ms text-c-border" style="font-size:48px">favorite_border</span>
            <p class="text-c-soft text-sm font-semibold mt-3">No sigues a ninguna creadora aun</p>
            <a href="explorar.html" class="c-btn text-white text-sm font-bold px-5 py-2.5 rounded-xl inline-block mt-4">Explorar creadoras</a>
        </div>`;
        return;
    }
    el.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">` +
        list.map(f => `
        <div class="follow-card" data-on-click="window.location.href='creadora.html?slug=${esc(f.creadora_slug)}'">
            <div class="w-14 h-14 rounded-full overflow-hidden bg-c-champagne flex-shrink-0">
                ${f.creadora_avatar
                    ? `<img src="${esc(f.creadora_avatar)}" alt="${esc(f.creadora_nombre)}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center text-white font-bold text-xl" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">${(f.creadora_nombre||'C')[0]}</div>`
                }
            </div>
            <p class="font-bold text-sm leading-snug truncate w-full">${esc(f.creadora_nombre)}</p>
            <p class="text-xs text-c-accent font-bold">${f.precio_suscripcion > 0 ? '$'+f.precio_suscripcion+'/mes' : 'Gratis'}</p>
            <button data-on-click="event.stopPropagation();dejarSeguir('${esc(f.creadora_slug)}',this)"
                class="text-[11px] text-c-soft border border-c-border rounded-full px-3 py-1 hover:border-red-300 hover:text-red-400 transition-colors">
                Dejar de seguir
            </button>
        </div>`).join('') + '</div>';
}

async function dejarSeguir(slug, btn) {
    const item = (actData.followings||[]).find(f => f.creadora_slug === slug);
    if (!item) return;
    try {
        btn.disabled = true;
        btn.textContent = '...';
        await candela._req('DELETE', '/api/fans/favoritos/' + item.creadora_id);
        actData.followings = actData.followings.filter(f => f.creadora_slug !== slug);
        document.getElementById('st-following').textContent = actData.followings.length;
        renderSiguiendo();
        toast('Dejaste de seguir a ' + item.creadora_nombre, 'success');
    } catch(e) {
        toast('Error al dejar de seguir', 'error');
        btn.disabled = false;
        btn.textContent = 'Dejar de seguir';
    }
}

// Suscripciones
function renderSubs() {
    const el = document.getElementById('lista-subs');
    if (!actData.suscripciones_activas.length) {
        el.innerHTML = `<div class="text-center py-10">
            <span class="ms text-c-border" style="font-size:48px">favorite</span>
            <p class="text-c-soft text-sm font-semibold mt-3">No tienes suscripciones activas</p>
            <a href="explorar.html" class="c-btn text-white text-sm font-bold px-5 py-2.5 rounded-xl inline-block mt-4">Explorar creadoras</a>
        </div>`;
        return;
    }
    el.innerHTML = actData.suscripciones_activas.map(s => `
        <div class="card p-4 flex items-center gap-4 sub-card" id="sub-${esc(s.creadora_slug)}">
            <div class="w-12 h-12 rounded-full overflow-hidden bg-c-champagne flex-shrink-0">
                ${s.creadora_avatar
                    ? `<img src="${esc(s.creadora_avatar)}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center text-white font-bold" style="background:linear-gradient(135deg,#B5445C,#F2B8C8)">${(s.creadora_nombre||'?')[0]}</div>`
                }
            </div>
            <div class="flex-1 min-w-0">
                <a href="creadora.html?slug=${esc(s.creadora_slug)}" class="font-bold text-sm hover:text-c-accent transition-colors">${esc(s.creadora_nombre)}</a>
                <p class="text-xs text-c-soft">Acceso hasta ${fmtFecha(s.fecha_fin)}</p>
            </div>
            <div class="text-right shrink-0 space-y-1.5">
                <p class="text-sm font-bold">$${fmt(s.monto)}</p>
                ${s.estado === 'cancelada'
                    ? '<span class="badge badge-warn block">Cancelada</span><p class="text-[10px] text-c-soft">Acceso hasta vencimiento</p>'
                    : `<span class="badge badge-ok block">Activa</span>
                       <button data-on-click="cancelarSub('${esc(s.creadora_slug)}',this)"
                           class="text-[10px] text-c-soft hover:text-red-500 transition-colors block">Cancelar</button>`
                }
            </div>
        </div>
    `).join('');
}

async function cancelarSub(slug, btn) {
    if (!confirm('Cancelar suscripcion? Mantendras acceso hasta la fecha de vencimiento.')) return;
    btn.disabled = true;
    btn.textContent = '...';
    try {
        const res = await candela._req('DELETE', '/api/pagos/suscripciones/' + slug);
        const hasta = res?.acceso_hasta ? fmtFecha(res.acceso_hasta) : '';
        toast('Suscripcion cancelada.' + (hasta ? ' Acceso hasta ' + hasta : ''), 'success');
        // Recargar datos y re-renderizar sección
        actData = await candela._req('GET', '/api/fans/mi-actividad');
        renderSubs();
    } catch(e) {
        if (e.message?.includes('404') || e.message?.includes('No tienes')) {
            // Ya estaba cancelada — solo actualizar la UI
            actData = await candela._req('GET', '/api/fans/mi-actividad');
            renderSubs();
        } else {
            toast(e.message || 'Error al cancelar', 'error');
            btn.disabled = false;
            btn.textContent = 'Cancelar';
        }
    }
}

// Compras
function renderCompras() {
    const el = document.getElementById('lista-compras');
    if (!actData.compras_recientes.length) {
        el.innerHTML = '<p class="text-sm text-c-soft py-4 text-center">No tienes compras de contenido PPV.</p>';
        return;
    }
    el.innerHTML = actData.compras_recientes.map(c => `
        <div class="card p-4 flex items-center gap-3 cursor-pointer hover:border-c-accent transition-colors"
            data-on-click="${c.contenido_id && c.creadora_slug ? `window.location.href='creadora.html?slug=${esc(c.creadora_slug)}'` : 'void 0'}">
            ${c.preview_url
                ? `<img src="${esc(c.preview_url)}" class="compra-thumb">`
                : `<div class="compra-thumb flex items-center justify-center bg-c-border">
                    <span class="ms text-c-soft" style="font-size:22px">${c.tipo==='video'?'play_circle':'photo_camera'}</span>
                  </div>`
            }
            <div class="flex-1 min-w-0">
                <p class="font-bold text-sm">${esc(c.titulo||c.creadora_nombre)}</p>
                <p class="text-xs text-c-soft">${esc(c.creadora_nombre)} &middot; ${fmtFecha(c.fecha)}</p>
            </div>
            <div class="text-right shrink-0">
                <p class="font-bold text-sm">$${fmt(c.monto)}</p>
                <span class="ms text-c-accent" style="font-size:16px">chevron_right</span>
            </div>
        </div>
    `).join('');
}

// Propinas
function renderPropinas() {
    const el = document.getElementById('lista-propinas');
    if (!actData.propinas_enviadas.length) {
        el.innerHTML = '<p class="text-sm text-c-soft py-4 text-center">No has enviado propinas.</p>';
        return;
    }
    el.innerHTML = actData.propinas_enviadas.map(p => `
        <div class="card p-4 flex items-center gap-3">
            <div class="mov-ico" style="background:#FFF0EA"><span class="ms text-rose-400 ms-fill" style="font-size:18px">volunteer_activism</span></div>
            <div class="flex-1 min-w-0">
                <p class="font-bold text-sm">${esc(p.creadora_nombre)}</p>
                <p class="text-xs text-c-soft">${p.mensaje ? '"'+esc(p.mensaje)+'"' : fmtFecha(p.fecha)}</p>
            </div>
            <p class="font-bold text-sm shrink-0">$${fmt(p.monto)}</p>
        </div>
    `).join('');
}

// Reclamos
function renderReclamos() {
    const el = document.getElementById('lista-reclamos');
    if (!actData.reclamos.length) {
        el.innerHTML = '<p class="text-sm text-c-soft py-4 text-center">No tienes reclamos registrados.</p>';
        return;
    }
    const badges = { pendiente:'badge-warn', resuelto:'badge-ok', en_revision:'badge-warn' };
    el.innerHTML = actData.reclamos.map(r => `
        <div class="card p-4 mb-3">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <p class="font-bold text-sm">${esc(r.tipo_reclamo||'Reclamo')}</p>
                    <p class="text-xs text-c-soft">${fmtFecha(r.fecha)}</p>
                    ${r.notas_admin ? `<p class="text-xs mt-2 text-c-text bg-amber-50 rounded-lg px-3 py-2 border border-amber-100"><strong>Respuesta:</strong> ${esc(r.notas_admin)}</p>` : ''}
                </div>
                <span class="badge ${badges[r.estado]||'badge-warn'} shrink-0">${esc(r.estado)}</span>
            </div>
        </div>
    `).join('');
}

// Movimientos
function renderMovs(elId, movs) {
    const el = document.getElementById(elId);
    if (!movs || !movs.length) { el.innerHTML = '<p class="text-sm text-c-soft py-2 text-center">Sin movimientos.</p>'; return; }
    const ico = {
        deposito:  ['savings','#E8F5E9','#27ae60'],
        suscripcion:['favorite','#FFF0EA','#F2B8C8'],
        compra:    ['shopping_bag','#FFF4EE','#B5445C'],
        propina:   ['volunteer_activism','#FFF0F0','#F2B8C8'],
        mensaje:   ['chat','#F0F4FF','#5B8DEF'],
        bonus:     ['star','#FFFDE7','#B5445C'],
        retiro:    ['send','#F3E5F5','#9C27B0'],
    };
    el.innerHTML = movs.map(m => {
        const [icon, bg, color] = ico[m.tipo] || ['payments','#F5F5F5','#7B4D5E'];
        const signo = m.monto < 0 ? '' : '+';
        return `<div class="mov-row">
            <div class="mov-ico" style="background:${bg}"><span class="ms ms-fill" style="font-size:18px;color:${color}">${icon}</span></div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">${esc(m.descripcion||m.tipo)}</p>
                <p class="text-xs text-c-soft">${fmtFecha(m.fecha)}</p>
            </div>
            <p class="font-bold text-sm shrink-0 ${m.monto<0?'text-red-500':'text-green-600'}">${signo}$${fmt(Math.abs(m.monto))}</p>
        </div>`;
    }).join('');
}

// Cuenta
function renderCuenta() {
    const el = document.getElementById('email-ver-status');
    if (actData.email_verificado) {
        el.innerHTML = '<span class="badge badge-ok">Email verificado</span>';
    } else {
        el.innerHTML = '<span class="badge badge-warn">Email pendiente</span><p class="text-xs text-c-soft mt-2">Revisa tu bandeja de entrada y verifica tu email.</p>';
    }
}

// Cambiar contraseña
async function cambiarPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-cambiar-pass');
    btn.disabled = true; btn.textContent = 'Actualizando...';
    try {
        await candela.auth.cambiarPassword(
            document.getElementById('pass-actual').value,
            document.getElementById('pass-nueva').value
        );
        toast('Contraseña actualizada correctamente', 'success');
        document.getElementById('form-cambiar-pass').reset();
    } catch(e) {
        toast(e.message || 'Error al cambiar contraseña', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Actualizar contraseña';
    }
}

// Eliminar cuenta
async function eliminarMiCuenta() {
    if (document.getElementById('confirm-elim').value !== 'ELIMINAR') {
        toast('Escribe ELIMINAR en mayusculas para confirmar', 'error'); return;
    }
    if (!confirm('Segura? Esta accion no se puede deshacer.')) return;
    try {
        await candela.auth.eliminarCuenta();
        toast('Cuenta eliminada. Cerrando sesion...', 'success');
        setTimeout(() => { candela.auth.logout(true); window.location.href = '../index.html'; }, 2000);
    } catch(e) { toast(e.message||'Error al eliminar cuenta', 'error'); }
}

cargar();
