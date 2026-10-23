function setConsent(v) {
  localStorage.setItem('candela_cookies', v);
  updateStatus();
  if (v === '1' && window.candela_cc_inject) window.candela_cc_inject();
  else location.reload();
}
function updateStatus() {
  var v = localStorage.getItem('candela_cookies');
  var el = document.getElementById('consent-status');
  if (v === '1') el.innerHTML = '<strong style="color:#2E7D32">✓ Has aceptado</strong> las cookies analíticas.';
  else if (v === '0') el.innerHTML = '<strong style="color:#C62828">✗ Has rechazado</strong> las cookies analíticas. Google Analytics no está activo.';
  else el.innerHTML = '<strong style="color:#F57F17">— Pendiente de decisión.</strong> No has aceptado ni rechazado todavía.';
}
updateStatus();
