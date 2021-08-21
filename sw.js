const cacheName = 'CheapVTuber-v1';

const dirPath = '/CheapVTuber';
const imgPath = '/image';
const iconPath = '/icons';
const contentToCache = [
  dirPath,
  dirPath + '/index.html',
  dirPath + '/style.css',
  dirPath + '/script.js',
  dirPath + imgPath + '/face_normal.png',
  dirPath + imgPath + '/mouse_close.png',
  dirPath + imgPath + '/mouse_open_light.png',
  dirPath + imgPath + '/mouse_open.png',
  dirPath + iconPath + '/icon-32.png',
  dirPath + iconPath + '/icon-64.png',
  dirPath + iconPath + '/icon-96.png',
  dirPath + iconPath + '/icon-128.png',
  dirPath + iconPath + '/icon-168.png',
  dirPath + iconPath + '/icon-192.png',
  dirPath + iconPath + '/icon-256.png',
  dirPath + iconPath + '/icon-512.png',
];


self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(contentToCache);
  })());
});

self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if(key !== cacheName) { return caches.delete(key); }
      }));
    })
  );
});
