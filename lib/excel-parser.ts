import * as XLSX from "xlsx";
import { getISOWeek } from "./utils";

// SECURITY NOTE: xlsx (SheetJS CE) has known prototype-pollution and ReDoS advisories
// with no upstream fix. We mitigate via:
// 1. Prototype snapshot + cleanup after parsing (detects and removes pollution)
// 2. cellFormula:false, bookVBA:false (disable macro/formula execution)
// 3. Row count limit + string length clamping (limit resource consumption)
// 4. File size + MIME type validation in the API route layer
// Consider migrating to a maintained alternative (e.g. ExcelJS) if SheetJS CE remains unpatched.

const MAX_IMPORT_ROWS = 5000;
const MAX_CELL_STRING_LENGTH = 5000;

/**
 * Parse an Excel buffer with prototype-pollution detection.
 * Snapshots Object.prototype keys before parsing and removes any keys
 * injected by the xlsx library (prototype pollution mitigation).
 */
function safeXlsxRead(buffer: ArrayBuffer): XLSX.WorkBook {
  const keysBefore = new Set(Object.getOwnPropertyNames(Object.prototype));

  const wb = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellFormula: false,
    bookVBA: false,
    dense: true,
  });

  // Detect and clean any prototype pollution
  const keysAfter = Object.getOwnPropertyNames(Object.prototype);
  for (const key of keysAfter) {
    if (!keysBefore.has(key)) {
      // Polluted property detected — remove it
      delete (Object.prototype as Record<string, unknown>)[key];
    }
  }

  return wb;
}

function normalizeString(value: unknown, maxLen = MAX_CELL_STRING_LENGTH): string {
  const str = String(value ?? "").trim();
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

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
  const wb = safeXlsxRead(buffer);

  if (!wb.SheetNames.length) {
    throw new Error("Le fichier Excel ne contient aucune feuille.");
  }

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error("Impossible de lire la première feuille Excel.");
  }

  const ref = ws["!ref"];
  if (!ref) {
    return {
      visits: [],
      weekNum: getISOWeek(new Date()),
      year: new Date().getUTCFullYear(),
      label: `W${getISOWeek(new Date())} ${new Date().getUTCFullYear()}`,
      warnings: [],
    };
  }

  const range = XLSX.utils.decode_range(ref);
  const estimatedRows = range.e.r - range.s.r;
  if (estimatedRows > MAX_IMPORT_ROWS) {
    throw new Error(`Fichier trop volumineux: ${estimatedRows} lignes détectées (max ${MAX_IMPORT_ROWS}).`);
  }

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
        visitDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
      } else {
        visitDate = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0));
      }
    } else {
      invalidDateCount++;
      const now = new Date();
      visitDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    }

    const storeId = String(row["store_id"] || "").trim();
    if (!storeId) missingStoreIdCount++;

    return {
      assortment: normalizeString(row["assortment"], 200),
      storeId,
      storeName: normalizeString(row["store_name"], 200),
      storeAddress: normalizeString(row["store_address"], 300),
      storeZipcode: normalizeString(row["store_zipcode"], 20),
      storeCity: normalizeString(row["store_city"], 100),
      visitType: normalizeString(row["visit_type"] || "Maintenance", 100) || "Maintenance",
      visitFrequence: row["Visit Frequence"] ? normalizeString(row["Visit Frequence"], 100) : null,
      visitDate,
      merchandiser: row["Merchandiser"] ? normalizeString(row["Merchandiser"], 200) : null,
      remarks: row["Remarks"] ? normalizeString(row["Remarks"], 5000) : null,
      salesRep: row["Sales rep"] ? normalizeString(row["Sales rep"], 200) : null,
      materials: row["Materials"] ? normalizeString(row["Materials"], 2000) : null,
      materialType: row["materialType"] ? normalizeString(row["materialType"], 100) : null,
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
