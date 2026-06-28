import type { Visit } from "@/types/visit";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodedVisit extends Visit {
  coords: LatLng | null;
}

export interface OSRMRouteData {
  totalDistance: number; // meters
  totalDuration: number; // seconds
  legs: { distance: number; duration: number }[]; // per-leg
  geometry: [number, number][]; // [lng, lat] pairs for polyline
}

// Fallback home coordinates — Rue Georges Tourneur 12, Marchienne-au-Pont 6030
export const HOME_FALLBACK: LatLng = { lat: 50.4082, lng: 4.3869 };
export const HOME_LABEL_FALLBACK = "Domicile — Marchienne-au-Pont";
