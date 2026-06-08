const CACHE_NAME = 'barq-offline-v6';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/JsBarcode.all.min.js',
    './js/qrcode.min.js',
    './js/jszip.min.js',
    './manifest.json',
    './robots.txt',
    './sitemap.xml',
    './img/KHIT.png',
    './img/apple-touch-icon.png',
    './icons/favicon.ico',
    './icons/favicon-16.png',
    './icons/favicon-32.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon.svg',
    './shapes/bolt.svg',
    './shapes/box.svg',
    './shapes/camera.svg',
    './shapes/cat.svg',
    './shapes/cheese.svg',
    './shapes/chef.svg',
    './shapes/cloud.svg',
    './shapes/compass.svg',
    './shapes/heart.svg',
    './shapes/mail.svg',
    './shapes/star.svg',
    './shapes/thumbs-up.svg'
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
