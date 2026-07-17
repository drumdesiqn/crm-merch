import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { weekId } = await params;
    const week = await prisma.week.findFirst({
      where: { id: weekId, userId: auth.user.userId },
      select: { id: true, label: true, excelUrl: true },
    });

    if (!week) {
      return NextResponse.json({ error: "Semaine introuvable" }, { status: 404 });
    }
    if (!week.excelUrl) {
      return NextResponse.json({ error: "Aucun fichier Excel associé à cette semaine" }, { status: 404 });
    }

    // Fetch the Excel file from Vercel Blob
    const res = await fetch(week.excelUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Impossible de récupérer le fichier Excel" }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const wb = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellFormula: false,
      bookVBA: false,
    });

    if (!wb.SheetNames.length) {
      return NextResponse.json({ error: "Fichier Excel vide" }, { status: 400 });
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      raw: false,
      dateNF: "yyyy-mm-dd",
      defval: "",
    });

    // Extract headers from first row keys
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Limit to 500 rows for preview
    const preview = rows.slice(0, 500).map((row) =>
      headers.map((h) => String(row[h] ?? ""))
    );

    return NextResponse.json({
      label: week.label,
      headers,
      rows: preview,
      totalRows: rows.length,
      truncated: rows.length > 500,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/weeks/[weekId]/excel");
  }
}
