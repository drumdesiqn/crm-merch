import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/visits/summary
 * Returns lightweight aggregated stats without full visit data.
 * Used by Dashboard for cross-week store stats.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const [storeStats, statusCounts] = await Promise.all([
      // Count visits and completed visits per store
      prisma.visit.groupBy({
        by: ["storeId"],
        _count: { id: true },
        where: { storeId: { not: "" }, userId: auth.user.userId },
      }),
      // Count by status
      prisma.visit.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { userId: auth.user.userId },
      }),
    ]);

    // Get completed counts per store
    const completedByStore = await prisma.visit.groupBy({
      by: ["storeId"],
      _count: { id: true },
      where: { storeId: { not: "" }, status: "done", userId: auth.user.userId },
    });

    const completedMap: Record<string, number> = {};
    completedByStore.forEach((s) => {
      completedMap[s.storeId] = s._count.id;
    });

    const stores: Record<string, { total: number; completed: number }> = {};
    storeStats.forEach((s) => {
      stores[s.storeId] = {
        total: s._count.id,
        completed: completedMap[s.storeId] || 0,
      };
    });

    const statuses: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statuses[s.status] = s._count.id;
    });

    return NextResponse.json({ stores, statuses });
  } catch (error) {
    return errorResponse(error, "GET /api/visits/summary");
  }
}
