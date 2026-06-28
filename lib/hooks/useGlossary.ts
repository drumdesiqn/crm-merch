import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

export function useGlossary() {
  return useQuery<GlossaryTerm[]>({
    queryKey: ["glossary"],
    queryFn: async () => {
      const data = await fetchApi<GlossaryTerm[]>("/api/glossary");
      if (!data) throw new Error("Failed to load glossary");
      return data;
    },
    staleTime: 60_000,
  });
}
