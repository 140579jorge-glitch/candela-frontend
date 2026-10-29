document.getElementById('abuse-form').onsubmit = async function(e) {
  e.preventDefault();
  var btn = this.querySelector('button[type=submit]');
  btn.textContent = 'Enviando...'; btn.disabled = true;

  var tipo = document.querySelector('input[name="tipo"]:checked')?.value || '';
  var url = document.getElementById('rep-url').value;
  var desc = document.getElementById('rep-desc').value;
  var email = document.getElementById('rep-email').value;

  try {
    // ponytail: send to backend if /api/reporte endpoint exists, else email fallback
    var API = window.CANDELA_API || 'https://api.clubcandela.com';
    var res = await fetch(API + '/api/reporte-abuso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, url, descripcion: desc, email_contacto: email })
    });
    if (!res.ok) throw new Error('http ' + res.status);
    document.getElementById('abuse-form').style.display = 'none';
    document.getElementById('rep-success').style.display = 'block';
  } catch(err) {
    btn.textContent = 'Enviar reporte'; btn.disabled = false;
    alert('No pudimos enviar el reporte. Intenta de nuevo o escribenos a legal@clubcandela.com.');
  }
};
