import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function colLetterToNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function setCellValue(sheetXml: string, cellRef: string, value: string | number): string {
  const isNumber = typeof value === "number";
  const escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const typeAttr = isNumber ? "" : ` t="inlineStr"`;
  const valueXml = isNumber ? `<v>${escaped}</v>` : `<is><t xml:space="preserve">${escaped}</t></is>`;

  // 1) Existing cell with content: <c r="F13" s="5" t="s"><v>12</v></c>
  const fullCellRegex = new RegExp(`<c r="${cellRef}"((?:\\s+[a-zA-Z:]+="[^"]*")*)\\s*>[\\s\\S]*?</c>`);
  const fullMatch = sheetXml.match(fullCellRegex);
  if (fullMatch) {
    const styleMatch = fullMatch[1].match(/s="(\d+)"/);
    const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : "";
    return sheetXml.replace(fullCellRegex, `<c r="${cellRef}"${styleAttr}${typeAttr}>${valueXml}</c>`);
  }

  // 2) Self-closing empty cell: <c r="F13" s="5"/>
  const selfClosingRegex = new RegExp(`<c r="${cellRef}"((?:\\s+[a-zA-Z:]+="[^"]*")*)\\s*/>`);
  const selfMatch = sheetXml.match(selfClosingRegex);
  if (selfMatch) {
    const styleMatch = selfMatch[1].match(/s="(\d+)"/);
    const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : "";
    return sheetXml.replace(selfClosingRegex, `<c r="${cellRef}"${styleAttr}${typeAttr}>${valueXml}</c>`);
  }

  // 3) Cell doesn't exist: insert into the row at the correct column position
  const rowNum = cellRef.match(/\d+/)![0];
  const targetCol = colLetterToNum(cellRef.match(/[A-Z]+/)![0]);
  const rowRegex = new RegExp(`(<row r="${rowNum}"(?:\\s+[a-zA-Z:]+="[^"]*")*\\s*>)([\\s\\S]*?)(</row>)`);
  const rowMatch = sheetXml.match(rowRegex);
  if (!rowMatch) return sheetXml;

  const newCell = `<c r="${cellRef}"${typeAttr}>${valueXml}</c>`;
  const rowContent = rowMatch[2];

  // Find insertion point: before the first cell whose column > targetCol
  const cellRefsRegex = /<c r="([A-Z]+)(\d+)"/g;
  let insertOffset = rowContent.length;
  let m: RegExpExecArray | null;
  while ((m = cellRefsRegex.exec(rowContent)) !== null) {
    if (colLetterToNum(m[1]) > targetCol) {
      insertOffset = m.index;
      break;
    }
  }

  const newRowContent = rowContent.slice(0, insertOffset) + newCell + rowContent.slice(insertOffset);
  return sheetXml.replace(rowRegex, `$1${newRowContent}$3`);
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
    const monthLabel = now.toLocaleDateString("fr-BE", { month: "long" });
    const userName = settings?.userName || auth.user.email || "";
    const dateStr = now.toLocaleDateString("fr-BE");

    sheetXml = setCellValue(sheetXml, "D6", monthLabel);
    sheetXml = setCellValue(sheetXml, "D7", now.getFullYear());
    sheetXml = setCellValue(sheetXml, "F13", userName);
    sheetXml = setCellValue(sheetXml, "F15", dateStr);

    // Fill expense rows (rows 22-33, 12 rows max)
    const maxRows = 12;
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
