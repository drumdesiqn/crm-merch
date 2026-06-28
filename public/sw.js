// Offline mode has been disabled.
// This service worker unregisters itself and clears all caches.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  event.waitUntil(self.clients.claim());
  event.waitUntil(self.registration.unregister());
});
