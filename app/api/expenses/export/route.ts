import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import * as XLSX from "xlsx";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function setCell(ws: XLSX.WorkSheet, addr: string, value: string | number) {
  const cell: XLSX.CellObject = { t: typeof value === "number" ? "n" : "s", v: value };
  ws[addr] = cell;
}

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

    // Load template
    const templatePath = path.join(process.cwd(), "public", "templates", "onkostennota-template.xlsx");
    const templateBuffer = await fs.readFile(templatePath);
    const wb = XLSX.read(templateBuffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Fill general section
    const now = new Date();
    const monthLabel = now.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
    const userName = settings?.userName || auth.user.email || "";
    const dateStr = now.toLocaleDateString("fr-BE");

    setCell(ws, "F13", userName);
    setCell(ws, "F15", dateStr);
    setCell(ws, "F16", monthLabel);
    setCell(ws, "F17", userName);

    // Fill expense rows (rows 22-35, 14 rows max)
    const maxRows = 14;
    const expensesToFill = expenses.slice(0, maxRows);
    let total = 0;

    expensesToFill.forEach((expense, i) => {
      const row = 22 + i; // 1-indexed
      setCell(ws, `C${row}`, expense.description);
      const d = new Date(expense.expenseDate);
      d.setHours(12, 0, 0, 0);
      setCell(ws, `G${row}`, d.toLocaleDateString("fr-BE"));
      setCell(ws, `J${row}`, expense.amount);
      total += expense.amount;
    });

    setCell(ws, "J37", Math.round(total * 100) / 100);

    // Generate xlsx buffer
    const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

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
