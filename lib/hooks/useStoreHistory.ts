import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { StoreHistoryVisit } from "@/types/visit";

export function useStoreHistory(storeId?: string, visitId?: string) {
  return useQuery<StoreHistoryVisit[]>({
    queryKey: ["store-history", storeId],
    queryFn: async () => {
      const data = await fetchApi<{ visits: StoreHistoryVisit[] }>(`/api/stores/${storeId}/history`);
      if (data?.visits === undefined) throw new Error("Failed to load history");
      return data.visits.filter((v) => v.id !== visitId);
    },
    enabled: !!storeId,
  });
}
