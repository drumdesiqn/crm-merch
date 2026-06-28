import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { VisitNote } from "@/types/visit";

export function useVisitNotes(visitId?: string) {
  return useQuery<VisitNote[]>({
    queryKey: ["visit-notes", visitId],
    queryFn: async () => {
      const data = await fetchApi<VisitNote[]>(`/api/visits/${visitId}/notes`);
      if (data === null) throw new Error("Failed to load notes");
      return data;
    },
    enabled: !!visitId,
  });
}
