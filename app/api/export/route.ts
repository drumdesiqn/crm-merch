import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

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

    // Parallel fetch: photos and notes at the same time
    const [allPhotos, allNotes] = await Promise.all([
      prisma.visitPhoto.findMany({
        where: {
          OR: [
            { visitId: { in: visitIds } },
            ...(storeIds.length > 0 ? [{ storeId: { in: storeIds } }] : []),
          ],
        },
        select: { id: true, url: true, visitId: true, storeId: true },
      }),
      prisma.visitNote.findMany({
        where: {
          OR: [
            { visitId: { in: visitIds } },
            ...(storeIds.length > 0 ? [{ storeId: { in: storeIds } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true, visitId: true, storeId: true },
      }),
    ]);

    // Group by visit — each photo/note is assigned to exactly one visit
    // Visit-specific items go to their visit; store-level items (no visitId match) go to the latest visit for that store
    const photosByVisit: Record<string, { id: string; url: string }[]> = {};
    const notesByVisit: Record<string, { content: string; createdAt: Date }[]> = {};

    const assignedPhotoIds = new Set<string>();
    const assignedNoteIndices = new Set<number>();

    // First pass: assign visit-specific items
    for (const v of visits) {
      photosByVisit[v.id] = [];
      notesByVisit[v.id] = [];

      for (const p of allPhotos) {
        if (p.visitId === v.id) {
          photosByVisit[v.id].push({ id: p.id, url: p.url });
          assignedPhotoIds.add(p.id);
        }
      }
      allNotes.forEach((n, idx) => {
        if (n.visitId === v.id) {
          notesByVisit[v.id].push({ content: n.content, createdAt: n.createdAt });
          assignedNoteIndices.add(idx);
        }
      });
    }

    // Second pass: assign store-level items (no visitId or visitId not in this week) to the latest visit for that store
    const latestVisitByStore = new Map<string, string>();
    for (const v of visits) {
      if (v.storeId && !latestVisitByStore.has(v.storeId)) {
        latestVisitByStore.set(v.storeId, v.id);
      }
    }

    for (const p of allPhotos) {
      if (assignedPhotoIds.has(p.id)) continue;
      if (p.storeId) {
        const targetVisitId = latestVisitByStore.get(p.storeId);
        if (targetVisitId) {
          photosByVisit[targetVisitId].push({ id: p.id, url: p.url });
        }
      }
    }
    allNotes.forEach((n, idx) => {
      if (assignedNoteIndices.has(idx)) return;
      if (n.storeId) {
        const targetVisitId = latestVisitByStore.get(n.storeId);
        if (targetVisitId) {
          notesByVisit[targetVisitId].push({ content: n.content, createdAt: n.createdAt });
        }
      }
    });

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
    return errorResponse(error, "GET /api/export");
  }
}
