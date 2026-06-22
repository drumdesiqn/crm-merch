import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface StoreAggregate {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeZipcode: string;
  storeCity: string;
  totalVisits: number;
  completedVisits: number;
  lastVisit: Date | null;
  materialTypes: Set<string>;
  totalPhotos: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "name";
    const order = searchParams.get("order") || "asc";

    // Lightweight query: only the fields needed for aggregation, no relation loading
    const visits = await prisma.visit.findMany({
      select: {
        storeId: true,
        storeName: true,
        storeAddress: true,
        storeZipcode: true,
        storeCity: true,
        visitDate: true,
        status: true,
        materialType: true,
      },
      orderBy: { visitDate: "desc" },
    });

    // Photo counts per store (single query)
    const photoCounts = await prisma.visitPhoto.groupBy({
      by: ["storeId"],
      _count: { id: true },
      where: { storeId: { not: null } },
    });
    const photoCountMap = new Map(
      photoCounts.map((p) => [p.storeId, p._count.id])
    );

    // Aggregate by store
    const storeMap = new Map<string, StoreAggregate>();

    for (const visit of visits) {
      if (!storeMap.has(visit.storeId)) {
        storeMap.set(visit.storeId, {
          storeId: visit.storeId,
          storeName: visit.storeName,
          storeAddress: visit.storeAddress,
          storeZipcode: visit.storeZipcode,
          storeCity: visit.storeCity,
          totalVisits: 0,
          completedVisits: 0,
          lastVisit: visit.visitDate,
          materialTypes: new Set<string>(),
          totalPhotos: 0,
        });
      }

      const store = storeMap.get(visit.storeId)!;
      store.totalVisits++;
      if (visit.status === "done") {
        store.completedVisits++;
      }
      if (visit.materialType) {
        store.materialTypes.add(visit.materialType);
      }
    }

    // Attach photo counts
    for (const store of storeMap.values()) {
      store.totalPhotos = photoCountMap.get(store.storeId) || 0;
    }

    // Convert to array and sort
    const stores = Array.from(storeMap.values()).map((store) => ({
      ...store,
      materialTypes: Array.from(store.materialTypes),
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
