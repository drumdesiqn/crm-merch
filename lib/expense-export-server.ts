import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";
import { jsPDF } from "jspdf";

export type ExportExpense = {
  id: string;
  description: string;
  amount: number;
  expenseDate: Date | string;
  receiptUrl: string | null;
};

export const EXCEL_MAX_ROWS = 12;

function colLetterToNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function setCellValue(sheetXml: string, cellRef: string, value: string | number): string {
  const isNumber = typeof value === "number";
  const escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const typeAttr = isNumber ? "" : ` t="inlineStr"`;
  const valueXml = isNumber ? `<v>${escaped}</v>` : `<is><t xml:space="preserve">${escaped}</t></is>`;

  const fullCellRegex = new RegExp(`<c r="${cellRef}"((?:\\s+[a-zA-Z:]+="[^"]*")*)\\s*>[\\s\\S]*?</c>`);
  const fullMatch = sheetXml.match(fullCellRegex);
  if (fullMatch) {
    const styleMatch = fullMatch[1].match(/s="(\d+)"/);
    const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : "";
    return sheetXml.replace(fullCellRegex, `<c r="${cellRef}"${styleAttr}${typeAttr}>${valueXml}</c>`);
  }

  const selfClosingRegex = new RegExp(`<c r="${cellRef}"((?:\\s+[a-zA-Z:]+="[^"]*")*)\\s*/>`);
  const selfMatch = sheetXml.match(selfClosingRegex);
  if (selfMatch) {
    const styleMatch = selfMatch[1].match(/s="(\d+)"/);
    const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : "";
    return sheetXml.replace(selfClosingRegex, `<c r="${cellRef}"${styleAttr}${typeAttr}>${valueXml}</c>`);
  }

  const rowNum = cellRef.match(/\d+/)![0];
  const targetCol = colLetterToNum(cellRef.match(/[A-Z]+/)![0]);
  const rowRegex = new RegExp(`(<row r="${rowNum}"(?:\\s+[a-zA-Z:]+="[^"]*")*\\s*>)([\\s\\S]*?)(</row>)`);
  const rowMatch = sheetXml.match(rowRegex);
  if (!rowMatch) return sheetXml;

  const newCell = `<c r="${cellRef}"${typeAttr}>${valueXml}</c>`;
  const rowContent = rowMatch[2];
  const cellRefsRegex = /<c r="([A-Z]+)(\d+)"/g;
  let insertOffset = rowContent.length;
  let m: RegExpExecArray | null;
  while ((m = cellRefsRegex.exec(rowContent)) !== null) {
    if (colLetterToNum(m[1]) > targetCol) {
      insertOffset = m.index;
      break;
    }
  }

  const newRowContent = rowContent.slice(0, insertOffset) + newCell + rowContent.slice(insertOffset);
  return sheetXml.replace(rowRegex, `$1${newRowContent}$3`);
}

/**
 * Fill the onkostennota Excel template with expenses. Preserves all template formatting.
 */
export async function generateExpenseExcel(expenses: ExportExpense[], userName: string): Promise<ArrayBuffer> {
  const templatePath = path.join(process.cwd(), "public", "templates", "onkostennota-template.xlsx");
  const templateBuffer = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const sheetFile = Object.keys(zip.files).find(f => f.startsWith("xl/worksheets/sheet") && f.endsWith(".xml"));
  if (!sheetFile) throw new Error("Sheet XML not found");
  let sheetXml = await zip.files[sheetFile].async("string");

  const now = new Date();
  const monthLabel = now.toLocaleDateString("fr-BE", { month: "long" });
  const dateStr = now.toLocaleDateString("fr-BE");

  sheetXml = setCellValue(sheetXml, "D6", monthLabel);
  sheetXml = setCellValue(sheetXml, "D7", now.getFullYear());
  sheetXml = setCellValue(sheetXml, "F13", userName);
  sheetXml = setCellValue(sheetXml, "F15", dateStr);

  const expensesToFill = expenses.slice(0, EXCEL_MAX_ROWS);
  let total = 0;

  expensesToFill.forEach((expense, i) => {
    const row = 22 + i;
    sheetXml = setCellValue(sheetXml, `C${row}`, expense.description);
    const d = new Date(expense.expenseDate);
    d.setHours(12, 0, 0, 0);
    sheetXml = setCellValue(sheetXml, `G${row}`, d.toLocaleDateString("fr-BE"));
    sheetXml = setCellValue(sheetXml, `J${row}`, expense.amount);
    total += expense.amount;
  });

  sheetXml = setCellValue(sheetXml, "J37", Math.round(total * 100) / 100);

  zip.file(sheetFile, sheetXml);
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

/**
 * Generate a neutral PDF with expense table + receipt photos (fetched server-side).
 */
export async function generateExpensePdf(expenses: ExportExpense[]): Promise<ArrayBuffer> {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-BE");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header bar (neutral)
  doc.setFillColor(50, 50, 50);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("NOTE DE FRAIS — Pièces justificatives", margin, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pageW - margin, 13, { align: "right" });

  y = 30;
  doc.setTextColor(30, 41, 59);

  // Info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date d'émission: ${dateStr}`, margin, y);
  doc.text(`Nombre de dépenses: ${expenses.length}`, pageW - margin, y, { align: "right" });
  y += 8;

  // Table header
  doc.setFillColor(50, 50, 50);
  doc.rect(margin, y, contentW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#", margin + 3, y + 5);
  doc.text("Date", margin + 15, y + 5);
  doc.text("Description", margin + 45, y + 5);
  doc.text("Montant", pageW - margin - 25, y + 5);
  doc.text("Ticket", pageW - margin - 5, y + 5, { align: "right" });
  y += 7;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  expenses.forEach((e, i) => {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }
    const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentW, 6, "F");
    const d = new Date(e.expenseDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
    doc.text(String(i + 1), margin + 3, y + 4.5);
    doc.text(d, margin + 15, y + 4.5);
    const desc = e.description.length > 40 ? e.description.slice(0, 38) + "…" : e.description;
    doc.text(desc, margin + 45, y + 4.5);
    doc.text(`${e.amount.toFixed(2)} €`, pageW - margin - 25, y + 4.5);
    doc.text(e.receiptUrl ? "Oui" : "—", pageW - margin - 5, y + 4.5, { align: "right" });
    y += 6;
  });

  // Total
  y += 3;
  doc.setFillColor(50, 50, 50);
  doc.rect(margin, y, contentW, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", margin + 3, y + 6);
  doc.text(`${total.toFixed(2)} €`, pageW - margin - 5, y + 6, { align: "right" });

  // Receipt photos — fetched server-side (no CORS restrictions)
  const withReceipts = expenses.filter((e) => e.receiptUrl);
  if (withReceipts.length > 0) {
    doc.addPage();
    y = margin;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Pièces justificatives", margin, y);
    y += 8;

    for (const e of withReceipts) {
      const num = expenses.indexOf(e) + 1;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const label = `N°${num} — ${e.description} (${e.amount.toFixed(2)} €)`;
      const truncated = label.length > 70 ? label.slice(0, 68) + "…" : label;

      if (y > pageH - 100) {
        doc.addPage();
        y = margin;
      }

      doc.text(truncated, margin, y);
      y += 5;

      try {
        const imgRes = await fetch(e.receiptUrl!);
        if (!imgRes.ok) throw new Error("fetch failed");
        const arrayBuffer = await imgRes.arrayBuffer();
        const imgData = new Uint8Array(arrayBuffer);

        const props = doc.getImageProperties(imgData);
        const maxImgW = contentW;
        const maxImgH = 160;
        const ratio = Math.min(maxImgW / props.width, maxImgH / props.height);
        const imgW = props.width * ratio;
        const imgH = props.height * ratio;

        if (y + imgH > pageH - 15) {
          doc.addPage();
          y = margin;
        }

        doc.addImage(imgData, props.fileType, margin, y, imgW, imgH, undefined, "FAST");
        y += imgH + 12;
      } catch {
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text("[Image non disponible]", margin, y + 5);
        y += 15;
      }
    }
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${p}/${pageCount}`, pageW / 2, pageH - 5, { align: "center" });
  }

  return doc.output("arraybuffer");
}

/**
 * Sanitize a description for use in a filename.
 */
export function safeFilename(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "photo";
}
