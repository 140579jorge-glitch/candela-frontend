// ponytail: minimal SW to enable PWA installability. No offline cache — upgrade to workbox if needed.
const CACHE = 'candela-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
    // Pass-through: network only. No offline support.
    e.respondWith(fetch(e.request));
});
