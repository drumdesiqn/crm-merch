import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Visit } from "@/types/visit";

export function useVisit(visitId?: string) {
  return useQuery<Visit>({
    queryKey: ["visit", visitId],
    queryFn: async () => {
      const data = await fetchApi<Visit>(`/api/visits/${visitId}`);
      if (data === null) throw new Error("Failed to load visit");
      return data;
    },
    enabled: !!visitId,
  });
}
