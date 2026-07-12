"use client";

import { useState } from "react";
import { BarChart3, MapPin, Loader2 } from "lucide-react";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { useWeeks } from "@/lib/hooks/useWeeks";
import { useTheme } from "@/components/ThemeProvider";
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

const PIE_COLORS = ["#0074d7", "#059669", "#d97706", "#8b5cf6", "#ec4899", "#ef4444"];
const BAR_CITY_COLOR = "#0074d7";
const BAR_MATERIAL_COLOR = "#0074d7";

export default function AnalyticsPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const { data: weeks = [] } = useWeeks();
  const { data, isLoading, isError } = useAnalytics(selectedWeek || undefined);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridStroke = isDark ? "#2e2e30" : "#e2e8f0";
  const tooltipStyle = { borderRadius: 8, fontSize: 12, backgroundColor: isDark ? "#1a1a1b" : "#fff", border: `1px solid ${isDark ? "#2e2e30" : "#e2e8f0"}`, color: isDark ? "#d4d4d8" : "#1e293b" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-teal-cpm" />
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Statistiques</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Analytics</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#222223] flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-lg font-medium text-slate-700 dark:text-zinc-300">Pas encore de données</p>
          <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Importe ton planning Excel pour voir les statistiques ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Statistiques</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Analytics</h1>
        </div>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] text-slate-700 dark:text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-cpm"
        >
          <option value="">Toutes les semaines</option>
          {weeks.map((w) => (
            <option key={w.id} value={w.id}>{w.label}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Visites totales", value: data.summary.totalVisits, accent: "border-l-teal-cpm" },
          { label: "Complétion", value: `${data.summary.completionRate}%`, accent: "border-l-green-500" },
          { label: "Magasins", value: data.summary.totalStores, accent: "border-l-teal-cpm" },
          { label: "Photos", value: data.summary.totalPhotos, accent: "border-l-amber-400" },
        ].map(({ label, value, accent }) => (
          <div key={label} className={`bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] border-l-4 ${accent} rounded-xl px-4 py-3`}>
            <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{value}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Visits per week — line chart */}
      {data.visitsByWeek.length > 0 && (
        <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-3">Visites par semaine</p>
          <div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.visitsByWeek} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      value,
                      name === "total" ? "Total" : name === "done" ? "Effectuées" : "Taux %",
                    ]}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="total" stroke="#0074d7" strokeWidth={2} dot={{ r: 3 }} name="total" />
                  <Line yAxisId="left" type="monotone" dataKey="done" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="done" />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie chart */}
        {data.visitsByStatus.length > 0 && (
          <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-3">Répartition par statut</p>
            <div>
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
                    <Tooltip formatter={(value) => [value, "Visites"]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Visit type pie chart */}
        {data.visitsByType.length > 0 && (
          <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-3">Types de visite</p>
            <div>
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
                    <Tooltip formatter={(value) => [value, "Visites"]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top cities bar chart */}
      {data.visitsByCity.length > 0 && (
        <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-cpm" />
            Top villes
          </p>
          <div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.visitsByCity} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={55} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, "Visites"]} />
                  <Bar dataKey="count" fill={BAR_CITY_COLOR} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Material type bar chart */}
      {data.materialCounts.length > 0 && (
        <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-3">Types de matériel</p>
          <div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.materialCounts} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="type" tick={{ fontSize: 10, angle: -30 }} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, "Visites"]} />
                  <Bar dataKey="count" fill={BAR_MATERIAL_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Sales Rep bar chart */}
      {data.visitsBySalesRep && data.visitsBySalesRep.length > 0 && (
        <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-teal-cpm" />
            Visites par Sales Rep
          </p>
          <div>
            <div style={{ height: Math.max(180, data.visitsBySalesRep.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.visitsBySalesRep} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={95} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, "Visites"]} />
                  <Bar dataKey="count" fill="#0074d7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}