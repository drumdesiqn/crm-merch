import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "name";
    const order = searchParams.get("order") || "asc";

    // Get all unique stores with visit statistics
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
        photos: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
      take: 5000,
    });

    // Aggregate by store
    const storeMap = new Map<string, any>();

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

      const store = storeMap.get(visit.storeId);
      store.totalVisits++;
      if (visit.status === "done") {
        store.completedVisits++;
      }
      if (visit.materialType) {
        store.materialTypes.add(visit.materialType);
      }
      if (visit.photos && visit.photos.length > 0) {
        store.totalPhotos += visit.photos.length;
      }
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
        case "lastVisit":
          comparison = new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
          break;
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
