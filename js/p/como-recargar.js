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
    document.querySelectorAll('.qr-monto-btn-cr').forEach(b => b.classList.remove('sel'));
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
    let user = null;
    try { user = JSON.parse(localStorage.getItem('candela_user')); } catch {}
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

actualizarPreviewQR();

function toggleFaq(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  document.querySelectorAll('.faq-q').forEach(b => {
    b.setAttribute('aria-expanded', 'false');
    b.nextElementSibling.classList.remove('open');
  });
  if (!expanded) {
    btn.setAttribute('aria-expanded', 'true');
    btn.nextElementSibling.classList.add('open');
  }
}
