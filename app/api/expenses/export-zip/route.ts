import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import JSZip from "jszip";
import {
  generateExpenseExcel,
  generateExpensePdf,
  safeFilename,
  EXCEL_MAX_ROWS,
} from "@/lib/expense-export-server";

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

    if (expenseIds.length > EXCEL_MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${EXCEL_MAX_ROWS} notes de frais par export` },
        { status: 400 }
      );
    }

    const expenses = await prisma.expense.findMany({
      where: { id: { in: expenseIds }, userId: auth.user.userId },
      orderBy: { expenseDate: "asc" },
    });

    if (expenses.length === 0) {
      return NextResponse.json({ error: "Aucune dépense trouvée" }, { status: 404 });
    }

    const settings = await prisma.settings.findFirst({
      where: { userId: auth.user.userId },
    });
    const userName = settings?.userName || auth.user.email || "";

    const now = new Date();
    const monthTag = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

    // Generate Excel + PDF in parallel
    const [excelBuffer, pdfBuffer] = await Promise.all([
      generateExpenseExcel(expenses, userName),
      generateExpensePdf(expenses),
    ]);

    // Build the ZIP
    const zip = new JSZip();
    zip.file(`onkostennota_${monthTag}.xlsx`, excelBuffer);
    zip.file(`justificatifs_${monthTag}.pdf`, pdfBuffer);

    // Add individual photos, clearly named
    const photosFolder = zip.folder("photos");
    if (photosFolder) {
      await Promise.all(
        expenses.map(async (e, i) => {
          if (!e.receiptUrl) return;
          try {
            const res = await fetch(e.receiptUrl);
            if (!res.ok) return;
            const buf = await res.arrayBuffer();
            const contentType = res.headers.get("content-type") || "";
            const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
            const num = String(i + 1).padStart(2, "0");
            const name = `${num}_${safeFilename(e.description)}_${e.amount.toFixed(2)}eur.${ext}`;
            photosFolder.file(name, buf);
          } catch {
            // skip photo on failure
          }
        })
      );
    }

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

    // Mark expenses as exported
    await prisma.expense.updateMany({
      where: { id: { in: expenseIds }, userId: auth.user.userId },
      data: { exportedAt: new Date() },
    });

    const filename = `note-de-frais_${monthTag}.zip`;
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error, "POST /api/expenses/export-zip");
  }
}
