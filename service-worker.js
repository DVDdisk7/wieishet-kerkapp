const CACHE_VERSION = 'v1.8';  // Verander dit om de cache te vernieuwen
const CACHE_NAME = `wie-is-het-kerkapp-${CACHE_VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/MuseoSans-500.ttf',
    '/css/MuseoSans-700.ttf',
    '/js/app.js',
    '/js/sweetalert2.all.min.js',
    '/views/login.html',
    '/views/start.html',
    '/views/select.html',
    '/views/game.html'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    // Open de cache en voeg alle bestanden toe
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', event => {
    // Verwijder oude caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    // skip POST requests
                    if (event.request.method !== 'GET') {
                        return fetchResponse;
                    }
                    cache.put(event.request, fetchResponse.clone());
                    return fetchResponse;
                });
            });
        })
    );
});

