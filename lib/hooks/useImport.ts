import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/client-api";

interface ImportResponse {
  error?: string;
  exists?: boolean;
  count?: number;
  label?: string;
  warnings?: string[];
}

export function useImport() {
  return useMutation<ImportResponse, Error, { file: File; mode: "check" | "replace" | "merge" | "new" }>({
    mutationFn: async ({ file, mode }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      const data = await fetchApi<ImportResponse>("/api/import", {
        method: "POST",
        body: formData,
        suppressToast: true,
      });
      if (data === null) throw new Error("Import échoué — vérifie le format du fichier (Excel .xlsx) et sa taille (max 5MB).");
      return data;
    },
  });
}
