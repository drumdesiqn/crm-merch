import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const starred = searchParams.get("starred") === "true";
    const storeId = searchParams.get("storeId") || undefined;
    const today = searchParams.get("today") === "true";

    const where: Record<string, unknown> = {};
    where.userId = auth.user.userId;
    if (starred) where.starred = true;
    if (storeId) where.storeId = storeId;
    if (today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const photos = await prisma.visitPhoto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        visit: {
          select: {
            visitDate: true,
            storeName: true,
            storeCity: true,
            week: { select: { label: true } },
          },
        },
      },
    });

    return NextResponse.json(photos);
  } catch (error) {
    return errorResponse(error, "GET /api/photos");
  }
}
