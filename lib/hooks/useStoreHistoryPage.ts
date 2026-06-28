import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { StoreHistoryVisit } from "@/types/visit";

export interface StoreHistoryData {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  salesRep?: string | null;
  visits: StoreHistoryVisit[];
}

export function useStoreHistoryPage(storeId: string) {
  return useQuery<StoreHistoryData>({
    queryKey: ["store-history-page", storeId],
    queryFn: async () => {
      const data = await fetchApi<StoreHistoryData>(`/api/stores/${storeId}/history`);
      if (!data) throw new Error("Failed to load store history");
      return data;
    },
    enabled: !!storeId,
  });
}
