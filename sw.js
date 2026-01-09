// Service Worker para VaultMail - Modo Offline
const CACHE_NAME = 'vaultmail-v2';
const urlsToCache = [
  // Archivos principales
  '/',
  '/index.html',
  '/main.js',
  '/style.css',
  '/manifest.json',
  
  // Bootstrap CDN
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  
  // Bootstrap Icons CDN
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.woff',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.woff2',
  
  // Bootstrap JS
  'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.min.js',
  
  // Favicon y Assets
  '/Assets/Logo VaultMail - Favicon.webp'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando recursos iniciales');
      return cache.addAll(urlsToCache).catch((error) => {
        console.warn('[SW] Algunos recursos no pudieron ser cacheados:', error);
        // No fallar completamente si algunos CDN no están disponibles
        return cache.addAll(urlsToCache.filter(url => !url.includes('cdn.jsdelivr.net')));
      });
    })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de fetch: Network First para JS/CSS, fallback a Cache
self.addEventListener('fetch', (event) => {
  // Ignorar solicitudes que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isMainFile = url.pathname === '/main.js' || 
                     url.pathname === '/style.css' || 
                     url.pathname === '/index.html';

  if (isMainFile) {
    // Para archivos principales, usar Network First con actualización de cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clonar la respuesta para cachearla
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Si falla la red, intentar caché
          return caches.match(event.request).then((response) => {
            if (response) {
              return response;
            }

            // Mostrar página offline personalizada
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }

            return new Response('No disponible offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
  } else {
    // Para otros recursos (CDN, assets), usar Cache First
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          return caches.match(event.request);
        });
      })
    );
  }
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
