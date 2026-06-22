import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "name";
    const order = searchParams.get("order") || "asc";

    // Run three parallel groupBy queries instead of loading all visits into JS
    const [visitAgg, photoCounts, materialTypes] = await Promise.all([
      // Core visit counts + last visit per store
      prisma.visit.groupBy({
        by: ["storeId", "storeName", "storeAddress", "storeZipcode", "storeCity"],
        _count: { id: true },
        _max: { visitDate: true },
      }),
      // Photo counts per store
      prisma.visitPhoto.groupBy({
        by: ["storeId"],
        _count: { id: true },
        where: { storeId: { not: null } },
      }),
      // Distinct material types per store (lightweight query)
      prisma.visit.findMany({
        where: { materialType: { not: null } },
        select: { storeId: true, materialType: true },
        distinct: ["storeId", "materialType"],
      }),
    ]);

    // Completed visit counts (separate query because groupBy can't filter+count in one pass)
    const completedAgg = await prisma.visit.groupBy({
      by: ["storeId"],
      _count: { id: true },
      where: { status: "done" },
    });

    const photoCountMap = new Map(photoCounts.map((p) => [p.storeId, p._count.id]));
    const completedMap = new Map(completedAgg.map((c) => [c.storeId, c._count.id]));
    const materialMap = new Map<string, Set<string>>();
    for (const m of materialTypes) {
      if (!m.materialType) continue;
      if (!materialMap.has(m.storeId)) materialMap.set(m.storeId, new Set());
      materialMap.get(m.storeId)!.add(m.materialType);
    }

    // Build result array directly — no intermediate Map needed
    const stores = visitAgg.map((agg) => ({
      storeId: agg.storeId,
      storeName: agg.storeName,
      storeAddress: agg.storeAddress,
      storeZipcode: agg.storeZipcode,
      storeCity: agg.storeCity,
      totalVisits: agg._count.id,
      completedVisits: completedMap.get(agg.storeId) || 0,
      lastVisit: agg._max.visitDate,
      materialTypes: Array.from(materialMap.get(agg.storeId) || []),
      totalPhotos: photoCountMap.get(agg.storeId) || 0,
    }));

    // Apply sorting
    stores.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.storeName.localeCompare(b.storeName);
          break;
        case "city":
          comparison = a.storeCity.localeCompare(b.storeCity);
          break;
        case "visits":
          comparison = b.totalVisits - a.totalVisits;
          break;
        case "lastVisit": {
          const ta = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const tb = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          comparison = tb - ta;
          break;
        }
        default:
          comparison = a.storeName.localeCompare(b.storeName);
      }
      return order === "desc" ? -comparison : comparison;
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    return errorResponse(error, "GET /api/stores");
  }
}
