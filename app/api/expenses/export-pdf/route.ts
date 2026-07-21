import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import { generateExpensePdf } from "@/lib/expense-export-server";

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

    const now = new Date();
    const pdfBuffer = await generateExpensePdf(expenses);

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
