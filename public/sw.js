const APP_CACHE = "portguard-app-v1";
const API_CACHE = "portguard-api-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![APP_CACHE, API_CACHE].includes(key)) {
              return caches.delete(key);
            }
            return Promise.resolve();
          }),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Next.js static assets: stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(APP_CACHE).then((cache) =>
        cache.match(req).then((cached) =>
          fetch(req)
            .then((resp) => {
              cache.put(req, resp.clone());
              return resp;
            })
            .catch(() => cached || Promise.reject("network")),
        ),
      ),
    );
    return;
  }

  // API routes: network-first with offline fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(req)
          .then((resp) => {
            cache.put(req, resp.clone());
            return resp;
          })
          .catch(
            () =>
              cache.match(req) ||
              new Response('{"error":"offline"}', {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }),
          ),
      ),
    );
    return;
  }

  // Pages and other assets: cache-first fallback
  event.respondWith(
    caches.open(APP_CACHE).then((cache) =>
      cache.match(req).then((cached) =>
        cached ||
        fetch(req)
          .then((resp) => {
            cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => cached),
      ),
    ),
  );
});