"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "last-route";
const SKIP_RESTORE_PATHS = ["/login"];
const RESTORE_ONLY_PATHS = ["/planning", "/stores", "/contacts", "/analytics", "/photos", "/assistant", "/export", "/settings", "/guide"];

/**
 * Persists the current route in localStorage so that when iOS Safari
 * kills the PWA process (after a few minutes in background), the user
 * is returned to their last page instead of always landing on the dashboard.
 */
export default function RouteRestorer() {
  const pathname = usePathname();
  const router = useRouter();
  const hasRestored = useRef(false);

  // On mount (fresh page load), restore the last known route if applicable
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    // Only restore if we landed on the root (which is what iOS does on resume)
    if (pathname !== "/") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      // Only restore paths that make sense (not login, not detail pages with IDs)
      const shouldRestore = RESTORE_ONLY_PATHS.some((p) => saved === p || saved.startsWith(p + "/"));
      if (shouldRestore) {
        router.replace(saved);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save current path on every navigation
  useEffect(() => {
    if (SKIP_RESTORE_PATHS.includes(pathname)) return;
    try {
      localStorage.setItem(STORAGE_KEY, pathname);
    } catch {}
  }, [pathname]);

  return null;
}
