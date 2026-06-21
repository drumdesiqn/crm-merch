"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, User, ChevronRight, Upload, Navigation, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateShort, VISIT_TYPE_COLORS, VisitStatus, parseLocalDate } from "@/lib/utils";
import { showToast } from "@/components/Toast";
import { StatusBadge } from "@/components/StatusBadge";
import type { Visit, Week } from "@/types/visit";

export default function DashboardPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Guillaume");
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/weeks").then((r) => r.json()).catch(() => {
        showToast("error", "Erreur lors du chargement des semaines");
        return [];
      }),
      fetch("/api/settings").then((r) => r.json()).catch(() => {
        showToast("error", "Erreur lors du chargement des paramètres");
        return {};
      }),
    ]).then(([weeksData, settingsData]) => {
      setWeeks(Array.isArray(weeksData) ? weeksData : []);
      if (settingsData.userName) setUserName(settingsData.userName);
      if (Array.isArray(weeksData) && weeksData.length > 0) {
        fetch(`/api/visits?weekId=${weeksData[0].id}`)
          .then((r) => r.json())
          .then((v) => {
            setVisits(Array.isArray(v) ? v : []);
            setLoading(false);
          })
          .catch(() => {
            showToast("error", "Erreur lors du chargement des visites");
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      showToast("error", "Erreur lors du chargement des données");
      setLoading(false);
    });
  }, []);

  const currentWeek = weeks[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayVisits = visits
    .filter((v) => parseLocalDate(v.visitDate).getTime() === today.getTime())
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const upcomingVisits = visits
    .filter((v) => parseLocalDate(v.visitDate).getTime() > today.getTime())
    .sort((a, b) => {
      const dateDiff = parseLocalDate(a.visitDate).getTime() - parseLocalDate(b.visitDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  const pastVisits = visits
    .filter((v) => parseLocalDate(v.visitDate).getTime() < today.getTime())
    .sort((a, b) => {
      const dateDiff = parseLocalDate(b.visitDate).getTime() - parseLocalDate(a.visitDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  const withRemarks = visits.filter((v) => v.remarks?.trim());
  const maintenanceCount = visits.filter((v) => v.visitType === "Maintenance").length;
  const adHocCount = visits.filter((v) => v.visitType === "Ad Hoc").length;
  const doneCount = visits.filter((v) => v.status === "done").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bonjour, {userName} 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {today.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
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
          <Card className="bg-red-600 text-white border-0">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs font-medium uppercase tracking-wide">Semaine en cours</p>
                <p className="text-xl font-bold">{currentWeek.label}</p>
                <p className="text-red-100 text-sm">{currentWeek._count.visits} visites</p>
              </div>
              <Link href="/planning">
                <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Voir planning <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
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
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Stats pour {currentWeek.label}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's visits */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4 text-red-600" />
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
                  todayVisits.map((v) => <VisitRow key={v.id} visit={v} />)
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
                    <VisitRow key={v.id} visit={v} showDate />
                  ))}
                  {upcomingVisits.length > 5 && (
                    <Link href="/planning" className="block text-center text-sm text-red-600 hover:underline pt-1">
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
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${showPast ? "rotate-90" : ""}`} />
                Visites effectuées ({pastVisits.length})
              </button>
              {showPast && (
                <div className="mt-2 space-y-2">
                  {pastVisits.slice(0, 10).map((v) => (
                    <VisitRow key={v.id} visit={v} showDate />
                  ))}
                  {pastVisits.length > 10 && (
                    <Link href="/planning" className="block text-center text-sm text-red-600 hover:underline pt-1">
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

function VisitRow({ visit, showDate }: { visit: Visit; showDate?: boolean }) {
  const router = useRouter();
  const colorClass = VISIT_TYPE_COLORS[visit.visitType] || "bg-slate-100 text-slate-700 border-slate-200";
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(`${visit.storeCity}`)}&navigate=yes`;
  return (
    <div onClick={() => router.push(`/planning/${visit.id}`)} className="block cursor-pointer">
      <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{visit.storeName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
              {visit.visitType}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{visit.storeCity}</p>
            {showDate && (
              <span className="text-xs text-slate-400 ml-1">· {formatDateShort(visit.visitDate)}</span>
            )}
          </div>
          {visit.remarks && (
            <p className="text-xs text-orange-600 mt-1 line-clamp-1">⚠ {visit.remarks}</p>
          )}
          {visit.materialType && (
            <div className="flex items-center gap-1 mt-1">
              <Wrench className="w-3 h-3 text-red-500 shrink-0" />
              <span className="text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full font-medium">
                {visit.materialType}
              </span>
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
