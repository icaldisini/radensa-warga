// DENGUARD Warga — service worker
// App shell di-cache supaya aplikasi tetap terbuka saat sinyal lemah.
// Data Supabase TIDAK di-cache di sini (aplikasi menyimpannya sendiri di
// localStorage beserta waktu pembaruannya).
const VERSION = 'denguard-warga-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/config.js', './assets/js/util.js', './assets/js/content.js', './assets/js/api.js',
  './assets/js/ui.js', './assets/js/screens.js', './assets/js/app.js',
  './data/kecamatan_44.js',
  './icons/logo.png', './icons/favicon.png', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
];
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'server.arcgisonline.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // network-first untuk file aplikasi, fallback ke cache saat offline
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  if (RUNTIME_HOSTS.includes(url.hostname)) {
    // stale-while-revalidate untuk pustaka CDN, font, dan ubin peta
    e.respondWith(
      caches.open(VERSION).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});
