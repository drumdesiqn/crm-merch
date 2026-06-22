"use client";

let installed = false;

/**
 * Installs a global fetch interceptor that redirects to /login on 401 responses
 * from the app's own API routes. Call once at app startup.
 */
export function installAuthInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await originalFetch(input, init);

    if (res.status === 401) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      // Only redirect for our own API calls, not external services
      if (url.startsWith("/api/") || url.includes("/api/")) {
        // Don't redirect if already on login page
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }

    return res;
  } as typeof window.fetch;
}
