// Service Worker for Live2D model caching
const CACHE_NAME = 'live2d-cache-v1';
const MODEL_FILES = [
    '/static/live2d/aersasi_2/aersasi_2.moc3',
    '/static/live2d/aersasi_2/aersasi_2.model3.json',
    '/static/live2d/aersasi_2/aersasi_2.physics3.json',
    '/static/live2d/aersasi_2/motions/idle.motion3.json',
    '/static/live2d/aersasi_2/motions/touch_head.motion3.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(MODEL_FILES);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    console.log('Cache hit for:', event.request.url);
                    return response;
                }
                console.log('Cache miss for:', event.request.url);
                return fetch(event.request);
            })
    );
});
