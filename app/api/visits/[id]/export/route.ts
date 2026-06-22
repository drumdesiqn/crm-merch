import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get single visit
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        week: { select: { label: true } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Get photos for this visit + store (same storeId)
    const photos = await prisma.visitPhoto.findMany({
      where: {
        OR: [
          { visitId: id },
          ...(visit.storeId ? [{ storeId: visit.storeId }] : []),
        ],
      },
      select: { id: true, url: true, caption: true },
      orderBy: { createdAt: "desc" },
    });

    // Get notes for this visit + store (same storeId)
    const notes = await prisma.visitNote.findMany({
      where: {
        OR: [
          { visitId: id },
          ...(visit.storeId ? [{ storeId: visit.storeId }] : []),
        ],
      },
      select: { content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      visit: {
        id: visit.id,
        visitDate: visit.visitDate,
        storeId: visit.storeId,
        storeName: visit.storeName,
        storeAddress: visit.storeAddress,
        storeZipcode: visit.storeZipcode,
        storeCity: visit.storeCity,
        visitType: visit.visitType,
        visitFrequence: visit.visitFrequence,
        assortment: visit.assortment,
        status: visit.status || "pending",
        merchandiser: visit.merchandiser,
        salesRep: visit.salesRep,
        remarks: visit.remarks,
        materials: visit.materials,
        materialType: visit.materialType,
        weekLabel: visit.week.label,
        photos,
        notes,
      },
    });
  } catch (error) {
    console.error("Export visit error:", error);
    return errorResponse(error, "GET /api/visits/[id]/export");
  }
}
