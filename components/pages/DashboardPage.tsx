"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, User, ChevronRight, Upload, Navigation, Wrench, Search, Route, X, CheckCircle2, Clock, AlertTriangle, TrendingUp, Check, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateShort, VISIT_TYPE_COLORS, VisitStatus, parseLocalDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import type { Visit } from "@/types/visit";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useWeeks } from "@/lib/hooks/useWeeks";
import { useVisits } from "@/lib/hooks/useVisits";
import { useSummary } from "@/lib/hooks/useSummary";
import { useSettings } from "@/lib/hooks/useSettings";
import { useUpdateVisit } from "@/lib/hooks/useUpdateVisit";
import { useDayRoutes } from "@/lib/hooks/useDayRoutes";
import { Gauge } from "lucide-react";

const EMPTY_VISITS: Visit[] = [];

export default function DashboardPage() {
  const [showPast, setShowPast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: weeks = [], isLoading: weeksLoading } = useWeeks();
  const { data: settingsData } = useSettings();
  const currentWeek = weeks[0];
  const { data: visitsResult, isLoading: visitsLoading } = useVisits(currentWeek?.id);
  const visits: Visit[] = visitsResult?.visits ?? EMPTY_VISITS;
  const { data: summaryStores = {}, isLoading: summaryLoading } = useSummary();
  const userName = settingsData?.userName?.split(" ")[0] || "";

  const loading = weeksLoading || visitsLoading || summaryLoading;
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredVisits = useMemo(() => {
    let result = visits;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((v) =>
        v.storeName?.toLowerCase().includes(query) ||
        v.storeCity?.toLowerCase().includes(query) ||
        v.storeAddress?.toLowerCase().includes(query) ||
        v.storeZipcode?.toLowerCase().includes(query)
      );
    }
    if (filterType !== "all") result = result.filter((v) => v.visitType === filterType);
    if (filterStatus !== "all") result = result.filter((v) => v.status === filterStatus);
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
  const completionPct = filteredVisits.length > 0 ? Math.round((doneCount / filteredVisits.length) * 100) : 0;

  const storeVisitCount = useMemo(() => {
    const counts = new Map<string, number>();
    Object.entries(summaryStores).forEach(([storeId, data]) => counts.set(storeId, data.total));
    return counts;
  }, [summaryStores]);

  const storeCompletedCount = useMemo(() => {
    const counts = new Map<string, number>();
    Object.entries(summaryStores).forEach(([storeId, data]) => counts.set(storeId, data.completed));
    return counts;
  }, [summaryStores]);

  const nextVisit = useMemo(() => todayVisits.find((v) => v.status === "pending") ?? null, [todayVisits]);
  const todayDone = useMemo(() => todayVisits.filter((v) => v.status === "done").length, [todayVisits]);

  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);
  const { data: weekRoutes = [] } = useDayRoutes(weekStart.toISOString(), weekEnd.toISOString());
  const weekKm = weekRoutes.reduce((sum, r) => sum + r.distanceM, 0) / 1000;
  const weekDuration = weekRoutes.reduce((sum, r) => sum + r.durationS, 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            {currentWeek ? currentWeek.label : "Tableau de bord"} · {new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {userName ? `${new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir"}, ${userName}` : "Tableau de bord"}
          </h1>
          {currentWeek && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {currentWeek._count.visits} visites planifiées · {completionPct}% complétées
            </p>
          )}
        </div>
        {currentWeek && (
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
              aria-label="Rechercher un magasin"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Effacer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── No week ── */}
      {!currentWeek && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Upload className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun planning importé</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Importe ton fichier Excel hebdomadaire pour commencer</p>
          </div>
          <Link href="/planning">
            <Button size="sm">Importer un planning</Button>
          </Link>
        </div>
      )}

      {currentWeek && (
        <>
          {/* ── Prochaine visite ── */}
          {nextVisit && (
            <div className="animate-fade-in-up stagger-1 relative overflow-hidden rounded-2xl border border-teal-cpm/25 bg-gradient-to-br from-teal-cpm/[0.07] to-transparent dark:from-teal-cpm/[0.12] p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-cpm mb-1">Prochaine visite</p>
                  <Link href={`/planning/${nextVisit.id}`} className="block group">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-cpm transition-colors">{nextVisit.storeName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {nextVisit.storeAddress}, {nextVisit.storeZipcode} {nextVisit.storeCity}
                    </p>
                  </Link>
                </div>
                <a
                  href={`https://waze.com/ul?q=${encodeURIComponent(`${nextVisit.storeAddress} ${nextVisit.storeZipcode} ${nextVisit.storeCity}`)}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-[#00bfff] hover:bg-[#00acdf] text-white text-sm font-semibold shadow-[0_2px_8px_rgba(0,191,255,0.35)] transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Waze
                </a>
              </div>
              {todayVisits.length > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-200/70 dark:bg-[#2e2e30] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-cpm to-[#6fa3d8] rounded-full transition-all duration-700" style={{ width: `${todayVisits.length > 0 ? Math.round((todayDone / todayVisits.length) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">{todayDone}/{todayVisits.length} aujourd&apos;hui</span>
                </div>
              )}
            </div>
          )}

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="animate-fade-in-up stagger-1"><StatCard
              label="Maintenance"
              value={maintenanceCount}
              icon={<Wrench className="w-4 h-4" />}
              accent="blue"
            /></div>
            <div className="animate-fade-in-up stagger-2"><StatCard
              label="Ad Hoc"
              value={adHocCount}
              icon={<Route className="w-4 h-4" />}
              accent="orange"
            /></div>
            <div className="animate-fade-in-up stagger-3"><StatCard
              label="Remarques"
              value={withRemarks.length}
              icon={<AlertTriangle className="w-4 h-4" />}
              accent="yellow"
            /></div>
            <div className="animate-fade-in-up stagger-4"><StatCard
              label="Effectuées"
              value={doneCount}
              icon={<CheckCircle2 className="w-4 h-4" />}
              accent="green"
              progress={completionPct}
            /></div>
          </div>

          {/* ── Kilométrage de la semaine ── */}
          {weekKm > 0 && (
            <div className="animate-fade-in-up flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#222223] border border-slate-200 dark:border-[#2e2e30]">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Kilométrage de la semaine</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {weekKm.toFixed(1)} km
                  {weekDuration > 0 && (
                    <span className="ml-2 text-slate-400 font-normal">
                      · {Math.floor(weekDuration / 3600)}h{String(Math.round((weekDuration % 3600) / 60)).padStart(2, "0")}
                    </span>
                  )}
                  <span className="ml-2 text-slate-400 font-normal">· {weekRoutes.length} jour{weekRoutes.length > 1 ? "s" : ""}</span>
                </p>
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-cpm"
              aria-label="Filtrer par type"
            >
              <option value="all">Tous types</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Ad Hoc">Ad Hoc</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-cpm"
              aria-label="Filtrer par statut"
            >
              <option value="all">Tous statuts</option>
              <option value="pending">À faire</option>
              <option value="done">Terminé</option>
            </select>
            {(filterType !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => { setFilterType("all"); setFilterStatus("all"); }}
                className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Réinitialiser
              </button>
            )}
            {(searchQuery || filterType !== "all" || filterStatus !== "all") && (
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                {filteredVisits.length} / {visits.length} visite{visits.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* ── Visit lists ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Aujourd'hui */}
            <Card className="h-fit animate-fade-in-up stagger-3">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  <Calendar className="w-4 h-4 text-teal-cpm" />
                  Aujourd&apos;hui
                  {todayVisits.length > 0 && (
                    <span className="ml-auto text-xs font-semibold bg-teal-cpm text-white px-2 py-0.5 rounded-full">
                      {todayVisits.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-1.5">
                {todayVisits.length === 0 ? (
                  (() => {
                    const weekDates = visits.map((v) => parseLocalDate(v.visitDate).getTime());
                    const minDate = weekDates.length > 0 ? Math.min(...weekDates) : null;
                    const maxDate = weekDates.length > 0 ? Math.max(...weekDates) : null;
                    if (maxDate && today.getTime() > maxDate) return <EmptyState text="Cette semaine est terminée" />;
                    if (minDate && today.getTime() < minDate) return <EmptyState text="La semaine n'a pas encore commencé" />;
                    return <EmptyState text="Aucune visite aujourd'hui" />;
                  })()
                ) : (
                  todayVisits.map((v) => <VisitRow key={v.id} visit={v} quickCheck totalVisits={storeVisitCount.get(v.storeId || v.storeName) || 0} completedVisits={storeCompletedCount.get(v.storeId || v.storeName) || 0} />)
                )}
              </CardContent>
            </Card>

            {/* Prochaines visites */}
            {upcomingVisits.length > 0 && (
              <Card className="h-fit animate-fade-in-up stagger-4">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    Prochaines visites
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-1.5">
                  {upcomingVisits.slice(0, 5).map((v) => (
                    <VisitRow key={v.id} visit={v} showDate totalVisits={storeVisitCount.get(v.storeId || v.storeName) || 0} completedVisits={storeCompletedCount.get(v.storeId || v.storeName) || 0} />
                  ))}
                  {upcomingVisits.length > 5 && (
                    <Link href="/planning" className="block text-center text-xs text-teal-cpm hover:underline pt-2 font-medium">
                      Voir toutes les visites →
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Past visits ── */}
          {pastVisits.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors"
                aria-expanded={showPast}
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${showPast ? "rotate-90" : ""}`} />
                Visites passées
                <span className="text-xs bg-slate-100 dark:bg-[#222223] text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                  {pastVisits.length}
                </span>
              </button>
              {showPast && (
                <div className="mt-2 space-y-1.5">
                  {pastVisits.slice(0, 10).map((v) => (
                    <VisitRow key={v.id} visit={v} showDate totalVisits={storeVisitCount.get(v.storeId || v.storeName) || 0} completedVisits={storeCompletedCount.get(v.storeId || v.storeName) || 0} />
                  ))}
                  {pastVisits.length > 10 && (
                    <Link href="/planning" className="block text-center text-xs text-teal-cpm hover:underline pt-2 font-medium">
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

const ACCENT_STYLES = {
  blue:   { icon: "text-teal-cpm bg-gradient-to-br from-teal-cpm/15 to-teal-cpm/5 dark:from-teal-cpm/25 dark:to-teal-cpm/10",   glow: "from-teal-cpm/[0.04]" },
  orange: { icon: "text-orange-500 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/60 dark:to-orange-950/20", glow: "from-orange-500/[0.04]" },
  yellow: { icon: "text-yellow-600 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-950/60 dark:to-yellow-950/20", glow: "from-yellow-500/[0.04]" },
  green:  { icon: "text-green-cpm bg-gradient-to-br from-green-cpm/15 to-green-cpm/5 dark:from-green-cpm/25 dark:to-green-cpm/10",  glow: "from-green-cpm/[0.04]" },
};

function StatCard({ label, value, icon, accent, progress }: { label: string; value: number; icon: React.ReactNode; accent: keyof typeof ACCENT_STYLES; progress?: number }) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className={`relative overflow-hidden bg-white dark:bg-[#1a1a1b] border border-slate-200/80 dark:border-[#2e2e30] rounded-2xl px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none hover-lift`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.glow} to-transparent pointer-events-none`} />
      <div className="relative flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <span className={`flex items-center justify-center w-8 h-8 rounded-xl ${s.icon}`}>
          {icon}
        </span>
      </div>
      <p className="relative text-[1.75rem] leading-none font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {progress !== undefined && (
        <div className="relative mt-2.5 h-1.5 w-full bg-slate-100 dark:bg-[#2e2e30] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-cpm to-[#a3cc5e] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-6 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#222223] flex items-center justify-center">
        <Clock className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
      </div>
      <span className="text-sm text-slate-400 dark:text-slate-500">{text}</span>
    </div>
  );
}

function VisitRow({ visit, showDate, quickCheck, totalVisits, completedVisits }: { visit: Visit; showDate?: boolean; quickCheck?: boolean; totalVisits?: number; completedVisits?: number }) {
  const router = useRouter();
  const updateVisit = useUpdateVisit();
  const colorClass = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${visit.storeAddress} ${visit.storeZipcode} ${visit.storeCity}`)}&navigate=yes`;
  const isDone = visit.status === "done";

  const toggleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateVisit.isPending) return;
    updateVisit.mutate({ id: visit.id, status: isDone ? "pending" : "done" });
  };

  return (
    <div
      onClick={() => router.push(`/planning/${visit.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/planning/${visit.id}`)}
      role="button"
      tabIndex={0}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] hover:border-slate-300 dark:hover:border-[#3a3a3c] hover-lift cursor-pointer"
    >
      <span className={`shrink-0 w-2 h-2 rounded-full ${isDone ? "bg-green-cpm" : visit.status === "cancelled" ? "bg-red-400" : visit.status === "postponed" ? "bg-orange-400" : "bg-slate-300 dark:bg-slate-600"}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`flex-1 text-sm font-medium leading-snug whitespace-normal lg:truncate ${isDone ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-900 dark:text-slate-100"}`} title={visit.storeName}>
            {visit.storeName}
          </p>
          <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md border font-medium ${colorClass}`}>
            {visit.visitType}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{visit.storeCity}</p>
          {showDate && <span className="text-xs text-slate-400 shrink-0">· {formatDateShort(visit.visitDate)}</span>}
          {totalVisits !== undefined && totalVisits > 1 && (
            <span className="text-xs text-slate-400 shrink-0">· {completedVisits || 0}/{totalVisits}</span>
          )}
        </div>
        {visit.remarks && (
          <div className="flex items-center gap-1 mt-0.5">
            <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
            <p className="text-xs text-orange-600 dark:text-orange-400 line-clamp-1">{visit.remarks}</p>
          </div>
        )}
        {visit.materialType && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <Wrench className="w-3 h-3 text-teal-cpm shrink-0" />
            {visit.materialType.split(", ").filter(Boolean).map((type, idx) => (
              <span key={idx} className="text-xs text-teal-cpm bg-teal-cpm/10 dark:bg-teal-cpm/15 px-1.5 py-0.5 rounded font-medium">
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      {visit.salesRep && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0">
          <User className="w-3 h-3" />
          <span>{visit.salesRep.split(" ")[0]}</span>
        </div>
      )}
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-[#00bfff] hover:bg-[#00bfff]/10 transition-colors"
        title="Waze"
      >
        <Navigation className="w-3.5 h-3.5" />
      </a>
      {quickCheck && (
        <button
          onClick={toggleDone}
          disabled={updateVisit.isPending}
          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all disabled:opacity-50 ${
            isDone
              ? "bg-green-cpm border-green-cpm text-white hover:bg-green-cpm/80"
              : "border-slate-200 dark:border-[#2e2e30] text-slate-400 hover:border-green-cpm hover:text-green-cpm hover:bg-green-cpm/10"
          }`}
          title={isDone ? "Remettre à faire" : "Marquer terminée"}
          aria-label={isDone ? "Remettre à faire" : "Marquer terminée"}
        >
          {isDone ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
        </button>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
    </div>
  );
}