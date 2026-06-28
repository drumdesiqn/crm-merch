import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

interface UpdateStoreInput {
  storeId: string;
  storeName?: string;
  storeAddress?: string;
  storeZipcode?: string;
  storeCity?: string;
  assortment?: string;
  visitType?: string;
  visitFrequence?: string | null;
  salesRep?: string | null;
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, UpdateStoreInput>({
    mutationFn: async (input) => {
      const data = await fetchApi("/api/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (data === null) throw new Error("Failed to update store");
      return data;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["store-history-page", input.storeId] });
    },
  });
}
