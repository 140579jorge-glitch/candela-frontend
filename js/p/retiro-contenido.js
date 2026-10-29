/* Formulario de retiro de contenido intimo sin consentimiento. Solo muestra exito si el servidor confirma. */
(function () {
  var API = window.CANDELA_API || 'https://api.clubcandela.com';
  var form = document.getElementById('retiro-form');
  var errorBox = document.getElementById('r-error');
  var boton = document.getElementById('r-enviar');

  function mostrarError(texto) {
    errorBox.textContent = texto;
    errorBox.style.display = 'block';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Convierte la respuesta de validacion del servidor en un texto que la persona entienda
  function mensajeDe(datos, status) {
    if (status === 429) return (datos && datos.detail) || 'Hay demasiadas solicitudes seguidas. Intenta de nuevo en un rato.';
    var d = datos && datos.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d) && d.length) {
      var campo = (d[0].loc || []).slice(-1)[0];
      var etiquetas = { email_contacto: 'Revisa tu correo.', urls: 'Los enlaces deben ser https de clubcandela.com, uno por línea.',
        descripcion: 'Cuéntanos un poco más (mínimo 20 caracteres).', nombre_solicitante: 'Escribe tu nombre completo.', firma: 'Escribe tu nombre completo como firma.' };
      return etiquetas[campo] || 'Revisa los datos del formulario.';
    }
    return 'No pudimos enviar la solicitud. Escríbenos a legal@clubcandela.com.';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';

    var nombre = document.getElementById('r-nombre').value.trim();
    var email = document.getElementById('r-email').value.trim();
    var desc = document.getElementById('r-desc').value.trim();
    var firma = document.getElementById('r-firma').value.trim();
    var urls = document.getElementById('r-urls').value.split('\n').map(function (u) { return u.trim(); }).filter(Boolean);
    var calidad = document.querySelector('input[name="calidad"]:checked').value;

    if (!nombre || !email) return mostrarError('Escribe tu nombre y tu correo.');
    if (desc.length < 20) return mostrarError('Cuéntanos un poco más (mínimo 20 caracteres).');
    if (urls.length > 10) return mostrarError('Puedes indicar hasta 10 enlaces.');
    if (!document.getElementById('r-decl').checked) return mostrarError('Debes confirmar la declaración para enviar la solicitud.');
    if (!firma) return mostrarError('Escribe tu nombre completo como firma.');

    boton.disabled = true;
    boton.textContent = 'Enviando...';
    try {
      var res = await fetch(API + '/api/retiro-contenido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_solicitante: nombre, email_contacto: email, calidad: calidad, urls: urls, descripcion: desc,
          declaracion: true, firma: firma, website: document.getElementById('r-web').value
        })
      });
      var datos = null;
      try { datos = await res.json(); } catch (_) {}
      if (!res.ok || !datos || !datos.ok) {
        mostrarError(mensajeDe(datos, res.status));
        boton.disabled = false; boton.textContent = 'Enviar solicitud';
        return;
      }
      document.getElementById('r-ref').textContent = datos.referencia;
      document.getElementById('r-limite').textContent = datos.limite
        ? new Date(datos.limite).toLocaleString('es', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      form.style.display = 'none';
      document.getElementById('r-ok').style.display = 'block';
      document.getElementById('r-ok').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      mostrarError('No pudimos conectar con el servidor. Intenta de nuevo o escríbenos a legal@clubcandela.com.');
      boton.disabled = false; boton.textContent = 'Enviar solicitud';
    }
  });
})();
