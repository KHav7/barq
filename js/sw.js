const CACHE_NAME = 'barq-offline-v6';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './robots.txt',
    './sitemap.xml',
    './KHIT.png',
    './favicon-32.png',
    './favicon-16.png',
    './favicon.ico',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png',
    './JsBarcode.all.min.js',
    './qrcode.min.js',
    './jszip.min.js',
    './bolt.svg',
    './box.svg',
    './camera.svg',
    './cat.svg',
    './cheese.svg',
    './chef.svg',
    './cloud.svg',
    './compass.svg',
    './heart.svg',
    './mail.svg',
    './star.svg',
    './thumbs-up.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});
