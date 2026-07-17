import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { del } from "@vercel/blob";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const visit = await prisma.visit.findFirst({
      where: { id, userId: auth.user.userId },
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
        week: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json(visit);
  } catch (error) {
    return errorResponse(error, "GET /api/visits/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`visit-delete:${ip}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans 1 minute." }, { status: 429 });
  }

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const visit = await prisma.visit.findFirst({ where: { id, userId: auth.user.userId }, select: { id: true, weekId: true } });
    if (!visit) {
      return NextResponse.json({ error: "Visite non trouvée" }, { status: 404 });
    }

    // Fetch blobKeys before deleting photos from DB
    const photos = await prisma.visitPhoto.findMany({
      where: { visitId: id },
      select: { blobKey: true },
    });

    await prisma.$transaction([
      prisma.visitNote.deleteMany({ where: { visitId: id } }),
      prisma.visitPhoto.deleteMany({ where: { visitId: id } }),
      prisma.visit.deleteMany({ where: { id, userId: auth.user.userId } }),
    ]);

    // Delete blobs from Vercel Blob Storage (best-effort, non-blocking)
    if (photos.length > 0) {
      void del(photos.map((p) => p.blobKey)).catch(() => {});
    }

    // Clean up week if it has no more visits
    const remaining = await prisma.visit.count({ where: { weekId: visit.weekId, userId: auth.user.userId } });
    if (remaining === 0) {
      await prisma.week.deleteMany({ where: { id: visit.weekId, userId: auth.user.userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "DELETE /api/visits/[id]");
  }
}