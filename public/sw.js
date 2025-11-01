const APP_CACHE = "portguard-app-v1";
const API_CACHE = "portguard-api-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
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
      cache.match(req).then(
        (cached) =>
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

// Push notification event handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, url } = data;

    const options = {
      body: body || "Anda memiliki notifikasi baru",
      icon: icon || "/favicon.ico",
      badge: badge || "/favicon.ico",
      tag: tag || "portguard-notification",
      requireInteraction: false,
      actions: [
        {
          action: "view",
          title: "Lihat",
          icon: "/favicon.ico",
        },
        {
          action: "dismiss",
          title: "Tutup",
        },
      ],
      data: {
        url: url || "/notifications",
        timestamp: Date.now(),
      },
    };

    event.waitUntil(
      self.registration.showNotification(
        title || "PortGuard Alert",
        options,
      ),
    );
  } catch (error) {
    // Log error untuk debugging agar lolos lint (no-unused-vars)
    // Catatan: console.error diizinkan sesuai aturan ESLint proyek
    console.error("SW push event error:", error);
    // Fallback jika parsing JSON gagal
    event.waitUntil(
      self.registration.showNotification("PortGuard Alert", {
        body: "Anda memiliki notifikasi baru",
        icon: "/favicon.ico",
        tag: "portguard-fallback",
      }),
    );
  }
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { action, data } = event;
  const url = data?.url || "/notifications";

  if (action === "dismiss") {
    return; // Hanya tutup notifikasi
  }

  // Default action atau action "view" - buka aplikasi
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Cari tab yang sudah terbuka dengan domain yang sama
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }

        // Jika tidak ada tab yang terbuka, buka tab baru
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});
