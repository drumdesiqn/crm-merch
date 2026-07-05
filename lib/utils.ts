import type React from "react";
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
  Maintenance: "bg-blue-mars-light text-blue-mars border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  "Ad Hoc": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
};

export const VISIT_TYPE_DARK_STYLES: Record<string, React.CSSProperties> = {
  Maintenance: { backgroundColor: "rgba(37,99,235,0.2)", color: "rgb(96,165,250)", borderColor: "rgba(37,99,235,0.4)" },
  "Ad Hoc": { backgroundColor: "rgba(124,45,18,0.4)", color: "rgb(253,186,116)", borderColor: "rgba(124,45,18,0.5)" },
};

export const ASSORTMENT_COLORS: Record<string, string> = {
  Snacking: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "Grocery Pet Nutrition": "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

export const ASSORTMENT_DARK_STYLES: Record<string, React.CSSProperties> = {
  Snacking: { backgroundColor: "rgba(88,28,135,0.4)", color: "rgb(216,180,254)" },
  "Grocery Pet Nutrition": { backgroundColor: "rgba(20,83,45,0.4)", color: "rgb(134,239,172)" },
};

// DEFAULT_GLOSSARY moved to lib/constants.ts
export { DEFAULT_GLOSSARY } from "./constants";

// compressImage moved to lib/image-utils.ts
export { compressImage } from "./image-utils";

/**
 * Escape HTML special characters to prevent XSS injection.
 * Use this whenever inserting user content into raw HTML (e.g. PDF exports).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================
// Shared Types and Constants
// ============================================

export type VisitStatus = "pending" | "done" | "cancelled" | "postponed";