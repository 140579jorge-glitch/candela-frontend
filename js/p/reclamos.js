const API = 'https://api.clubcandela.com';
let tipoSeleccionado = '';

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function seleccionar(val, el) {
  tipoSeleccionado = val;
  document.querySelectorAll('.type-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

document.getElementById('descripcion').addEventListener('input', function() {
  document.getElementById('char-count').textContent = this.value.length + ' / 2000';
});

function getToken() {
  return localStorage.getItem('candela_user') ? 'sesion' : '';  // la sesion real va en la cookie HttpOnly
}

function badgeClass(estado) {
  const m = { nuevo: 'badge-nuevo', en_revision: 'badge-en_revision', resuelto: 'badge-resuelto', rechazado: 'badge-rechazado' };
  return 'badge ' + (m[estado] || 'badge-nuevo');
}

function labelEstado(estado) {
  const m = { nuevo: 'Nuevo', en_revision: 'En revisión', resuelto: 'Resuelto', rechazado: 'Rechazado' };
  return m[estado] || estado;
}

async function cargarHistorial() {
  const token = getToken();
  if (!token) {
    document.getElementById('login-notice').style.display = 'block';
    document.getElementById('form-area').style.display = 'none';
    return;
  }
  try {
    const r = await fetch(API + '/api/reclamos/mis-reclamos', { credentials: 'include' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data.length) return;
    const area = document.getElementById('historial-area');
    const list = document.getElementById('historial-list');
    area.style.display = 'block';
    const LABELS = {
      cobro_no_autorizado: 'Cobro no autorizado',
      contenido_no_recibido: 'Contenido no recibido',
      acceso_denegado: 'Acceso denegado',
      stream_problema: 'Problema con stream',
      pago_no_acreditado: 'Pago no acreditado',
      otro: 'Otro',
    };
    list.innerHTML = data.map(r => `
      <div class="hist-item px-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-sm">${esc(LABELS[r.tipo_reclamo] || r.tipo_reclamo)}</p>
            <p class="text-c-soft text-xs mt-0.5">${r.fecha ? new Date(r.fecha).toLocaleDateString('es', {day:'2-digit',month:'short',year:'numeric'}) : ''}</p>
          </div>
          <span class="${badgeClass(r.estado)}">${labelEstado(r.estado)}</span>
        </div>
        <p class="text-c-soft text-sm mt-1 leading-relaxed line-clamp-2">${esc(r.descripcion)}</p>
        ${r.notas_admin ? `<p class="text-sm mt-1.5 text-indigo-700 font-semibold">Respuesta: ${esc(r.notas_admin)}</p>` : ''}
      </div>
    `).join('');
  } catch (_) {}
}

document.getElementById('reclamo-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const token = getToken();
  if (!token) { document.getElementById('login-notice').style.display = 'block'; return; }
  if (!tipoSeleccionado) { mostrarError('Selecciona el tipo de reclamo.'); return; }
  const desc = document.getElementById('descripcion').value.trim();
  if (desc.length < 20) { mostrarError('La descripción debe tener al menos 20 caracteres.'); return; }
  const ref = document.getElementById('referencia').value.trim() || null;

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  ocultarError();

  try {
    const r = await fetch(API + '/api/reclamos', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_reclamo: tipoSeleccionado, descripcion: desc, referencia_id: ref }),
    });
    const data = await r.json();
    if (!r.ok) { mostrarError(data.detail || 'Error al enviar el reclamo.'); btn.disabled = false; btn.textContent = 'Enviar reclamo'; return; }
    document.getElementById('form-area').style.display = 'none';
    document.getElementById('success-box').style.display = 'block';
    cargarHistorial();
  } catch (_) {
    mostrarError('Error de red. Intenta de nuevo.');
    btn.disabled = false;
    btn.textContent = 'Enviar reclamo';
  }
});

function mostrarError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function ocultarError() {
  document.getElementById('error-msg').classList.add('hidden');
}

cargarHistorial();
