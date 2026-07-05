import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface ContactItem {
  id: string;
  teamId: string;
  name: string;
  phone: string;
  email: string;
  sortOrder: number;
}

export interface ContactTeamWithContacts {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  contacts: ContactItem[];
}

export function useContacts() {
  return useQuery<ContactTeamWithContacts[]>({
    queryKey: ["contacts"],
    queryFn: () => fetchApi<ContactTeamWithContacts[]>("/api/contacts").then((d) => d ?? []),
    staleTime: 5 * 60 * 1000,
  });
}
