const CACHE_NAME = "freedom-public-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  "/", "/index.html", "/offline.html", "/help.html", "/urge.html",
  "/cravings.html", "/about.html", "/books.html", "/videos.html",
  "/editorial-standards.html", "/theme.css", "/logo.svg", "/manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache each resource independently: one unavailable page must not cancel
    // the entire installation and leave the app without an offline fallback.
    await Promise.allSettled(PRECACHE.map(async path => {
      const response = await fetch(path, { cache: "reload" });
      if (response.ok) await cache.put(path, response);
    }));
    // The offline page is the minimum viable fallback.
    const offline = await cache.match(OFFLINE_URL);
    if (!offline) throw new Error("FREEDOM offline fallback could not be cached.");
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("freedom-public-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache APIs, account data, moderation tools, or private/dynamic pages.
  if (url.pathname.startsWith("/api/") || /account|admin|community|companion|feedback|professional/i.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(url.pathname)) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && (url.pathname.endsWith(".css") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webmanifest"))) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response("", { status: 503, statusText: "Offline" });
    }
  })());
});
