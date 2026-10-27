let redActual   = 'trc20';
let montoActual = 20;
function setMontoActual(v) { montoActual = parseFloat(v) || 0; actualizarUI(); }
let depositoId  = null;
let pollTimer   = null;
let countTimer  = null;

if (!candela.auth.isLoggedIn()) window.location.href = '../index.html';
const user = candela.auth.user();
if (user?.nombre) document.getElementById('nav-nombre').textContent = user.nombre;

// Mostrar banner si el fan fue redirigido por saldo insuficiente
(function() {
    try {
        const ctx = JSON.parse(sessionStorage.getItem('candela_recarga_ctx') || 'null');
        if (!ctx) return;
        sessionStorage.removeItem('candela_recarga_ctx');
        const banner = document.getElementById('recarga-banner');
        if (!banner) return;
        document.getElementById('banner-titulo').textContent = `Suscripción a ${ctx.nombre} — faltan $${ctx.falta.toFixed(2)} USDT`;
        document.getElementById('banner-msg').textContent = `Precio: $${ctx.precio} USDT · Tu saldo actual no es suficiente. Recarga aquí y después vuelve para completar tu suscripción.`;
        const returnUrl = sessionStorage.getItem('candela_return');
        if (returnUrl) document.getElementById('banner-return').href = returnUrl;
        else document.getElementById('banner-return').style.display = 'none';
        banner.classList.remove('hidden');
    } catch(e) {}
})();

async function canjearCodigo() {
    const input = document.getElementById('voucher-codigo');
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) { toast('Ingresa un código', 'error'); return; }
    const btn = document.getElementById('btn-canjear');
    btn.disabled = true;
    try {
        const r = await candela.recargadores.canjearVoucher(codigo);
        toast(`✓ $${r.acreditado.toFixed(2)} acreditados a tu cuenta`, 'success');
        input.value = '';
        await init();
    } catch (e) {
        toast(e.message || 'Código inválido', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function init() {
    try {
        const w = await candela.wallet.miSaldo();
        candela.balance.cache(w.balance || 0);
        document.getElementById('balance-disp').textContent = `$${(w.balance||0).toFixed(2)}`;
        if (w.depositos_pendientes > 0) {
            document.getElementById('dep-pendiente-count').textContent = w.depositos_pendientes;
            document.getElementById('dep-pendiente-aviso').classList.remove('hidden');
        }
        renderMovimientos(w.movimientos_recientes);
    } catch(e) {
        document.getElementById('balance-disp').textContent = '$0.00';
        document.getElementById('mov-list').innerHTML = '<p class="text-c-soft text-sm text-center py-4">Error al cargar.</p>';
    }
}

let montoQR = 5;
let tasasQRCache = null;
let codigoQRCache = null;

async function cargarTasasQR() {
    if (tasasQRCache) return tasasQRCache;
    try { tasasQRCache = await candela.wallet.tasasRecarga(); }
    catch (e) { tasasQRCache = null; }
    return tasasQRCache;
}

function qrMontoPreset(v, btn) {
    montoQR = v;
    document.querySelectorAll('.qr-monto-btn').forEach(b => b.classList.remove('sel'));
    btn?.classList.add('sel');
    actualizarPreviewQR();
}

async function actualizarPreviewQR() {
    const pais = document.getElementById('qr-pais')?.value || 'bolivia';
    const d = await cargarTasasQR();
    const info = d?.paises?.[pais];
    const previewMonto = document.getElementById('qr-preview-monto');
    document.getElementById('qr-preview-usd').textContent = `$${montoQR}`;

    let costoTexto = null;
    if (info) {
        const totalUsdEquiv = (montoQR + d.fee_fijo) * (1 + d.margen_pct / 100);
        const montoLocal = totalUsdEquiv * info.tasa;
        const decimals = info.tasa > 100 ? 0 : 2;
        costoTexto = `${info.moneda_simbolo} ${montoLocal.toLocaleString('es', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
        previewMonto.textContent = costoTexto;
    } else {
        previewMonto.textContent = 'Te lo confirmamos por WhatsApp';
    }

    actualizarLinkWhatsapp(pais, costoTexto);
}

async function actualizarLinkWhatsapp(pais, costoTexto) {
    const link = document.getElementById('wa-recarga-link');
    if (!link) return;
    const user = candela.auth.user();
    const base = 'https://wa.me/18457098595?text=';
    const nombresPais = { bolivia: 'Bolivia', argentina: 'Argentina', peru: 'Peru', brasil: 'Brasil' };
    const detalle = `Monto deseado: $${montoQR} USD\nPais: ${nombresPais[pais] || pais}${costoTexto ? `\nCosto estimado: ${costoTexto}` : ''}`;

    if (!user?.email) {
        link.href = base + encodeURIComponent(`Hola, quiero recargar mi cuenta de Candela.\n${detalle}`);
        return;
    }
    try {
        if (!codigoQRCache) codigoQRCache = await candela.wallet.codigoRecarga();
        const msg = `Hola, quiero recargar mi cuenta de Candela.\nCodigo: ${codigoQRCache.codigo}\nUsuario: ${user.email}\n${detalle}`;
        link.href = base + encodeURIComponent(msg);
    } catch (e) {
        link.href = base + encodeURIComponent(`Hola, quiero recargar mi cuenta de Candela.\nUsuario: ${user.email}\n${detalle}`);
    }
}

function elegirMetodo(m) {
    document.getElementById('card-usdt').classList.toggle('sel', m === 'usdt');
    document.getElementById('card-qr').classList.toggle('sel', m === 'qr');
    document.getElementById('bloque-usdt').classList.toggle('hidden', m === 'qr');
    document.getElementById('panel-qr').classList.toggle('hidden', m !== 'qr');
    if (m === 'qr') actualizarPreviewQR();
}

function elegirRed(red) {
    redActual = red;
    const activo = 'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-c-accent bg-orange-50 text-c-accent transition-all';
    const inact  = 'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-c-border text-c-soft transition-all hover:border-c-accent hover:text-c-accent';
    document.getElementById('red-trc20').className  = red === 'trc20'   ? activo : inact;
    document.getElementById('red-polygon').className = red === 'polygon' ? activo : inact;
}

function elegirMonto(m) {
    document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('sel'));
    const ci = document.getElementById('monto-custom');
    if (m === 0) {
        document.querySelector('.monto-btn[data-m="0"]').classList.add('sel');
        ci.classList.remove('hidden');
        montoActual = 0;
    } else {
        document.querySelector(`.monto-btn[data-m="${m}"]`).classList.add('sel');
        ci.classList.add('hidden');
        montoActual = m;
    }
    actualizarUI();
}

// ponytail: bono apagado en el piloto, alineado con backend BONUS_PCT=0.0. Para reactivar, subir ambos.
function bonusPct(m) { return 0; }

function actualizarUI() {
    const m = montoActual || parseFloat(document.getElementById('monto-custom').value) || 0;
    const lbl = document.getElementById('btn-monto-label');
    if (lbl) lbl.textContent = m > 0 ? `$${m}` : '$?';
    const pct = bonusPct(m);
    const bonusEl = document.getElementById('bonus-notice');
    if (pct > 0) {
        document.getElementById('bonus-val').textContent = `$${(m * pct).toFixed(2)}`;
        document.getElementById('bonus-pct-text').textContent = `+${Math.round(pct * 100)}%`;
        bonusEl.classList.remove('hidden');
    } else {
        bonusEl.classList.add('hidden');
    }
}

function copiarDireccion() {
    const addr = document.getElementById('pay-addr-text').textContent;
    navigator.clipboard.writeText(addr);
    toast('Direccion copiada', 'success');
}

function generarDireccion() {
    const monto = montoActual || parseFloat(document.getElementById('monto-custom').value);
    if (!monto || monto < 20) { toast('El monto mínimo es $20 USD', 'error'); return; }
    // Mostrar modal de confirmación de red antes de generar
    const nombres = { trc20: 'USDT TRC20 (Tron)', polygon: 'USDT o USDC Polygon' };
    document.getElementById('modal-red-nombre').textContent = nombres[redActual] || redActual.toUpperCase();
    document.getElementById('modal-red').classList.remove('hidden');
    document.getElementById('modal-red').style.display = 'flex';
}

function cerrarModalRed() {
    document.getElementById('modal-red').classList.add('hidden');
    document.getElementById('modal-red').style.display = 'none';
}

async function confirmarRedYGenerar() {
    cerrarModalRed();
    const monto = montoActual || parseFloat(document.getElementById('monto-custom').value);
    const btnModal = document.getElementById('btn-confirmar-red');
    btnModal.disabled = true;

    const btn = document.getElementById('btn-generar');
    btn.disabled = true; btn.textContent = 'Generando...';

    try {
        const r = await candela.wallet.crearPago({ monto, metodo_red: redActual });
        depositoId = r.deposito_id;

        document.getElementById('pay-addr-text').textContent  = r.pay_address;
        document.getElementById('pay-amount-label').textContent = `${Number(r.pay_amount).toFixed(3)} USDT`;

        // Mostrar red activa en el banner rojo
        const nombres = { trc20: 'USDT TRC20 (Tron)', polygon: 'USDT Polygon (MATIC)' };
        document.getElementById('red-activa-label').textContent = nombres[redActual] || redActual.toUpperCase();

        document.getElementById('step-generar').classList.add('hidden');
        document.getElementById('panel-usdt').classList.add('hidden');
        document.getElementById('step-direccion').classList.remove('hidden');

        if (r.expiration) iniciarCountdown(new Date(r.expiration));
        iniciarPolling();
    } catch(e) {
        toast(e.message || 'Error al generar pago', 'error');
        btn.disabled = false;
        btn.innerHTML = `Generar direccion de pago — <span id="btn-monto-label">$${monto}</span>`;
        btnModal.disabled = false;
    }
}

function iniciarCountdown(expira) {
    clearInterval(countTimer);
    countTimer = setInterval(() => {
        const diff = Math.max(0, Math.floor((expira - Date.now()) / 1000));
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        document.getElementById('countdown-label').textContent = `${m}:${s}`;
        if (diff === 0) clearInterval(countTimer);
    }, 1000);
}

function mostrarFallido(titulo, desc) {
    clearInterval(pollTimer);
    clearInterval(countTimer);
    document.getElementById('step-direccion').classList.add('hidden');
    document.getElementById('step-fallido-titulo').textContent = titulo;
    document.getElementById('step-fallido-desc').textContent = desc;
    document.getElementById('step-fallido').classList.remove('hidden');
}

function reiniciarDeposito() {
    depositoId = null;
    document.getElementById('step-fallido').classList.add('hidden');
    document.getElementById('step-generar').classList.remove('hidden');
}

function iniciarPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
        try {
            const r = await candela.wallet.estadoPago(depositoId);
            if (r.estado === 'confirmado') {
                clearInterval(pollTimer);
                clearInterval(countTimer);
                document.getElementById('step-direccion').classList.add('hidden');
                document.getElementById('step-confirmado').classList.remove('hidden');
                setTimeout(() => location.reload(), 3000);
            } else if (r.estado === 'failed') {
                mostrarFallido('Pago rechazado', 'La transaccion fue rechazada por la red. Intenta con un nuevo deposito.');
            } else if (r.estado === 'expired') {
                mostrarFallido('Pago expirado', 'El tiempo para completar el pago vencio. Genera una nueva direccion.');
            } else if (r.estado === 'partially_paid') {
                document.getElementById('pay-status-text').textContent = 'Pago parcial detectado, esperando monto completo...';
            } else if (r.estado !== 'pendiente') {
                document.getElementById('pay-status-text').textContent = 'Pago detectado, confirmando...';
            }
        } catch(_) {}
    }, 15000);
}

function renderMovimientos(movs) {
    const list  = document.getElementById('mov-list');
    const empty = document.getElementById('mov-empty');
    if (!movs || !movs.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    const ic = {
        deposito:    { bg:'#f0fdf4', color:'#16a34a', icon:'arrow_downward' },
        bonus:       { bg:'#fefce8', color:'#ca8a04', icon:'card_giftcard' },
        suscripcion: { bg:'#fff7ed', color:'#ea580c', icon:'favorite' },
        ppv:         { bg:'#fdf4ff', color:'#9333ea', icon:'lock_open' },
        propina:     { bg:'#fff7ed', color:'#ea580c', icon:'volunteer_activism' },
        mensaje:     { bg:'#f0f9ff', color:'#0284c7', icon:'mail' },
    };
    list.innerHTML = movs.map(m => {
        const i = ic[m.tipo] || { bg:'#f9fafb', color:'#6b7280', icon:'swap_horiz' };
        const signo = m.monto >= 0 ? '+' : '';
        const color = m.monto >= 0 ? 'text-green-600' : 'text-red-500';
        const fecha = m.fecha ? new Date(m.fecha).toLocaleDateString('es', { day:'numeric', month:'short' }) : '';
        return `
        <div class="flex items-center gap-3 py-3 border-b border-c-border last:border-0">
            <div class="mov-icon" style="background:${i.bg}">
                <span class="ms" style="color:${i.color};font-size:18px">${i.icon}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-c-text truncate">${esc(m.descripcion || m.tipo)}</p>
                <p class="text-[11px] text-c-soft">${fecha} · saldo: $${(m.balance_resultante||0).toFixed(2)}</p>
            </div>
            <span class="font-bold text-sm ${color} whitespace-nowrap">${signo}$${Math.abs(m.monto).toFixed(2)}</span>
        </div>`;
    }).join('');
}

elegirMonto(20);
init();

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

async function eliminarCuenta() {
    if (document.getElementById('confirm-eliminar').value !== 'ELIMINAR') {
        toast('Escribe ELIMINAR (en mayúsculas) para confirmar', 'error'); return;
    }
    if (!confirm('¿Seguro? Esta acción no se puede deshacer.')) return;
    try {
        await candela.auth.eliminarCuenta();
        toast('Cuenta eliminada. Cerrando sesión...', 'info');
        setTimeout(() => { candela.auth.logout(true); window.location.href = '../index.html'; }, 2000);
    } catch(e) {
        toast(e.message || 'Error al eliminar cuenta', 'error');
    }
}
