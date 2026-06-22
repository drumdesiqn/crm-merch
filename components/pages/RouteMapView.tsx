"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, CheckCircle, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VISIT_TYPE_COLORS } from "@/lib/utils";
import type { Visit } from "@/types/visit";

interface LatLng {
  lat: number;
  lng: number;
}

interface GeocodedVisit extends Visit {
  coords: LatLng | null;
}

// Fallback home coordinates — Rue Georges Tourneur 12, Marchienne-au-Pont 6030
const HOME_FALLBACK: LatLng = { lat: 50.4082, lng: 4.3869 };
const HOME_LABEL_FALLBACK = "Domicile — Marchienne-au-Pont";

// Geocode using Nominatim OSM (free, no API key)
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

async function geocodeAddress(address: string, city: string, zip: string): Promise<LatLng | null> {
  const key = `${address} ${zip} ${city}`;
  if (key in _addressCache) return _addressCache[key];

  // Try 1: full address
  let result = await nominatimFetch(`${address}, ${zip} ${city}, Belgium`);

  // Try 2: fallback — zip + city only (more reliable for rural or unusual streets)
  if (!result && zip && city) {
    await sleep(600);
    result = await nominatimFetch(`${zip} ${city}, Belgium`);
  }

  _addressCache[key] = result;
  return result;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Sortable item ─────────────────────────────────────────────────────────
function SortableVisitItem({
  visit,
  index,
  geocoding,
}: {
  visit: GeocodedVisit;
  index: number;
  geocoding: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: visit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const typeColor = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border bg-white transition-shadow ${
        isDragging ? "shadow-lg border-red-300" : "border-slate-100 hover:border-slate-200"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Déplacer"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          visit.coords ? "bg-red-600 text-white" : "bg-slate-200 text-slate-500"
        }`}
      >
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{visit.storeName}</p>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 truncate">
            {visit.storeAddress}, {visit.storeZipcode} {visit.storeCity}
          </p>
        </div>
      </div>

      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${typeColor}`}>
        {visit.visitType}
      </span>

      {!visit.coords && !geocoding && (
        <span className="text-xs text-slate-400 shrink-0" title="Adresse non géolocalisée">
          📍?
        </span>
      )}
    </div>
  );
}

// ─── Map component (loaded dynamically) ────────────────────────────────────
function LeafletMap({ visits, home, homeLabel }: { visits: GeocodedVisit[]; home: LatLng; homeLabel: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const layersRef = useRef<unknown[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamically import leaflet (client-side only)
    import("leaflet").then((L) => {
      // Fix Leaflet default icon path in Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current!, { preferCanvas: true }).setView([home.lat, home.lng], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;
        // Force Leaflet to recalculate container size (needed in dynamic imports)
        setTimeout(() => map.invalidateSize(), 100);
      }

      const map = mapInstanceRef.current as ReturnType<typeof L.map>;

      // Clear old layers
      layersRef.current.forEach((l) => (l as ReturnType<typeof L.marker>).remove());
      layersRef.current = [];

      // Home marker
      const homeIcon = L.divIcon({
        html: `<div style="background:#dc2626;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏠</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const homeMarker = L.marker([home.lat, home.lng], { icon: homeIcon })
        .addTo(map)
        .bindPopup(homeLabel);
      layersRef.current.push(homeMarker);

      // Visit markers with numbers
      const routePoints: [number, number][] = [[home.lat, home.lng]];

      visits.forEach((v, i) => {
        if (!v.coords) return;
        routePoints.push([v.coords.lat, v.coords.lng]);

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

      // Route polyline
      if (routePoints.length > 1) {
        const line = L.polyline(routePoints, { color: "#dc2626", weight: 2.5, opacity: 0.7, dashArray: "6, 6" }).addTo(map);
        layersRef.current.push(line);

        // Fit map to route
        map.fitBounds(L.latLngBounds(routePoints), { padding: [40, 40] });
      }
    });

    // Cleanup function to prevent memory leak
    return () => {
      const map = mapInstanceRef.current as { remove: () => void } | null;
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "300px" }} />;
}

type LatLngOrNull = { lat: number; lng: number } | null;

// ─── Main RouteMapView ──────────────────────────────────────────────────────
export default function RouteMapView({
  visits: initialVisits,
  geocodedCache,
  onGeocodedCacheUpdate,
  onOrderSaved,
}: {
  visits: Visit[];
  geocodedCache: Record<string, LatLngOrNull>;
  onGeocodedCacheUpdate: (updater: (prev: Record<string, LatLngOrNull>) => Record<string, LatLngOrNull>) => void;
  onOrderSaved: (reorderedVisits: Visit[]) => void;
}) {
  // Group by day
  const dayKeys = Array.from(
    new Set(initialVisits.map((v) => v.visitDate.split("T")[0]))
  ).sort();

  const [selectedDay, setSelectedDay] = useState(dayKeys[0] ?? "");
  const geocodedMap = geocodedCache;
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{ done: number; total: number } | null>(null);
  const [orderedVisits, setOrderedVisits] = useState<GeocodedVisit[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [home, setHome] = useState<LatLng>(HOME_FALLBACK);
  const [homeLabel, setHomeLabel] = useState(HOME_LABEL_FALLBACK);

  // Load home address from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(async (s) => {
        if (s.homeAddress && typeof s.homeAddress === "string" && s.homeAddress.trim()) {
          const coords = await geocodeAddress(s.homeAddress.trim(), "", "");
          if (coords) {
            setHome(coords);
            setHomeLabel(`Domicile — ${s.homeAddress.trim()}`);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // When day changes, load visits for that day
  useEffect(() => {
    const dayVisits = initialVisits
      .filter((v) => v.visitDate.split("T")[0] === selectedDay)
      .map((v) => ({ ...v, coords: geocodedMap[v.id] ?? null }));
    setOrderedVisits(dayVisits);
  }, [selectedDay, initialVisits, geocodedMap]);

  // Geocode visits for current day progressively — updates map after each address
  useEffect(() => {
    if (!selectedDay) return;
    const dayVisitsAll = initialVisits.filter((v) => v.visitDate.split("T")[0] === selectedDay);
    const toGeocode = dayVisitsAll.filter((v) => !(v.id in geocodedCache));
    if (toGeocode.length === 0) return;

    setGeocoding(true);
    setGeocodingProgress({ done: 0, total: toGeocode.length });
    (async () => {
      for (let i = 0; i < toGeocode.length; i++) {
        const v = toGeocode[i];
        const coords = await geocodeAddress(v.storeAddress, v.storeCity, v.storeZipcode);
        onGeocodedCacheUpdate((prev) => ({ ...prev, [v.id]: coords }));
        setGeocodingProgress({ done: i + 1, total: toGeocode.length });
        if (i < toGeocode.length - 1) await sleep(1100);
      }
      setGeocoding(false);
      setGeocodingProgress(null);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, initialVisits.length]);

  // Keep orderedVisits in sync when cache updates coords
  useEffect(() => {
    setOrderedVisits((prev) =>
      prev.map((v) => ({ ...v, coords: geocodedCache[v.id] ?? null }))
    );
  }, [geocodedCache]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedVisits((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setSaved(false);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    setSaveError(false);
    const orders = orderedVisits.map((v, i) => ({ id: v.id, sortOrder: i + 1 }));
    // Snapshot the current display order so the useEffect re-sync doesn't reset it
    const savedOrder = orderedVisits.map((v) => v.id);
    try {
      const res = await fetch("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error("API error");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Build updatedAll with new sortOrders, then re-sort by savedOrder so parent state matches
      const updatedAll = initialVisits.map((v) => {
        const found = orders.find((o) => o.id === v.id);
        return found ? { ...v, sortOrder: found.sortOrder } : v;
      });
      // Re-apply the saved display order so useEffect doesn't scramble orderedVisits
      setOrderedVisits((prev) => {
        const byId = Object.fromEntries(prev.map((v) => [v.id, v]));
        return savedOrder.map((id) => byId[id]).filter(Boolean) as GeocodedVisit[];
      });
      onOrderSaved(updatedAll);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-BE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  return (
    <div className="space-y-4">
      {/* Day tabs */}
      {dayKeys.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayKeys.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                selectedDay === day
                  ? "bg-red-600 text-white border-red-600"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {dayLabel(day)}
            </button>
          ))}
        </div>
      )}

      {geocoding && geocodingProgress && (
        <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
            Géolocalisation… {geocodingProgress.done}/{geocodingProgress.total} adresses
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((geocodingProgress.done / geocodingProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Map + list layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map */}
        <div className="lg:flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: "400px" }}>
          <LeafletMap visits={orderedVisits} home={home} homeLabel={homeLabel} />
        </div>

        {/* Drag-and-drop list */}
        <div className="lg:w-80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-red-600" />
              <p className="text-sm font-semibold text-slate-900">
                {orderedVisits.length} visite{orderedVisits.length > 1 ? "s" : ""} — glisse pour réordonner
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                onClick={saveOrder}
                disabled={saving || saved}
                variant={saved ? "success" : saveError ? "destructive" : "default"}
              >
                {saved ? (
                  <><CheckCircle className="w-4 h-4" /> Sauvegardé</>
                ) : saveError ? (
                  <>⚠ Erreur — Réessayer</>
                ) : (
                  <><Save className="w-4 h-4" /> {saving ? "..." : "Sauvegarder"}</>
                )}
              </Button>
            </div>
          </div>

          {/* Home point */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-sm shrink-0">
              🏠
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-800">Départ domicile</p>
              <p className="text-xs text-red-600 truncate">{homeLabel.replace("Domicile — ", "")}</p>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedVisits.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {orderedVisits.map((v, i) => (
                  <SortableVisitItem key={v.id} visit={v} index={i} geocoding={geocoding} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {orderedVisits.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Aucune visite ce jour</p>
          )}

          {orderedVisits.length > 0 && !geocoding && orderedVisits.every((v) => !v.coords) && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span>⚠</span>
              Aucune adresse n&apos;a pu être géolocalisée. Les marqueurs ne s&apos;affichent pas sur la carte.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
