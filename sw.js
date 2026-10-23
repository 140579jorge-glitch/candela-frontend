// ponytail: minimal SW to enable PWA installability. No offline cache — upgrade to workbox if needed.
const CACHE = 'candela-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
    // Solo se atiende lo del propio sitio. Lo de otros dominios (fuentes, API, analitica) lo resuelve el
    // navegador con el CSP de la pagina; si el SW lo pidiera aplicaria su propio connect-src y lo bloquearia.
    if (new URL(e.request.url).origin !== self.location.origin) return;
    // Pass-through: network only. No offline support.
    e.respondWith(fetch(e.request));
});
