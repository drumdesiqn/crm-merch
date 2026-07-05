"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, User, ChevronRight, Upload, Navigation, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateShort, VISIT_TYPE_COLORS, VISIT_TYPE_DARK_STYLES, VisitStatus, parseLocalDate } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { StatusBadge } from "@/components/StatusBadge";
import type { Visit } from "@/types/visit";
import { Search } from "lucide-react";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useWeeks } from "@/lib/hooks/useWeeks";
import { useVisits } from "@/lib/hooks/useVisits";
import { useSummary } from "@/lib/hooks/useSummary";

const EMPTY_VISITS: Visit[] = [];

export default function DashboardPage() {
  const [showPast, setShowPast] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: weeks = [], isLoading: weeksLoading } = useWeeks();
  const currentWeek = weeks[0];
  const { data: visitsResult, isLoading: visitsLoading } = useVisits(currentWeek?.id);
  const visits: Visit[] = visitsResult?.visits ?? EMPTY_VISITS;
  const { data: summaryStores = {}, isLoading: summaryLoading } = useSummary();

  const loading = weeksLoading || visitsLoading || summaryLoading;
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filter visits based on search query and filters
  const filteredVisits = useMemo(() => {
    let result = visits;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((v) =>
        v.storeName?.toLowerCase().includes(query) ||
        v.storeCity?.toLowerCase().includes(query) ||
        v.storeAddress?.toLowerCase().includes(query) ||
        v.storeZipcode?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((v) => v.visitType === filterType);
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((v) => v.status === filterStatus);
    }

    return result;
  }, [visits, searchQuery, filterType, filterStatus]);

  const todayVisits = useMemo(() => 
    filteredVisits
      .filter((v) => parseLocalDate(v.visitDate).getTime() === today.getTime())
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [filteredVisits, today]
  );

  const upcomingVisits = useMemo(() => 
    filteredVisits
      .filter((v) => parseLocalDate(v.visitDate).getTime() > today.getTime())
      .sort((a, b) => {
        const dateDiff = parseLocalDate(a.visitDate).getTime() - parseLocalDate(b.visitDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }),
    [filteredVisits, today]
  );

  const pastVisits = useMemo(() => 
    filteredVisits
      .filter((v) => parseLocalDate(v.visitDate).getTime() < today.getTime())
      .sort((a, b) => {
        const dateDiff = parseLocalDate(b.visitDate).getTime() - parseLocalDate(a.visitDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }),
    [filteredVisits, today]
  );

  const withRemarks = useMemo(() => filteredVisits.filter((v) => v.remarks?.trim()), [filteredVisits]);
  const maintenanceCount = useMemo(() => filteredVisits.filter((v) => v.visitType === "Maintenance").length, [filteredVisits]);
  const adHocCount = useMemo(() => filteredVisits.filter((v) => v.visitType === "Ad Hoc").length, [filteredVisits]);
  const doneCount = useMemo(() => filteredVisits.filter((v) => v.status === "done").length, [filteredVisits]);

  // Cross-week store stats from summary endpoint
  const storeVisitCount = useMemo(() => {
    const counts = new Map<string, number>();
    Object.entries(summaryStores).forEach(([storeId, data]) => {
      counts.set(storeId, data.total);
    });
    return counts;
  }, [summaryStores]);

  const storeCompletedCount = useMemo(() => {
    const counts = new Map<string, number>();
    Object.entries(summaryStores).forEach(([storeId, data]) => {
      counts.set(storeId, data.completed);
    });
    return counts;
  }, [summaryStores]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {currentWeek && (
          <div className="relative w-full sm:w-64 ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un magasin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-mars focus:border-transparent"
              aria-label="Rechercher un magasin"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* No week imported */}
      {!currentWeek && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
            <Upload className="w-10 h-10 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun planning importé</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Importe ton fichier Excel hebdomadaire pour commencer</p>
            </div>
            <Link href="/planning">
              <Button>Importer un planning</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {currentWeek && (
        <>
          {/* Current week banner */}
          <Card className="bg-gradient-to-r from-blue-mars to-blue-cpm dark:from-blue-800 dark:to-blue-600 text-white border-0">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Semaine en cours</p>
                <p className="text-xl font-bold">{currentWeek.label}</p>
                <p className="text-white/80 text-sm">{currentWeek._count.visits} visites</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-mars"
                  aria-label="Filtrer par type"
                >
                  <option value="all">Tous types</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Ad Hoc">Ad Hoc</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-mars"
                  aria-label="Filtrer par statut"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending">À faire</option>
                  <option value="done">Terminé</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-slate-900 border-blue-100 dark:border-blue-900">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{maintenanceCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Maintenance</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/50 dark:to-slate-900 border-orange-100 dark:border-orange-900">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{adHocCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ad Hoc</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/50 dark:to-slate-900 border-yellow-100 dark:border-yellow-900">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{withRemarks.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Remarques</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-slate-900 border-green-100 dark:border-green-900">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{doneCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Effectuées</p>
                {filteredVisits.length > 0 && (
                  <div className="mt-2 w-full bg-green-100 dark:bg-green-900/40 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round((doneCount / filteredVisits.length) * 100)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Stats pour {currentWeek.label} · {Math.round((doneCount / (filteredVisits.length || 1)) * 100)}% complété</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's visits */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4 text-blue-mars dark:text-blue-400" />
                  Aujourd&apos;hui
                  {todayVisits.length > 0 && (
                    <Badge variant="blue" className="ml-auto">{todayVisits.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayVisits.length === 0 ? (
                  (() => {
                    const weekDates = visits.map((v) => parseLocalDate(v.visitDate).getTime());
                    const minDate = weekDates.length > 0 ? Math.min(...weekDates) : null;
                    const maxDate = weekDates.length > 0 ? Math.max(...weekDates) : null;
                    if (maxDate && today.getTime() > maxDate) {
                      return <p className="text-sm text-slate-400 py-2">Cette semaine est terminée 📅</p>;
                    }
                    if (minDate && today.getTime() < minDate) {
                      return <p className="text-sm text-slate-400 py-2">Cette semaine n&apos;a pas encore commencé 📅</p>;
                    }
                    return <p className="text-sm text-slate-500 py-2">Aucune visite aujourd&apos;hui 🎉</p>;
                  })()
                ) : (
                  todayVisits.map((v) => <VisitRow key={v.id} visit={v} totalVisits={storeVisitCount.get(v.storeId || v.storeName) || 0} completedVisits={storeCompletedCount.get(v.storeId || v.storeName) || 0} />)
                )}
              </CardContent>
            </Card>

            {/* Upcoming visits */}
            {upcomingVisits.length > 0 && (
              <Card className="h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    Prochaines visites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {upcomingVisits.slice(0, 5).map((v) => (
                    <VisitRow key={v.id} visit={v} showDate totalVisits={storeVisitCount.get(v.storeId || v.storeName) || 0} completedVisits={storeCompletedCount.get(v.storeId || v.storeName) || 0} />
                  ))}
                  {upcomingVisits.length > 5 && (
                    <Link href="/planning" className="block text-center text-sm text-blue-mars dark:text-blue-400 hover:underline pt-1">
                      Voir toutes les visites →
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past visits (collapsible) */}
          {pastVisits.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                aria-expanded={showPast}
                aria-controls="past-visits"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${showPast ? "rotate-90" : ""}`} />
                Visites passées
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-normal">{pastVisits.length}</span>
              </button>
              {showPast && (
                <div id="past-visits" className="mt-2 space-y-2">
                  {pastVisits.slice(0, 10).map((v) => (
                    <VisitRow key={v.id} visit={v} showDate totalVisits={storeVisitCount.get(v.storeId || v.storeName) || 0} completedVisits={storeCompletedCount.get(v.storeId || v.storeName) || 0} />
                  ))}
                  {pastVisits.length > 10 && (
                    <Link href="/planning" className="block text-center text-sm text-blue-mars dark:text-blue-400 hover:underline pt-1">
                      Voir toutes →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

        </>
      )}

    </div>
  );
}

function VisitRow({ visit, showDate, totalVisits, completedVisits }: { visit: Visit; showDate?: boolean; totalVisits?: number; completedVisits?: number; }) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const colorClass = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
  const darkStyle = isDark ? (VISIT_TYPE_DARK_STYLES[visit.visitType] || {}) : {};
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${visit.storeAddress} ${visit.storeZipcode} ${visit.storeCity}`)}&navigate=yes`;
  return (
    <div 
      onClick={() => router.push(`/planning/${visit.id}`)} 
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/planning/${visit.id}`)}
      role="button"
      tabIndex={0}
      className="block cursor-pointer"
    >
      <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{visit.storeName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`} style={darkStyle}>
              {visit.visitType}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{visit.storeCity}</p>
            {showDate && (
              <span className="text-xs text-slate-400 ml-1">· {formatDateShort(visit.visitDate)}</span>
            )}
            {totalVisits !== undefined && totalVisits > 1 && (
              <span className="text-xs text-slate-400 ml-1">· {completedVisits || 0}/{totalVisits} visites</span>
            )}
          </div>
          {visit.remarks && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 line-clamp-1">⚠ {visit.remarks}</p>
          )}
          {visit.materialType && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Wrench className="w-3 h-3 text-blue-mars shrink-0" />
              {visit.materialType.split(", ").filter(Boolean).map((type, idx) => (
                <span key={idx} className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium border border-blue-200" style={isDark ? { backgroundColor: "rgba(37,99,235,0.2)", color: "rgb(147,197,253)", borderColor: "rgba(37,99,235,0.4)" } : {}}>
                  {type}
                </span>
              ))}
            </div>
          )}
        </div>
        {visit.status && visit.status !== "pending" && (
          <StatusBadge status={visit.status as VisitStatus} size="sm" />
        )}
        {visit.salesRep && (
          <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <User className="w-3 h-3" />
            <span className="hidden sm:inline">{visit.salesRep.split(" ")[0]}</span>
          </div>
        )}
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-[#00bfff]/10 hover:bg-[#00bfff]/20 transition-colors"
          title="Naviguer avec Waze"
        >
          <Navigation className="w-3.5 h-3.5 text-[#00bfff]" />
        </a>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
      </div>
    </div>
  );
}