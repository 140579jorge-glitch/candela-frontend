if (!requireAuth()) { /* redirige */ }

let _secActual = 'balance';
let _datosBalance = null;

function ir(sec, el, tipo) {
    _secActual = sec;
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + sec).classList.add('active');
    if (tipo === 'bot') {
        document.querySelectorAll('.bot-nav-item').forEach(n => n.classList.remove('active'));
    } else {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    }
    el.classList.add('active');
    if (sec === 'balance') cargarBalance();
}

function showToast(msg, tipo = 'ok') {
    const c = document.getElementById('toast-cnt');
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.style.background = tipo === 'ok' ? '#B5445C' : tipo === 'warn' ? '#CF6278' : '#2D2D2D';
    el.textContent = msg;
    c.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => { el.classList.add('show'); }); });
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3500);
}

async function cargarBalance() {
    try {
        const d = await candela.recargadores.miBalance();
        _datosBalance = d;
        document.getElementById('bal-recargador').textContent = '$' + d.balance_recargador.toFixed(2);
        document.getElementById('bal-consumo').textContent = '$' + d.balance_consumo.toFixed(2);
        _renderMovimientos(d.movimientos || []);
    } catch (e) {
        if (e.message && (e.message.includes('403') || e.message.toLowerCase().includes('autorizado') || e.message.toLowerCase().includes('recargador'))) {
            window.location.href = '../pages/fan-dashboard.html';
            return;
        }
        document.getElementById('bal-recargador').textContent = '$0.00';
        document.getElementById('bal-consumo').textContent = '$0.00';
        document.getElementById('mov-lista').innerHTML = '<p class="text-sm text-c-soft">No hay movimientos aun.</p>';
    }
}

function _renderMovimientos(movs) {
    const c = document.getElementById('mov-lista');
    if (!movs.length) { c.innerHTML = '<p class="text-sm text-c-soft">No hay movimientos aun.</p>'; return; }
    const iconos = { deposito:'add_circle', recarga_transferencia:'send', recarga_consumo:'swap_horiz', bonus:'star' };
    const colores = { deposito:'#27ae60', recarga_transferencia:'#B5445C', recarga_consumo:'#e67e22', bonus:'#8e44ad' };
    c.innerHTML = movs.map(m => {
        const ico = iconos[m.tipo] || 'circle';
        const col = colores[m.tipo] || '#7B4D5E';
        const signo = m.monto >= 0 ? '+' : '';
        const fecha = m.fecha ? new Date(m.fecha).toLocaleDateString('es', { day:'2-digit', month:'short' }) : '';
        return `<div class="mov-row">
            <div class="mov-ico" style="background:${col}18">
                <span class="ms text-base" style="color:${col}">${ico}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-600 text-c-text truncate">${esc(m.descripcion || m.tipo)}</p>
                <p class="text-xs text-c-soft">${fecha}</p>
            </div>
            <p class="text-sm font-bold" style="color:${m.monto >= 0 ? '#27ae60' : '#B5445C'}">${signo}$${Math.abs(m.monto).toFixed(2)}</p>
        </div>`;
    }).join('');
}


function actualizarPreviewConsumo() {
    const monto = parseFloat(document.getElementById('consumo-monto').value) || 0;
    const prev = document.getElementById('consumo-preview');
    if (monto >= 1) {
        const fee = monto * 0.10;
        const neto = monto - fee;
        prev.classList.remove('hidden');
        document.getElementById('cp-debito').textContent = '$' + monto.toFixed(2);
        document.getElementById('cp-fee').textContent = '-$' + fee.toFixed(2);
        document.getElementById('cp-neto').textContent = '$' + neto.toFixed(2);
    } else {
        prev.classList.add('hidden');
    }
}

async function generarVoucher() {
    const monto = parseFloat(document.getElementById('fan-monto').value);
    if (!monto || monto < 1) { showToast('Ingresa un monto valido', 'err'); return; }
    const btn = document.getElementById('btn-transferir');
    btn.disabled = true;
    try {
        const r = await candela.recargadores.crearVoucher(monto);
        document.getElementById('vr-codigo').textContent = r.codigo;
        document.getElementById('vr-monto').textContent = '$' + r.monto.toFixed(2);
        document.getElementById('voucher-resultado').classList.remove('hidden');
        showToast(`✓ Código ${r.codigo} generado`, 'ok');
        document.getElementById('fan-monto').value = '';
        await cargarBalance();
    } catch (e) {
        showToast(e.message || 'Error al generar el código', 'err');
    } finally {
        btn.disabled = false;
    }
}

async function transferirAMiCuenta() {
    const monto = parseFloat(document.getElementById('consumo-monto').value);
    if (!monto || monto < 1) { showToast('Ingresa un monto valido', 'err'); return; }
    const btn = document.getElementById('btn-consumo');
    btn.disabled = true; btn.textContent = 'Procesando...';
    try {
        const r = await candela.recargadores.transferirAMiCuenta(monto);
        showToast(`✓ $${r.credito_consumo_acreditado.toFixed(2)} cargados a tu cuenta`, 'ok');
        document.getElementById('consumo-monto').value = '';
        document.getElementById('consumo-preview').classList.add('hidden');
        await cargarBalance();
    } catch (e) {
        showToast(e.message || 'Error al convertir', 'err');
    } finally {
        btn.disabled = false; btn.textContent = 'Convertir';
    }
}

// Init
(async () => {
    const user = candela.auth.user();
    if (user?.nombre) document.getElementById('nav-nombre').textContent = user.nombre;
    await cargarBalance();
})();
