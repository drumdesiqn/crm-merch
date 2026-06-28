import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

export interface MailLogModification {
  id: string;
  action: string;
  target: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string;
  applied: boolean;
}

export interface MailLog {
  id: string;
  summary: string | null;
  replyDraft: string | null;
  status: string;
  createdAt: string;
  modifications: MailLogModification[];
}

export function useMailLogs() {
  return useQuery<MailLog[]>({
    queryKey: ["mail-logs"],
    queryFn: async () => {
      const data = await fetchApi<MailLog[]>("/api/maillogs", { suppressToast: true });
      if (!data) throw new Error("Failed to load mail logs");
      return data;
    },
    staleTime: 30_000,
  });
}
