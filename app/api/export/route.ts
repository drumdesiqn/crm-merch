import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const weekId = searchParams.get("weekId");

    if (!weekId) {
      return NextResponse.json({ error: "weekId required" }, { status: 400 });
    }

    // Get visits for the week
    const visits = await prisma.visit.findMany({
      where: { weekId, userId: auth.user.userId },
      orderBy: { visitDate: "asc" },
      select: {
        id: true,
        weekId: true,
        assortment: true,
        storeId: true,
        storeName: true,
        storeAddress: true,
        storeZipcode: true,
        storeCity: true,
        visitType: true,
        visitFrequence: true,
        visitDate: true,
        merchandiser: true,
        remarks: true,
        salesRep: true,
        materials: true,
        sortOrder: true,
        status: true,
        materialType: true,
        latitude: true,
        longitude: true,
      },
    });

    if (visits.length === 0) {
      return NextResponse.json({ weekId, count: 0, visits: [] });
    }

    const visitIds = visits.map((v) => v.id);

    // Fetch only photos and notes linked to this week's visits
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
    const photosByVisit: Record<string, { id: string; url: string; category: string | null }[]> = {};
    const notesByVisit: Record<string, { content: string; createdAt: Date }[]> = {};

    for (const v of visits) {
      photosByVisit[v.id] = allPhotos
        .filter((p) => p.visitId === v.id)
        .map((p) => ({ id: p.id, url: p.url, category: p.category }));
      notesByVisit[v.id] = allNotes
        .filter((n) => n.visitId === v.id)
        .map((n) => ({ content: n.content, createdAt: n.createdAt }));
    }

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
        salesRep: v.salesRep,
        latitude: v.latitude,
        longitude: v.longitude,
        photos: photosByVisit[v.id] || [],
        notes: notesByVisit[v.id] || [],
      })),
    });
  } catch (error) {
    return errorResponse(error, "GET /api/export");
  }
}
