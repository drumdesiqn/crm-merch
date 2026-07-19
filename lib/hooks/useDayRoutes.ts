import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type DayRoute = {
  id: string;
  date: string;
  distanceM: number;
  durationS: number;
  visitCount: number;
};

export function useDayRoutes(from?: string, to?: string) {
  return useQuery<DayRoute[]>({
    queryKey: ["dayRoutes", from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/routes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch day routes");
      return res.json();
    },
    enabled: !!from && !!to,
  });
}

export function useSaveDayRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; distanceM: number; durationS: number; visitCount: number }) => {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save day route");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dayRoutes"] });
    },
  });
}
