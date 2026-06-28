import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Visit } from "@/types/visit";

export function useVisits(weekId?: string) {
  return useQuery<Visit[]>({
    queryKey: ["visits", weekId],
    queryFn: async () => {
      const data = await fetchApi<Visit[]>(weekId ? `/api/visits?weekId=${weekId}` : "/api/visits");
      if (data === null) throw new Error("Failed to load visits");
      return data;
    },
    enabled: !!weekId,
  });
}
