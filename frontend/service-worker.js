const CACHE_NAME = 'passly-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/css/index.css',
    '/socket.io/socket.io.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
