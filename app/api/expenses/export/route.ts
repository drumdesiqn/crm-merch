import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import ExcelJS from "exceljs";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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

    // Load settings for user info
    const settings = await prisma.settings.findFirst({
      where: { userId: auth.user.userId },
    });

    // Load template with exceljs (preserves styles)
    const templatePath = path.join(process.cwd(), "public", "templates", "onkostennota-template.xlsx");
    const templateBuffer = await fs.readFile(templatePath);
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(templateBuffer as any);
    const ws = wb.getWorksheet(1);
    if (!ws) throw new Error("Worksheet not found");

    // Fill general section
    const now = new Date();
    const monthLabel = now.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
    const userName = settings?.userName || auth.user.email || "";
    const dateStr = now.toLocaleDateString("fr-BE");

    ws.getCell("F13").value = userName;
    ws.getCell("F15").value = dateStr;
    ws.getCell("F16").value = monthLabel;
    ws.getCell("F17").value = userName;

    // Fill expense rows (rows 22-35, 14 rows max)
    const maxRows = 14;
    const expensesToFill = expenses.slice(0, maxRows);
    let total = 0;

    expensesToFill.forEach((expense, i) => {
      const row = 22 + i; // 1-indexed
      ws.getCell(`C${row}`).value = expense.description;
      const d = new Date(expense.expenseDate);
      d.setHours(12, 0, 0, 0);
      ws.getCell(`G${row}`).value = d.toLocaleDateString("fr-BE");
      ws.getCell(`J${row}`).value = expense.amount;
      total += expense.amount;
    });

    ws.getCell("J37").value = Math.round(total * 100) / 100;

    // Generate xlsx buffer
    const xlsxBuffer = await wb.xlsx.writeBuffer();

    // Mark expenses as exported
    await prisma.expense.updateMany({
      where: { id: { in: expenseIds }, userId: auth.user.userId },
      data: { exportedAt: new Date() },
    });

    const filename = `onkostennota_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}.xlsx`;
    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error, "POST /api/expenses/export");
  }
}
