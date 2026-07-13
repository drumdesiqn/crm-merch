"use client";

import { useEffect, useRef } from "react";
import type { LatLng, GeocodedVisit } from "./types";

export function LeafletMap({
  visits,
  home,
  homeLabel,
  routeGeometry,
}: {
  visits: GeocodedVisit[];
  home: LatLng;
  homeLabel: string;
  routeGeometry: [number, number][] | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);

  // Initialize map ONCE — never destroy on data changes
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { preferCanvas: true }).setView([home.lat, home.lng], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      leafletRef.current = L;
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        leafletRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers and route when data changes — WITHOUT recreating the map
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old layers
    layersRef.current.forEach((l) => { try { l.remove(); } catch {} });
    layersRef.current = [];

    // Home marker
    const homeIcon = L.divIcon({
      html: `<div style="background:#4b7dba;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏠</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const homeMarker = L.marker([home.lat, home.lng], { icon: homeIcon })
      .addTo(map)
      .bindPopup(homeLabel);
    layersRef.current.push(homeMarker);

    // Visit markers with numbers
    const fallbackPoints: [number, number][] = [[home.lat, home.lng]];

    visits.forEach((v, i) => {
      if (!v.coords) return;
      fallbackPoints.push([v.coords.lat, v.coords.lng]);

      const icon = L.divIcon({
        html: `<div style="background:#1e293b;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${i + 1}</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([v.coords.lat, v.coords.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${i + 1}. ${v.storeName}</b><br>${v.storeAddress}<br>${v.storeZipcode} ${v.storeCity}`);
      layersRef.current.push(marker);
    });

    // Route polyline — use OSRM geometry if available, otherwise straight lines
    if (routeGeometry && routeGeometry.length > 1) {
      const latLngs: [number, number][] = routeGeometry.map(([lng, lat]) => [lat, lng]);
      const line = L.polyline(latLngs, { color: "#4b7dba", weight: 4, opacity: 0.8 }).addTo(map);
      layersRef.current.push(line);
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    } else if (fallbackPoints.length > 1) {
      const line = L.polyline(fallbackPoints, { color: "#4b7dba", weight: 2.5, opacity: 0.7, dashArray: "6, 6" }).addTo(map);
      layersRef.current.push(line);
      map.fitBounds(L.latLngBounds(fallbackPoints), { padding: [40, 40] });
    }
  }, [visits, home, homeLabel, routeGeometry]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "300px" }} />;
}
