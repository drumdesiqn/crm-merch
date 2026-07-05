"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "@/lib/hooks/useSettings";
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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Save, CheckCircle, Navigation, Route, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Visit } from "@/types/visit";
import { fetchApi } from "@/lib/client-api";
import { showToast } from "@/components/Toast";
import {
  SortableVisitItem,
  LeafletMap,
  geocodeAddress,
  sleep,
  fetchOSRMRoute,
  fallbackLegDistances,
  formatKm,
  formatDuration,
  optimizeOrder,
  HOME_FALLBACK,
  HOME_LABEL_FALLBACK,
} from "@/components/route";
import type { LatLng, GeocodedVisit, OSRMRouteData } from "@/components/route";

type LatLngOrNull = LatLng | null;

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
  const [optimizing, setOptimizing] = useState(false);
  const [osrmRoute, setOsrmRoute] = useState<OSRMRouteData | null>(null);
  const [editingVisit, setEditingVisit] = useState<GeocodedVisit | null>(null);
  const [editAddress, setEditAddress] = useState({ address: "", zipcode: "", city: "" });
  const [savingAddress, setSavingAddress] = useState(false);

  // Load home address from settings via React Query
  const { data: settingsData } = useSettings();
  useEffect(() => {
    const addr = settingsData?.homeAddress?.trim();
    if (!addr) return;
    let cancelled = false;
    geocodeAddress(addr, "", "").then((coords) => {
      if (!cancelled && coords) {
        setHome(coords);
        setHomeLabel(`Domicile — ${addr}`);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [settingsData?.homeAddress]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // When day changes, load visits for that day — use DB-cached coords first
  useEffect(() => {
    const dayVisits = initialVisits
      .filter((v) => v.visitDate.split("T")[0] === selectedDay)
      .map((v) => {
        // Priority: geocodedMap (session cache) > DB cached lat/lng > null
        const cached = geocodedMap[v.id];
        const dbCoords = v.latitude != null && v.longitude != null ? { lat: v.latitude, lng: v.longitude } : null;
        return { ...v, coords: cached ?? dbCoords };
      });
    setOrderedVisits(dayVisits);
  }, [selectedDay, initialVisits, geocodedMap]);

  // Geocode visits for current day progressively — updates map after each address
  useEffect(() => {
    if (!selectedDay) return;
    const dayVisitsAll = initialVisits.filter((v) => v.visitDate.split("T")[0] === selectedDay);
    // Skip visits already in session cache OR with DB-cached coords
    const toGeocode = dayVisitsAll.filter((v) =>
      !(v.id in geocodedCache) && (v.latitude == null || v.longitude == null)
    );
    if (toGeocode.length === 0) return;

    let cancelled = false;
    setGeocoding(true);
    setGeocodingProgress({ done: 0, total: toGeocode.length });
    (async () => {
      for (let i = 0; i < toGeocode.length; i++) {
        if (cancelled) break;
        const v = toGeocode[i];
        const coords = await geocodeAddress(v.storeAddress, v.storeCity, v.storeZipcode);
        if (cancelled) break;
        onGeocodedCacheUpdate((prev) => ({ ...prev, [v.id]: coords }));
        setGeocodingProgress({ done: i + 1, total: toGeocode.length });
        // Save coords to DB for future cache hits (fire & forget)
        if (coords) {
          fetchApi("/api/visits", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: v.id, latitude: coords.lat, longitude: coords.lng }),
            suppressToast: true,
          }).catch(() => {});
        }
        if (i < toGeocode.length - 1) await sleep(1100);
      }
      if (!cancelled) {
        setGeocoding(false);
        setGeocodingProgress(null);
      }
    })();
    return () => { cancelled = true; setGeocoding(false); setGeocodingProgress(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, initialVisits.length]);

  // Keep orderedVisits in sync when cache updates coords
  useEffect(() => {
    setOrderedVisits((prev) =>
      prev.map((v) => ({ ...v, coords: geocodedCache[v.id] ?? null }))
    );
  }, [geocodedCache]);

  // Fetch OSRM driving route when visits are geocoded (debounced)
  useEffect(() => {
    if (geocoding) return;
    const geocoded = orderedVisits.filter((v) => v.coords);
    if (geocoded.length < 1) { setOsrmRoute(null); return; }
    const points: LatLng[] = [home, ...geocoded.map((v) => v.coords!)];
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchOSRMRoute(points).then((data) => {
        if (!cancelled) setOsrmRoute(data);
      });
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
   
  }, [orderedVisits, geocoding, home]);

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
      const ok = await fetchApi("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
        suppressToast: true,
      });
      if (ok === null) throw new Error("API error");
      setSaved(true);
      showToast("success", "Ordre de visite sauvegardé dans le planning");
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
      showToast("error", "Erreur lors de la sauvegarde de l'ordre");
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleOptimize = () => {
    setOptimizing(true);
    const optimized = optimizeOrder(home, orderedVisits);
    setOrderedVisits(optimized);
    setSaved(false);
    setOptimizing(false);
  };

  const handleSaveAddress = async () => {
    if (!editingVisit) return;
    setSavingAddress(true);
    try {
      const ok = await fetchApi("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVisit.id,
          storeAddress: editAddress.address.trim(),
          storeZipcode: editAddress.zipcode.trim(),
          storeCity: editAddress.city.trim(),
        }),
        suppressToast: true,
      });
      if (ok === null) throw new Error("API error");

      // Re-geocode the new address
      const newCoords = await geocodeAddress(
        editAddress.address.trim(),
        editAddress.city.trim(),
        editAddress.zipcode.trim(),
      );
      onGeocodedCacheUpdate((prev) => ({ ...prev, [editingVisit.id]: newCoords }));

      // Update local visit data and notify parent
      const updatedVisits = orderedVisits.map((v) =>
        v.id === editingVisit.id
          ? { ...v, storeAddress: editAddress.address.trim(), storeZipcode: editAddress.zipcode.trim(), storeCity: editAddress.city.trim(), coords: newCoords }
          : v,
      );
      setOrderedVisits(updatedVisits);
      onOrderSaved(updatedVisits);
      setEditingVisit(null);
    } catch {
      // keep dialog open on error
    } finally {
      setSavingAddress(false);
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

  // Show skeleton while initial geocoding starts
  if (orderedVisits.length === 0 && initialVisits.length > 0 && geocoding) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
          <div className="lg:flex-1 rounded-xl bg-slate-200 dark:bg-slate-700 h-[50vh] lg:h-[400px]" />
          <div className="lg:w-80 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
                  ? "bg-blue-mars text-white border-blue-mars"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {dayLabel(day)}
            </button>
          ))}
        </div>
      )}

      {geocoding && geocodingProgress && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-3 h-3 border-2 border-blue-mars border-t-transparent rounded-full animate-spin shrink-0" />
            Géolocalisation… {geocodingProgress.done}/{geocodingProgress.total} adresses
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-mars h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((geocodingProgress.done / geocodingProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Map + list layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map */}
        <div className="lg:flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-[50vh] lg:h-[400px]">
          <LeafletMap visits={orderedVisits} home={home} homeLabel={homeLabel} routeGeometry={osrmRoute?.geometry ?? null} />
        </div>

        {/* Drag-and-drop list */}
        <div className="lg:w-80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-mars" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Ton itinéraire du jour
                <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">({orderedVisits.length})</span>
              </p>
            </div>
            <Button
              size="sm"
              onClick={saveOrder}
              disabled={saving || saved}
              variant={saved ? "success" : saveError ? "destructive" : "default"}
            >
              {saved ? (
                <><CheckCircle className="w-4 h-4" /> Sauvegardé</>
              ) : saveError ? (
                <>⚠ Réessayer</>
              ) : (
                <><Save className="w-4 h-4" /> {saving ? "..." : "Sauvegarder"}</>
              )}
            </Button>
          </div>

          {/* Organiser ma journée — CTA principal */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleOptimize}
            disabled={optimizing || geocoding || orderedVisits.filter((v) => v.coords).length < 2}
            title="Trie automatiquement les magasins par distance depuis ton domicile"
          >
            {optimizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Route className="w-4 h-4 text-blue-mars" />
            )}
            <span>Organiser ma journée</span>
          </Button>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center -mt-1">
            Glisse les visites pour modifier l&apos;ordre manuellement
          </p>

          {/* Route stats */}
          {orderedVisits.some((v) => v.coords) && !geocoding && (() => {
            const fallback = !osrmRoute ? fallbackLegDistances(home, orderedVisits) : [];
            const totalDist = osrmRoute ? osrmRoute.totalDistance : fallback.reduce((s, l) => s + l.distanceM, 0);
            const totalDur = osrmRoute ? osrmRoute.totalDuration : fallback.reduce((s, l) => s + l.durationS, 0);
            return (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{formatKm(totalDist)}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{formatDuration(totalDur)}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{orderedVisits.filter((v) => v.coords).length} étapes</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${osrmRoute ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"}`}>
                  {osrmRoute ? "route réelle" : "estimation"}
                </span>
              </div>
            );
          })()}

          {/* Home point */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-mars-light dark:bg-blue-mars/20 border border-blue-200 dark:border-blue-800">
            <div className="w-7 h-7 rounded-full bg-blue-mars flex items-center justify-center text-sm shrink-0">
              🏠
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-mars dark:text-blue-cpm">Départ domicile</p>
              <p className="text-xs text-blue-cpm dark:text-blue-cpm truncate">{homeLabel.replace("Domicile — ", "")}</p>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedVisits.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0 max-h-[400px] overflow-y-auto pr-1">
                {(() => {
                  // Build leg info from OSRM or fallback
                  const geocodedIndices: number[] = [];
                  orderedVisits.forEach((v, i) => { if (v.coords) geocodedIndices.push(i); });
                  const fallback = fallbackLegDistances(home, orderedVisits);
                  const legMap = new Map<number, { distance: number; duration: number }>();
                  let fbIdx = 0;
                  for (const idx of geocodedIndices) {
                    if (osrmRoute && osrmRoute.legs[fbIdx]) {
                      legMap.set(idx, { distance: osrmRoute.legs[fbIdx].distance, duration: osrmRoute.legs[fbIdx].duration });
                    } else if (fallback[fbIdx]) {
                      legMap.set(idx, { distance: fallback[fbIdx].distanceM, duration: fallback[fbIdx].durationS });
                    }
                    fbIdx++;
                  }
                  return orderedVisits.map((v, i) => (
                    <SortableVisitItem
                      key={v.id}
                      visit={v}
                      index={i}
                      geocoding={geocoding}
                      legInfo={legMap.get(i) ?? null}
                      onEditAddress={() => { setEditingVisit(v); setEditAddress({ address: v.storeAddress, zipcode: v.storeZipcode, city: v.storeCity }); }}
                    />
                  ));
                })()}
              </div>
            </SortableContext>
          </DndContext>

          {orderedVisits.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Aucune visite ce jour</p>
          )}

          {orderedVisits.length > 0 && !geocoding && orderedVisits.every((v) => !v.coords) && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <span>⚠</span>
              Aucune adresse n&apos;a pu être géolocalisée. Les marqueurs ne s&apos;affichent pas sur la carte.
            </div>
          )}
        </div>
      </div>

      {/* Edit address modal — portaled to body to avoid Leaflet z-index issues */}
      {editingVisit && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5 w-full max-w-sm space-y-4 border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Modifier l&apos;adresse</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{editingVisit.storeName}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Adresse</label>
                <input
                  type="text"
                  value={editAddress.address}
                  onChange={(e) => setEditAddress((p) => ({ ...p, address: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars"
                  placeholder="Rue Example 42"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Code postal</label>
                  <input
                    type="text"
                    value={editAddress.zipcode}
                    onChange={(e) => setEditAddress((p) => ({ ...p, zipcode: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Ville</label>
                  <input
                    type="text"
                    value={editAddress.city}
                    onChange={(e) => setEditAddress((p) => ({ ...p, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars"
                    placeholder="Bruxelles"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditingVisit(null)} disabled={savingAddress}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveAddress} disabled={savingAddress || !editAddress.address.trim()}>
                {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}