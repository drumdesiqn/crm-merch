import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Visit } from "@/types/visit";

interface UpdateVisitInput {
  id: string;
  visitDate?: string;
  status?: string;
  materialType?: string | null;
  remarks?: string | null;
  salesRep?: string | null;
  visitType?: string;
  materials?: string | null;
  visitFrequence?: string | null;
  merchandiser?: string | null;
  storeAddress?: string;
  storeZipcode?: string;
  storeCity?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  return useMutation<Visit, Error, UpdateVisitInput>({
    mutationFn: async (input) => {
      const data = await fetchApi<Visit>("/api/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (data === null) throw new Error("Failed to update visit");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["visit"] });
    },
  });
}
