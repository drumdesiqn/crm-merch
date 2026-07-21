import { escapeHtml } from "./utils";
import { showToast } from "@/components/Toast";

/**
 * Shared PDF template styles used by ExportPage and VisitDetailPage.
 * Professional design with Mars branding.
 */
export const PDF_BASE_STYLES = `
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { margin: 18mm 16mm 20mm 16mm; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    color: #1e293b;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px;
    background: #fff;
  }

  /* ── Brand header bar ── */
  .brand-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: linear-gradient(135deg, #003478 0%, #005392 100%);
    border-radius: 10px;
    margin-bottom: 28px;
    color: #fff;
  }
  .brand-bar .brand-title { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
  .brand-bar .brand-sub { font-size: 12px; opacity: 0.85; }

  /* ── Section headers ── */
  .section { margin-bottom: 28px; }
  .section h2 {
    color: #003478;
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 12px;
    padding: 8px 14px;
    background: #f0f5fa;
    border-radius: 6px;
    border-left: 4px solid #005392;
  }

  /* ── Info grid ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
  .info-box {
    background: #f8fafc;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid #e9eef5;
  }
  .info-box label { display: block; color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
  .info-box value { display: block; color: #1e293b; font-size: 15px; font-weight: 600; }

  /* ── Status badges ── */
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-pending { background: #fef3c7; color: #b45309; }
  .status-done { background: #dcfce7; color: #15803d; }
  .status-cancelled { background: #fee2e2; color: #C8102E; }
  .status-postponed { background: #e0e7ff; color: #4f46e5; }

  /* ── Photos ── */
  .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

  /* ── Notes ── */
  .note-item {
    background: #f8fafc;
    padding: 12px 14px;
    border-radius: 8px;
    margin-bottom: 8px;
    border-left: 3px solid #005392;
  }
  .note-content { margin: 0; color: #334155; font-size: 14px; }
  .note-date { margin: 4px 0 0; color: #94a3b8; font-size: 11px; }

  .no-content { color: #9ca3af; font-style: italic; font-size: 13px; }

  /* ── Cover page ── */
  .cover-page {
    min-height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    page-break-after: always;
  }
  .cover-logo {
    width: 64px; height: 64px;
    border-radius: 14px;
    background: linear-gradient(135deg, #003478 0%, #005392 100%);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
    color: #fff; font-size: 28px; font-weight: 800;
    letter-spacing: -1px;
  }
  .cover-title { font-size: 32px; font-weight: 800; color: #003478; margin: 0 0 8px; letter-spacing: -0.5px; }
  .cover-subtitle { font-size: 16px; color: #64748b; margin: 0 0 40px; }
  .cover-meta {
    display: flex; gap: 32px;
    margin-bottom: 40px;
  }
  .cover-meta-item { text-align: center; }
  .cover-meta-item .num { font-size: 28px; font-weight: 800; color: #005392; }
  .cover-meta-item .lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-top: 2px; }

  /* ── Summary table ── */
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 8px;
  }
  .summary-table th {
    background: #003478;
    color: #fff;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .summary-table th:first-child { border-radius: 6px 0 0 0; }
  .summary-table th:last-child { border-radius: 0 6px 0 0; }
  .summary-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #e9eef5;
    color: #334155;
  }
  .summary-table tr:nth-child(even) td { background: #f8fafc; }

  /* ── Visit page ── */
  .visit-page { page-break-inside: avoid; }
  .visit-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 2px solid #003478;
  }
  .visit-header h1 { color: #003478; margin: 0; font-size: 22px; font-weight: 800; }
  .visit-header .visit-date { color: #64748b; font-size: 13px; margin: 4px 0 0; }

  /* ── Footer ── */
  .pdf-footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    color: #94a3b8;
    font-size: 11px;
  }
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
 * Status label in French.
 */
function statusLabel(status: string): string {
  return status === "done" ? "Effectu\u00e9" : status === "cancelled" ? "Annul\u00e9" : status === "postponed" ? "Report\u00e9" : "En attente";
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
 * Render a categorized photo item for the PDF grid.
 */
export function pdfCategorizedPhotoItem(url: string, category?: string | null, caption?: string | null): string {
  const badge = category === "before"
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:#fef3c7;color:#b45309;margin-bottom:6px;">Avant</span>`
    : category === "after"
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;background:#dcfce7;color:#15803d;margin-bottom:6px;">Après</span>`
    : "";
  return `
    <div style="break-inside: avoid; margin-bottom: 20px;">
      ${badge}
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
    <div class="pdf-footer">
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
  salesRep?: string | null;
  photos: { url: string; category?: string | null }[];
  notes: { content: string; createdAt: string }[];
}): string {
  const photosHtml = visit.photos.map((p) => pdfCategorizedPhotoItem(p.url, p.category)).join("");
  const notesHtml = visit.notes.length
    ? visit.notes.map((n) => pdfNoteItem(n.content, n.createdAt)).join("")
    : '<p class="no-content">Aucune note</p>';

  const date = new Date(visit.visitDate).toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return `
    <div class="visit-page">
      <div class="visit-header">
        <div>
          <h1>${escapeHtml(visit.storeName)}</h1>
          <p class="visit-date">${date}</p>
        </div>
        <span class="status-badge status-${visit.status}">${statusLabel(visit.status)}</span>
      </div>

      <div class="info-grid">
        ${pdfInfoBox("Type", visit.visitType)}
        ${pdfInfoBox("Adresse", `${visit.storeAddress}, ${visit.storeZipcode} ${visit.storeCity}`)}
        ${visit.materialType ? pdfInfoBox("Matériel", visit.materialType) : ""}
        ${visit.salesRep ? pdfInfoBox("Sales Rep", visit.salesRep) : ""}
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
    salesRep?: string | null;
    photos: { url: string; category?: string | null }[];
    notes: { content: string; createdAt: string }[];
  }[],
  weekLabel: string,
): string {
  const pages = visits.map((v) => pdfVisitPage(v)).join('<div style="page-break-after: always;"></div>');

  const doneCount = visits.filter((v) => v.status === "done").length;
  const pendingCount = visits.filter((v) => v.status === "pending").length;
  const totalPhotos = visits.reduce((s, v) => s + v.photos.length, 0);
  const totalNotes = visits.reduce((s, v) => s + v.notes.length, 0);

  const summaryRows = visits.map((v, i) => {
    const d = new Date(v.visitDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
    return `<tr>
      <td>${i + 1}</td>
      <td>${d}</td>
      <td>${escapeHtml(v.storeName)}</td>
      <td>${escapeHtml(v.storeCity)}</td>
      <td>${escapeHtml(v.visitType)}</td>
      <td><span class="status-badge status-${v.status}">${statusLabel(v.status)}</span></td>
    </tr>`;
  }).join("");

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
      <!-- Cover page -->
      <div class="cover-page">
        <div class="cover-logo">M</div>
        <h1 class="cover-title">Rapport Hebdomadaire</h1>
        <p class="cover-subtitle">${escapeHtml(weekLabel)}</p>

        <div class="cover-meta">
          <div class="cover-meta-item">
            <div class="num">${visits.length}</div>
            <div class="lbl">Visites</div>
          </div>
          <div class="cover-meta-item">
            <div class="num">${doneCount}</div>
            <div class="lbl">Effectuées</div>
          </div>
          <div class="cover-meta-item">
            <div class="num">${pendingCount}</div>
            <div class="lbl">En attente</div>
          </div>
          <div class="cover-meta-item">
            <div class="num">${totalPhotos}</div>
            <div class="lbl">Photos</div>
          </div>
          <div class="cover-meta-item">
            <div class="num">${totalNotes}</div>
            <div class="lbl">Notes</div>
          </div>
        </div>

        <table class="summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Magasin</th>
              <th>Ville</th>
              <th>Type</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
        </table>
      </div>

      <!-- Visit pages -->
      ${pages}

      <div class="pdf-footer">
        Généré par CPM Mars le ${new Date().toLocaleDateString("fr-BE")}
      </div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;
}

/**
 * Generate a PDF note de frais document with expense table + receipt photos.
 * Opens a print window and returns nothing.
 */
export function pdfExpenseDocument(
  expenses: {
    id: string;
    description: string;
    amount: number;
    expenseDate: string;
    receiptUrl: string | null;
  }[]
): void {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-BE");

  const rows = expenses.map((e, i) => {
    const d = new Date(e.expenseDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `<tr>
      <td>${i + 1}</td>
      <td>${d}</td>
      <td>${escapeHtml(e.description)}</td>
      <td style="text-align: right; font-weight: 600;">${e.amount.toFixed(2)} €</td>
      <td style="text-align: center;">${e.receiptUrl ? "Oui" : "—"}</td>
    </tr>`;
  }).join("");

  const receiptPhotos = expenses
    .filter((e) => e.receiptUrl)
    .map((e, i) => {
      const num = expenses.indexOf(e) + 1;
      return `
        <div style="break-inside: avoid; margin-bottom: 24px; page-break-inside: avoid;">
          <p style="font-size: 13px; font-weight: 700; color: #003478; margin: 0 0 8px;">
            N°${num} — ${escapeHtml(e.description)} (${e.amount.toFixed(2)} €)
          </p>
          <img src="${escapeHtml(e.receiptUrl!)}" style="max-width: 100%; max-height: 500px; border-radius: 8px; border: 1px solid #e2e8f0;" />
        </div>
      `;
    }).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Note de frais — ${dateStr}</title>
      <style>
        ${PDF_BASE_STYLES}
        .expense-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: linear-gradient(135deg, #003478 0%, #005392 100%);
          border-radius: 8px;
          color: #fff;
          margin-top: 16px;
        }
        .expense-total .lbl { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .expense-total .val { font-size: 24px; font-weight: 800; }
        .signature-zone {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
          gap: 40px;
        }
        .signature-box {
          flex: 1;
          text-align: center;
        }
        .signature-box .line {
          border-top: 1.5px solid #94a3b8;
          padding-top: 8px;
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        @media print { .receipt-page { page-break-before: always; } }
      </style>
    </head>
    <body>
      <div class="brand-bar">
        <div>
          <div class="brand-title">NOTE DE FRAIS</div>
          <div class="brand-sub">CPM Mars · ${dateStr}</div>
        </div>
        <div style="font-size: 28px; font-weight: 800;">€</div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <label>Date d'émission</label>
          <value>${dateStr}</value>
        </div>
        <div class="info-box">
          <label>Nombre de dépenses</label>
          <value>${expenses.length}</value>
        </div>
      </div>

      <div class="section">
        <h2>Détail des dépenses</h2>
        <table class="summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Description</th>
              <th style="text-align: right;">Montant</th>
              <th style="text-align: center;">Ticket</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="expense-total">
          <span class="lbl">Total</span>
          <span class="val">${total.toFixed(2)} €</span>
        </div>
      </div>

      <div class="signature-zone">
        <div class="signature-box">
          <div style="height: 60px;"></div>
          <div class="line">Signature du collaborateur</div>
        </div>
        <div class="signature-box">
          <div style="height: 60px;"></div>
          <div class="line">Validation du manager</div>
        </div>
      </div>

      ${receiptPhotos ? `
        <div class="receipt-page"></div>
        <div class="section">
          <h2>Pièces justificatives</h2>
          ${receiptPhotos}
        </div>
      ` : ""}

      <div class="pdf-footer">
        Généré par CPM Mars le ${dateStr}
      </div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("error", "Popup bloquée — autorisez les popups pour l'export PDF");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
