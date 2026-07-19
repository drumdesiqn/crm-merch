import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface AnalyticsData {
  summary: {
    totalVisits: number;
    completionRate: number;
    totalStores: number;
    totalPhotos: number;
    totalNotes: number;
    photosBefore: number;
    photosAfter: number;
    totalKm: number;
    totalHours: number;
    routeCount: number;
    avgVisitsPerDay: number;
    avgNotesPerVisit: number;
  };
  visitsByWeek: { label: string; total: number; done: number; rate: number }[];
  visitsByStatus: { status: string; count: number }[];
  visitsByType: { type: string; count: number }[];
  visitsByCity: { city: string; count: number }[];
  materialCounts: { type: string; count: number }[];
  visitsBySalesRep: { name: string; count: number }[];
  visitsByDow: { day: string; total: number; done: number }[];
}

export function useAnalytics(weekId?: string) {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics", weekId ?? "all"],
    queryFn: async () => {
      const url = weekId ? `/api/analytics?weekId=${encodeURIComponent(weekId)}` : "/api/analytics";
      const data = await fetchApi<AnalyticsData>(url);
      if (!data) throw new Error("Failed to load analytics");
      return data;
    },
    staleTime: 60_000,
  });
}