/* Mi agenda: guarda la app en el teléfono para que abra sin señal.
   La página se pide primero a la red (así llegan las actualizaciones) y, si no hay señal
   o tarda más de 4 segundos, se usa la copia guardada. Los datos nunca pasan por aquí. */
const CACHE = 'mi-agenda-v2';
const SHELL = ['./', 'index.html', 'icono-180.png', 'icono-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    const net = fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
      return r;
    });
    const slow = new Promise((_, reject) => setTimeout(() => reject(new Error('lento')), 4000));
    e.respondWith(Promise.race([net, slow]).catch(() => caches.match('index.html').then(m => m || net)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(m => m || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
