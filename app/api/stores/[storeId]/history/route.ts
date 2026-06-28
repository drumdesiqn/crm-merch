import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const visits = await prisma.visit.findMany({
      where: { storeId },
      orderBy: { visitDate: "desc" },
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
        week: { select: { label: true } },
      },
    });

    const visitIds = visits.map((v) => v.id);

    const notes = await prisma.visitNote.findMany({
      where: {
        OR: [
          { visitId: { in: visitIds } },
          { storeId },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, createdAt: true, visitId: true, storeId: true },
    });

    const photos = await prisma.visitPhoto.findMany({
      where: {
        OR: [
          { visitId: { in: visitIds } },
          { storeId },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, caption: true, createdAt: true, visitId: true, storeId: true },
    });

    // Store-level notes/photos (storeId match but not tied to a specific visit)
    const storeNotes = notes.filter((n) => n.storeId === storeId && !visitIds.includes(n.visitId));
    const storePhotos = photos.filter((p) => p.storeId === storeId && !visitIds.includes(p.visitId));

    const enrichedVisits = visits.map((v) => ({
      ...v,
      materialType: v.materialType,
      notes: notes.filter((n) => n.visitId === v.id),
      photos: photos.filter((p) => p.visitId === v.id),
    }));

    return NextResponse.json({
      storeId,
      storeName: visits[0]?.storeName || storeId,
      storeAddress: visits[0]?.storeAddress || "",
      storeZipcode: visits[0]?.storeZipcode || "",
      storeCity: visits[0]?.storeCity || "",
      visits: enrichedVisits,
      storeNotes,
      storePhotos,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/stores/[storeId]/history");
  }
}
