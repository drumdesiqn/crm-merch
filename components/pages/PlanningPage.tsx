"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Upload, Calendar, MapPin, User, AlertCircle, ChevronRight, X, CheckCircle, List, Map, Navigation, FileDown, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VISIT_TYPE_COLORS, ASSORTMENT_COLORS, VisitStatus } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { showToast } from "@/components/Toast";

const RouteMapView = dynamic(() => import("@/components/pages/RouteMapView"), { ssr: false, loading: () => (
  <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" /></div>
) });

interface Visit {
  id: string;
  storeName: string;
  storeCity: string;
  storeZipcode: string;
  storeAddress: string;
  visitType: string;
  visitDate: string;
  remarks: string | null;
  salesRep: string | null;
  assortment: string;
  materials: string | null;
  materialType: string | null;
  sortOrder: number;
  status: string;
}

interface Week {
  id: string;
  label: string;
  weekNum: number;
  year: number;
  _count: { visits: number };
}

interface DayGroup {
  date: string;
  label: string;
  visits: Visit[];
}

export default function PlanningPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<{ file: File; count: number; label: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [geocodedCache, setGeocodedCache] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/weeks")
      .then((r) => r.json())
      .then((data) => {
        const weeks = Array.isArray(data) ? data : [];
        setWeeks(weeks);
        if (weeks.length > 0) {
          setSelectedWeekId(weeks[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        showToast("error", "Erreur lors du chargement des semaines");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedWeekId) return;
    setLoading(true);
    setGeocodedCache({});
    fetch(`/api/visits?weekId=${selectedWeekId}`)
      .then((r) => r.json())
      .then((data) => {
        setVisits(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        showToast("error", "Erreur lors du chargement des visites");
        setLoading(false);
      });
  }, [selectedWeekId]);

  const handleFile = async (file: File, mode: "check" | "replace" | "merge" = "check") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    setImporting(true);

    let res: Response;
    let data: Record<string, unknown>;
    try {
      res = await fetch("/api/import", { method: "POST", body: formData });
      data = await res.json();
    } catch {
      setImporting(false);
      setImportMsg({ type: "error", text: "Erreur réseau lors de l'import" });
      return;
    }
    setImporting(false);

    if (!res.ok) {
      setImportMsg({ type: "error", text: (data.error as string) || "Erreur lors de l'import" });
      return;
    }

    if (mode === "check" && data.exists) {
      setPendingImport({ file, count: data.count as number, label: data.label as string });
      return;
    }

    const warnings = data.warnings as string[] | undefined;
    const warningText = warnings && warnings.length > 0 ? ` ⚠ ${warnings.join(" ")}` : "";
    setImportMsg({ type: "success", text: `✓ ${data.count} visites importées — ${data.label}${warningText}` });
    setPendingImport(null);

    try {
      const weeksRes = await fetch("/api/weeks");
      const newWeeks = await weeksRes.json();
      setWeeks(newWeeks);
      const imported = newWeeks.find((w: Week) => w.label === data.label);
      if (imported) setSelectedWeekId(imported.id);
    } catch {
      // weeks refresh failed, ignore
    }
  };

  const dayGroups = visits.reduce((acc, v) => {
    const day = v.visitDate.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(v);
    return acc;
  }, {} as Record<string, Visit[]>);

  const sortedDays: DayGroup[] = Object.entries(dayGroups)
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
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Planning</h1>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
          {visits.length > 0 && (
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${viewMode === "list" ? "bg-red-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                <List className="w-4 h-4" /> Liste
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-600 whitespace-nowrap ${viewMode === "map" ? "bg-red-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                <Map className="w-4 h-4" /> Carte
              </button>
            </div>
          )}
          <Link href="/export" className="shrink-0">
            <Button size="sm" variant="outline">
              <FileDown className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </Link>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importing} className="shrink-0 whitespace-nowrap">
            <Upload className="w-4 h-4 mr-1" />
            {importing ? "..." : <span className="hidden sm:inline">Importer Excel</span>}
            {importing ? "" : <span className="sm:hidden">Import</span>}
          </Button>
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
      </div>

      {/* Drop zone — hidden when visits are already loaded or still loading */}
      {visits.length === 0 && !loading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f, "check");
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragging ? "border-red-400 bg-red-50 dark:bg-red-950" : "border-slate-200 dark:border-slate-600 hover:border-slate-300"}`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Glisse ton fichier Excel ici ou clique pour choisir</p>
        </div>
      )}

      {/* Import feedback */}
      {importMsg && (
        <div className={`flex items-center gap-3 rounded-lg p-3 text-sm ${importMsg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {importMsg.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{importMsg.text}</span>
          <button onClick={() => setImportMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Confirm overwrite dialog */}
      {pendingImport && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 space-y-3">
          <p className="text-sm font-medium text-yellow-900">
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
      {weeks.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weeks.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedWeekId(w.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedWeekId === w.id ? "bg-red-600 text-white border-red-600" : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
            >
              {w.label} · {w._count.visits} visites
            </button>
          ))}
        </div>
      )}

      {/* Visits — list or map view */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedDays.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p>Aucune visite. Importe ton planning Excel.</p>
        </div>
      ) : viewMode === "map" ? (
        <RouteMapView
          visits={visits}
          geocodedCache={geocodedCache}
          onGeocodedCacheUpdate={setGeocodedCache}
          onOrderSaved={(reordered) => setVisits(reordered)}
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
            {day.visits.map((v) => <VisitCard key={v.id} visit={v} />)}
          </div>
        ))
      )}
    </div>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const router = useRouter();
  const typeColor = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
  const assortColor = ASSORTMENT_COLORS[visit.assortment] || "bg-slate-100 text-slate-700";
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${visit.storeAddress} ${visit.storeZipcode} ${visit.storeCity}`)}&navigate=yes`;

  return (
    <div onClick={() => router.push(`/planning/${visit.id}`)} className="cursor-pointer">
      <Card className="hover:shadow-md hover:border-red-200 transition-all">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{visit.storeAddress}, {visit.storeZipcode} {visit.storeCity}</p>
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
                  <p className="text-xs text-orange-700 line-clamp-2">{visit.remarks}</p>
                </div>
              )}
              {visit.materialType && (
                <div className="flex items-center gap-1 mt-1">
                  <Wrench className="w-3 h-3 text-red-500 shrink-0" />
                  <span className="text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full font-medium">
                    {visit.materialType}
                  </span>
                </div>
              )}
              {visit.status && visit.status !== "pending" && (
                <StatusBadge status={visit.status as VisitStatus} size="sm" className="mt-1" />
              )}
            </div>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#00bfff]/10 hover:bg-[#00bfff]/20 transition-colors"
              title="Naviguer avec Waze"
            >
              <Navigation className="w-4 h-4 text-[#00bfff]" />
            </a>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
