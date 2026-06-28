import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Run all aggregation queries in parallel
    const [
      visitsByWeek,
      visitsByStatus,
      visitsByType,
      visitsByCity,
      materialCounts,
      totalStores,
      totalPhotos,
      visitsBySalesRep,
    ] = await Promise.all([
      // Visits per week with completion rate
      prisma.$queryRaw<
        { week_label: string; week_num: number; year: number; total: bigint; done: bigint }[]
      >`
        SELECT w."label" as week_label, w."weekNum" as week_num, w."year" as year,
          COUNT(v."id") as total,
          COUNT(CASE WHEN v."status" = 'done' THEN 1 END) as done
        FROM "Visit" v
        JOIN "Week" w ON v."weekId" = w."id"
        GROUP BY w."id", w."label", w."weekNum", w."year"
        ORDER BY w."year" ASC, w."weekNum" ASC
      `,

      // Visits by status
      prisma.visit.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Visits by type
      prisma.visit.groupBy({
        by: ["visitType"],
        _count: { id: true },
      }),

      // Top 10 cities
      prisma.visit.groupBy({
        by: ["storeCity"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Material type distribution
      prisma.visit.groupBy({
        by: ["materialType"],
        _count: { id: true },
        where: { materialType: { not: null } },
        orderBy: { _count: { id: "desc" } },
      }),

      // Total distinct stores
      prisma.visit.groupBy({
        by: ["storeId"],
        _count: { id: true },
      }),

      // Total photos
      prisma.visitPhoto.count(),

      // Visits by sales rep
      prisma.visit.groupBy({
        by: ["salesRep"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      }),
    ]);

    // Total visits + done
    const totalVisits = visitsByWeek.reduce((sum, w) => sum + Number(w.total), 0);
    const totalDone = visitsByWeek.reduce((sum, w) => sum + Number(w.done), 0);

    return NextResponse.json({
      summary: {
        totalVisits,
        completionRate: totalVisits > 0 ? Math.round((totalDone / totalVisits) * 100) : 0,
        totalStores: totalStores.length,
        totalPhotos,
      },
      visitsByWeek: visitsByWeek.map((w) => ({
        label: w.week_label,
        total: Number(w.total),
        done: Number(w.done),
        rate: Number(w.total) > 0 ? Math.round((Number(w.done) / Number(w.total)) * 100) : 0,
      })),
      visitsByStatus: visitsByStatus.map((s) => ({
        status: s.status || "pending",
        count: s._count.id,
      })),
      visitsByType: visitsByType.map((t) => ({
        type: t.visitType,
        count: t._count.id,
      })),
      visitsByCity: visitsByCity.map((c) => ({
        city: c.storeCity,
        count: c._count.id,
      })),
      materialCounts: materialCounts.map((m) => ({
        type: m.materialType || "Non spécifié",
        count: Number(m._count.id),
      })),
      visitsBySalesRep: visitsBySalesRep.map((s) => ({
        name: s.salesRep || "Non renseigné",
        count: s._count.id,
      })),
    });
  } catch (error) {
    return errorResponse(error, "GET /api/analytics");
  }
}
