let pasoActual = 1;
let paisSel = '';

const hoy = new Date();
hoy.setFullYear(hoy.getFullYear() - 18);
document.getElementById('r-nacimiento').max = hoy.toISOString().split('T')[0];

document.getElementById('r-artistico')?.addEventListener('input', function() {
    const slug = this.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    document.getElementById('preview-slug').textContent = slug || 'tuapodo';
});

function selPais(pais, el) {
    document.querySelectorAll('.pais-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    paisSel = pais;
}

function togglePass(id, eyeId) {
    const input = document.getElementById(id);
    const eye = document.getElementById(eyeId);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.textContent = show ? 'visibility' : 'visibility_off';
}

function irPaso2() {
    const nombre = document.getElementById('r-nombre').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const pass = document.getElementById('r-pass').value;
    const pass2 = document.getElementById('r-pass2').value;
    const nac = document.getElementById('r-nacimiento').value;
    if (!nombre) { toast('Ingresa tu nombre', 'error'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Email invalido', 'error'); return; }
    if (pass.length < 8) { toast('La contraseña debe tener al menos 8 caracteres', 'error'); return; }
    if (pass !== pass2) { toast('Las contrasenas no coinciden', 'error'); return; }
    if (!nac) { toast('Ingresa tu fecha de nacimiento', 'error'); return; }
    const nacDate = new Date(nac);
    const limite = new Date(); limite.setFullYear(limite.getFullYear() - 18);
    if (nacDate > limite) { toast('Debes tener al menos 18 anos', 'error'); return; }
    irPaso(2);
}

function irPaso3() {
    if (!document.getElementById('r-artistico').value.trim()) { toast('Ingresa tu nombre artistico', 'error'); return; }
    if (!paisSel) { toast('Selecciona tu pais', 'error'); return; }
    irPaso(3);
}

function irPaso(n) {
    document.getElementById('paso' + pasoActual).classList.add('hidden');
    document.getElementById('paso' + n).classList.remove('hidden');
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('dot' + i);
        dot.classList.remove('done','active','idle');
        if (i < n) dot.classList.add('done');
        else if (i === n) dot.classList.add('active');
        else dot.classList.add('idle');
    }
    const upd = (id, done) => { const el=document.getElementById(id); el.classList.toggle('done',done); el.classList.toggle('idle',!done); };
    upd('line1-2', n > 1);
    upd('line2-3', n > 2);
    pasoActual = n;
    window.scrollTo(0, 0);
}

async function registrar() {
    const checks = ['t-edad','t-terminos','t-contenido','t-release','t-comision'];
    if (checks.some(id => !document.getElementById(id).checked)) { toast('Debes aceptar todos los terminos', 'error'); return; }
    const btn = document.getElementById('btn-registrar');
    btn.innerHTML = '<span class="ms" style="font-size:18px">hourglass_top</span> Creando...';
    btn.disabled = true;
    document.getElementById('error-reg').classList.add('hidden');
    const refCode = new URLSearchParams(window.location.search).get('ref') || null;
    const data = {
        nombre: document.getElementById('r-nombre').value.trim(),
        email: document.getElementById('r-email').value.trim(),
        website: document.getElementById('r-website').value,
        password: document.getElementById('r-pass').value,
        fecha_nacimiento: document.getElementById('r-nacimiento').value,
        nombre_artistico: document.getElementById('r-artistico').value.trim(),
        bio: document.getElementById('r-bio').value.trim(),
        pais: paisSel,
        precio_suscripcion: parseFloat(document.getElementById('r-precio').value) || 0,
        ref_code: refCode,
    };
    try {
        await candela.auth.registroCreadora(data);
        // No intentamos auto-login: la cuenta recien creada siempre requiere
        // verificar el email primero (el backend rechaza el login con 403
        // hasta entonces), asi que mostramos el exito directo sin loguear.
        document.getElementById('paso3').classList.add('hidden');
        document.getElementById('exito').classList.remove('hidden');
    } catch(err) {
        const errEl = document.getElementById('error-reg');
        errEl.textContent = err.message || 'Error al crear la cuenta';
        errEl.classList.remove('hidden');
    } finally {
        btn.innerHTML = '<span class="ms" style="font-size:18px">rocket_launch</span> Registrarme';
        btn.disabled = false;
    }
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
