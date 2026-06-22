import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function parseLocalDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  const iso = date.split("T")[0];
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date: Date | string): string {
  return parseLocalDate(date).toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  return parseLocalDate(date).toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export const VISIT_TYPE_COLORS: Record<string, string> = {
  Maintenance: "bg-blue-100 text-blue-800 border-blue-200",
  "Ad Hoc": "bg-orange-100 text-orange-800 border-orange-200",
};

export const ASSORTMENT_COLORS: Record<string, string> = {
  Snacking: "bg-purple-100 text-purple-800",
  "Grocery Pet Nutrition": "bg-green-100 text-green-800",
};

export const DEFAULT_GLOSSARY = [
  { term: "Halfmoon", definition: "Meuble/display métallique arrondi installé en magasin pour présenter les produits Mars" },
  { term: "HM", definition: "Abréviation de Halfmoon" },
  { term: "Clipstrip", definition: "Bande plastique accrochée en rayon permettant d'exposer des produits supplémentaires" },
  { term: "C&T", definition: "Confiserie & Tablette — catégorie de produits chocolat/confiserie" },
  { term: "MEUBLES SELF C/O", definition: "Mobilier libre-service à vérifier, remplir et maintenir" },
  { term: "Ad Hoc", definition: "Visite ponctuelle hors planning standard pour une mission spécifique" },
  { term: "Maintenance", definition: "Visite de routine : remplissage produits, facing, vérification des prix, mise en ordre du rayon" },
  { term: "Sales rep", definition: "Représentant commercial Mars à contacter en cas de problème en magasin" },
  { term: "Facing", definition: "Mise en avant des produits en rayon (produits bien alignés et visibles en façade)" },
  { term: "CRF MKT", definition: "Carrefour Market" },
  { term: "CRF EXPRESS", definition: "Carrefour Express" },
  { term: "AD DELHAIZE", definition: "AD Delhaize — magasin affilié Delhaize" },
  { term: "INTERMARCHE", definition: "Intermarché" },
];

/**
 * Compress an image file using canvas resizing.
 * Returns a compressed Blob (as File) with max dimensions and quality.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; type?: string } = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8, type = "image/jpeg" } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type,
            lastModified: file.lastModified,
          });
          resolve(compressedFile);
        },
        type,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

// ============================================
// Shared Types and Constants
// ============================================

export type VisitStatus = "pending" | "done" | "cancelled" | "postponed";

export interface VisitBase {
  id: string;
  storeName: string;
  storeCity: string;
  storeZipcode: string;
  storeAddress?: string;
  visitType: string;
  visitDate: string;
  remarks: string | null;
  salesRep: string | null;
  assortment: string;
  sortOrder: number;
  status: string;
}
