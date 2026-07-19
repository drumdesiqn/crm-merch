const CACHE_VERSION = "v2026.07.01.13.15"; // Bump this on each deploy to bust caches
const CACHE_NAME = `mars-merch-${CACHE_VERSION}`;
const DATA_CACHE = `mars-merch-data-${CACHE_VERSION}`;
// Only precache the two most-used pages; others are cached on first visit (stale-while-revalidate)
const PRECACHE_URLS = ["/", "/planning"];
const CACHEABLE_API_GET_PREFIXES = [
  "/api/weeks",
  "/api/visits",
  "/api/stores",
  "/api/visits/summary",
  "/api/analytics",
  "/api/routes",
];

function isCacheableApiGet(pathname) {
  return CACHEABLE_API_GET_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Install - precache critical pages only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== DATA_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler with offline support
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-http(s)
  if (!url.protocol.startsWith("http")) return;
  
  // Skip auth routes entirely — let the browser handle redirects
  if (url.pathname.startsWith("/api/auth/")) return;

  // API calls - network first with offline queue for mutations
  if (url.pathname.startsWith("/api/")) {
    if (event.request.method !== "GET") {
      // Never queue critical mutations automatically (imports, deletes, uploads, etc.).
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            return new Response(JSON.stringify({ offline: true, error: "Action indisponible hors ligne" }), {
              status: 503,
              headers: { "Content-Type": "application/json" } 
            });
          })
      );
      return;
    }

    if (!isCacheableApiGet(url.pathname)) {
      event.respondWith(
        fetch(event.request).catch(() =>
          new Response(JSON.stringify({ offline: true, error: "Données non disponibles hors ligne" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      return;
    }
    
    // GET API calls - cache for offline use
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true, error: "Données non disponibles hors ligne" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        }))
    );
    return;
  }
  
  // Navigation requests (HTML pages) - network first, fallback to cache only when offline
  if (event.request.method === "GET" && event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful, non-redirect HTML responses
          if (response.ok && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback to cached "/" if available
          return caches.match("/");
        }))
    );
    return;
  }

  // Static assets - cache first (JS, CSS, images, fonts)
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Only cache successful same-origin responses, never redirects
          if (response.ok && response.status === 200 && response.type === "basic" && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// Listen for cache management messages from main thread
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
