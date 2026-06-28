import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface Store {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  assortment: string;
  visitType: string;
  visitFrequence: string | null;
  salesRep: string | null;
  totalVisits: number;
  completedVisits: number;
  lastVisit: string | null;
  materialTypes: string[];
  totalPhotos: number;
}

export function useStores() {
  return useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const data = await fetchApi<Store[]>("/api/stores");
      if (data === null) throw new Error("Failed to load stores");
      return data;
    },
  });
}
