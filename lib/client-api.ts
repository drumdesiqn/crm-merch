"use client";

import { showToast } from "@/components/Toast";

interface FetchApiOptions extends RequestInit {
  /** If true, do not show a toast on network/server errors. */
  suppressToast?: boolean;
  /** If true, do not redirect to /login on 401. */
  suppressAuthRedirect?: boolean;
}

/**
 * Wrapper around fetch for the app's own API routes.
 * - Parses JSON automatically
 * - Shows a toast on network or server errors
 * - Redirects to /login on 401 (unless suppressed)
 */
export async function fetchApi<T = unknown>(
  input: RequestInfo | URL,
  options: FetchApiOptions = {}
): Promise<T | null> {
  const { suppressToast, suppressAuthRedirect, ...init } = options;

  try {
    const res = await fetch(input, init);

    if (res.status === 401 && !suppressAuthRedirect) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      return null;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Erreur serveur" }));
      if (!suppressToast) {
        showToast("error", data.error || `Erreur ${res.status}`);
      }
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error("fetchApi error:", err);
    if (!suppressToast) {
      showToast("error", "Erreur réseau. Vérifie ta connexion.");
    }
    return null;
  }
}
