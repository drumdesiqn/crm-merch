import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import type { Week } from "@/types/visit";

export function useWeeks() {
  return useQuery<Week[]>({
    queryKey: ["weeks"],
    queryFn: async () => {
      const data = await fetchApi<Week[]>("/api/weeks");
      if (data === null) throw new Error("Failed to load weeks");
      return data;
    },
  });
}
