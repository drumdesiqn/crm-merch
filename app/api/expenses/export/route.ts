import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function setCellValue(sheetXml: string, cellRef: string, value: string | number): string {
  const isNumber = typeof value === "number";
  const escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const type = isNumber ? "" : ` t="inlineStr"`;
  const valueXml = isNumber
    ? `<v>${escaped}</v>`
    : `<is><t>${escaped}</t></is>`;

  const cellRegex = new RegExp(`(<c r="${cellRef}"[^>]*>)(?:<v>|<is>).*?(?:</v>|</is>)?(</c>)`, "s");
  const existingMatch = sheetXml.match(cellRegex);

  if (existingMatch) {
    const styleMatch = existingMatch[1].match(/s="(\d+)"/);
    const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : "";
    return sheetXml.replace(cellRegex, `<c r="${cellRef}"${type}${styleAttr}>${valueXml}</c>`);
  }

  const rowMatch = sheetXml.match(new RegExp(`(<row r="${parseInt(cellRef.match(/\d+/)![0])}"[^>]*>)`));
  if (rowMatch) {
    const newCell = `<c r="${cellRef}"${type}>${valueXml}</c>`;
    return sheetXml.replace(rowMatch[0], rowMatch[0] + newCell);
  }

  return sheetXml;
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

    // Load template with JSZip to preserve all formatting (images, styles, borders)
    const templatePath = path.join(process.cwd(), "public", "templates", "onkostennota-template.xlsx");
    const templateBuffer = await fs.readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    // Find the sheet XML
    const sheetFile = Object.keys(zip.files).find(f => f.startsWith("xl/worksheets/sheet") && f.endsWith(".xml"));
    if (!sheetFile) throw new Error("Sheet XML not found");
    let sheetXml = await zip.files[sheetFile].async("string");

    // Fill general section
    const now = new Date();
    const monthLabel = now.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
    const userName = settings?.userName || auth.user.email || "";
    const dateStr = now.toLocaleDateString("fr-BE");

    sheetXml = setCellValue(sheetXml, "F13", userName);
    sheetXml = setCellValue(sheetXml, "F15", dateStr);
    sheetXml = setCellValue(sheetXml, "F16", monthLabel);
    sheetXml = setCellValue(sheetXml, "F17", userName);

    // Fill expense rows (rows 22-35, 14 rows max)
    const maxRows = 14;
    const expensesToFill = expenses.slice(0, maxRows);
    let total = 0;

    expensesToFill.forEach((expense, i) => {
      const row = 22 + i;
      sheetXml = setCellValue(sheetXml, `C${row}`, expense.description);
      const d = new Date(expense.expenseDate);
      d.setHours(12, 0, 0, 0);
      sheetXml = setCellValue(sheetXml, `G${row}`, d.toLocaleDateString("fr-BE"));
      sheetXml = setCellValue(sheetXml, `J${row}`, expense.amount);
      total += expense.amount;
    });

    sheetXml = setCellValue(sheetXml, "J37", Math.round(total * 100) / 100);

    // Write back the modified sheet XML
    zip.file(sheetFile, sheetXml);

    // Generate xlsx buffer
    const xlsxBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

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
