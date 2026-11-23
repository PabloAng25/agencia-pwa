const CACHE_VERSION = 'agencia-visual-github-v2';
const CACHE_PREFIX = 'agencia-visual-';
const SCOPE = self.registration.scope;
const HOME = new URL('./', SCOPE).href;
const INDEX_HTML = new URL('./index.html', SCOPE).href;
const OFFLINE = new URL('./offline.html', SCOPE).href;
const APP_PATH = new URL(SCOPE).pathname;
const API_PATH = new URL('./api/', SCOPE).pathname;
const ADMIN_PATH = new URL('./admin/', SCOPE).pathname;
const IMAGES_PATH = new URL('./assets/images/', SCOPE).pathname;

const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './assets/app.js',
  './assets/db.js',
  './assets/portfolio.js',
  './assets/styles.css', 
  './manifest.webmanifest',
  './icons/icon-192.png', 
  './icons/icon-512.png', 
  './assets/images/fotografia-publicitaria.svg',
  './assets/images/render-producto-3d.svg',
  './assets/images/animacion-3d-concepto.svg'
];

const SHELL_URLS = new Set(PRECACHE.map(path => new URL(path, SCOPE).href));

function enAreaPrivada(url) {
  return url.pathname.startsWith(API_PATH) || url.pathname.startsWith(ADMIN_PATH);
}

function esHome(url) {
  return url.pathname === APP_PATH || url.pathname === new URL(INDEX_HTML).pathname;
}

// Instalar sin bloquear el SW si algún archivo de tus compañeros aún falta.
// ATENCIÓN: una instalación exitosa NO demuestra que toda la Home esté offline.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(PRECACHE.map(async path => {
      try {
        await cache.add(new URL(path, SCOPE).href);
      } catch (error) {
        console.warn('[SW] Recurso pendiente / no cacheado:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key !== CACHE_VERSION &&
        (key.startsWith(CACHE_PREFIX) || key === 'avisos-php-v1'))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_PATH)) return;

  // Nunca guardar sesiones, configuraciones ni respuestas del administrador.
  if (enAreaPrivada(url)) return;

  // Página principal: usar shell offline, si se ha visitado/precargado.
  if (request.mode === 'navigate' && esHome(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const local = await cache.match(HOME) || await cache.match(INDEX_HTML);
      if (local) return local;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(HOME, response.clone());
        return response;
      } catch {
        return (await cache.match(OFFLINE)) || new Response('Sin conexión', { status: 503 });
      }
    })());
    return;
  }

  // App Shell: cache-first. No hace solicitudes remotas cuando ya está cacheado.
  const shellUrl = [...SHELL_URLS].find(x => new URL(x).pathname === url.pathname);
  if (shellUrl) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const local = await cache.match(shellUrl);
      if (local) return local;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(shellUrl, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Galería: cache-first en las imágenes públicas vistas previamente.
  if (request.destination === 'image' && url.pathname.startsWith(IMAGES_PATH)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const local = await cache.match(request);
      if (local) return local;
      try {
        const response = await fetch(request);
        if (response.ok) {
          try { await cache.put(request, response.clone()); }
          catch (error) { console.warn('[SW] Almacenamiento lleno:', error); }
        }
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Otra página pública no precargada: intentar red; fallback de solo lectura.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(OFFLINE)) || new Response('Sin conexión', { status: 503 });
      }
    })());
  }
});

