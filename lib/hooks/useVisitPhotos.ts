import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { VisitPhoto } from "@/types/visit";

export function useVisitPhotos(visitId?: string) {
  return useQuery<VisitPhoto[]>({
    queryKey: ["visit-photos", visitId],
    queryFn: async () => {
      const data = await fetchApi<VisitPhoto[]>(`/api/visits/${visitId}/photos`);
      if (data === null) throw new Error("Failed to load photos");
      return data;
    },
    enabled: !!visitId,
  });
}
