const CACHE_NAME = 'passly-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/css/index.css',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/api.js',
    '/js/utils.js',
    '/js/theme.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip API requests and external scripts
    if (event.request.url.includes('/api/') || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
