import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import { generateExpenseExcel } from "@/lib/expense-export-server";

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
    const userName = settings?.userName || auth.user.email || "";
    const now = new Date();

    const xlsxBuffer = await generateExpenseExcel(expenses, userName);

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
