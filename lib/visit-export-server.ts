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
 * Optimized: continuous flow, 2-column photo grid, compact layout.
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
  doc.rect(0, 0, pageW, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport Hebdomadaire", margin, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(weekLabel, margin, 27);

  y = 48;
  doc.setTextColor(30, 41, 59);

  // Stats
  const doneCount = visits.filter((v) => v.status === "done").length;
  const pendingCount = visits.filter((v) => v.status === "pending").length;
  const totalPhotos = visits.reduce((s, v) => s + v.photos.length, 0);
  const totalNotes = visits.reduce((s, v) => s + v.notes.length, 0);

  doc.setFontSize(9);
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
    doc.text(s, margin + col * 60, y + row * 6);
  });
  y += 16;

  // Summary table
  doc.setFillColor(0, 52, 120);
  doc.rect(margin, y, contentW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#", margin + 3, y + 5);
  doc.text("Date", margin + 15, y + 5);
  doc.text("Magasin", margin + 45, y + 5);
  doc.text("Ville", margin + 110, y + 5);
  doc.text("Type", margin + 145, y + 5);
  doc.text("Statut", margin + 175, y + 5);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  visits.forEach((v, i) => {
    if (y > pageH - 20) {
      doc.addPage();
      y = margin;
    }
    const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentW, 6, "F");
    const d = new Date(v.visitDate).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
    doc.text(String(i + 1), margin + 3, y + 4.5);
    doc.text(d, margin + 15, y + 4.5);
    const name = v.storeName.length > 30 ? v.storeName.slice(0, 28) + "…" : v.storeName;
    doc.text(name, margin + 45, y + 4.5);
    const city = (v.storeCity || "").length > 20 ? (v.storeCity || "").slice(0, 18) + "…" : v.storeCity || "";
    doc.text(city, margin + 110, y + 4.5);
    doc.text(v.visitType || "", margin + 145, y + 4.5);
    doc.text(statusLabel(v.status), margin + 175, y + 4.5);
    y += 6;
  });

  // ── Visit details — one page per visit ──

  for (let vi = 0; vi < visits.length; vi++) {
    const visit = visits[vi];

    // Each visit starts on a new page
    doc.addPage();
    y = margin;

    // Compact visit header — colored bar with name + date + status
    doc.setFillColor(0, 52, 120);
    doc.rect(margin, y, contentW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const name = visit.storeName.length > 35 ? visit.storeName.slice(0, 33) + "…" : visit.storeName;
    doc.text(name, margin + 3, y + 7);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const date = new Date(visit.visitDate).toLocaleDateString("fr-BE", {
      weekday: "short", day: "numeric", month: "short",
    });
    const infoParts = [date, visit.visitType, visit.storeCity].filter(Boolean);
    doc.text(infoParts.join(" · "), margin + 3, y + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(statusLabel(visit.status), margin + contentW - 3, y + 7, { align: "right" });
    y += 18;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);

    // Remarks + Materials side by side if both exist
    const hasRemarks = visit.remarks && visit.remarks.trim();
    const hasMaterials = visit.materials && visit.materials.trim();

    if (hasRemarks && hasMaterials) {
      // Two columns
      const colW = (contentW - 4) / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 83, 146);
      doc.text("REMARQUES", margin, y);
      doc.text("MATÉRIEL", margin + colW + 4, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      y += 4;

      const remLines = doc.splitTextToSize(visit.remarks!, colW);
      const matLines = doc.splitTextToSize(visit.materials!, colW);
      const maxLines = Math.max(remLines.length, matLines.length);
      for (let li = 0; li < maxLines; li++) {
        if (y > pageH - 15) { doc.addPage(); y = margin; }
        if (li < remLines.length) doc.text(remLines[li], margin, y);
        if (li < matLines.length) doc.text(matLines[li], margin + colW + 4, y);
        y += 4;
      }
      y += 4;
    } else {
      // Single column for whichever exists
      if (hasRemarks) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0, 83, 146);
        doc.text("REMARQUES", margin, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 4;
        const remLines = doc.splitTextToSize(visit.remarks!, contentW);
        remLines.forEach((line: string) => {
          if (y > pageH - 15) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 4;
        });
        y += 3;
      }
      if (hasMaterials) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0, 83, 146);
        doc.text("MATÉRIEL", margin, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 4;
        const matLines = doc.splitTextToSize(visit.materials!, contentW);
        matLines.forEach((line: string) => {
          if (y > pageH - 15) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 4;
        });
        y += 3;
      }
    }

    // Notes — compact inline
    if (visit.notes.length > 0) {
      if (y > pageH - 20) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 83, 146);
      doc.text(`NOTES (${visit.notes.length})`, margin, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      y += 4;

      for (const note of visit.notes) {
        if (y > pageH - 15) { doc.addPage(); y = margin; }
        const noteLines = doc.splitTextToSize(note.content, contentW - 4);
        noteLines.forEach((line: string) => {
          if (y > pageH - 12) { doc.addPage(); y = margin; }
          doc.text(line, margin + 2, y);
          y += 3.5;
        });
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(new Date(note.createdAt).toLocaleDateString("fr-BE"), margin + 2, y);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        y += 4;
      }
      y += 2;
    }

    // Photos — 2-column grid
    if (visit.photos.length > 0) {
      if (y > pageH - 35) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 83, 146);
      doc.text(`PHOTOS (${visit.photos.length})`, margin, y);
      doc.setTextColor(30, 41, 59);
      y += 5;

      const colW = (contentW - 4) / 2;
      const maxImgH = 70;
      let col = 0;
      let rowStartY = y;

      for (const photo of visit.photos) {
        try {
          const imgRes = await fetch(photo.url);
          if (!imgRes.ok) throw new Error("fetch failed");
          const arrayBuffer = await imgRes.arrayBuffer();
          const imgData = new Uint8Array(arrayBuffer);

          const props = doc.getImageProperties(imgData);
          const maxImgW = colW;
          const ratio = Math.min(maxImgW / props.width, maxImgH / props.height);
          const imgW = props.width * ratio;
          const imgH = props.height * ratio;

          // Check if we need a new row
          if (col === 0 && y + imgH > pageH - 15) {
            doc.addPage();
            y = margin;
            rowStartY = y;
          }

          const imgX = margin + col * (colW + 4);

          // Category badge
          if (photo.category === "before" || photo.category === "after") {
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(photo.category === "before" ? 180 : 21, photo.category === "before" ? 83 : 128, photo.category === "before" ? 9 : 61);
            doc.text(photo.category === "before" ? "AVANT" : "APRÈS", imgX, y - 1);
            doc.setTextColor(30, 41, 59);
          }

          doc.addImage(imgData, props.fileType, imgX, y, imgW, imgH, undefined, "FAST");

          if (col === 0) {
            rowStartY = y;
            col = 1;
          } else {
            y = Math.max(rowStartY + imgH, y + imgH) + 6;
            col = 0;
            rowStartY = y;
          }
        } catch {
          if (col === 0) {
            if (y > pageH - 15) { doc.addPage(); y = margin; }
            doc.setTextColor(148, 163, 184);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.text("[Image non disponible]", margin, y + 3);
            doc.setTextColor(30, 41, 59);
            col = 1;
          } else {
            doc.setTextColor(148, 163, 184);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.text("[Image non disponible]", margin + colW + 4, y + 3);
            doc.setTextColor(30, 41, 59);
            y += 12;
            col = 0;
          }
        }
      }

      // If odd number of photos, advance y
      if (col === 1) {
        y = rowStartY + maxImgH + 6;
      }
      y += 4;
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
