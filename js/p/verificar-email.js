const API_URL = 'https://api.clubcandela.com';

async function reenviar() {
    const email = document.getElementById('email-reenvio').value.trim();
    if (!email) return;
    const btn = document.getElementById('btn-reenviar');
    btn.textContent = '...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/api/auth/reenviar-verificacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error');
        btn.textContent = 'Enviado';
        btn.style.background = '#27ae60';
    } catch(e) {
        btn.textContent = 'Error'; btn.disabled = false;
    }
}

(async () => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
        document.getElementById('estado-verificando').classList.add('hidden');
        document.getElementById('estado-error').classList.remove('hidden');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/api/auth/verificar-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        document.getElementById('estado-verificando').classList.add('hidden');
        if (res.ok) {
            document.getElementById('estado-ok').classList.remove('hidden');
        } else {
            document.getElementById('error-msg').textContent = data.detail || 'Token invalido o expirado.';
            document.getElementById('estado-error').classList.remove('hidden');
        }
    } catch(_) {
        document.getElementById('estado-verificando').classList.add('hidden');
        document.getElementById('estado-error').classList.remove('hidden');
    }
})();
