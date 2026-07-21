"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";
import { showToast } from "@/components/Toast";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl: string | null;
  receiptKey: string | null;
  exportedAt: string | null;
  createdAt: string;
}

export function useExpenses() {
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const data = await fetchApi<Expense[]>("/api/expenses");
      return data ?? [];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation<Expense, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const data = await fetchApi<Expense>("/api/expenses", {
        method: "POST",
        body: formData,
        suppressToast: true,
      });
      if (data === null) throw new Error("Erreur lors de l'ajout");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      showToast("success", "Dépense ajoutée");
    },
    onError: () => {
      showToast("error", "Erreur lors de l'ajout");
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation<Expense, Error, { id: string; description?: string; amount?: number; expenseDate?: string; exported?: boolean }>({
    mutationFn: async (params) => {
      const data = await fetchApi<Expense>("/api/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        suppressToast: true,
      });
      if (data === null) throw new Error("Erreur lors de la modification");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id: string) => {
      const data = await fetchApi<{ success: boolean }>(`/api/expenses?id=${id}`, {
        method: "DELETE",
        suppressToast: true,
      });
      if (data === null) throw new Error("Erreur lors de la suppression");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      showToast("success", "Dépense supprimée");
    },
    onError: () => {
      showToast("error", "Erreur lors de la suppression");
    },
  });
}
