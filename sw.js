const CACHE_NAME = 'sake-diary-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/router.js',
  './js/helpers.js',
  './js/imageCrop.js',
  './js/prefectures.js',
  './js/dataStore.js',
  './js/photoStore.js',
  './js/firebase-init.js',
  './js/store.js',
  './js/auth.js',
  './js/modals.js',
  './js/components.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './js/views/auth.js',
  './js/views/home.js',
  './js/views/detail.js',
  './js/views/form.js',
  './js/views/search.js',
  './js/views/stats.js',
  './js/views/map.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// アプリ本体(静的ファイル)はネットワーク優先。
// オンラインなら常に最新版を取得してキャッシュを更新し、オフライン時だけキャッシュにフォールバックする。
// (キャッシュ優先だと、ホーム画面に追加したPWAが新しいバージョンをいつまでも見に行かなくなるため)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
