import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface AnalyticsData {
  summary: {
    totalVisits: number;
    completionRate: number;
    totalStores: number;
    totalPhotos: number;
  };
  visitsByWeek: { label: string; total: number; done: number; rate: number }[];
  visitsByStatus: { status: string; count: number }[];
  visitsByType: { type: string; count: number }[];
  visitsByCity: { city: string; count: number }[];
  materialCounts: { type: string; count: number }[];
  visitsBySalesRep: { name: string; count: number }[];
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const data = await fetchApi<AnalyticsData>("/api/analytics");
      if (!data) throw new Error("Failed to load analytics");
      return data;
    },
    staleTime: 60_000,
  });
}
