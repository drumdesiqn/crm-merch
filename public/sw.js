const CACHE_VERSION = "v2026.06.29.22.09"; // Bump this on each deploy to bust caches
const CACHE_NAME = `mars-merch-${CACHE_VERSION}`;
const DATA_CACHE = `mars-merch-data-${CACHE_VERSION}`;
// Only precache the two most-used pages; others are cached on first visit (stale-while-revalidate)
const PRECACHE_URLS = ["/", "/planning"];
const CACHEABLE_API_GET_PREFIXES = [
  "/api/weeks",
  "/api/visits",
  "/api/stores",
  "/api/visits/summary",
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

// Background sync for pending actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-actions") {
    event.waitUntil(syncPendingActions());
  }
});

// Fetch handler with offline support
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-http(s)
  if (!url.protocol.startsWith("http")) return;
  
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
  
  // Static assets - cache first
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// Sync pending actions when back online
async function syncPendingActions() {
  const pending = await getPendingActions();
  const remaining = [];
  
  for (const action of pending) {
    try {
      const headers = new Headers(action.headers);
      await fetch(action.url, {
        method: action.method,
        body: action.body,
        headers
      });
    } catch {
      remaining.push(action);
    }
  }
  
  await savePendingActions(remaining);
  
  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_COMPLETE", remaining: remaining.length });
  });
}

// IndexedDB helpers
function getPendingActions() {
  return new Promise((resolve) => {
    const request = indexedDB.open("MarsMerchDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("pending", "readonly");
      const store = tx.objectStore("pending");
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}

function savePendingActions(actions) {
  return new Promise((resolve) => {
    const request = indexedDB.open("MarsMerchDB", 1);
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("pending", "readwrite");
      const store = tx.objectStore("pending");
      store.clear();
      actions.forEach((action) => store.add(action));
      tx.oncomplete = resolve;
    };
    request.onerror = resolve;
  });
}

// Listen for online/offline events from main thread
self.addEventListener("message", async (event) => {
  if (event.data.type === "SYNC_NOW") {
    syncPendingActions();
  }
  if (event.data.type === "CLEAR_PENDING") {
    savePendingActions([]);
  }
  if (event.data.type === "GET_PENDING_COUNT") {
    const pending = await getPendingActions();
    event.source.postMessage({ type: "PENDING_COUNT", count: pending.length });
  }
});
