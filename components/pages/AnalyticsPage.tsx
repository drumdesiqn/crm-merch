"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Camera, MapPin, Store, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { useWeeks } from "@/lib/hooks/useWeeks";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { User } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  done: "#059669",
  pending: "#d97706",
  cancelled: "#C8102E",
  postponed: "#4f46e5",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Effectué",
  pending: "En attente",
  cancelled: "Annulé",
  postponed: "Reporté",
};

const PIE_COLORS = ["#0010A4", "#0055FF", "#00C8A0", "#d97706", "#8b5cf6", "#ec4899"];
const BAR_CITY_COLOR = "#0010A4";
const BAR_MATERIAL_COLOR = "#0055FF";

export default function AnalyticsPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const { data: weeks = [] } = useWeeks();
  const { data, isLoading, isError } = useAnalytics(selectedWeek || undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-mars" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-center">Impossible de charger les analytics.</p>
      </div>
    );
  }

  if (data.summary.totalVisits === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" aria-label="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Pas encore de données</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Importe ton planning Excel pour voir les statistiques ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" aria-label="Retour">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Vue d&apos;ensemble de l&apos;activité</p>
          </div>
        </div>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-mars"
        >
          <option value="">Toutes les semaines</option>
          {weeks.map((w) => (
            <option key={w.id} value={w.id}>{w.label}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5 text-blue-mars" />}
          label="Visites totales"
          value={data.summary.totalVisits}
        />
        <SummaryCard
          icon={<div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">%</div>}
          label="Taux de complétion"
          value={`${data.summary.completionRate}%`}
        />
        <SummaryCard
          icon={<Store className="w-5 h-5 text-blue-600" />}
          label="Magasins"
          value={data.summary.totalStores}
        />
        <SummaryCard
          icon={<Camera className="w-5 h-5 text-purple-600" />}
          label="Photos"
          value={data.summary.totalPhotos}
        />
      </div>

      {/* Visits per week — line chart */}
      {data.visitsByWeek.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Visites par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.visitsByWeek} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value, name) => [
                      value,
                      name === "total" ? "Total" : name === "done" ? "Effectuées" : "Taux %",
                    ]}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="total" stroke="#0010A4" strokeWidth={2} dot={{ r: 3 }} name="total" />
                  <Line yAxisId="left" type="monotone" dataKey="done" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="done" />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie chart */}
        {data.visitsByStatus.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.visitsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props) => {
                        const p = props as unknown as { status: string; count: number };
                        return `${STATUS_LABELS[p.status] || p.status} (${p.count})`;
                      }}
                    >
                      {data.visitsByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Visites"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visit type pie chart */}
        {data.visitsByType.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Types de visite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.visitsByType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props) => {
                        const p = props as unknown as { type: string; count: number };
                        return `${p.type} (${p.count})`;
                      }}
                    >
                      {data.visitsByType.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Visites"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top cities bar chart */}
      {data.visitsByCity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-blue-mars" />
              Top villes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.visitsByCity} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={55} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value) => [value, "Visites"]} />
                  <Bar dataKey="count" fill={BAR_CITY_COLOR} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material type bar chart */}
      {data.materialCounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Types de matériel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.materialCounts} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 10, angle: -30 }} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value) => [value, "Visites"]} />
                  <Bar dataKey="count" fill={BAR_MATERIAL_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Rep bar chart */}
      {data.visitsBySalesRep && data.visitsBySalesRep.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-blue-mars" />
              Visites par Sales Representative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: Math.max(180, data.visitsBySalesRep.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.visitsBySalesRep} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={95} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value) => [value, "Visites"]} />
                  <Bar dataKey="count" fill="#0055FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4 px-4">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}