const CACHE_NAME = "freedom-public-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/help.html",
  "/urge.html",
  "/cravings.html",
  "/about.html",
  "/books.html",
  "/videos.html",
  "/editorial-standards.html",
  "/theme.css",
  "/logo.svg",
  "/manifest.webmanifest"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("freedom-public-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || /account|admin|community|companion|feedback|professional/i.test(url.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && (url.pathname.endsWith(".css") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webmanifest"))) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});