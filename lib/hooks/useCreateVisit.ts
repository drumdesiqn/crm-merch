import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Visit } from "@/types/visit";

interface CreateVisitInput {
  storeId: string;
  weekId?: string;
  visitDate: string;
  visitType?: string;
  assortment?: string;
  merchandiser?: string | null;
  remarks?: string | null;
  salesRep?: string | null;
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation<Visit, Error, CreateVisitInput>({
    mutationFn: async (input) => {
      const data = await fetchApi<Visit>("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (data === null) throw new Error("Failed to create visit");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["weeks"] });
    },
  });
}
