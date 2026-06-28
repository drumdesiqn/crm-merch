import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Store } from "./useStores";

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation<Store, Error, Omit<Store, "id" | "totalVisits" | "completedVisits" | "lastVisit" | "materialTypes" | "totalPhotos">>({
    mutationFn: async (store) => {
      const data = await fetchApi<Store>("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(store),
      });
      if (data === null) throw new Error("Failed to create store");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}
