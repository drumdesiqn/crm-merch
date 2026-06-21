import * as XLSX from "xlsx";
import { getISOWeek } from "./utils";

export interface ParsedVisit {
  assortment: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  visitType: string;
  visitFrequence: string | null;
  visitDate: Date;
  merchandiser: string | null;
  remarks: string | null;
  salesRep: string | null;
  materials: string | null;
  materialType: string | null;
}

export interface ParseResult {
  visits: ParsedVisit[];
  weekNum: number;
  year: number;
  label: string;
  warnings: string[];
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: false,
    dateNF: "yyyy-mm-dd",
    defval: null,
  });

  const warnings: string[] = [];
  let invalidDateCount = 0;
  let missingStoreIdCount = 0;

  const allVisits: ParsedVisit[] = rows.map((row) => {
    let visitDate: Date;
    const rawDate = row["Day Period 2"];
    if (rawDate instanceof Date) {
      visitDate = new Date(Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 12, 0, 0));
    } else if (typeof rawDate === "string") {
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) {
        invalidDateCount++;
        const now = new Date();
        visitDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
      } else {
        visitDate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
      }
    } else {
      invalidDateCount++;
      const now = new Date();
      visitDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
    }

    const storeId = String(row["store_id"] || "").trim();
    if (!storeId) missingStoreIdCount++;

    return {
      assortment: String(row["assortment"] || ""),
      storeId,
      storeName: String(row["store_name"] || ""),
      storeAddress: String(row["store_address"] || ""),
      storeZipcode: String(row["store_zipcode"] || ""),
      storeCity: String(row["store_city"] || ""),
      visitType: String(row["visit_type"] || "Maintenance"),
      visitFrequence: row["Visit Frequence"] ? String(row["Visit Frequence"]) : null,
      visitDate,
      merchandiser: row["Merchandiser"] ? String(row["Merchandiser"]) : null,
      remarks: row["Remarks"] ? String(row["Remarks"]).trim() : null,
      salesRep: row["Sales rep"] ? String(row["Sales rep"]) : null,
      materials: row["Materials"] ? String(row["Materials"]).trim() : null,
      materialType: row["materialType"] ? String(row["materialType"]).trim() : null,
    };
  });

  if (invalidDateCount > 0) {
    warnings.push(`${invalidDateCount} ligne(s) sans date valide — date d'aujourd'hui utilisée en remplacement.`);
  }
  if (missingStoreIdCount > 0) {
    warnings.push(`${missingStoreIdCount} ligne(s) sans identifiant magasin (store_id).`);
  }

  // Filter out rows with empty storeId to avoid merge deduplication issues
  const visits = allVisits.filter((v) => v.storeId !== "");

  // Use median date for week detection (more robust than first row)
  const sortedDates = [...visits].map((v) => v.visitDate.getTime()).sort((a, b) => a - b);
  const medianDate = sortedDates.length > 0
    ? new Date(sortedDates[Math.floor(sortedDates.length / 2)])
    : new Date();

  const weekNum = getISOWeek(medianDate);
  const year = medianDate.getUTCFullYear();
  const label = `W${weekNum} ${year}`;

  return { visits, weekNum, year, label, warnings };
}
