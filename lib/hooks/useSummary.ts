import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export function useSummary() {
  return useQuery<Record<string, { total: number; completed: number }>>({
    queryKey: ["summary"],
    queryFn: async () => {
      const data = await fetchApi<{ stores?: Record<string, { total: number; completed: number }> }>("/api/visits/summary");
      if (data?.stores === undefined) throw new Error("Failed to load summary");
      return data.stores;
    },
  });
}
