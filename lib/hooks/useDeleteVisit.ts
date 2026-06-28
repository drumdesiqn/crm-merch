import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id: string) => {
      const data = await fetchApi<{ success: boolean }>(`/api/visits/${id}`, {
        method: "DELETE",
      });
      if (data === null) throw new Error("Failed to delete visit");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["weeks"] });
    },
  });
}
