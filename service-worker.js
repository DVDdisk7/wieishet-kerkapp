const CACHE_VERSION = 'v1.11';  // Verander dit om de cache te vernieuwen
const CACHE_NAME = `wie-is-het-kerkapp-${CACHE_VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/MuseoSans-500.ttf',
    '/css/MuseoSans-700.ttf',
    '/js/app.js',
    '/img/logo.png',
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
    const requestUrl = new URL(event.request.url);

    // Skip POST requests
    if (event.request.method === 'POST') {
        return;
    }

    // if it is an API call to donkeymobile, use network-first policy
    if (requestUrl.pathname.startsWith('/api/')) {
        console.log('API call detected');
        // Network-first policy for API calls
        event.respondWith(
            fetch(event.request).then(fetchResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, fetchResponse.clone());
                    return fetchResponse;
                });
            }).catch(() => {
                return caches.match(event.request);
            })
        );
    } else {
        // Cache-first policy for all other requests
        event.respondWith(caches.open(CACHE_NAME).then((cache) => {
            // Go to the cache first
            return cache.match(event.request.url).then((cachedResponse) => {
              // Return a cached response if we have one
              if (cachedResponse) {
                return cachedResponse;
              }
      
              // Otherwise, hit the network
              return fetch(event.request).then((fetchedResponse) => {
                // Add the network response to the cache for later visits
                cache.put(event.request, fetchedResponse.clone());
                
                // Return the network response
                return fetchedResponse;
              });
            });
          }));
    }
}
);

