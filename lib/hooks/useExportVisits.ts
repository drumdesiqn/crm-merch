import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { ExportVisit } from "@/types/visit";

export function useExportVisits(weekId: string) {
  return useQuery<ExportVisit[]>({
    queryKey: ["export-visits", weekId],
    queryFn: async () => {
      const data = await fetchApi<{ visits?: ExportVisit[] }>(`/api/export?weekId=${weekId}`, { suppressToast: true });
      if (!data?.visits) throw new Error("Failed to load visits");
      return data.visits;
    },
    enabled: !!weekId,
    staleTime: 30_000,
  });
}
