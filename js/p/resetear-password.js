        const API_BASE = 'https://api.clubcandela.com';

        const vistaSolicitar = document.getElementById('vista-solicitar');
        const vistaResetear = document.getElementById('vista-resetear');
        const vistaExito = document.getElementById('vista-exito');
        const alertaError = document.getElementById('alerta-error');

        function mostrarError(msg) {
            alertaError.textContent = msg;
            alertaError.classList.remove('hidden');
            setTimeout(() => alertaError.classList.add('hidden'), 6000);
        }

        // Detectar si hay token en la URL
        const params = new URLSearchParams(window.location.search);
        const tokenURL = params.get('token');

        if (tokenURL) {
            vistaSolicitar.classList.add('hidden');
            vistaResetear.classList.remove('hidden');
        }

        // Formulario: solicitar link
        document.getElementById('form-solicitar').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-solicitar');
            const email = document.getElementById('email-input').value.trim();
            btn.disabled = true;
            btn.textContent = 'Enviando...';
            try {
                await fetch(`${API_BASE}/api/auth/recuperar-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                vistaSolicitar.classList.add('hidden');
                vistaExito.classList.remove('hidden');
                document.getElementById('exito-titulo').textContent = 'Revisa tu email';
                document.getElementById('exito-msg').textContent =
                    'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.';
            } catch {
                mostrarError('Ocurrió un error. Por favor, intenta de nuevo.');
                btn.disabled = false;
                btn.textContent = 'Enviar enlace de recuperación';
            }
        });

        // Formulario: nueva contraseña
        document.getElementById('form-resetear').addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = document.getElementById('pass-input').value;
            const confirm = document.getElementById('pass-confirm').value;
            if (pass !== confirm) {
                mostrarError('Las contraseñas no coinciden.');
                return;
            }
            const btn = document.getElementById('btn-resetear');
            btn.disabled = true;
            btn.textContent = 'Guardando...';
            try {
                const res = await fetch(`${API_BASE}/api/auth/resetear-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tokenURL, nueva_password: pass }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Error al restablecer');
                vistaResetear.classList.add('hidden');
                vistaExito.classList.remove('hidden');
                document.getElementById('exito-titulo').textContent = 'Contraseña actualizada';
                document.getElementById('exito-msg').textContent =
                    'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.';
            } catch (err) {
                mostrarError(err.message || 'El enlace es inválido o ha expirado.');
                btn.disabled = false;
                btn.textContent = 'Establecer nueva contraseña';
            }
        });
    
