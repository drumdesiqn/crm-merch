import { escapeHtml } from "./utils";

/**
 * Shared PDF template styles used by ExportPage and VisitDetailPage.
 */
export const PDF_BASE_STYLES = `
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563EB; }
  .header h1 { color: #2563EB; margin: 0 0 10px; font-size: 24px; }
  .header p { color: #64748b; margin: 0; font-size: 14px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
  .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
  .info-box label { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
  .info-box value { display: block; color: #1e293b; font-size: 16px; font-weight: 600; }
  .section { margin-bottom: 30px; }
  .section h2 { color: #2563EB; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-done { background: #d1fae5; color: #059669; }
  .status-cancelled { background: #fee2e2; color: #C8102E; }
  .status-postponed { background: #e0e7ff; color: #4f46e5; }
  .no-content { color: #9ca3af; font-style: italic; }
  .note-item { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #2563EB; }
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
      Généré par CPM Mars le ${new Date().toLocaleDateString("fr-BE")}
    </div>
    <script>
      window.onload = function() { setTimeout(function() { window.print(); }, 500); };
    </script>
  `;
}

/**
 * Render a single visit as a full PDF page section (for batch export).
 */
export function pdfVisitPage(visit: {
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  visitDate: string;
  visitType: string;
  status: string;
  remarks?: string | null;
  materials?: string | null;
  materialType?: string | null;
  photos: { url: string }[];
  notes: { content: string; createdAt: string }[];
}): string {
  const photosHtml = visit.photos.map((p) => pdfPhotoItem(p.url)).join("");
  const notesHtml = visit.notes.length
    ? visit.notes.map((n) => pdfNoteItem(n.content, n.createdAt)).join("")
    : '<p class="no-content">Aucune note</p>';

  const date = new Date(visit.visitDate).toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return `
    <div class="visit-page">
      <div class="header">
        <h1>${escapeHtml(visit.storeName)}</h1>
        <p>${date}</p>
      </div>

      <div class="info-grid">
        ${pdfInfoBox("Type", visit.visitType)}
        ${pdfInfoBox("Adresse", `${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}`)}
        <div class="info-box">
          <label>Statut</label>
          <value><span class="status-badge status-${visit.status}">${visit.status === "done" ? "Effectué" : visit.status === "cancelled" ? "Annulé" : visit.status === "postponed" ? "Reporté" : "En attente"}</span></value>
        </div>
        ${visit.materialType ? pdfInfoBox("Matériel", visit.materialType) : ""}
      </div>

      ${visit.remarks ? `<div class="section"><h2>Remarques</h2><p>${escapeHtml(visit.remarks).replace(/\n/g, "<br>")}</p></div>` : ""}
      ${visit.materials ? `<div class="section"><h2>Matériel nécessaire</h2><p>${escapeHtml(visit.materials).replace(/\n/g, "<br>")}</p></div>` : ""}

      <div class="section">
        <h2>Notes (${visit.notes.length})</h2>
        ${notesHtml}
      </div>

      <div class="section">
        <h2>Photos (${visit.photos.length})</h2>
        ${visit.photos.length > 0 ? `<div class="photos-grid">${photosHtml}</div>` : '<p class="no-content">Aucune photo</p>'}
      </div>
    </div>
  `;
}

/**
 * Assemble a multi-page PDF document for all visits of a week.
 */
export function pdfBatchDocument(
  visits: {
    storeName: string;
    storeAddress: string;
    storeZipcode: string;
    storeCity: string;
    visitDate: string;
    visitType: string;
    status: string;
    remarks?: string | null;
    materials?: string | null;
    materialType?: string | null;
    photos: { url: string }[];
    notes: { content: string; createdAt: string }[];
  }[],
  weekLabel: string,
): string {
  const pages = visits.map((v) => pdfVisitPage(v)).join('<div style="page-break-after: always;"></div>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rapport semaine - ${escapeHtml(weekLabel)}</title>
      <style>
        ${PDF_BASE_STYLES}
        .visit-page { page-break-inside: avoid; }
        @media print { .visit-page { page-break-after: always; } .visit-page:last-child { page-break-after: auto; } }
      </style>
    </head>
    <body>
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #2563EB; font-size: 28px; margin: 0;">Rapport Hebdomadaire</h1>
        <p style="color: #64748b; font-size: 16px; margin: 8px 0 0;">${escapeHtml(weekLabel)} — ${visits.length} visite${visits.length !== 1 ? "s" : ""}</p>
      </div>
      ${pages}
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
        Généré par CPM Mars le ${new Date().toLocaleDateString("fr-BE")}
      </div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;
}
