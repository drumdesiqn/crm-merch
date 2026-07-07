"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Upload, Calendar, MapPin, User, AlertCircle, ChevronRight, X, CheckCircle, List, Navigation, FileDown, Wrench, Route, Plus, CalendarDays, Trash2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VISIT_TYPE_COLORS, ASSORTMENT_COLORS, VisitStatus } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { useQueryClient } from "@tanstack/react-query";
import { useWeeks } from "@/lib/hooks/useWeeks";
import { useVisits } from "@/lib/hooks/useVisits";
import { useSummary } from "@/lib/hooks/useSummary";
import { useImport } from "@/lib/hooks/useImport";
import { useStores } from "@/lib/hooks/useStores";
import { useCreateVisit } from "@/lib/hooks/useCreateVisit";
import { useUpdateVisit } from "@/lib/hooks/useUpdateVisit";
import { useDeleteVisit } from "@/lib/hooks/useDeleteVisit";
import { showToast } from "@/components/Toast";
import { fetchApi } from "@/lib/client-api";
import FrenchDatePicker from "@/components/FrenchDatePicker";
import type { Visit, Week } from "@/types/visit";

const EMPTY_VISITS: Visit[] = [];

const RouteMapView = dynamic(() => import("@/components/pages/RouteMapView"), { ssr: false, loading: () => (
  <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-mars border-t-transparent rounded-full animate-spin" /></div>
) });

interface DayGroup {
  date: string;
  label: string;
  visits: Visit[];
}

export default function PlanningPage() {
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [localVisits, setLocalVisits] = useState<Visit[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<{ file: File; count: number; label: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [geocodedCache, setGeocodedCache] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [visitsTruncated, setVisitsTruncated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: weeks = [] } = useWeeks();
  const effectiveWeekId = selectedWeekId || (weeks[0]?.id ?? "");
  const { data: visitsResult } = useVisits(effectiveWeekId);
  const visits: Visit[] = visitsResult?.visits ?? EMPTY_VISITS;
  const allVisitsTruncated = visitsResult?.truncated ?? false;
  const { data: summaryStores = {} } = useSummary();
  const { data: stores = [] } = useStores();
  const importMutation = useImport();
  const createVisit = useCreateVisit();
  const updateVisit = useUpdateVisit();
  const deleteVisit = useDeleteVisit();

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planStoreId, setPlanStoreId] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [editingVisit, setEditingVisit] = useState<{ id: string; date: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState(false);
  const [deletingWeek, setDeletingWeek] = useState(false);

  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      setSelectedWeekId(weeks[0].id);
    }
    setIsReady(true);
  }, [weeks, selectedWeekId]);

  useEffect(() => {
    setLocalVisits(visits);
    if (allVisitsTruncated) setVisitsTruncated(true);
  }, [visits, allVisitsTruncated]);

  const handlePlanVisit = async () => {
    if (!planStoreId || !planDate) {
      showToast("error", "Sélectionne un magasin et une date");
      return;
    }
    try {
      await createVisit.mutateAsync({ storeId: planStoreId, weekId: effectiveWeekId, visitDate: planDate });
      showToast("success", "Magasin planifié");
      setShowPlanForm(false);
      setPlanStoreId("");
      setPlanDate("");
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({ queryKey: ["weeks"] });
    } catch {
      showToast("error", "Erreur lors de la planification");
    }
  };

  const handleUpdateDate = async (id: string, newDate: string) => {
    try {
      await updateVisit.mutateAsync({ id, visitDate: newDate });
      showToast("success", "Date mise à jour");
      setEditingVisit(null);
    } catch {
      showToast("error", "Erreur lors du changement de date");
    }
  };

  const handleWeekChange = (weekId: string) => {
    setSelectedWeekId(weekId);
    setGeocodedCache({});
  };

  const handleDeleteWeek = async () => {
    if (!effectiveWeekId) return;
    setDeletingWeek(true);
    try {
      const result = await fetchApi("/api/weeks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: effectiveWeekId }),
        suppressToast: true,
      });
      if (!result) throw new Error();
      showToast("success", "Semaine supprimée");
      setConfirmDeleteWeek(false);
      setSelectedWeekId("");
      await queryClient.invalidateQueries({ queryKey: ["weeks"] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
    } catch {
      showToast("error", "Erreur lors de la suppression de la semaine");
    } finally {
      setDeletingWeek(false);
    }
  };

  const handleFile = async (file: File, mode: "check" | "replace" | "merge" = "check") => {
    try {
      const data = await importMutation.mutateAsync({ file, mode });

      if (data.error) {
        setImportMsg({ type: "error", text: data.error });
        return;
      }

      if (mode === "check" && data.exists) {
        setPendingImport({ file, count: data.count || 0, label: data.label || "" });
        return;
      }

      const warnings = data.warnings;
      const warningText = warnings && warnings.length > 0 ? ` ⚠ ${warnings.join(" ")}` : "";
      setImportMsg({ type: "success", text: `✓ ${data.count} visites importées — ${data.label}${warningText}` });
      setPendingImport(null);

      await queryClient.invalidateQueries({ queryKey: ["weeks"] });
      const newWeeks = queryClient.getQueryData<Week[]>(["weeks"]);
      const imported = newWeeks?.find((w) => w.label === data.label);
      if (imported) {
        setSelectedWeekId(imported.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
    } catch {
      setImportMsg({ type: "error", text: "Erreur réseau lors de l'import" });
    }
  };

  const storeVisitCount = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(summaryStores).forEach(([id, s]) => { counts[id] = s.total; });
    return counts;
  }, [summaryStores]);

  const storeCompletedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(summaryStores).forEach(([id, s]) => { counts[id] = s.completed; });
    return counts;
  }, [summaryStores]);

  const filteredVisits = useMemo(() => {
    let result = localVisits;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((v) =>
        v.storeName?.toLowerCase().includes(q) ||
        v.storeCity?.toLowerCase().includes(q) ||
        v.storeAddress?.toLowerCase().includes(q) ||
        v.storeZipcode?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") result = result.filter((v) => v.status === filterStatus);
    if (filterType !== "all") result = result.filter((v) => v.visitType === filterType);
    return result;
  }, [localVisits, searchQuery, filterStatus, filterType]);

  const visitTypes = useMemo(() => Array.from(new Set(localVisits.map((v) => v.visitType).filter(Boolean))), [localVisits]);

  const dayGroups = useMemo(() => filteredVisits.reduce((acc: Record<string, Visit[]>, v: Visit) => {
    const day = v.visitDate.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(v);
    return acc;
  }, {} as Record<string, Visit[]>), [filteredVisits]);

  const sortedDays: DayGroup[] = useMemo(() => Object.entries(dayGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayVisits]) => ({
      date,
      label: (() => {
        const [y, m, d] = date.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("fr-BE", {
          weekday: "long", day: "2-digit", month: "long",
        });
      })(),
      visits: dayVisits,
    })), [dayGroups]);


  useEffect(() => {
    const saved = sessionStorage.getItem("planning-scroll");
    if (saved) {
      const y = parseInt(saved, 10);
      setTimeout(() => window.scrollTo({ top: y, behavior: "instant" }), 80);
      sessionStorage.removeItem("planning-scroll");
    }
  }, []);


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {!isReady || weeks.length === 0 || effectiveWeekId === "" ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-blue-mars border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        // Actual content
        <>
          {visitsTruncated && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Affichage limité à 500 visites. Utilise le filtre par semaine pour voir toutes les visites.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Planning</h1>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
              {localVisits.length > 0 && (
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${viewMode === "list" ? "bg-blue-mars text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                  >
                    <List className="w-4 h-4" /> Liste
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    title="Organise et optimise ton itinéraire de la journée sur la carte"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-600 whitespace-nowrap ${viewMode === "map" ? "bg-blue-mars text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                  >
                    <Route className="w-4 h-4" />
                    <span className="hidden sm:inline">Routing journée</span>
                    <span className="sm:hidden">Routing</span>
                  </button>
                </div>
              )}
              <Link href="/export" className="shrink-0">
                <Button size="sm" variant="outline" aria-label="Exporter en PDF">
                  <FileDown className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Export PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </Link>
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importMutation.isPending} className="shrink-0 whitespace-nowrap" aria-label="Importer un fichier Excel">
                <Upload className="w-4 h-4 mr-1" />
                {importMutation.isPending ? "..." : <span className="hidden sm:inline">Importer Excel</span>}
                {importMutation.isPending ? "" : <span className="sm:hidden">Import</span>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPlanForm(true)} className="shrink-0 whitespace-nowrap" aria-label="Ajouter un magasin au planning">
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Ajouter magasin</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "check");
              e.target.value = "";
            }}
          />

          {/* Drop zone — hidden when visits are already loaded */}
          {localVisits.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f, "check");
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragging ? "border-blue-cpm bg-blue-mars-light dark:bg-blue-mars/20" : "border-slate-200 dark:border-slate-600 hover:border-slate-300"}`}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Glisse ton fichier Excel ici ou clique pour choisir</p>
            </div>
          )}

          {/* Import feedback */}
          {importMsg && (
            <div className={`flex items-center gap-3 rounded-lg p-3 text-sm ${importMsg.type === "success" ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800" : "bg-red-mars-light text-red-mars border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"}`}>
              {importMsg.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{importMsg.text}</span>
              <button onClick={() => setImportMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Confirm overwrite dialog */}
          {pendingImport && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                La semaine <strong>{pendingImport.label}</strong> existe déjà ({pendingImport.count} visites détectées).
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleFile(pendingImport.file, "replace")}>Remplacer</Button>
                <Button size="sm" variant="outline" onClick={() => handleFile(pendingImport.file, "merge")}>Fusionner</Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingImport(null)}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Week selector */}
          {weeks.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {weeks.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleWeekChange(w.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${(selectedWeekId || weeks[0]?.id) === w.id ? "bg-blue-mars text-white border-blue-mars" : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  {w.label} · {w._count.visits} visites
                </button>
              ))}
              {effectiveWeekId && (
                <button
                  onClick={() => setConfirmDeleteWeek(true)}
                  title="Supprimer cette semaine"
                  className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Search + filters */}
          {localVisits.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un magasin, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-mars"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars"
              >
                <option value="all">Tous statuts</option>
                <option value="pending">À faire</option>
                <option value="done">Terminé</option>
                <option value="cancelled">Annulé</option>
                <option value="postponed">Reporté</option>
              </select>
              {visitTypes.length > 1 && (
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-mars"
                >
                  <option value="all">Tous types</option>
                  {visitTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {(searchQuery || filterStatus !== "all" || filterType !== "all") && (
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap self-center">
                  {filteredVisits.length} / {localVisits.length} visite{localVisits.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}

          {/* Visits — list or map view */}
          {localVisits.length === 0 && weeks.length > 0 && selectedWeekId !== "" ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune visite pour cette semaine</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Importe ton fichier Excel ou ajoute une visite manuellement</p>
            </div>
          ) : viewMode === "map" ? (
            <RouteMapView
              visits={localVisits}
              geocodedCache={geocodedCache}
              onGeocodedCacheUpdate={setGeocodedCache}
              onOrderSaved={(reordered) => setLocalVisits(reordered)}
            />
          ) : (
            sortedDays.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex items-center gap-2 py-1">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{day.label}</h2>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{day.visits.length} visite{day.visits.length > 1 ? "s" : ""}</span>
                </div>
                {day.visits.map((v) => (
                  <VisitCard
                    key={v.id}
                    visit={v}
                    totalVisits={storeVisitCount[v.storeId || v.storeName] || 0}
                    completedVisits={storeCompletedCount[v.storeId || v.storeName] || 0}
                    onUpdateDate={(id, date) => setEditingVisit({ id, date })}
                    onDelete={async (id) => {
                      try {
                        await deleteVisit.mutateAsync(id);
                        showToast("success", "Visite supprimée");
                      } catch {
                        showToast("error", "Erreur lors de la suppression");
                      }
                    }}
                  />
                ))}
              </div>
            ))
          )}

          {/* Plan visit modal */}
          {showPlanForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPlanForm(false)}>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ajouter un magasin</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Magasin</label>
                  <select
                    value={planStoreId}
                    onChange={(e) => setPlanStoreId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-base"
                  >
                    <option value="">Choisir un magasin</option>
                    {stores.map((s) => (
                      <option key={s.storeId} value={s.storeId}>{s.storeName} ({s.storeCity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                  <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-3">
                    <FrenchDatePicker value={planDate} onChange={setPlanDate} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handlePlanVisit} disabled={createVisit.isPending}>
                    {createVisit.isPending ? "..." : "Planifier"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowPlanForm(false)}>Annuler</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete week confirmation modal */}
      {confirmDeleteWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDeleteWeek(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/40 shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Supprimer la semaine ?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toutes les visites, notes et photos seront supprimées. Irréversible.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                disabled={deletingWeek}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                onClick={handleDeleteWeek}
              >
                {deletingWeek ? "Suppression..." : "Supprimer"}
              </button>
              <button
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setConfirmDeleteWeek(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit date modal */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingVisit(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Changer de jour</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nouvelle date</label>
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-3">
                <FrenchDatePicker
                  value={editingVisit.date}
                  onChange={(d) => setEditingVisit({ ...editingVisit, date: d })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => handleUpdateDate(editingVisit.id, editingVisit.date)} disabled={updateVisit.isPending}>
                {updateVisit.isPending ? "..." : "Enregistrer"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditingVisit(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VisitCard({ visit, totalVisits, completedVisits, onUpdateDate, onDelete }: { visit: Visit; totalVisits?: number; completedVisits?: number; onUpdateDate?: (id: string, date: string) => void; onDelete?: (id: string) => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typeColor = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
  const assortColor = ASSORTMENT_COLORS[visit.assortment] || "bg-slate-100 text-slate-700";
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${visit.storeAddress} ${visit.storeZipcode} ${visit.storeCity}`)}&navigate=yes`;

  return (
    <div onClick={() => { sessionStorage.setItem("planning-scroll", String(window.scrollY)); router.push(`/planning/${visit.id}`); }} className="cursor-pointer">
      <Card className="hover:shadow-md hover:border-blue-200 transition-all">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{visit.storeName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColor}`}>
                  {visit.visitType}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${assortColor}`}>
                  {visit.assortment}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{visit.storeAddress}, {visit.storeZipcode} {visit.storeCity}</p>
                {totalVisits !== undefined && totalVisits > 0 && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{completedVisits || 0}/{totalVisits} visites</span>
                )}
              </div>
              {visit.salesRep && (
                <div className="flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">{visit.salesRep}</p>
                </div>
              )}
              {visit.remarks && (
                <div className="flex items-start gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-600 dark:text-orange-400 line-clamp-2">{visit.remarks}</p>
                </div>
              )}
              {visit.materialType && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <Wrench className="w-3 h-3 text-blue-mars shrink-0" />
                  {visit.materialType.split(", ").filter(Boolean).map((type, idx) => (
                    <span key={idx} className="text-xs text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      {type}
                    </span>
                  ))}
                </div>
              )}
              {visit.status && visit.status !== "pending" && (
                <StatusBadge status={visit.status as VisitStatus} size="sm" className="mt-1" />
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateDate?.(visit.id, visit.visitDate.split("T")[0]); }}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              title="Changer de jour"
              aria-label="Changer de jour"
            >
              <CalendarDays className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Supprimer la visite"
              aria-label="Supprimer la visite"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#00bfff]/10 hover:bg-[#00bfff]/20 transition-colors"
              title="Naviguer avec Waze"
              aria-label="Naviguer avec Waze"
            >
              <Navigation className="w-4 h-4 text-[#00bfff]" />
            </a>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
          </div>
        </CardContent>
      </Card>
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/40 shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Supprimer {visit.storeName} ?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Notes et photos incluses. Irréversible.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete?.(visit.id); setConfirmDelete(false); }}
              >
                Supprimer
              </button>
              <button
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
