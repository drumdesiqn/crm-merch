import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const visits = await prisma.visit.findMany({
      where: { storeId },
      orderBy: { visitDate: "desc" },
      include: {
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

    const enrichedVisits = visits.map((v) => ({
      ...v,
      materialType: v.materialType,
      notes: notes.filter((n) => n.visitId === v.id || n.storeId === storeId),
      photos: photos.filter((p) => p.visitId === v.id || p.storeId === storeId),
    }));

    return NextResponse.json(enrichedVisits);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
