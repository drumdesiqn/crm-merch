import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface SettingsData {
  userName?: string;
  userZone?: string;
  userEmail?: string;
  homeAddress?: string;
  endAddress?: string;
  hasApiKey?: boolean;
}

export function useSettings() {
  return useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: async () => {
      const data = await fetchApi<SettingsData>("/api/settings");
      if (!data) throw new Error("Failed to load settings");
      return data;
    },
    staleTime: 60_000,
  });
}
