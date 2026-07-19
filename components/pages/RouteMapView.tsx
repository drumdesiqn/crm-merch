"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "@/lib/hooks/useSettings";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { Save, CheckCircle, Navigation, Route, Loader2, Info, MapPin } from "lucide-react";
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
  const [hasUserReordered, setHasUserReordered] = useState(false);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationLabel, setDestinationLabel] = useState("Arrivée — dernière visite");

  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  // Track which day's visits we've initialized to avoid resetting user reorder
  const initializedDayRef = useRef<string>("");

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

  useEffect(() => {
    const addr = settingsData?.endAddress?.trim();
    if (!addr) {
      setDestination(null);
      setDestinationLabel("Arrivée — dernière visite");
      return;
    }
    let cancelled = false;
    geocodeAddress(addr, "", "").then((coords) => {
      if (!cancelled && coords) {
        setDestination(coords);
        setDestinationLabel(`Arrivée — ${addr}`);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [settingsData?.endAddress]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Initialize visits for selected day — ONLY when day changes, not on every cache update
  useEffect(() => {
    if (selectedDay === initializedDayRef.current && hasUserReordered) return;
    initializedDayRef.current = selectedDay;
    setHasUserReordered(false);
    setLockedIds(new Set()); // reset locks when switching day

    const dayVisits = initialVisits
      .filter((v) => v.visitDate.split("T")[0] === selectedDay)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((v) => {
        const cached = geocodedCache[v.id];
        const dbCoords = v.latitude != null && v.longitude != null ? { lat: v.latitude, lng: v.longitude } : null;
        return { ...v, coords: cached ?? dbCoords ?? null };
      });
    setOrderedVisits(dayVisits);
    setSaved(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Update coords on geocoded visits WITHOUT resetting order
  const updateCoordsOnly = useCallback((cache: Record<string, LatLngOrNull>) => {
    setOrderedVisits((prev) =>
      prev.map((v) => {
        const newCoords = cache[v.id];
        if (newCoords !== undefined && newCoords !== v.coords) {
          return { ...v, coords: newCoords };
        }
        return v;
      })
    );
  }, []);

  // When geocodedCache updates, only update coords — never reorder
  useEffect(() => {
    updateCoordsOnly(geocodedCache);
  }, [geocodedCache, updateCoordsOnly]);

  // Geocode visits for current day progressively
  useEffect(() => {
    if (!selectedDay) return;
    const dayVisitsAll = initialVisits.filter((v) => v.visitDate.split("T")[0] === selectedDay);
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

  // Fetch OSRM driving route when visits are geocoded (debounced)
  useEffect(() => {
    if (geocoding) return;
    const geocoded = orderedVisits.filter((v) => v.coords);
    if (geocoded.length < 1) { setOsrmRoute(null); return; }
    const points: LatLng[] = [home, ...geocoded.map((v) => v.coords!), ...(destination ? [destination] : [])];
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchOSRMRoute(points).then((data) => {
        if (!cancelled) setOsrmRoute(data);
      });
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [orderedVisits, geocoding, home, destination]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Block drag if either end is locked
      if (lockedIds.has(String(active.id)) || lockedIds.has(String(over.id))) return;
      setOrderedVisits((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasUserReordered(true);
      setSaved(false);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    setSaveError(false);
    const orders = orderedVisits.map((v, i) => ({ id: v.id, sortOrder: i + 1 }));
    try {
      const ok = await fetchApi("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
        suppressToast: true,
      });
      if (ok === null) throw new Error("API error");

      // Save mileage data for the selected day
      const fallback = !osrmRoute ? fallbackLegDistances(home, orderedVisits, destination) : [];
      const totalDist = osrmRoute ? osrmRoute.totalDistance : fallback.reduce((s, l) => s + l.distanceM, 0);
      const totalDur = osrmRoute ? osrmRoute.totalDuration : fallback.reduce((s, l) => s + l.durationS, 0);
      if (totalDist > 0 && selectedDay) {
        await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDay,
            distanceM: Math.round(totalDist),
            durationS: Math.round(totalDur),
            visitCount: orderedVisits.length,
          }),
        }).catch(() => {});
      }

      setSaved(true);
      showToast("success", "Ordre sauvegardé !");
      setTimeout(() => setSaved(false), 3000);
      const updatedAll = initialVisits.map((v) => {
        const found = orders.find((o) => o.id === v.id);
        return found ? { ...v, sortOrder: found.sortOrder } : v;
      });
      onOrderSaved(updatedAll);
    } catch {
      setSaveError(true);
      showToast("error", "Erreur lors de la sauvegarde");
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleOptimize = () => {
    setOptimizing(true);
    const optimized = optimizeOrder(home, orderedVisits, lockedIds, destination);
    setOrderedVisits(optimized);
    setHasUserReordered(true);
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

      const newCoords = await geocodeAddress(
        editAddress.address.trim(),
        editAddress.city.trim(),
        editAddress.zipcode.trim(),
      );
      onGeocodedCacheUpdate((prev) => ({ ...prev, [editingVisit.id]: newCoords }));

      setOrderedVisits((prev) => prev.map((v) =>
        v.id === editingVisit.id
          ? { ...v, storeAddress: editAddress.address.trim(), storeZipcode: editAddress.zipcode.trim(), storeCity: editAddress.city.trim(), coords: newCoords }
          : v,
      ));
      setEditingVisit(null);
      showToast("success", "Adresse mise à jour");
    } catch {
      showToast("error", "Erreur lors de la sauvegarde de l'adresse");
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

  const geocodedCount = orderedVisits.filter((v) => v.coords).length;

  return (
    <div className="space-y-4">
      {/* Intro banner — explains the feature */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-cpm/5 dark:bg-teal-cpm/10 border border-teal-cpm/20">
        <Info className="w-5 h-5 text-teal-cpm shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
          <p className="font-semibold text-teal-cpm">Comment ça marche ?</p>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
            <li>Choisis un jour ci-dessous</li>
            <li>Clique <strong>&quot;Optimiser le trajet&quot;</strong> pour trier automatiquement</li>
            <li>Utilise le <strong>🔓 cadenas</strong> pour fixer un magasin à sa position avant d&apos;optimiser</li>
            <li>Ajuste manuellement en <strong>glissant-déposant</strong> les visites non verrouillées</li>
            <li>Clique <strong>&quot;Sauvegarder&quot;</strong> pour enregistrer l&apos;ordre</li>
          </ol>
        </div>
      </div>

      {/* Day tabs */}
      {dayKeys.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayKeys.map((day) => {
            const count = initialVisits.filter((v) => v.visitDate.split("T")[0] === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                  selectedDay === day
                    ? "bg-teal-cpm text-white border-teal-cpm shadow-sm"
                    : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {dayLabel(day)}
                <span className={`ml-1.5 text-xs ${selectedDay === day ? "text-white/70" : "text-slate-400"}`}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Single day label when only 1 day */}
      {dayKeys.length === 1 && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-teal-cpm" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">{dayLabel(dayKeys[0])}</p>
          <span className="text-xs text-slate-400">— {orderedVisits.length} visite{orderedVisits.length > 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Geocoding progress */}
      {geocoding && geocodingProgress && (
        <div className="bg-slate-50 dark:bg-[#222223] rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="w-4 h-4 border-2 border-teal-cpm border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Géolocalisation des adresses…</span>
            <span className="ml-auto text-xs text-slate-400">{geocodingProgress.done}/{geocodingProgress.total}</span>
          </div>

          {destination && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm shrink-0 text-white">
                🏁
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Arrivée</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{destinationLabel.replace("Arrivée — ", "")}</p>
              </div>
            </div>
          )}
          <div className="w-full bg-slate-200 dark:bg-[#2e2e30] rounded-full h-2">
            <div
              className="bg-teal-cpm h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((geocodingProgress.done / geocodingProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Map + list layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map */}
        <div className="lg:flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-[#2e2e30] bg-slate-100 dark:bg-[#222223] h-[50vh] lg:h-[450px]">
          <LeafletMap
            visits={orderedVisits}
            home={home}
            homeLabel={homeLabel}
            destination={destination}
            destinationLabel={destinationLabel}
            routeGeometry={osrmRoute?.geometry ?? null}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:w-96 space-y-3">
          {/* Action buttons row */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleOptimize}
              disabled={optimizing || geocoding || geocodedCount < 2}
              title="Trie les magasins par distance depuis ton domicile"
            >
              {optimizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Route className="w-4 h-4" />
              )}
              <span className="ml-1.5">Optimiser le trajet</span>
            </Button>
            <Button
              variant={saved ? "success" : saveError ? "destructive" : "outline"}
              onClick={saveOrder}
              disabled={saving || saved}
            >
              {saved ? (
                <><CheckCircle className="w-4 h-4" /><span className="ml-1 hidden sm:inline">Sauvegardé</span></>
              ) : saveError ? (
                <span>Réessayer</span>
              ) : (
                <><Save className="w-4 h-4" /><span className="ml-1 hidden sm:inline">{saving ? "..." : "Sauvegarder"}</span></>
              )}
            </Button>
          </div>

          {/* Route stats */}
          {geocodedCount > 0 && !geocoding && (() => {
            const fallback = !osrmRoute ? fallbackLegDistances(home, orderedVisits, destination) : [];
            const totalDist = osrmRoute ? osrmRoute.totalDistance : fallback.reduce((s, l) => s + l.distanceM, 0);
            const totalDur = osrmRoute ? osrmRoute.totalDuration : fallback.reduce((s, l) => s + l.durationS, 0);
            return (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#222223] border border-slate-200 dark:border-[#2e2e30]">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-teal-cpm" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatKm(totalDist)}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{formatDuration(totalDur)}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-sm text-slate-500">{geocodedCount + (destination ? 1 : 0)} étapes</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${osrmRoute ? "bg-green-cpm/10 dark:bg-green-cpm/15 text-green-cpm" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"}`}>
                  {osrmRoute ? "route réelle" : "estimation"}
                </span>
              </div>
            );
          })()}

          {/* Home point */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-teal-cpm/5 dark:bg-teal-cpm/10 border border-teal-cpm/20">
            <div className="w-8 h-8 rounded-full bg-teal-cpm flex items-center justify-center text-sm shrink-0">
              🏠
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-teal-cpm">Départ</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{homeLabel.replace("Domicile — ", "")}</p>
            </div>
          </div>

          {/* Drag list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedVisits.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                {(() => {
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
                      isLocked={lockedIds.has(v.id)}
                      onToggleLock={() => toggleLock(v.id)}
                      onEditAddress={() => { setEditingVisit(v); setEditAddress({ address: v.storeAddress, zipcode: v.storeZipcode, city: v.storeCity }); }}
                    />
                  ));
                })()}
              </div>
            </SortableContext>
          </DndContext>

          {orderedVisits.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune visite ce jour</p>
            </div>
          )}

          {orderedVisits.length > 0 && !geocoding && orderedVisits.every((v) => !v.coords) && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <span className="text-base">⚠️</span>
              <span>Aucune adresse n&apos;a pu être géolocalisée. Vérifie les adresses ou modifie-les en cliquant sur ✏️.</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit address modal */}
      {editingVisit && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4" onClick={() => setEditingVisit(null)}>
          <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow-2xl p-5 w-full max-w-sm space-y-4 border border-slate-200 dark:border-[#2e2e30]" onClick={(e) => e.stopPropagation()}>
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
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
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
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Ville</label>
                  <input
                    type="text"
                    value={editAddress.city}
                    onChange={(e) => setEditAddress((p) => ({ ...p, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#222223] px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
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