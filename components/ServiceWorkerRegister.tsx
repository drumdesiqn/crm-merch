"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Clean up any old/stuck service workers before registering
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        const currentSW = "/sw.js";
        registrations.forEach((reg) => {
          // Unregister any SW that isn't our current one
          if (reg.active && reg.active.scriptURL !== currentSW && !reg.active.scriptURL.endsWith(currentSW)) {
            reg.unregister().catch(() => {});
          }
        });
        // Also clear old caches that don't match current version
        if (window.caches) {
          window.caches.keys().then((keys) => {
            const currentVersion = "v2026.07.01.13.15";
            keys.forEach((key) => {
              if (!key.includes(currentVersion)) {
                window.caches.delete(key).catch(() => {});
              }
            });
          });
        }
      });

      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent fail — SW is a progressive enhancement
      });
    }
  }, []);

  return null;
}
