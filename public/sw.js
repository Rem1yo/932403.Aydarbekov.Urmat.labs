const CACHE_NAME = "travel-site-v4";

const FILES_TO_CACHE = [
  "/",
  "/about",
  "/shop",
  "/style.css",
  "/storage.js",
  "/script.js",
  "/shop.js",
  "/sw-register.js",
  "/manifest.json",
  "/images/avatar.svg",
  "/images/icon-192.png",
  "/images/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  // новая версия не ждёт закрытия старых вкладок
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API всегда идёт на сервер, данные из кеша были бы устаревшими
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // сначала пробуем сеть, чтобы после правок кода сразу видеть свежие файлы,
  // а если сети нет, отдаём то, что лежит в кеше
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
