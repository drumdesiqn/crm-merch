import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import { jsPDF } from "jspdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { expenseIds } = body as { expenseIds: string[] };

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json({ error: "Aucune dépense sélectionnée" }, { status: 400 });
    }

    const expenses = await prisma.expense.findMany({
      where: { id: { in: expenseIds }, userId: auth.user.userId },
      orderBy: { expenseDate: "asc" },
    });

    if (expenses.length === 0) {
      return NextResponse.json({ error: "Aucune dépense trouvée" }, { status: 404 });
    }

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

    const pdfBuffer = doc.output("arraybuffer");
    const filename = `justificatifs_${now.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error, "POST /api/expenses/export-pdf");
  }
}
