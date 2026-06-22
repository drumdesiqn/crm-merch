import { escapeHtml } from "./utils";

/**
 * Shared PDF template styles used by ExportPage and VisitDetailPage.
 */
export const PDF_BASE_STYLES = `
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc2626; }
  .header h1 { color: #dc2626; margin: 0 0 10px; font-size: 24px; }
  .header p { color: #64748b; margin: 0; font-size: 14px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
  .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
  .info-box label { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
  .info-box value { display: block; color: #1e293b; font-size: 16px; font-weight: 600; }
  .section { margin-bottom: 30px; }
  .section h2 { color: #dc2626; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-done { background: #d1fae5; color: #059669; }
  .status-cancelled { background: #fee2e2; color: #dc2626; }
  .status-postponed { background: #e0e7ff; color: #4f46e5; }
  .no-content { color: #9ca3af; font-style: italic; }
  .note-item { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #dc2626; }
  .note-content { margin: 0; color: #334155; font-size: 14px; }
  .note-date { margin: 4px 0 0; color: #94a3b8; font-size: 12px; }
`;

/**
 * Render an info box for the PDF grid.
 */
export function pdfInfoBox(label: string, value: string): string {
  return `
    <div class="info-box">
      <label>${escapeHtml(label)}</label>
      <value>${escapeHtml(value)}</value>
    </div>
  `;
}

/**
 * Render a photo item for the PDF grid.
 */
export function pdfPhotoItem(url: string, caption?: string | null): string {
  return `
    <div style="break-inside: avoid; margin-bottom: 20px;">
      <img src="${escapeHtml(url)}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e2e8f0;" />
      ${caption ? `<p style="font-size: 12px; color: #666; margin-top: 5px;">${escapeHtml(caption)}</p>` : ""}
    </div>
  `;
}

/**
 * Render a note item for the PDF.
 */
export function pdfNoteItem(content: string, dateStr: string): string {
  return `
    <div class="note-item">
      <p class="note-content">${escapeHtml(content).replace(/\n/g, "<br>")}</p>
      <p class="note-date">${new Date(dateStr).toLocaleDateString("fr-BE")}</p>
    </div>
  `;
}

/**
 * Render the footer of a PDF report.
 */
export function pdfFooter(): string {
  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
      Généré par Mars Merch le ${new Date().toLocaleDateString("fr-BE")}
    </div>
    <script>
      window.onload = function() { setTimeout(function() { window.print(); }, 500); };
    </script>
  `;
}
