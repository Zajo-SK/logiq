/* LogiQ service worker – offline app shell (network-first for HTML, cache-first for assets) */
const CACHE = 'logiq-v5';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/util.js', 'js/i18n.js', 'js/store.js', 'js/tasktypes.js', 'js/content.js', 'js/gen_logic.js', 'js/gen_math.js', 'js/gen_chess.js', 'js/worlds.js', 'js/rewards.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
