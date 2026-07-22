import { jsPDF } from "jspdf";

export type ExportVisitData = {
  id: string;
  storeName: string;
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
};

function statusLabel(status: string): string {
  return status === "done" ? "Effectué" : status === "cancelled" ? "Annulé" : status === "postponed" ? "Reporté" : "En attente";
}

/**
 * Generate a downloadable PDF report for a week's visits (server-side, jsPDF).
 */
export async function generateWeekPdf(visits: ExportVisitData[], weekLabel: string): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Cover page ──
  doc.setFillColor(0, 52, 120);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport Hebdomadaire", margin, 20);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(weekLabel, margin, 30);

  y = 55;
  doc.setTextColor(30, 41, 59);

  // Stats
  const doneCount = visits.filter((v) => v.status === "done").length;
  const pendingCount = visits.filter((v) => v.status === "pending").length;
  const totalPhotos = visits.reduce((s, v) => s + v.photos.length, 0);
  const totalNotes = visits.reduce((s, v) => s + v.notes.length, 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const stats = [
    `Visites: ${visits.length}`,
    `Effectuées: ${doneCount}`,
    `En attente: ${pendingCount}`,
    `Photos: ${totalPhotos}`,
    `Notes: ${totalNotes}`,
  ];
  stats.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    doc.text(s, margin + col * 60, y + row * 7);
  });
  y += 20;

  // Summary table
  doc.setFillColor(0, 52, 120);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#", margin + 3, y + 5.5);
  doc.text("Date", margin + 15, y + 5.5);
  doc.text("Magasin", margin + 45, y + 5.5);
  doc.text("Ville", margin + 110, y + 5.5);
  doc.text("Type", margin + 145, y + 5.5);
  doc.text("Statut", margin + 175, y + 5.5);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  visits.forEach((v, i) => {
    if (y > pageH - 20) {
      doc.addPage();
      y = margin;
    }
    const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentW, 7, "F");
    const d = new Date(v.visitDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
    doc.text(String(i + 1), margin + 3, y + 5);
    doc.text(d, margin + 15, y + 5);
    const name = v.storeName.length > 30 ? v.storeName.slice(0, 28) + "…" : v.storeName;
    doc.text(name, margin + 45, y + 5);
    const city = (v.storeCity || "").length > 20 ? (v.storeCity || "").slice(0, 18) + "…" : v.storeCity || "";
    doc.text(city, margin + 110, y + 5);
    doc.text(v.visitType || "", margin + 145, y + 5);
    doc.text(statusLabel(v.status), margin + 175, y + 5);
    y += 7;
  });

  // ── Visit pages ──
  for (const visit of visits) {
    doc.addPage();
    y = margin;

    // Visit header
    doc.setFillColor(0, 52, 120);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(visit.storeName, margin, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const date = new Date(visit.visitDate).toLocaleDateString("fr-BE", {
      weekday: "short", day: "numeric", month: "short",
    });
    const infoParts = [date, visit.visitType, visit.storeCity, visit.materialType].filter(Boolean);
    doc.text(infoParts.join(" · "), margin, 18);
    doc.text(statusLabel(visit.status), pageW - margin, 12, { align: "right" });

    y = 32;
    doc.setTextColor(30, 41, 59);

    // Remarks
    if (visit.remarks) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Remarques", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const remarksLines = doc.splitTextToSize(visit.remarks, contentW);
      remarksLines.forEach((line: string) => {
        if (y > pageH - 20) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 5;
    }

    // Materials
    if (visit.materials) {
      if (y > pageH - 20) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Matériel", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const matLines = doc.splitTextToSize(visit.materials, contentW);
      matLines.forEach((line: string) => {
        if (y > pageH - 20) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 5;
    }

    // Notes
    if (visit.notes.length > 0) {
      if (y > pageH - 20) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Notes (${visit.notes.length})`, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      for (const note of visit.notes) {
        if (y > pageH - 20) { doc.addPage(); y = margin; }
        const noteLines = doc.splitTextToSize(note.content, contentW - 4);
        noteLines.forEach((line: string) => {
          if (y > pageH - 15) { doc.addPage(); y = margin; }
          doc.text(line, margin + 2, y);
          y += 4.5;
        });
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(new Date(note.createdAt).toLocaleDateString("fr-BE"), margin + 2, y);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        y += 5;
      }
      y += 3;
    }

    // Photos
    if (visit.photos.length > 0) {
      if (y > pageH - 30) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Photos (${visit.photos.length})`, margin, y);
      y += 8;

      for (const photo of visit.photos) {
        try {
          const imgRes = await fetch(photo.url);
          if (!imgRes.ok) throw new Error("fetch failed");
          const arrayBuffer = await imgRes.arrayBuffer();
          const imgData = new Uint8Array(arrayBuffer);

          const props = doc.getImageProperties(imgData);
          const maxImgW = contentW;
          const maxImgH = 120;
          const ratio = Math.min(maxImgW / props.width, maxImgH / props.height);
          const imgW = props.width * ratio;
          const imgH = props.height * ratio;

          if (y + imgH > pageH - 15) {
            doc.addPage();
            y = margin;
          }

          // Category badge
          if (photo.category === "before" || photo.category === "after") {
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(photo.category === "before" ? 180 : 21, photo.category === "before" ? 83 : 128, photo.category === "before" ? 9 : 61);
            doc.text(photo.category === "before" ? "AVANT" : "APRÈS", margin, y - 2);
            doc.setTextColor(30, 41, 59);
          }

          doc.addImage(imgData, props.fileType, margin, y, imgW, imgH, undefined, "FAST");
          y += imgH + 8;
        } catch {
          if (y > pageH - 20) { doc.addPage(); y = margin; }
          doc.setTextColor(148, 163, 184);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.text("[Image non disponible]", margin, y + 5);
          doc.setTextColor(30, 41, 59);
          y += 15;
        }
      }
    }
  }

  // Page numbers on all pages
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
