import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";
import { generateWeekPdf, type ExportVisitData } from "@/lib/visit-export-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { weekId, salesRep } = body as { weekId: string; salesRep?: string };

    if (!weekId) {
      return NextResponse.json({ error: "weekId required" }, { status: 400 });
    }

    // Get the week label
    const week = await prisma.week.findFirst({
      where: { id: weekId, userId: auth.user.userId },
      select: { label: true },
    });

    if (!week) {
      return NextResponse.json({ error: "Semaine introuvable" }, { status: 404 });
    }

    // Get visits for the week
    const visits = await prisma.visit.findMany({
      where: { weekId, userId: auth.user.userId },
      orderBy: { visitDate: "asc" },
      select: {
        id: true,
        storeName: true,
        storeCity: true,
        visitDate: true,
        visitType: true,
        status: true,
        remarks: true,
        materials: true,
        materialType: true,
        salesRep: true,
      },
    });

    if (visits.length === 0) {
      return NextResponse.json({ error: "Aucune visite pour cette semaine" }, { status: 404 });
    }

    // Filter by sales rep if specified
    const filteredVisits = salesRep
      ? visits.filter((v) => v.salesRep === salesRep)
      : visits;

    if (filteredVisits.length === 0) {
      return NextResponse.json({ error: "Aucune visite pour ce sales rep" }, { status: 404 });
    }

    const visitIds = filteredVisits.map((v) => v.id);

    // Fetch photos and notes for these visits only
    const [allPhotos, allNotes] = await Promise.all([
      prisma.visitPhoto.findMany({
        where: { visitId: { in: visitIds }, userId: auth.user.userId },
        select: { id: true, url: true, visitId: true, category: true },
      }),
      prisma.visitNote.findMany({
        where: { visitId: { in: visitIds }, userId: auth.user.userId },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true, visitId: true },
      }),
    ]);

    // Group by visit
    const photosByVisit: Record<string, { url: string; category: string | null }[]> = {};
    const notesByVisit: Record<string, { content: string; createdAt: Date }[]> = {};

    for (const v of filteredVisits) {
      photosByVisit[v.id] = allPhotos
        .filter((p) => p.visitId === v.id)
        .map((p) => ({ url: p.url, category: p.category }));
      notesByVisit[v.id] = allNotes
        .filter((n) => n.visitId === v.id)
        .map((n) => ({ content: n.content, createdAt: n.createdAt }));
    }

    // Build the data for PDF generation
    const visitData: ExportVisitData[] = filteredVisits.map((v) => ({
      id: v.id,
      storeName: v.storeName,
      storeCity: v.storeCity || "",
      visitDate: v.visitDate.toISOString(),
      visitType: v.visitType || "",
      status: v.status || "pending",
      remarks: v.remarks,
      materials: v.materials,
      materialType: v.materialType,
      salesRep: v.salesRep,
      photos: photosByVisit[v.id] || [],
      notes: (notesByVisit[v.id] || []).map((n) => ({
        content: n.content,
        createdAt: n.createdAt.toISOString(),
      })),
    }));

    const label = salesRep ? `${week.label} - ${salesRep}` : week.label;
    const pdfBuffer = await generateWeekPdf(visitData, label);

    const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `rapport_${safeLabel}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error, "POST /api/export/pdf");
  }
}
