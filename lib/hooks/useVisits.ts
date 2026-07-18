import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Visit } from "@/types/visit";

interface VisitsResult {
  visits: Visit[];
  truncated: boolean;
}

export function useVisits(weekId?: string) {
  return useQuery<VisitsResult>({
    queryKey: ["visits", weekId ?? "all"],
    queryFn: async () => {
      if (weekId) {
        const data = await fetchApi<Visit[]>(`/api/visits?weekId=${weekId}`);
        if (data === null) throw new Error("Failed to load visits");
        return { visits: data, truncated: false };
      }
      const res = await fetch("/api/visits");
      if (res.status === 401) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        throw new Error("Non authentifié");
      }
      if (!res.ok) throw new Error("Failed to load visits");
      const data: Visit[] = await res.json();
      return { visits: data, truncated: res.headers.get("X-Results-Truncated") === "true" };
    },
    enabled: weekId !== undefined ? !!weekId : true,
    select: (d) => d,
  });
}

export function useWeekVisits(weekId?: string) {
  const result = useVisits(weekId);
  return {
    ...result,
    data: result.data?.visits ?? [],
    truncated: result.data?.truncated ?? false,
  };
}
