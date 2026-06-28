import type { LatLng, GeocodedVisit, OSRMRouteData } from "./types";

// ─── Geocoding ──────────────────────────────────────────────────────────────

// Module-level cache dedupes by address string within a browser session
const _addressCache: Record<string, LatLng | null> = {};

async function nominatimFetch(q: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=be`,
      { headers: { "User-Agent": "MarsmerchApp/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.error("Geocoding error:", err);
  }
  return null;
}

export async function geocodeAddress(address: string, city: string, zip: string): Promise<LatLng | null> {
  const key = `${address} ${zip} ${city}`;
  if (key in _addressCache) return _addressCache[key];

  // Try 1: full address
  let result = await nominatimFetch(`${address}, ${zip} ${city}, Belgium`);

  // Try 2: fallback — zip + city only (more reliable for rural or unusual streets)
  if (!result && zip && city) {
    await sleep(600);
    result = await nominatimFetch(`${zip} ${city}, Belgium`);
  }

  // Try 3: fallback — city name only (last resort)
  if (!result && city) {
    await sleep(600);
    result = await nominatimFetch(`${city}, Belgium`);
  }

  _addressCache[key] = result;
  return result;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Distance helpers ───────────────────────────────────────────────────────

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Fetch real driving route from OSRM (free, no API key) */
export async function fetchOSRMRoute(points: LatLng[]): Promise<OSRMRouteData | null> {
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const route = data.routes[0];
    return {
      totalDistance: route.distance,
      totalDuration: route.duration,
      legs: route.legs.map((l: { distance: number; duration: number }) => ({
        distance: l.distance,
        duration: l.duration,
      })),
      geometry: route.geometry.coordinates as [number, number][],
    };
  } catch {
    return null;
  }
}

/** Fallback: estimate distances using haversine */
export function fallbackLegDistances(home: LatLng, visits: GeocodedVisit[]): { distanceM: number; durationS: number }[] {
  const legs: { distanceM: number; durationS: number }[] = [];
  let prev: LatLng = home;
  for (const v of visits) {
    if (!v.coords) continue;
    const km = haversineKm(prev, v.coords) * 1.3;
    legs.push({ distanceM: km * 1000, durationS: (km / 40) * 3600 });
    prev = v.coords;
  }
  return legs;
}

export function formatKm(meters: number): string {
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `~${h}h${String(m).padStart(2, "0")}` : `~${h}h`;
}

/** Nearest-neighbor heuristic starting from home */
export function optimizeOrder(home: LatLng, visits: GeocodedVisit[]): GeocodedVisit[] {
  const geocoded = visits.filter((v) => v.coords);
  const ungeocoded = visits.filter((v) => !v.coords);
  if (geocoded.length <= 1) return visits;

  const result: GeocodedVisit[] = [];
  const remaining = [...geocoded];
  let current = home;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i].coords!);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    result.push(next);
    current = next.coords!;
  }

  return [...result, ...ungeocoded];
}
