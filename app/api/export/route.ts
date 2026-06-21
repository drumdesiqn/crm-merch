import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get("weekId");

    if (!weekId) {
      return NextResponse.json({ error: "weekId required" }, { status: 400 });
    }

    // Get visits for the week
    const visits = await prisma.visit.findMany({
      where: { weekId },
      orderBy: { visitDate: "asc" },
    });

    if (visits.length === 0) {
      return NextResponse.json({ weekId, count: 0, visits: [] });
    }

    const visitIds = visits.map((v) => v.id);
    const storeIds = [...new Set(visits.map((v) => v.storeId).filter(Boolean))];

    // Get all photos for these visits OR stores (magasin-linked)
    const allPhotos = await prisma.visitPhoto.findMany({
      where: {
        OR: [
          { visitId: { in: visitIds } },
          ...(storeIds.length > 0 ? [{ storeId: { in: storeIds } }] : []),
        ],
      },
      select: { id: true, url: true, visitId: true, storeId: true },
    });

    // Get all notes for these visits OR stores (magasin-linked)
    const allNotes = await prisma.visitNote.findMany({
      where: {
        OR: [
          { visitId: { in: visitIds } },
          ...(storeIds.length > 0 ? [{ storeId: { in: storeIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { content: true, createdAt: true, visitId: true, storeId: true },
    });

    // Group by visit (visitId match OR storeId match)
    const photosByVisit = visits.reduce((acc, v) => {
      acc[v.id] = allPhotos
        .filter((p) => p.visitId === v.id || p.storeId === v.storeId)
        .map((p) => ({ id: p.id, url: p.url }));
      return acc;
    }, {} as Record<string, { id: string; url: string }[]>);

    const notesByVisit = visits.reduce((acc, v) => {
      acc[v.id] = allNotes
        .filter((n) => n.visitId === v.id || n.storeId === v.storeId)
        .map((n) => ({ content: n.content, createdAt: n.createdAt }));
      return acc;
    }, {} as Record<string, { content: string; createdAt: Date }[]>);

    return NextResponse.json({
      weekId,
      count: visits.length,
      visits: visits.map((v) => ({
        id: v.id,
        visitDate: v.visitDate,
        storeName: v.storeName,
        storeCity: v.storeCity,
        storeAddress: v.storeAddress,
        storeZipcode: v.storeZipcode,
        visitType: v.visitType,
        status: v.status || "pending",
        merchandiser: v.merchandiser,
        remarks: v.remarks,
        materials: v.materials,
        materialType: v.materialType,
        photos: photosByVisit[v.id] || [],
        notes: notesByVisit[v.id] || [],
      })),
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
